import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

interface PIXTransaction {
  id: string;
  from_user_id?: string;
  to_user_id?: string;
  from_pix_key?: string;
  to_pix_key: string;
  amount: number;
  description?: string;
  transaction_type: string;
  status: string;
  created_at: string;
  completed_at?: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

export default function TransactionsScreen() {
  const [transactions, setTransactions] = useState<PIXTransaction[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<'all' | 'sent' | 'received'>('all');
  const router = useRouter();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      const userData = await AsyncStorage.getItem('user_data');

      if (!token || !userData) {
        router.replace('/');
        return;
      }

      const parsedUser = JSON.parse(userData);
      setUser(parsedUser);

      // Load PIX transactions
      const response = await axios.get(`${BACKEND_URL}/api/pix/transactions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setTransactions(response.data);
    } catch (error) {
      console.error('Error loading transactions:', error);
      Alert.alert('Erro', 'Erro ao carregar transações');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const getFilteredTransactions = () => {
    if (!user) return transactions;

    switch (filter) {
      case 'sent':
        return transactions.filter(t => t.from_user_id === user.id);
      case 'received':
        return transactions.filter(t => t.to_user_id === user.id);
      default:
        return transactions;
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTransactionIcon = (transaction: PIXTransaction) => {
    if (!user) return 'swap-horizontal';
    
    if (transaction.from_user_id === user.id) {
      return 'arrow-up';
    } else {
      return 'arrow-down';
    }
  };

  const getTransactionColor = (transaction: PIXTransaction) => {
    if (!user) return '#4ECDC4';
    
    if (transaction.from_user_id === user.id) {
      return '#F44336'; // Red for sent
    } else {
      return '#4CAF50'; // Green for received
    }
  };

  const getTransactionType = (transaction: PIXTransaction) => {
    if (!user) return 'Transação';
    
    if (transaction.from_user_id === user.id) {
      return 'Enviado';
    } else {
      return 'Recebido';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return '#4CAF50';
      case 'pending': return '#FF9800';
      case 'failed': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed': return 'Concluído';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const filteredTransactions = getFilteredTransactions();

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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Extrato</Text>
            <Text style={styles.subtitle}>Histórico de transações PIX</Text>
          </View>

          {/* Filter Buttons */}
          <View style={styles.filterContainer}>
            <TouchableOpacity
              style={[styles.filterButton, filter === 'all' && styles.filterButtonActive]}
              onPress={() => setFilter('all')}
            >
              <Text style={[styles.filterButtonText, filter === 'all' && styles.filterButtonTextActive]}>
                Todas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filter === 'sent' && styles.filterButtonActive]}
              onPress={() => setFilter('sent')}
            >
              <Text style={[styles.filterButtonText, filter === 'sent' && styles.filterButtonTextActive]}>
                Enviadas
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.filterButton, filter === 'received' && styles.filterButtonActive]}
              onPress={() => setFilter('received')}
            >
              <Text style={[styles.filterButtonText, filter === 'received' && styles.filterButtonTextActive]}>
                Recebidas
              </Text>
            </TouchableOpacity>
          </View>

          {/* Transactions List */}
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="receipt-outline" size={64} color="#4ECDC4" />
              <Text style={styles.emptyTitle}>Nenhuma transação encontrada</Text>
              <Text style={styles.emptyDescription}>
                {filter === 'all' 
                  ? 'Você ainda não fez nenhuma transação PIX'
                  : `Você não tem transações ${filter === 'sent' ? 'enviadas' : 'recebidas'}`
                }
              </Text>
            </View>
          ) : (
            <View style={styles.transactionsContainer}>
              <Text style={styles.sectionTitle}>
                {filteredTransactions.length} transação{filteredTransactions.length !== 1 ? 'ões' : ''}
              </Text>
              
              {filteredTransactions.map((transaction) => (
                <View key={transaction.id} style={styles.transactionCard}>
                  <View style={styles.transactionHeader}>
                    <View style={styles.transactionInfo}>
                      <View 
                        style={[
                          styles.transactionIcon, 
                          { backgroundColor: getTransactionColor(transaction) + '20' }
                        ]}
                      >
                        <Ionicons 
                          name={getTransactionIcon(transaction)} 
                          size={20} 
                          color={getTransactionColor(transaction)} 
                        />
                      </View>
                      
                      <View style={styles.transactionDetails}>
                        <Text style={styles.transactionType}>
                          PIX {getTransactionType(transaction)}
                        </Text>
                        <Text style={styles.transactionDate}>
                          {formatDate(transaction.created_at)}
                        </Text>
                        {transaction.description && (
                          <Text style={styles.transactionDescription}>
                            {transaction.description}
                          </Text>
                        )}
                      </View>
                    </View>
                    
                    <View style={styles.transactionAmount}>
                      <Text 
                        style={[
                          styles.transactionValue,
                          { color: getTransactionColor(transaction) }
                        ]}
                      >
                        {transaction.from_user_id === user?.id ? '-' : '+'}R$ {transaction.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                      
                      <View style={styles.statusContainer}>
                        <View 
                          style={[
                            styles.statusIndicator, 
                            { backgroundColor: getStatusColor(transaction.status) }
                          ]} 
                        />
                        <Text style={styles.statusText}>
                          {getStatusText(transaction.status)}
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Transaction Keys */}
                  <View style={styles.transactionKeys}>
                    {transaction.from_pix_key && (
                      <View style={styles.keyItem}>
                        <Text style={styles.keyLabel}>De:</Text>
                        <Text style={styles.keyValue}>{transaction.from_pix_key}</Text>
                      </View>
                    )}
                    
                    <View style={styles.keyItem}>
                      <Text style={styles.keyLabel}>Para:</Text>
                      <Text style={styles.keyValue}>{transaction.to_pix_key}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Quick Actions */}
          <View style={styles.quickActionsContainer}>
            <Text style={styles.sectionTitle}>Ações rápidas</Text>
            
            <View style={styles.quickActionsGrid}>
              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => router.push('/pix/transfer')}
              >
                <Ionicons name="send" size={24} color="#4ECDC4" />
                <Text style={styles.quickActionText}>Enviar PIX</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={styles.quickActionCard}
                onPress={() => router.push('/pix/receive')}
              >
                <Ionicons name="qr-code" size={24} color="#4ECDC4" />
                <Text style={styles.quickActionText}>Receber PIX</Text>
              </TouchableOpacity>
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
    paddingBottom: 32,
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
  filterContainer: {
    flexDirection: 'row',
    marginBottom: 24,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
  },
  filterButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  filterButtonActive: {
    backgroundColor: '#4ECDC4',
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#B0BEC5',
  },
  filterButtonTextActive: {
    color: '#fff',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 16,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 32,
  },
  transactionsContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  transactionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  transactionInfo: {
    flexDirection: 'row',
    flex: 1,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  transactionDetails: {
    flex: 1,
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: '#B0BEC5',
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 12,
    color: '#B0BEC5',
    fontStyle: 'italic',
  },
  transactionAmount: {
    alignItems: 'flex-end',
  },
  transactionValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#B0BEC5',
  },
  transactionKeys: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    paddingTop: 12,
  },
  keyItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  keyLabel: {
    fontSize: 12,
    color: '#B0BEC5',
    width: 40,
  },
  keyValue: {
    fontSize: 12,
    color: '#fff',
    flex: 1,
  },
  quickActionsContainer: {
    marginBottom: 32,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quickActionCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    width: '48%',
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  quickActionText: {
    fontSize: 14,
    color: '#fff',
    marginTop: 8,
    textAlign: 'center',
  },
});