import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Share,
  Dimensions,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { Clipboard } from 'react-native';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface PIXAccount {
  id: string;
  pix_key: string;
  balance: number;
}

export default function PIXReceiveScreen() {
  const [pixAccount, setPixAccount] = useState<PIXAccount | null>(null);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [amount, setAmount] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadPixAccount();
  }, []);

  const loadPixAccount = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const response = await axios.get(`${BACKEND_URL}/api/pix/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setPixAccount(response.data);
    } catch (error) {
      console.error('Error loading PIX account:', error);
      Alert.alert('Erro', 'Erro ao carregar dados da conta PIX');
    }
  };

  const formatCurrency = (value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    if (numericValue === '') return '';
    
    const number = parseInt(numericValue) / 100;
    return number.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleAmountChange = (text: string) => {
    const formatted = formatCurrency(text);
    setAmount(formatted);
  };

  const getAmountValue = () => {
    return parseFloat(amount.replace(/[^0-9]/g, '')) / 100;
  };

  const generateQRCode = async () => {
    const amountValue = getAmountValue();
    
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Erro', 'Por favor, digite um valor válido');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      const response = await axios.post(
        `${BACKEND_URL}/api/pix/generate-qr`,
        {
          amount: amountValue,
          description: description.trim() || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setQrCode(response.data.qr_code);
      setShowQR(true);
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao gerar QR Code';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const copyPixKey = async () => {
    if (pixAccount?.pix_key) {
      Clipboard.setString(pixAccount.pix_key);
      Alert.alert('Copiado!', 'Chave PIX copiada para a área de transferência');
    }
  };

  const sharePixKey = async () => {
    if (pixAccount?.pix_key) {
      try {
        await Share.share({
          message: `Minha chave PIX: ${pixAccount.pix_key}`,
          title: 'Chave PIX - Fintech Flow',
        });
      } catch (error) {
        console.error('Error sharing:', error);
      }
    }
  };

  const shareQRCode = async () => {
    if (qrCode && pixAccount) {
      const amountValue = getAmountValue();
      const message = `Pague R$ ${amountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} via PIX\nChave: ${pixAccount.pix_key}`;
      
      try {
        await Share.share({
          message,
          title: 'Cobrança PIX - Fintech Flow',
        });
      } catch (error) {
        console.error('Error sharing QR code:', error);
      }
    }
  };

  const resetQR = () => {
    setShowQR(false);
    setQrCode(null);
    setAmount('');
    setDescription('');
  };

  if (showQR && qrCode) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
        
        <LinearGradient
          colors={['#1a1a2e', '#16213e', '#0f3460']}
          style={styles.gradient}
        >
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={resetQR}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              
              <Text style={styles.title}>QR Code PIX</Text>
              <Text style={styles.subtitle}>Escaneie o código para pagar</Text>
            </View>

            {/* QR Code */}
            <View style={styles.qrContainer}>
              <View style={styles.qrCodeWrapper}>
                <Image 
                  source={{ uri: `data:image/png;base64,${qrCode}` }} 
                  style={styles.qrCodeImage}
                  resizeMode="contain"
                />
              </View>
              
              <View style={styles.qrInfoContainer}>
                <Text style={styles.qrAmount}>
                  R$ {getAmountValue().toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </Text>
                {description && (
                  <Text style={styles.qrDescription}>{description}</Text>
                )}
                <Text style={styles.qrPixKey}>PIX: {pixAccount?.pix_key}</Text>
              </View>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionsContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={shareQRCode}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={['#4ECDC4', '#44B09E']}
                  style={styles.actionButtonGradient}
                >
                  <Ionicons name="share" size={20} color="#fff" />
                  <Text style={styles.actionButtonText}>Compartilhar</Text>
                </LinearGradient>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryActionButton}
                onPress={copyPixKey}
                activeOpacity={0.8}
              >
                <Ionicons name="copy" size={20} color="#4ECDC4" />
                <Text style={styles.secondaryActionButtonText}>Copiar Chave</Text>
              </TouchableOpacity>
            </View>

            {/* Instructions */}
            <View style={styles.instructionsContainer}>
              <Text style={styles.instructionsTitle}>Como receber:</Text>
              <View style={styles.instructionItem}>
                <Ionicons name="qr-code" size={16} color="#4ECDC4" />
                <Text style={styles.instructionText}>Mostre este QR Code para quem vai pagar</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="key" size={16} color="#4ECDC4" />
                <Text style={styles.instructionText}>Ou compartilhe sua chave PIX</Text>
              </View>
              <View style={styles.instructionItem}>
                <Ionicons name="time" size={16} color="#4ECDC4" />
                <Text style={styles.instructionText}>O dinheiro cai na hora na sua conta</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.newQRButton}
              onPress={resetQR}
              activeOpacity={0.8}
            >
              <Text style={styles.newQRButtonText}>Gerar Novo QR Code</Text>
            </TouchableOpacity>
          </ScrollView>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Receber PIX</Text>
            <Text style={styles.subtitle}>Crie um QR Code ou compartilhe sua chave</Text>
          </View>

          {/* PIX Key Card */}
          <View style={styles.pixKeyCard}>
            <LinearGradient
              colors={['#4ECDC4', '#44B09E']}
              style={styles.pixKeyGradient}
            >
              <View style={styles.pixKeyHeader}>
                <Ionicons name="key" size={24} color="#fff" />
                <Text style={styles.pixKeyTitle}>Sua Chave PIX</Text>
              </View>
              <Text style={styles.pixKeyValue}>{pixAccount?.pix_key}</Text>
              
              <View style={styles.pixKeyActions}>
                <TouchableOpacity
                  style={styles.pixKeyActionButton}
                  onPress={copyPixKey}
                >
                  <Ionicons name="copy" size={16} color="#fff" />
                  <Text style={styles.pixKeyActionText}>Copiar</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.pixKeyActionButton}
                  onPress={sharePixKey}
                >
                  <Ionicons name="share" size={16} color="#fff" />
                  <Text style={styles.pixKeyActionText}>Compartilhar</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>

          {/* QR Code Generation */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Gerar QR Code</Text>
            
            {/* Amount Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Valor a receber</Text>
              <View style={styles.amountContainer}>
                <Text style={styles.currencySymbol}>R$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0,00"
                  placeholderTextColor="#B0BEC5"
                  value={amount}
                  onChangeText={handleAmountChange}
                  keyboardType="numeric"
                />
              </View>
            </View>

            {/* Description Input */}
            <View style={styles.inputSection}>
              <Text style={styles.inputLabel}>Descrição (opcional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="text" size={20} color="#4ECDC4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ex: Pagamento freelance"
                  placeholderTextColor="#B0BEC5"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={100}
                />
              </View>
            </View>

            {/* Quick Amounts */}
            <View style={styles.quickAmountsSection}>
              <Text style={styles.inputLabel}>Valores rápidos</Text>
              <View style={styles.quickAmountsContainer}>
                {[10, 25, 50, 100, 200, 500].map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={styles.quickAmountButton}
                    onPress={() => setAmount(value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }))}
                  >
                    <Text style={styles.quickAmountText}>R$ {value}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Generate QR Button */}
            <TouchableOpacity
              style={styles.generateButton}
              onPress={generateQRCode}
              disabled={isLoading || !amount}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isLoading || !amount 
                    ? ['#666', '#555'] 
                    : ['#4ECDC4', '#44B09E']
                }
                style={styles.buttonGradient}
              >
                <Text style={styles.generateButtonText}>
                  {isLoading ? 'Gerando...' : 'Gerar QR Code'}
                </Text>
                {!isLoading && <Ionicons name="qr-code" size={20} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color="#4ECDC4" />
            <Text style={styles.infoText}>
              O QR Code gerado é válido por 24 horas. Você pode compartilhar ou mostrar para quem vai pagar.
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1a1a2e',
  },
  gradient: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 32,
  },
  header: {
    paddingTop: 20,
    paddingBottom: 32,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#B0BEC5',
    lineHeight: 24,
  },
  pixKeyCard: {
    marginBottom: 32,
    borderRadius: 16,
    overflow: 'hidden',
  },
  pixKeyGradient: {
    padding: 24,
  },
  pixKeyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  pixKeyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  pixKeyValue: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    marginBottom: 16,
  },
  pixKeyActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pixKeyActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flex: 0.48,
    justifyContent: 'center',
  },
  pixKeyActionText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    marginLeft: 8,
  },
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  inputSection: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 8,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
    paddingHorizontal: 16,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 24,
    fontWeight: '600',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  inputIcon: {
    marginLeft: 16,
    marginRight: 12,
  },
  input: {
    flex: 1,
    height: 56,
    color: '#fff',
    fontSize: 16,
    paddingRight: 16,
  },
  quickAmountsSection: {
    marginBottom: 24,
  },
  quickAmountsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  quickAmountButton: {
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginBottom: 8,
    width: '30%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  quickAmountText: {
    fontSize: 14,
    color: '#4ECDC4',
    fontWeight: '500',
  },
  generateButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  generateButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  infoContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  infoText: {
    flex: 1,
    fontSize: 14,
    color: '#B0BEC5',
    lineHeight: 20,
    marginLeft: 12,
  },
  
  // QR Code Display Styles
  qrContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  qrCodeWrapper: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  qrCodeImage: {
    width: width * 0.6,
    height: width * 0.6,
  },
  qrInfoContainer: {
    alignItems: 'center',
  },
  qrAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#4ECDC4',
    marginBottom: 8,
  },
  qrDescription: {
    fontSize: 16,
    color: '#fff',
    marginBottom: 8,
    textAlign: 'center',
  },
  qrPixKey: {
    fontSize: 14,
    color: '#B0BEC5',
  },
  actionsContainer: {
    marginBottom: 32,
  },
  actionButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 12,
  },
  actionButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  actionButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  secondaryActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  secondaryActionButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4ECDC4',
    marginLeft: 8,
  },
  instructionsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionText: {
    fontSize: 14,
    color: '#B0BEC5',
    marginLeft: 12,
    lineHeight: 20,
  },
  newQRButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  newQRButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
  },
});