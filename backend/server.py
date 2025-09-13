from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, File, UploadFile
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
from passlib.context import CryptContext
import qrcode
import io
import base64
from PIL import Image
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = "fintech_flow_secret_key_2025"
ALGORITHM = "HS256"

# Create the main app
app = FastAPI(title="Fintech Flow API", version="1.0.0")
api_router = APIRouter(prefix="/api")

# Auth Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str
    phone: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class User(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    phone: Optional[str] = None
    kyc_status: str = "pending"  # pending, in_review, approved, rejected
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    google_id: Optional[str] = None

class Token(BaseModel):
    access_token: str
    token_type: str
    user: User

# KYC Models
class KYCDocument(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    document_type: str  # cpf, rg, cnh, passport
    document_number: str
    document_image: str  # base64
    selfie_image: str  # base64
    ocr_data: Optional[Dict[str, Any]] = None
    ai_analysis: Optional[Dict[str, Any]] = None
    status: str = "pending"  # pending, analyzing, in_review, approved, rejected
    submitted_at: datetime = Field(default_factory=datetime.utcnow)
    reviewed_at: Optional[datetime] = None
    reviewer_id: Optional[str] = None
    reviewer_notes: Optional[str] = None

class KYCSubmission(BaseModel):
    document_type: str
    document_number: str
    document_image: str  # base64
    selfie_image: str  # base64

# Pix Models
class PIXAccount(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    pix_key: str
    pix_key_type: str  # cpf, email, phone, random
    account_type: str = "checking"
    balance: float = 0.0
    is_active: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PIXTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    from_user_id: Optional[str] = None
    to_user_id: Optional[str] = None
    from_pix_key: Optional[str] = None
    to_pix_key: str
    amount: float
    description: Optional[str] = None
    transaction_type: str  # send, receive, qr_payment
    status: str = "pending"  # pending, completed, failed, cancelled
    qr_code: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    completed_at: Optional[datetime] = None

class PIXTransfer(BaseModel):
    to_pix_key: str
    amount: float
    description: Optional[str] = None

class PIXQRCode(BaseModel):
    amount: float
    description: Optional[str] = None

# Virtual Card Models
class VirtualCard(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    card_number: str = Field(default_factory=lambda: f"4{uuid.uuid4().hex[:15]}")
    card_holder_name: str
    cvv: str = Field(default_factory=lambda: str(uuid.uuid4().int)[:3])
    expiry_date: str = Field(default_factory=lambda: (datetime.now() + timedelta(days=1825)).strftime("%m/%y"))  # 5 years
    status: str = "active"  # active, blocked, cancelled
    daily_limit: float = 5000.0
    monthly_limit: float = 50000.0
    daily_spent: float = 0.0
    monthly_spent: float = 0.0
    created_at: datetime = Field(default_factory=datetime.utcnow)
    blocked_at: Optional[datetime] = None

class CardTransaction(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    card_id: str
    merchant_name: str
    amount: float
    currency: str = "BRL"
    status: str = "completed"  # completed, pending, failed, refunded
    transaction_type: str = "purchase"  # purchase, refund, fee
    created_at: datetime = Field(default_factory=datetime.utcnow)

class CardCreate(BaseModel):
    card_holder_name: str
    daily_limit: Optional[float] = 5000.0
    monthly_limit: Optional[float] = 50000.0

class CardLimits(BaseModel):
    daily_limit: float
    monthly_limit: float

# Utility Functions
def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        
        user_data = await db.users.find_one({"id": user_id})
        if user_data is None:
            raise HTTPException(status_code=401, detail="User not found")
        
        return User(**user_data)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

def generate_qr_code(data: str) -> str:
    qr = qrcode.QRCode(version=1, box_size=10, border=5)
    qr.add_data(data)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format='PNG')
    img_str = base64.b64encode(buffer.getvalue()).decode()
    return img_str

# Auth Routes
@api_router.post("/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    # Check if user exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Create user
    hashed_password = hash_password(user_data.password)
    user = User(
        email=user_data.email,
        full_name=user_data.full_name,
        phone=user_data.phone
    )
    
    user_dict = user.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    
    # Create PIX account
    pix_account = PIXAccount(
        user_id=user.id,
        pix_key=user_data.email,
        pix_key_type="email"
    )
    await db.pix_accounts.insert_one(pix_account.dict())
    
    # Create token
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: UserLogin):
    user_data = await db.users.find_one({"email": login_data.email})
    if not user_data:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(login_data.password, user_data["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    user = User(**user_data)
    token = create_access_token({"sub": user.id})
    return Token(access_token=token, token_type="bearer", user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

# KYC Routes
@api_router.post("/kyc/submit", response_model=Dict[str, str])
async def submit_kyc(kyc_data: KYCSubmission, current_user: User = Depends(get_current_user)):
    # Check if user already has KYC submission
    existing_kyc = await db.kyc_documents.find_one({"user_id": current_user.id})
    if existing_kyc and existing_kyc["status"] != "rejected":
        raise HTTPException(status_code=400, detail="KYC already submitted")
    
    # Create KYC document
    kyc_doc = KYCDocument(
        user_id=current_user.id,
        document_type=kyc_data.document_type,
        document_number=kyc_data.document_number,
        document_image=kyc_data.document_image,
        selfie_image=kyc_data.selfie_image,
        status="analyzing"
    )
    
    await db.kyc_documents.insert_one(kyc_doc.dict())
    
    # Update user KYC status
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"kyc_status": "in_review"}}
    )
    
    return {"message": "KYC submitted successfully", "status": "analyzing"}

@api_router.get("/kyc/status", response_model=Dict[str, Any])
async def get_kyc_status(current_user: User = Depends(get_current_user)):
    kyc_doc = await db.kyc_documents.find_one({"user_id": current_user.id})
    if not kyc_doc:
        return {"status": "not_submitted"}
    
    return {
        "status": kyc_doc["status"],
        "submitted_at": kyc_doc["submitted_at"],
        "reviewer_notes": kyc_doc.get("reviewer_notes")
    }

# PIX Routes
@api_router.get("/pix/account", response_model=PIXAccount)
async def get_pix_account(current_user: User = Depends(get_current_user)):
    pix_account = await db.pix_accounts.find_one({"user_id": current_user.id})
    if not pix_account:
        raise HTTPException(status_code=404, detail="PIX account not found")
    return PIXAccount(**pix_account)

@api_router.post("/pix/generate-qr", response_model=Dict[str, str])
async def generate_pix_qr(qr_data: PIXQRCode, current_user: User = Depends(get_current_user)):
    pix_account = await db.pix_accounts.find_one({"user_id": current_user.id})
    if not pix_account:
        raise HTTPException(status_code=404, detail="PIX account not found")
    
    qr_payload = {
        "pix_key": pix_account["pix_key"],
        "amount": qr_data.amount,
        "description": qr_data.description,
        "merchant_name": current_user.full_name
    }
    
    qr_code_image = generate_qr_code(json.dumps(qr_payload))
    
    return {
        "qr_code": qr_code_image,
        "pix_key": pix_account["pix_key"],
        "amount": str(qr_data.amount)
    }

@api_router.post("/pix/transfer", response_model=Dict[str, str])
async def pix_transfer(transfer_data: PIXTransfer, current_user: User = Depends(get_current_user)):
    # Get sender account
    sender_account = await db.pix_accounts.find_one({"user_id": current_user.id})
    if not sender_account:
        raise HTTPException(status_code=404, detail="PIX account not found")
    
    if sender_account["balance"] < transfer_data.amount:
        raise HTTPException(status_code=400, detail="Insufficient balance")
    
    # Find recipient
    recipient_account = await db.pix_accounts.find_one({"pix_key": transfer_data.to_pix_key})
    if not recipient_account:
        raise HTTPException(status_code=404, detail="Recipient not found")
    
    # Create transaction
    transaction = PIXTransaction(
        from_user_id=current_user.id,
        to_user_id=recipient_account["user_id"],
        from_pix_key=sender_account["pix_key"],
        to_pix_key=transfer_data.to_pix_key,
        amount=transfer_data.amount,
        description=transfer_data.description,
        transaction_type="send",
        status="completed",
        completed_at=datetime.utcnow()
    )
    
    await db.pix_transactions.insert_one(transaction.dict())
    
    # Update balances
    await db.pix_accounts.update_one(
        {"user_id": current_user.id},
        {"$inc": {"balance": -transfer_data.amount}}
    )
    
    await db.pix_accounts.update_one(
        {"user_id": recipient_account["user_id"]},
        {"$inc": {"balance": transfer_data.amount}}
    )
    
    return {"message": "Transfer completed successfully", "transaction_id": transaction.id}

@api_router.get("/pix/transactions", response_model=List[PIXTransaction])
async def get_pix_transactions(current_user: User = Depends(get_current_user)):
    transactions = await db.pix_transactions.find({
        "$or": [
            {"from_user_id": current_user.id},
            {"to_user_id": current_user.id}
        ]
    }).sort("created_at", -1).to_list(100)
    
    return [PIXTransaction(**transaction) for transaction in transactions]

# Virtual Cards Routes
@api_router.post("/cards/create", response_model=VirtualCard)
async def create_card(card_data: CardCreate, current_user: User = Depends(get_current_user)):
    if current_user.kyc_status != "approved":
        raise HTTPException(status_code=400, detail="KYC approval required for card creation")
    
    card = VirtualCard(
        user_id=current_user.id,
        card_holder_name=card_data.card_holder_name,
        daily_limit=card_data.daily_limit,
        monthly_limit=card_data.monthly_limit
    )
    
    await db.virtual_cards.insert_one(card.dict())
    return card

@api_router.get("/cards", response_model=List[VirtualCard])
async def get_cards(current_user: User = Depends(get_current_user)):
    cards = await db.virtual_cards.find({"user_id": current_user.id}).to_list(10)
    return [VirtualCard(**card) for card in cards]

@api_router.put("/cards/{card_id}/block")
async def block_card(card_id: str, current_user: User = Depends(get_current_user)):
    result = await db.virtual_cards.update_one(
        {"id": card_id, "user_id": current_user.id},
        {"$set": {"status": "blocked", "blocked_at": datetime.utcnow()}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    
    return {"message": "Card blocked successfully"}

@api_router.put("/cards/{card_id}/unblock")
async def unblock_card(card_id: str, current_user: User = Depends(get_current_user)):
    result = await db.virtual_cards.update_one(
        {"id": card_id, "user_id": current_user.id},
        {"$set": {"status": "active", "blocked_at": None}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    
    return {"message": "Card unblocked successfully"}

@api_router.put("/cards/{card_id}/limits", response_model=Dict[str, str])
async def update_card_limits(card_id: str, limits: CardLimits, current_user: User = Depends(get_current_user)):
    result = await db.virtual_cards.update_one(
        {"id": card_id, "user_id": current_user.id},
        {"$set": {"daily_limit": limits.daily_limit, "monthly_limit": limits.monthly_limit}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Card not found")
    
    return {"message": "Card limits updated successfully"}

@api_router.get("/cards/{card_id}/transactions", response_model=List[CardTransaction])
async def get_card_transactions(card_id: str, current_user: User = Depends(get_current_user)):
    # Verify card ownership
    card = await db.virtual_cards.find_one({"id": card_id, "user_id": current_user.id})
    if not card:
        raise HTTPException(status_code=404, detail="Card not found")
    
    transactions = await db.card_transactions.find({"card_id": card_id}).sort("created_at", -1).to_list(100)
    return [CardTransaction(**transaction) for transaction in transactions]

# Admin Routes (for KYC reviewers)
@api_router.get("/admin/kyc/pending", response_model=List[Dict[str, Any]])
async def get_pending_kyc(current_user: User = Depends(get_current_user)):
    # In a real app, you'd check for admin permissions here
    pending_kyc = await db.kyc_documents.find({"status": {"$in": ["analyzing", "in_review"]}}).to_list(100)
    
    result = []
    for kyc in pending_kyc:
        user_data = await db.users.find_one({"id": kyc["user_id"]})
        result.append({
            "kyc_id": kyc["id"],
            "user_name": user_data["full_name"] if user_data else "Unknown",
            "user_email": user_data["email"] if user_data else "Unknown",
            "document_type": kyc["document_type"],
            "submitted_at": kyc["submitted_at"],
            "status": kyc["status"]
        })
    
    return result

@api_router.put("/admin/kyc/{kyc_id}/review")
async def review_kyc(kyc_id: str, action: Dict[str, str], current_user: User = Depends(get_current_user)):
    # In a real app, you'd check for admin permissions here
    status = action.get("status")  # "approved" or "rejected"
    notes = action.get("notes", "")
    
    if status not in ["approved", "rejected"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    # Update KYC document
    result = await db.kyc_documents.update_one(
        {"id": kyc_id},
        {"$set": {
            "status": status,
            "reviewed_at": datetime.utcnow(),
            "reviewer_id": current_user.id,
            "reviewer_notes": notes
        }}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="KYC document not found")
    
    # Update user KYC status
    kyc_doc = await db.kyc_documents.find_one({"id": kyc_id})
    if kyc_doc:
        await db.users.update_one(
            {"id": kyc_doc["user_id"]},
            {"$set": {"kyc_status": status}}
        )
    
    return {"message": f"KYC {status} successfully"}

# Health check
@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.utcnow()}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()