#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Fintech Flow
Tests all authentication, PIX, KYC, and virtual card endpoints
"""

import requests
import json
import base64
import uuid
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv('/app/frontend/.env')

# Get backend URL from environment
BACKEND_URL = os.getenv('EXPO_PUBLIC_BACKEND_URL', 'http://localhost:8001')
API_BASE_URL = f"{BACKEND_URL}/api"

print(f"Testing backend at: {API_BASE_URL}")

class FintechAPITester:
    def __init__(self):
        self.session = requests.Session()
        self.access_token = None
        self.user_data = None
        self.test_results = []
        
    def log_test(self, test_name, success, details="", response_data=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and not success:
            print(f"   Response: {response_data}")
        print()
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'details': details,
            'response': response_data
        })
    
    def test_health_check(self):
        """Test health endpoint"""
        try:
            response = self.session.get(f"{API_BASE_URL}/health")
            if response.status_code == 200:
                data = response.json()
                if data.get('status') == 'healthy':
                    self.log_test("Health Check", True, "Backend is healthy")
                    return True
                else:
                    self.log_test("Health Check", False, "Unexpected health status", data)
                    return False
            else:
                self.log_test("Health Check", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Health Check", False, f"Connection error: {str(e)}")
            return False
    
    def test_user_registration(self):
        """Test user registration endpoint"""
        try:
            # Generate unique test data
            unique_id = str(uuid.uuid4())[:8]
            test_user = {
                "email": f"testuser_{unique_id}@fintechflow.com",
                "password": "SecurePassword123!",
                "full_name": f"Test User {unique_id}",
                "phone": "+5511987654321"
            }
            
            response = self.session.post(f"{API_BASE_URL}/auth/register", json=test_user)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    self.access_token = data['access_token']
                    self.user_data = data['user']
                    self.session.headers.update({'Authorization': f'Bearer {self.access_token}'})
                    self.log_test("User Registration", True, f"User registered: {test_user['email']}")
                    return True
                else:
                    self.log_test("User Registration", False, "Missing token or user data", data)
                    return False
            else:
                self.log_test("User Registration", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("User Registration", False, f"Error: {str(e)}")
            return False
    
    def test_user_login(self):
        """Test user login endpoint"""
        if not self.user_data:
            self.log_test("User Login", False, "No user data available for login test")
            return False
            
        try:
            login_data = {
                "email": self.user_data['email'],
                "password": "SecurePassword123!"
            }
            
            response = self.session.post(f"{API_BASE_URL}/auth/login", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'access_token' in data and 'user' in data:
                    # Update token for subsequent tests
                    self.access_token = data['access_token']
                    self.session.headers.update({'Authorization': f'Bearer {self.access_token}'})
                    self.log_test("User Login", True, f"Login successful for: {login_data['email']}")
                    return True
                else:
                    self.log_test("User Login", False, "Missing token or user data", data)
                    return False
            else:
                self.log_test("User Login", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("User Login", False, f"Error: {str(e)}")
            return False
    
    def test_get_current_user(self):
        """Test getting current user endpoint"""
        if not self.access_token:
            self.log_test("Get Current User", False, "No access token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE_URL}/auth/me")
            
            if response.status_code == 200:
                data = response.json()
                if 'email' in data and 'full_name' in data:
                    self.log_test("Get Current User", True, f"Retrieved user: {data['email']}")
                    return True
                else:
                    self.log_test("Get Current User", False, "Missing user fields", data)
                    return False
            else:
                self.log_test("Get Current User", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Current User", False, f"Error: {str(e)}")
            return False
    
    def test_get_pix_account(self):
        """Test getting PIX account endpoint"""
        if not self.access_token:
            self.log_test("Get PIX Account", False, "No access token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE_URL}/pix/account")
            
            if response.status_code == 200:
                data = response.json()
                if 'pix_key' in data and 'balance' in data:
                    self.log_test("Get PIX Account", True, f"PIX Key: {data['pix_key']}, Balance: {data['balance']}")
                    return True
                else:
                    self.log_test("Get PIX Account", False, "Missing PIX account fields", data)
                    return False
            else:
                self.log_test("Get PIX Account", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get PIX Account", False, f"Error: {str(e)}")
            return False
    
    def test_generate_pix_qr(self):
        """Test generating PIX QR code endpoint"""
        if not self.access_token:
            self.log_test("Generate PIX QR", False, "No access token available")
            return False
            
        try:
            qr_data = {
                "amount": 50.00,
                "description": "Test payment for fintech flow"
            }
            
            response = self.session.post(f"{API_BASE_URL}/pix/generate-qr", json=qr_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'qr_code' in data and 'pix_key' in data:
                    self.log_test("Generate PIX QR", True, f"QR generated for amount: R$ {qr_data['amount']}")
                    return True
                else:
                    self.log_test("Generate PIX QR", False, "Missing QR code fields", data)
                    return False
            else:
                self.log_test("Generate PIX QR", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Generate PIX QR", False, f"Error: {str(e)}")
            return False
    
    def test_get_pix_transactions(self):
        """Test getting PIX transactions endpoint"""
        if not self.access_token:
            self.log_test("Get PIX Transactions", False, "No access token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE_URL}/pix/transactions")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get PIX Transactions", True, f"Retrieved {len(data)} transactions")
                    return True
                else:
                    self.log_test("Get PIX Transactions", False, "Response is not a list", data)
                    return False
            else:
                self.log_test("Get PIX Transactions", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get PIX Transactions", False, f"Error: {str(e)}")
            return False
    
    def test_get_kyc_status(self):
        """Test getting KYC status endpoint"""
        if not self.access_token:
            self.log_test("Get KYC Status", False, "No access token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE_URL}/kyc/status")
            
            if response.status_code == 200:
                data = response.json()
                if 'status' in data:
                    self.log_test("Get KYC Status", True, f"KYC Status: {data['status']}")
                    return True
                else:
                    self.log_test("Get KYC Status", False, "Missing status field", data)
                    return False
            else:
                self.log_test("Get KYC Status", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get KYC Status", False, f"Error: {str(e)}")
            return False
    
    def test_submit_kyc(self):
        """Test KYC submission endpoint"""
        if not self.access_token:
            self.log_test("Submit KYC", False, "No access token available")
            return False
            
        try:
            # Create dummy base64 data for testing
            dummy_image_data = base64.b64encode(b"dummy_image_data_for_testing").decode('utf-8')
            
            kyc_data = {
                "document_type": "cpf",
                "document_number": "12345678901",
                "document_image": dummy_image_data,
                "selfie_image": dummy_image_data
            }
            
            response = self.session.post(f"{API_BASE_URL}/kyc/submit", json=kyc_data)
            
            if response.status_code == 200:
                data = response.json()
                if 'message' in data and 'status' in data:
                    self.log_test("Submit KYC", True, f"KYC submitted: {data['message']}")
                    return True
                else:
                    self.log_test("Submit KYC", False, "Missing response fields", data)
                    return False
            else:
                self.log_test("Submit KYC", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Submit KYC", False, f"Error: {str(e)}")
            return False
    
    def test_create_virtual_card_without_kyc(self):
        """Test creating virtual card without KYC approval (should fail)"""
        if not self.access_token:
            self.log_test("Create Virtual Card (No KYC)", False, "No access token available")
            return False
            
        try:
            card_data = {
                "card_holder_name": "Test User Card",
                "daily_limit": 1000.0,
                "monthly_limit": 10000.0
            }
            
            response = self.session.post(f"{API_BASE_URL}/cards/create", json=card_data)
            
            # This should fail because KYC is not approved
            if response.status_code == 400:
                data = response.json()
                if "KYC approval required" in data.get('detail', ''):
                    self.log_test("Create Virtual Card (No KYC)", True, "Correctly rejected without KYC approval")
                    return True
                else:
                    self.log_test("Create Virtual Card (No KYC)", False, "Wrong error message", data)
                    return False
            else:
                self.log_test("Create Virtual Card (No KYC)", False, f"Expected 400, got {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Create Virtual Card (No KYC)", False, f"Error: {str(e)}")
            return False
    
    def test_get_virtual_cards(self):
        """Test getting user's virtual cards endpoint"""
        if not self.access_token:
            self.log_test("Get Virtual Cards", False, "No access token available")
            return False
            
        try:
            response = self.session.get(f"{API_BASE_URL}/cards")
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test("Get Virtual Cards", True, f"Retrieved {len(data)} cards")
                    return True
                else:
                    self.log_test("Get Virtual Cards", False, "Response is not a list", data)
                    return False
            else:
                self.log_test("Get Virtual Cards", False, f"HTTP {response.status_code}", response.text)
                return False
        except Exception as e:
            self.log_test("Get Virtual Cards", False, f"Error: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend API tests"""
        print("=" * 60)
        print("FINTECH FLOW BACKEND API TESTING")
        print("=" * 60)
        print()
        
        # Test sequence
        tests = [
            ("Health Check", self.test_health_check),
            ("User Registration", self.test_user_registration),
            ("User Login", self.test_user_login),
            ("Get Current User", self.test_get_current_user),
            ("Get PIX Account", self.test_get_pix_account),
            ("Generate PIX QR", self.test_generate_pix_qr),
            ("Get PIX Transactions", self.test_get_pix_transactions),
            ("Get KYC Status", self.test_get_kyc_status),
            ("Submit KYC", self.test_submit_kyc),
            ("Create Virtual Card (No KYC)", self.test_create_virtual_card_without_kyc),
            ("Get Virtual Cards", self.test_get_virtual_cards),
        ]
        
        passed = 0
        total = len(tests)
        
        for test_name, test_func in tests:
            success = test_func()
            if success:
                passed += 1
        
        print("=" * 60)
        print(f"TEST SUMMARY: {passed}/{total} tests passed")
        print("=" * 60)
        
        # Print failed tests
        failed_tests = [result for result in self.test_results if not result['success']]
        if failed_tests:
            print("\nFAILED TESTS:")
            for test in failed_tests:
                print(f"❌ {test['test']}: {test['details']}")
        
        return passed, total, failed_tests

if __name__ == "__main__":
    tester = FintechAPITester()
    passed, total, failed_tests = tester.run_all_tests()
    
    # Exit with error code if tests failed
    if failed_tests:
        exit(1)
    else:
        print("\n🎉 All tests passed!")
        exit(0)