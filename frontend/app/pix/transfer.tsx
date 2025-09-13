import React, { useState } from 'react';
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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function PIXTransferScreen() {
  const [recipientKey, setRecipientKey] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [keyType, setKeyType] = useState('email');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const keyTypes = [
    { value: 'email', label: 'E-mail', icon: 'mail', placeholder: 'usuario@exemplo.com' },
    { value: 'phone', label: 'Telefone', icon: 'call', placeholder: '+55 11 99999-9999' },
    { value: 'cpf', label: 'CPF', icon: 'person', placeholder: '123.456.789-00' },
    { value: 'random', label: 'Chave Aleatória', icon: 'key', placeholder: 'abc123-def456-...' },
  ];

  const formatCurrency = (value: string) => {
    // Remove non-numeric characters
    const numericValue = value.replace(/[^0-9]/g, '');
    
    if (numericValue === '') return '';
    
    // Convert to number and divide by 100 to get decimal places
    const number = parseInt(numericValue) / 100;
    
    // Format as Brazilian currency
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

  const validateForm = () => {
    if (!recipientKey.trim()) {
      Alert.alert('Erro', 'Por favor, digite a chave PIX do destinatário');
      return false;
    }

    const amountValue = getAmountValue();
    if (!amountValue || amountValue <= 0) {
      Alert.alert('Erro', 'Por favor, digite um valor válido');
      return false;
    }

    if (amountValue > 10000) {
      Alert.alert('Erro', 'Valor máximo por transação: R$ 10.000,00');
      return false;
    }

    return true;
  };

  const handleTransfer = async () => {
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      const amountValue = getAmountValue();

      const response = await axios.post(
        `${BACKEND_URL}/api/pix/transfer`,
        {
          to_pix_key: recipientKey.trim(),
          amount: amountValue,
          description: description.trim() || null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Transferência Realizada!',
        `PIX de R$ ${amountValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} enviado com sucesso!`,
        [
          {
            text: 'Ver Extrato',
            onPress: () => router.push('/transactions'),
          },
          {
            text: 'Voltar ao Início',
            onPress: () => router.push('/dashboard'),
            style: 'cancel',
          },
        ]
      );
    } catch (error: any) {
      console.error('PIX transfer error:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao realizar transferência';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const getCurrentKeyType = () => {
    return keyTypes.find(type => type.value === keyType) || keyTypes[0];
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
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
              
              <Text style={styles.title}>Enviar PIX</Text>
              <Text style={styles.subtitle}>Transfira dinheiro instantaneamente</Text>
            </View>

            {/* Key Type Selection */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Tipo de Chave PIX</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.keyTypesScroll}>
                {keyTypes.map((type) => (
                  <TouchableOpacity
                    key={type.value}
                    style={[
                      styles.keyTypeCard,
                      keyType === type.value && styles.keyTypeCardSelected,
                    ]}
                    onPress={() => setKeyType(type.value)}
                  >
                    <Ionicons 
                      name={type.icon as any} 
                      size={20} 
                      color={keyType === type.value ? '#4ECDC4' : '#B0BEC5'} 
                    />
                    <Text 
                      style={[
                        styles.keyTypeText,
                        keyType === type.value && styles.keyTypeTextSelected,
                      ]}
                    >
                      {type.label}
                    </Text>
                  </TouchableOpacity>  
                ))}
              </ScrollView>
            </View>

            {/* Recipient Key Input */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Chave PIX do Destinatário</Text>
              <View style={styles.inputContainer}>
                <Ionicons 
                  name={getCurrentKeyType().icon as any} 
                  size={20} 
                  color="#4ECDC4" 
                  style={styles.inputIcon} 
                />
                <TextInput
                  style={styles.input}
                  placeholder={getCurrentKeyType().placeholder}
                  placeholderTextColor="#B0BEC5"
                  value={recipientKey}
                  onChangeText={setRecipientKey}
                  keyboardType={keyType === 'phone' ? 'phone-pad' : 'default'}
                  autoCapitalize="none"
                />
              </View>
            </View>

            {/* Amount Input */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Valor</Text>
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
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Descrição (opcional)</Text>
              <View style={styles.inputContainer}>
                <Ionicons name="text" size={20} color="#4ECDC4" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Digite uma descrição"
                  placeholderTextColor="#B0BEC5"
                  value={description}
                  onChangeText={setDescription}
                  maxLength={100}
                />
              </View>
            </View>

            {/* Quick Amounts */}
            <View style={styles.sectionContainer}>
              <Text style={styles.sectionTitle}>Valores Rápidos</Text>
              <View style={styles.quickAmountsContainer}>
                {[10, 20, 50, 100, 200, 500].map((value) => (
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

            {/* Transfer Summary */}
            {amount && recipientKey && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Resumo da Transferência</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Destinatário:</Text>
                  <Text style={styles.summaryValue}>{recipientKey}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Valor:</Text>
                  <Text style={styles.summaryValueAmount}>R$ {amount}</Text>
                </View>
                {description && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Descrição:</Text>
                    <Text style={styles.summaryValue}>{description}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Transfer Button */}
            <TouchableOpacity
              style={styles.transferButton}
              onPress={handleTransfer}
              disabled={isLoading || !amount || !recipientKey}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  isLoading || !amount || !recipientKey 
                    ? ['#666', '#555'] 
                    : ['#4ECDC4', '#44B09E']
                }
                style={styles.buttonGradient}
              >
                <Text style={styles.transferButtonText}>
                  {isLoading ? 'Processando...' : 'Enviar PIX'}
                </Text>
                {!isLoading && <Ionicons name="send" size={20} color="#fff" />}
              </LinearGradient>
            </TouchableOpacity>

            {/* Security Info */}
            <View style={styles.securityContainer}>
              <Ionicons name="shield-checkmark" size={20} color="#4ECDC4" />
              <Text style={styles.securityText}>
                Transação segura e instantânea. Verifique os dados antes de confirmar.
              </Text>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
  keyboardView: {
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
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  keyTypesScroll: {
    flexDirection: 'row',
  },
  keyTypeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 12,
    minWidth: 80,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  keyTypeCardSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  keyTypeText: {
    fontSize: 12,
    color: '#B0BEC5',
    marginTop: 4,
    textAlign: 'center',
  },
  keyTypeTextSelected: {
    color: '#4ECDC4',
    fontWeight: '500',
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
  summaryContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#B0BEC5',
  },
  summaryValue: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
    flex: 1,
    textAlign: 'right',
  },
  summaryValueAmount: {
    fontSize: 18,
    color: '#4ECDC4',
    fontWeight: 'bold',
  },
  transferButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  buttonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  transferButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginRight: 8,
  },
  securityContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  securityText: {
    flex: 1,
    fontSize: 14,
    color: '#B0BEC5',
    lineHeight: 20,
    marginLeft: 12,
  },
});