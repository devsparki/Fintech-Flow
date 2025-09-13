import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Alert,
  RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface User {
  id: string;
  email: string;
  full_name: string;
  kyc_status: string;
  phone?: string;
}

interface PIXAccount {
  id: string;
  pix_key: string;
  balance: number;
}

export default function DashboardScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [pixAccount, setPixAccount] = useState<PIXAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (!token || !userData) {
        router.replace('/');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Load PIX account data
      const response = await axios.get(`${BACKEND_URL}/api/pix/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setPixAccount(response.data);
    } catch (error) {
      console.error('Error loading user data:', error);
      // If token is invalid, redirect to login
      router.replace('/');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadUserData();
    setRefreshing(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Sair',
      'Tem certeza que deseja sair da sua conta?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove(['access_token', 'user_data']);
            router.replace('/');
          },
        },
      ]
    );
  };

  const getKYCStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'in_review': return '#2196F3';
      case 'rejected': return '#F44336';
      default: return '#9E9E9E';
    }
  };

  const getKYCStatusText = (status: string) => {
    switch (status) {
      case 'approved': return 'Aprovado';
      case 'pending': return 'Pendente';
      case 'in_review': return 'Em análise';
      case 'rejected': return 'Rejeitado';
      default: return 'Desconhecido';
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1a1a2e" />
      
      <LinearGradient
        colors={['#1a1a2e', '#16213e', '#0f3460']}
        style={styles.gradient}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.userInfo}>
              <Text style={styles.greeting}>Olá,</Text>
              <Text style={styles.userName}>{user?.full_name}</Text>
            </View>
            <TouchableOpacity style={styles.profileButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#fff" />
            </TouchableOpacity>
          </View>

          {/* Balance Card */}
          <View style={styles.balanceCard}>
            <LinearGradient
              colors={['#4ECDC4', '#44B09E']}
              style={styles.balanceGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.balanceHeader}>
                <Text style={styles.balanceLabel}>Saldo disponível</Text>
                <Ionicons name="eye-outline" size={20} color="#fff" />
              </View>
              <Text style={styles.balanceAmount}>
                R$ {pixAccount?.balance?.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) || '0,00'}
              </Text>
              <Text style={styles.pixKey}>PIX: {pixAccount?.pix_key}</Text>
            </LinearGradient>
          </View>

          {/* KYC Status */}
          <View style={styles.kycCard}>
            <View style={styles.kycHeader}>
              <Ionicons name="shield-checkmark" size={24} color={getKYCStatusColor(user?.kyc_status || 'pending')} />
              <Text style={styles.kycTitle}>Status KYC</Text>
            </View>
            <View style={styles.kycStatus}>
              <View 
                style={[
                  styles.kycStatusIndicator, 
                  { backgroundColor: getKYCStatusColor(user?.kyc_status || 'pending') }
                ]} 
              />
              <Text style={styles.kycStatusText}>
                {getKYCStatusText(user?.kyc_status || 'pending')}
              </Text>
            </View>
            {user?.kyc_status === 'pending' && (
              <TouchableOpacity 
                style={styles.kycButton}
                onPress={() => router.push('/kyc/document-upload')}
              >
                <Text style={styles.kycButtonText}>Iniciar verificação</Text>
                <Ionicons name="arrow-forward" size={16} color="#4ECDC4" />
              </TouchableOpacity>
            )}
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <Text style={styles.sectionTitle}>Ações rápidas</Text>
            
            <View style={styles.actionsGrid}>
              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/pix/transfer')}
              >
                <Ionicons name="send" size={28} color="#4ECDC4" />
                <Text style={styles.actionText}>Enviar PIX</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/pix/receive')}
              >
                <Ionicons name="qr-code" size={28} color="#4ECDC4" />
                <Text style={styles.actionText}>Receber PIX</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/cards')}
              >
                <Ionicons name="card" size={28} color="#4ECDC4" />
                <Text style={styles.actionText}>Cartões</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.actionCard}
                onPress={() => router.push('/transactions')}
              >
                <Ionicons name="list" size={28} color="#4ECDC4" />
                <Text style={styles.actionText}>Extrato</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Recent Activity */}
          <View style={styles.activityContainer}>
            <Text style={styles.sectionTitle}>Atividade recente</Text>
            <View style={styles.activityCard}>
              <Ionicons name="time-outline" size={20} color="#B0BEC5" />
              <Text style={styles.activityText}>Nenhuma atividade recente</Text>
            </View>
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
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  loadingText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
  },
  userInfo: {
    flex: 1,
  },
  greeting: {
    fontSize: 16,
    color: '#B0BEC5',
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  balanceCard: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  balanceGradient: {
    padding: 24,
  },
  balanceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  balanceAmount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  pixKey: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.7)',
  },
  kycCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  kycHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 12,
  },
  kycStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  kycStatusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  kycStatusText: {
    fontSize: 16,
    color: '#B0BEC5',
  },
  kycButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#4ECDC4',
  },
  kycButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4ECDC4',
  },
  actionsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 16,
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  actionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  actionText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
  activityContainer: {
    marginBottom: 32,
  },
  activityCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  activityText: {
    fontSize: 16,
    color: '#B0BEC5',
    marginLeft: 12,
  },
});