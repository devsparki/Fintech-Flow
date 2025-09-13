import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL;

export default function DocumentUploadScreen() {
  const [documentImage, setDocumentImage] = useState<string | null>(null);
  const [selfieImage, setSelfieImage] = useState<string | null>(null);
  const [documentType, setDocumentType] = useState('cpf');
  const [documentNumber, setDocumentNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const documentTypes = [
    { value: 'cpf', label: 'CPF', icon: 'card' },
    { value: 'rg', label: 'RG', icon: 'id-card' },
    { value: 'cnh', label: 'CNH', icon: 'car' },
    { value: 'passport', label: 'Passaporte', icon: 'airplane' },
  ];

  const pickImage = async (type: 'document' | 'selfie') => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à galeria para enviar documentos');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: type === 'selfie' ? [1, 1] : [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        if (type === 'document') {
          setDocumentImage(base64Image);
        } else {
          setSelfieImage(base64Image);
        }
      }
    } catch (error) {
      console.error('Error picking image:', error);
      Alert.alert('Erro', 'Erro ao selecionar imagem');
    }
  };

  const takePhoto = async (type: 'document' | 'selfie') => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permissão necessária', 'Precisamos de acesso à câmera para capturar documentos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: type === 'selfie' ? [1, 1] : [4, 3],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0].base64) {
        const base64Image = `data:image/jpeg;base64,${result.assets[0].base64}`;
        
        if (type === 'document') {
          setDocumentImage(base64Image);
        } else {
          setSelfieImage(base64Image);
        }
      }
    } catch (error) {
      console.error('Error taking photo:', error);
      Alert.alert('Erro', 'Erro ao capturar foto');
    }
  };

  const showImageOptions = (type: 'document' | 'selfie') => {
    const title = type === 'document' ? 'Documento' : 'Selfie';
    Alert.alert(
      `Adicionar ${title}`,
      'Escolha uma opção:',
      [
        { text: 'Câmera', onPress: () => takePhoto(type) },
        { text: 'Galeria', onPress: () => pickImage(type) },
        { text: 'Cancelar', style: 'cancel' },
      ]
    );
  };

  const handleSubmit = async () => {
    if (!documentImage || !selfieImage) {
      Alert.alert('Erro', 'Por favor, adicione o documento e a selfie');
      return;
    }

    if (!documentNumber.trim()) {
      Alert.alert('Erro', 'Por favor, digite o número do documento');
      return;
    }

    setIsLoading(true);
    try {
      const token = await AsyncStorage.getItem('access_token');
      
      const response = await axios.post(
        `${BACKEND_URL}/api/kyc/submit`,
        {
          document_type: documentType,
          document_number: documentNumber.trim(),
          document_image: documentImage,
          selfie_image: selfieImage,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      Alert.alert(
        'Sucesso',
        'Documentos enviados com sucesso! Seu KYC está sendo analisado.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/dashboard'),
          },
        ]
      );
    } catch (error: any) {
      console.error('KYC submission error:', error);
      const errorMessage = error.response?.data?.detail || 'Erro ao enviar documentos';
      Alert.alert('Erro', errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

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
            
            <Text style={styles.title}>Verificação KYC</Text>
            <Text style={styles.subtitle}>Envie seus documentos para verificação</Text>
          </View>

          {/* Document Type Selection */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Tipo de Documento</Text>
            <View style={styles.documentTypesContainer}>
              {documentTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.documentTypeCard,
                    documentType === type.value && styles.documentTypeCardSelected,
                  ]}
                  onPress={() => setDocumentType(type.value)}
                >
                  <Ionicons 
                    name={type.icon as any} 
                    size={24} 
                    color={documentType === type.value ? '#4ECDC4' : '#B0BEC5'} 
                  />
                  <Text 
                    style={[
                      styles.documentTypeText,
                      documentType === type.value && styles.documentTypeTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Document Number Input */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Número do Documento</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Digite o número do documento"
                placeholderTextColor="#B0BEC5"
                value={documentNumber}
                onChangeText={setDocumentNumber}
                keyboardType="default"
              />
            </View>
          </View>

          {/* Document Image */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Foto do Documento</Text>
            <TouchableOpacity
              style={styles.imageUploadCard}
              onPress={() => showImageOptions('document')}
            >
              {documentImage ? (
                <Image source={{ uri: documentImage }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.imageUploadContent}>
                  <Ionicons name="camera" size={48} color="#4ECDC4" />
                  <Text style={styles.imageUploadText}>Adicionar Foto do Documento</Text>
                  <Text style={styles.imageUploadSubtext}>Toque para tirar foto ou selecionar da galeria</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Selfie */}
          <View style={styles.sectionContainer}>
            <Text style={styles.sectionTitle}>Selfie</Text>
            <TouchableOpacity
              style={styles.imageUploadCard}
              onPress={() => showImageOptions('selfie')}
            >
              {selfieImage ? (
                <Image source={{ uri: selfieImage }} style={styles.uploadedImage} />
              ) : (
                <View style={styles.imageUploadContent}>
                  <Ionicons name="person" size={48} color="#4ECDC4" />
                  <Text style={styles.imageUploadText}>Adicionar Selfie</Text>
                  <Text style={styles.imageUploadSubtext}>Tire uma selfie segurando o documento</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Submit Button */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['#4ECDC4', '#44B09E']}
              style={styles.buttonGradient}
            >
              <Text style={styles.submitButtonText}>
                {isLoading ? 'Enviando...' : 'Enviar Documentos'}
              </Text>
              {!isLoading && <Ionicons name="arrow-forward" size={20} color="#fff" />}
            </LinearGradient>
          </TouchableOpacity>

          {/* Information */}
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle" size={20} color="#4ECDC4" />
            <Text style={styles.infoText}>
              Seus documentos serão analisados em até 24 horas. Certifique-se de que as imagens estejam nítidas e legíveis.
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
  sectionContainer: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',
    marginBottom: 16,
  },
  documentTypesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  documentTypeCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    width: '48%',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  documentTypeCardSelected: {
    borderColor: '#4ECDC4',
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  documentTypeText: {
    fontSize: 14,
    color: '#B0BEC5',
    marginTop: 8,
    textAlign: 'center',
  },
  documentTypeTextSelected: {
    color: '#4ECDC4',
    fontWeight: '500',
  },
  inputContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(78, 205, 196, 0.2)',
  },
  input: {
    height: 56,
    color: '#fff',
    fontSize: 16,
    paddingHorizontal: 16,
  },
  imageUploadCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: 'rgba(78, 205, 196, 0.3)',
    borderStyle: 'dashed',
    overflow: 'hidden',
  },
  imageUploadContent: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  imageUploadText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#fff',
    marginTop: 12,
    marginBottom: 4,
  },
  imageUploadSubtext: {
    fontSize: 14,
    color: '#B0BEC5',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadedImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  submitButton: {
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
  submitButtonText: {
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
});