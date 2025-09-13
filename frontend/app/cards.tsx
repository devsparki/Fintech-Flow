import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;
const { width } = Dimensions.get('window');

interface VirtualCard {
  id: string;
  card_number: string;
  card_holder_name: string;
  cvv: string;
  expiry_date: string;
  status: string;
  daily_limit: number;
  monthly_limit: number;
  daily_spent: number;
  monthly_spent: number;
  created_at: string;
}

interface User {
  kyc_status: string;
}

export default function CardsScreen() {
  const [cards, setCards] = useState<VirtualCard[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCardDetails, setShowCardDetails] = useState<{ [key: string]: boolean }>({});
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

      // Load user's cards
      const response = await axios.get(`${BACKEND_URL}/api/cards`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      setCards(response.data);
    } catch (error) {
      console.error('Error loading cards:', error);
      Alert.alert('Erro', 'Erro ao carregar cartões');
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const createCard = async () => {
    if (user?.kyc_status !== 'approved') {
      Alert.alert(
        'KYC Necessário',
        'Você precisa ter seu KYC aprovado para criar cartões virtuais.',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Fazer KYC',
            onPress: () => router.push('/kyc/document-upload'),
          },
        ]
      );
      return;
    }

    Alert.prompt(
      'Criar Cartão',
      'Digite o nome do portador:',
      async (cardHolderName) => {
        if (!cardHolderName?.trim()) {
          Alert.alert('Erro', 'Nome do portador é obrigatório');
          return;
        }

        try {
          const token = await AsyncStorage.getItem('access_token');
          
          const response = await axios.post(
            `${BACKEND_URL}/api/cards/create`,
            {
              card_holder_name: cardHolderName.trim(),
              daily_limit: 1000,
              monthly_limit: 10000,
            },
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          Alert.alert('Sucesso', 'Cartão virtual criado com sucesso!');
          loadData();
        } catch (error: any) {
          console.error('Error creating card:', error);
          const errorMessage = error.response?.data?.detail || 'Erro ao criar cartão';
          Alert.alert('Erro', errorMessage);
        }
      }
    );
  };

  const toggleCardVisibility = (cardId: string) => {
    setShowCardDetails(prev => ({
      ...prev,
      [cardId]: !prev[cardId]
    }));
  };

  const blockCard = async (cardId: string) => {
    Alert.alert(
      'Bloquear Cartão',
      'Tem certeza que deseja bloquear este cartão?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Bloquear',
          style: 'destructive',
          onPress: async () => {
            try {
              const token = await AsyncStorage.getItem('access_token');
              
              await axios.put(
                `${BACKEND_URL}/api/cards/${cardId}/block`,
                {},
                {
                  headers: { Authorization: `Bearer ${token}` },
                }
              );

              Alert.alert('Sucesso', 'Cartão bloqueado com sucesso!');
              loadData();
            } catch (error: any) {
              console.error('Error blocking card:', error);
              Alert.alert('Erro', 'Erro ao bloquear cartão');
            }
          },
        },
      ]
    );
  };

  const unblockCard = async (cardId: string) => {
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      await axios.put(
        `${BACKEND_URL}/api/cards/${cardId}/unblock`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert('Sucesso', 'Cartão desbloqueado com sucesso!');
      loadData();
    } catch (error: any) {
      console.error('Error unblocking card:', error);
      Alert.alert('Erro', 'Erro ao desbloquear cartão');
    }
  };

  const formatCardNumber = (cardNumber: string, show: boolean = false) => {
    if (show) {
      return cardNumber.replace(/(.{4})/g, '$1 ').trim();
    }
    return '**** **** **** ' + cardNumber.slice(-4);
  };

  const getCardStatusColor = (status: string) => {
    switch (status) {
      case 'active': return '#4CAF50';
      case 'blocked': return '#F44336';
      case 'cancelled': return '#9E9E9E';
      default: return '#9E9E9E';
    }
  };

  const getCardStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Ativo';
      case 'blocked': return 'Bloqueado';
      case 'cancelled': return 'Cancelado';
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
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            
            <Text style={styles.title}>Cartões Virtuais</Text>
            <Text style={styles.subtitle}>Gerencie seus cartões</Text>
          </View>

          {/* Cards List */}
          {cards.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="card-outline" size={64} color="#4ECDC4" />
              <Text style={styles.emptyTitle}>Nenhum cartão encontrado</Text>
              <Text style={styles.emptyDescription}>
                {user?.kyc_status !== 'approved' 
                  ? 'Complete seu KYC para criar cartões virtuais'
                  : 'Crie seu primeiro cartão virtual para fazer compras online'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {cards.map((card) => (
                <View key={card.id} style={styles.cardContainer}>
                  <LinearGradient
                    colors={card.status === 'active' ? ['#4ECDC4', '#44B09E'] : ['#666', '#555']}
                    style={styles.cardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View style={styles.cardBrand}>
                        <Ionicons name="card" size={24} color="#fff" />
                        <Text style={styles.cardBrandText}>Virtual</Text>
                      </View>
                      
                      <View style={styles.cardStatus}>
                        <View 
                          style={[
                            styles.statusIndicator, 
                            { backgroundColor: getCardStatusColor(card.status) }
                          ]} 
                        />
                        <Text style={styles.statusText}>
                          {getCardStatusText(card.status)}
                        </Text>
                      </View>
                    </View>

                    {/* Card Number */}
                    <View style={styles.cardNumberContainer}>
                      <Text style={styles.cardNumber}>
                        {formatCardNumber(card.card_number, showCardDetails[card.id])}
                      </Text>
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => toggleCardVisibility(card.id)}
                      >
                        <Ionicons 
                          name={showCardDetails[card.id] ? "eye-off" : "eye"} 
                          size={20} 
                          color="#fff" 
                        />
                      </TouchableOpacity>  
                    </View>

                    {/* Card Details */}
                    <View style={styles.cardDetails}>
                      <View style={styles.cardDetailItem}>
                        <Text style={styles.cardDetailLabel}>Nome</Text>
                        <Text style={styles.cardDetailValue}>{card.card_holder_name}</Text>
                      </View>
                      
                      <View style={styles.cardDetailItem}>
                        <Text style={styles.cardDetailLabel}>Validade</Text>
                        <Text style={styles.cardDetailValue}>{card.expiry_date}</Text>
                      </View>
                      
                      <View style={styles.cardDetailItem}>
                        <Text style={styles.cardDetailLabel}>CVV</Text>
                        <Text style={styles.cardDetailValue}>
                          {showCardDetails[card.id] ? card.cvv : '***'}
                        </Text>
                      </View>
                    </View>
                  </LinearGradient>

                  {/* Card Actions */}
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/cards/${card.id}/transactions`)}
                    >
                      <Ionicons name="list" size={16} color="#4ECDC4" />
                      <Text style={styles.actionButtonText}>Extrato</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => router.push(`/cards/${card.id}/limits`)}
                    >
                      <Ionicons name="settings" size={16} color="#4ECDC4" />
                      <Text style={styles.actionButtonText}>Limites</Text>
                    </TouchableOpacity>

                    {card.status === 'active' ? (
                      <TouchableOpacity
                        style={[styles.actionButton, styles.dangerButton]}
                        onPress={() => blockCard(card.id)}
                      >
                        <Ionicons name="lock-closed" size={16} color="#F44336" />
                        <Text style={[styles.actionButtonText, styles.dangerText]}>Bloquear</Text>
                      </TouchableOpacity>
                    ) : card.status === 'blocked' ? (
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => unblockCard(card.id)}
                      >
                        <Ionicons name="lock-open" size={16} color="#4ECDC4" />
                        <Text style={styles.actionButtonText}>Desbloquear</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  {/* Card Limits */}
                  <View style={styles.limitsContainer}>
                    <Text style={styles.limitsTitle}>Limites</Text>
                    
                    <View style={styles.limitItem}>
                      <Text style={styles.limitLabel}>Diário</Text>
                      <Text style={styles.limitValue}>
                        R$ {card.daily_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                        R$ {card.daily_limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                    
                    <View style={styles.limitItem}>
                      <Text style={styles.limitLabel}>Mensal</Text>
                      <Text style={styles.limitValue}>
                        R$ {card.monthly_spent.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / 
                        R$ {card.monthly_limit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Create Card Button */}
          <TouchableOpacity
            style={styles.createButton}
            onPress={createCard}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4ECDC4', '#44B09E']}
              style={styles.createButtonGradient}
            >
              <Ionicons name="add" size={24} color="#fff" />
              <Text style={styles.createButtonText}>Criar Novo Cartão</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color="#4ECDC4" />
            <Text style={styles.infoText}>
              Os cartões virtuais são seguros para compras online e podem ser bloqueados a qualquer momento.
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
  cardsContainer: {
    marginBottom: 24,
  },
  cardContainer: {
    marginBottom: 24,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGradient: {
    padding: 24,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cardBrandText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
  },
  cardStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  statusText: {
    fontSize: 14,
    color: '#fff',
    fontWeight: '500',
  },
  cardNumberContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  cardNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
    letterSpacing: 2,
  },
  eyeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardDetailItem: {
    flex: 1,
  },
  cardDetailLabel: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: 4,
  },
  cardDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#4ECDC4',
    marginLeft: 4,
  },
  dangerButton: {
    backgroundColor: 'rgba(244, 67, 54, 0.1)',
    borderColor: 'rgba(244, 67, 54, 0.2)',
  },
  dangerText: {
    color: '#F44336',
  },
  limitsContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 16,
  },
  limitsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 12,
  },
  limitItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  limitLabel: {
    fontSize: 14,
    color: '#B0BEC5',
  },
  limitValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#fff',
  },
  createButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 24,
  },
  createButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  createButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 8,
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
});