import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  Modal,
  FlatList,
  Image,
  BackHandler,
  Keyboard
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, getBaseUrl } from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import { useTheme } from '../context/ThemeContext';
import { useTab } from '../context/TabContext';
import * as ImagePicker from 'expo-image-picker';
import {
  SparklesIcon,
  SendIcon,
  HomeIcon,
  ShieldIcon,
  ArrowLeftIcon,
  ChevronDownIcon,
  CheckIcon,
  StarIcon,
  PencilIcon,
  TrashIcon,
  MapPinIcon,
  CameraIcon,
  CalendarIcon
} from '../components/SvgIcons';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  customizer?: {
    date: string;
    time: string;
    description: string;
    amount: number;
    category: any;
    subcategory: string;
    paymentMethod: string;
    account: string;
    receiptImageName?: string;
    type?: 'Expense' | 'Income' | 'Transfer';
    merchantName: string;
    location: string;
    tags: string;
    note: string;
    favorite: boolean;
    items: { name: string; price: number }[];
    isCommitted?: boolean;
    committedTransactionId?: string;
    isMinimized?: boolean;
  };
}

const CATEGORIES = [
  'Beauty/Wellness',
  'Eating Out/Ordering In',
  'Entertainment',
  'Fitness/Sports',
  'Fuel',
  'Gifts',
  'Groceries',
  'Healthcare',
  'Home Improvement',
  'Loan/EMI Payments',
  'Miscellaneous',
  'Money Transfers',
  'Rent',
  'Shopping',
  'Skill Development',
  'Subscriptions',
  'Travel',
  'Utilities/Bills',
  'Salary',
  'Freelancing',
  'Business Income',
  'Interest',
  'Investment Returns',
  'Bonus',
  'Refund',
  'Cashback',
  'Other Income'
];

const STORAGE_KEY = 'passbook_mobile_chat_history';

const getCategoryEmoji = (category: string, type?: string) => {
  if (type === 'Transfer') return '⇄';
  const c = category.toLowerCase();
  if (c === 'salary' || c === 'freelancing' || c === 'business income' || c.includes('stipend')) return '💻';
  if (c.includes('eating out') || c.includes('ordering in') || c === 'groceries') return '🍔';
  if (c === 'fuel' || c === 'travel') return '🚗';
  if (c === 'shopping') return '🛍️';
  if (c === 'entertainment') return '🎬';
  return '📦';
};

export const ChatScreen: React.FC = () => {
  const navigation = useNavigation<StackNavigationProp<any>>();
  const { isDark, colors } = useTheme();
  const { setActiveTab } = useTab();
  const getFormattedTime = () => {
    const d = new Date();
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  const parseSafeDate = (dStr: any) => {
    if (!dStr) return new Date();
    const parsed = new Date(dStr);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  };
  // States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});
  const [hubAuthModalVisible, setHubAuthModalVisible] = useState(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [hubAuthError, setHubAuthError] = useState('');
  
  // Dropdowns and date/time pickers
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [showDatePickerId, setShowDatePickerId] = useState<string | null>(null);
  const [showTimePickerId, setShowTimePickerId] = useState<string | null>(null);

  // Tag inputs
  const [showAddTagInput, setShowAddTagInput] = useState<string | null>(null);
  const [tagInputValue, setTagInputValue] = useState('');

  const scrollViewRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const handleLayout = (event: any) => {};

  // Handle Android hardware back button to navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      setActiveTab('Home');
      navigation.navigate('MainTab');
      return true; // prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {
    const showSubscription = Keyboard.addListener('keyboardDidShow', () => {
      setKeyboardVisible(true);
    });
    const hideSubscription = Keyboard.addListener('keyboardDidHide', () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  const handleCameraPress = () => {
    Alert.alert(
      'Select Image Source',
      'Choose where to select receipt image:',
      [
        {
          text: 'Camera',
          onPress: handleTakePhoto,
        },
        {
          text: 'Photo Gallery',
          onPress: handleChooseFromGallery,
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
  };

  const handleTakePhoto = async () => {
    try {
      const { status } = await ImagePicker.getCameraPermissionsAsync();
      if (status !== 'granted') {
        const req = await ImagePicker.requestCameraPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert('Permission Denied', 'Camera permission is required to take photos.');
          return;
        }
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Failed to launch camera:', err);
      Alert.alert('Error', 'An error occurred while opening the camera.');
    }
  };

  const handleChooseFromGallery = async () => {
    try {
      const { status } = await ImagePicker.getMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        const req = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (req.status !== 'granted') {
          Alert.alert('Permission Denied', 'Gallery permission is required to pick photos.');
          return;
        }
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error('Failed to launch gallery:', err);
      Alert.alert('Error', 'An error occurred while opening the gallery.');
    }
  };

  // Load chat history
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const saved = await AsyncStorage.getItem(STORAGE_KEY);
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          setMessages([
            {
              id: 'welcome',
              sender: 'ai',
              text: 'Hello! I am your AI Ledger Assistant. Describe your transaction naturally (e.g., "Spent 1250 at Dominos for pizza in Karimpur happy mood"), or scan an attachment below.'
            }
          ]);
        }
      } catch (err) {
        console.error('Failed to load chat history:', err);
      }
    };
    loadHistory();
  }, []);

  // Save chat history
  const saveHistory = async (newMsgs: ChatMessage[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newMsgs));
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  };

  const handleSend = async () => {
    if (!inputText.trim() && !selectedImage) return;

    Keyboard.dismiss();
    inputRef.current?.blur();

    const userMsgId = `user_${Date.now()}`;
    const userQuery = inputText.trim() || 'Scanned uploaded receipt';
    const imageToScan = selectedImage;

    const updatedMsgs = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user' as const,
        text: userQuery,
        imageUrl: imageToScan || undefined
      }
    ];

    setMessages(updatedMsgs);
    saveHistory(updatedMsgs);
    setInputText('');
    setSelectedImage(null);
    setLoading(true);
    scrollToBottom();

    if (imageToScan) {
      // Simulate image OCR Scan
      setTimeout(() => {
        const currentTime = getFormattedTime();
        
        // Generate mock items list based on a standard receipt scan
        const extractedItems = [
          { name: 'Office Stationery Pack', price: 1250 },
          { name: 'Ergonomic Desk Organizer', price: 950 },
          { name: 'Eco-friendly Coffee Tumbler', price: 800 }
        ];
        const sumTotal = extractedItems.reduce((acc, item) => acc + item.price, 0);

        const aiMsg: ChatMessage = {
          id: `ai_ocr_${Date.now()}`,
          sender: 'ai',
          text: 'OCR scan complete! I detected an office supplies purchase. Customize and record the billing details below:',
          customizer: {
            date: new Date().toISOString().split('T')[0],
            time: currentTime,
            description: 'Office supplies purchase',
            amount: sumTotal,
            category: 'Shopping',
            subcategory: 'Stationery',
            paymentMethod: 'Card',
            account: 'HDFC',
            type: 'Expense',
            merchantName: 'Stationery Mart',
            location: 'Sector 5',
            tags: 'office, supplies',
            note: 'Attached receipt image scan',
            favorite: false,
            items: extractedItems
          },
          imageUrl: imageToScan
        };

        const finalMsgs = [...updatedMsgs, aiMsg];
        setMessages(finalMsgs);
        saveHistory(finalMsgs);
        setLoading(false);
        scrollToBottom();
      }, 1500);
    } else {
      // Normal text classification
      try {
        const res = await api.post('/api/transactions/ai', { text: userQuery });
        const txnsList = res.data.transactions || [res.data.transaction];
        
        const currentTime = getFormattedTime();
        const queryLower = userQuery.toLowerCase();

        const newMessages: ChatMessage[] = [];

        txnsList.forEach((t: any, index: number) => {
          let parsedMerchant = t.merchantName || '';
          let parsedLocation = '';
          let parsedMood = 'Neutral';
          let parsedTags = 'food';
          let parsedNote = t.notes || '';

          // Preset checks
          if (queryLower.includes('dominos') || queryLower.includes('pizza')) {
            parsedMerchant = 'Dominos';
            parsedLocation = 'Karimpur';
            parsedMood = 'Happy';
            parsedTags = 'food, pizza';
            parsedNote = 'Weekend dinner with friends';
          } else if (queryLower.includes('starbucks') || queryLower.includes('coffee') || queryLower.includes('cafe')) {
            parsedMerchant = 'Starbucks';
            parsedLocation = 'Connaught Place';
            parsedMood = 'Happy';
            parsedTags = 'food, coffee';
            parsedNote = 'Morning espresso brew';
          }

          const locMatch = userQuery.match(/in\s+([A-Za-z]+)/i);
          if (locMatch && locMatch[1]) parsedLocation = locMatch[1];

          let ptType: 'Expense' | 'Income' | 'Transfer' = 'Expense';
          const rawType = (t.transactionType || t.type || 'Expense').toLowerCase();
          if (rawType.includes('income')) {
            ptType = 'Income';
          } else if (rawType.includes('transfer')) {
            ptType = 'Transfer';
          }

          const customMsg: ChatMessage = {
            id: `ai_${Date.now()}_${index}`,
            sender: 'ai',
            text: txnsList.length > 1
              ? `I detected Category "${t.category}". Confirm, customize, and save this split ledger entry below:`
              : 'I have successfully parsed your sentence. Confirm, customize, and save the ledger entry below:',
            customizer: {
              date: t.date ? t.date.split('T')[0] : new Date().toISOString().split('T')[0],
              time: currentTime,
              description: t.description || 'AI Transaction',
              amount: Math.abs(t.amount) || 1250,
              category: (typeof t.category === 'object' ? t.category.name : t.category) || 'Eating Out/Ordering In',
              subcategory: t.subcategory || 'General',
              paymentMethod: t.paymentMethod || 'UPI',
              account: t.account || 'SBI',
              type: ptType,
              merchantName: parsedMerchant,
              location: parsedLocation,
              tags: parsedTags,
              note: parsedNote,
              favorite: false,
              items: t.items || [
                { name: t.description || 'General Item', price: Math.abs(t.amount) || 1250 }
              ]
            }
          };

          newMessages.push(customMsg);
        });

        setTimeout(() => {
          const finalMsgs = [...updatedMsgs, ...newMessages];
          setMessages(finalMsgs);
          saveHistory(finalMsgs);
          setLoading(false);
          scrollToBottom();
        }, 800);

      } catch (err) {
        const finalMsgs = [
          ...updatedMsgs,
          {
            id: `ai_err_${Date.now()}`,
            sender: 'ai' as const,
            text: 'I was unable to classify that statement automatically. Try another or scan a receipt attachment!'
          }
        ];
        setMessages(finalMsgs);
        saveHistory(finalMsgs);
        setLoading(false);
        scrollToBottom();
      }
    }
  };

  const handleMockScan = (type: 'receipt' | 'item') => {
    const userMsgId = `user_mock_${Date.now()}`;
    const scanText = type === 'receipt' ? 'Uploaded receipt image for OCR scan' : 'Scanned single item photo';
    const mockImgUrl = type === 'receipt' 
      ? 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400' 
      : 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400';
    
    const updatedMsgs = [...messages, { id: userMsgId, sender: 'user' as const, text: scanText, imageUrl: mockImgUrl }];
    setMessages(updatedMsgs);
    setLoading(true);
    scrollToBottom();

    setTimeout(() => {
      const currentTime = getFormattedTime();
      
      let customizerData;
      let text = '';

      if (type === 'receipt') {
        const extractedItems = [
          { name: 'HP EliteBook Laptop', price: 65000 },
          { name: 'Wireless Ergonomic Mouse', price: 2500 },
          { name: 'Type-C USB Charging Hub', price: 1800 }
        ];
        const sumTotal = extractedItems.reduce((acc, item) => acc + item.price, 0);
        
        text = 'OCR scan complete! I detected an office purchase. Customize and record the billing details below:';
        customizerData = {
          date: new Date().toISOString().split('T')[0],
          time: currentTime,
          description: 'HP EliteBook purchase',
          amount: sumTotal,
          category: 'Shopping',
          subcategory: 'Electronics',
          paymentMethod: 'Card',
          account: 'HDFC',
          type: 'Expense' as const,
          merchantName: 'HP Hardware Store',
          location: 'Tech Hub Park',
          tags: 'electronics, laptop',
          note: 'Office laptop workstation upgrade',
          favorite: true,
          items: extractedItems
        };
      } else {
        text = 'Item recognized as **Nike Air Max Sneakers**! I have pre-filled standard ledger parameters. Confirm your details below:';
        customizerData = {
          date: new Date().toISOString().split('T')[0],
          time: currentTime,
          description: 'Nike Air Max Sneakers',
          amount: 12500,
          category: 'Shopping',
          subcategory: 'General',
          paymentMethod: 'UPI',
          account: 'SBI',
          type: 'Expense' as const,
          merchantName: 'Nike Store',
          location: 'City Mall',
          tags: 'clothing, shoes',
          note: 'Running shoes purchase',
          favorite: false,
          items: [{ name: 'Nike Air Max Sneakers', price: 12500 }]
        };
      }

      const aiMsg = {
        id: `ai_ocr_${Date.now()}`,
        sender: 'ai' as const,
        text,
        customizer: customizerData,
        imageUrl: mockImgUrl
      };

      const finalMsgs = [...updatedMsgs, aiMsg];
      setMessages(finalMsgs);
      saveHistory(finalMsgs);
      setLoading(false);
      scrollToBottom();
    }, 1200);
  };

  const handleUpdateField = (msgId: string, key: string, value: any) => {
    const updated = messages.map(m => {
      if (m.id === msgId && m.customizer) {
        const c = m.customizer;
        if (key === 'amount' && c.items.length === 1) {
          const updatedItems = [{ ...c.items[0], price: parseFloat(value) || 0 }];
          return {
            ...m,
            customizer: {
              ...c,
              amount: parseFloat(value) || 0,
              items: updatedItems
            }
          };
        }
        return {
          ...m,
          customizer: {
            ...c,
            [key]: value
          }
        };
      }
      return m;
    });
    setMessages(updated);
  };

  const handleUpdateItem = (msgId: string, itemIdx: number, key: 'name' | 'price', value: any) => {
    const updated = messages.map(m => {
      if (m.id === msgId && m.customizer) {
        const c = m.customizer;
        const updatedItems = c.items.map((item, idx) => {
          if (idx === itemIdx) {
            return {
              ...item,
              [key]: key === 'price' ? parseFloat(value) || 0 : value
            };
          }
          return item;
        });
        const sumAmount = updatedItems.reduce((acc, i) => acc + i.price, 0);
        return {
          ...m,
          customizer: {
            ...c,
            items: updatedItems,
            amount: sumAmount
          }
        };
      }
      return m;
    });
    setMessages(updated);
  };

  const handleAddItemRow = (msgId: string) => {
    const updated = messages.map(m => {
      if (m.id === msgId && m.customizer) {
        const c = m.customizer;
        return {
          ...m,
          customizer: {
            ...c,
            items: [...c.items, { name: 'New Item', price: 0 }]
          }
        };
      }
      return m;
    });
    setMessages(updated);
  };

  const handleDeleteItemRow = (msgId: string, itemIdx: number) => {
    const updated = messages.map(m => {
      if (m.id === msgId && m.customizer) {
        const c = m.customizer;
        const updatedItems = c.items.filter((_, idx) => idx !== itemIdx);
        const sumAmount = updatedItems.reduce((acc, i) => acc + i.price, 0);
        return {
          ...m,
          customizer: {
            ...c,
            items: updatedItems,
            amount: sumAmount
          }
        };
      }
      return m;
    });
    setMessages(updated);
  };

  const handleSaveCustomizer = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !msg.customizer) return;

    const c = msg.customizer;
    const tType = c.type || 'Expense';
    let signedAmt = c.amount;
    let finalCategory = c.category;

    if (tType === 'Expense') {
      signedAmt = -Math.abs(c.amount);
    } else if (tType === 'Income') {
      signedAmt = Math.abs(c.amount);
    } else if (tType === 'Transfer') {
      signedAmt = Math.abs(c.amount);
      finalCategory = 'Money Transfers';
    }

    let combinedDateStr = new Date().toISOString();
    try {
      const parsedDate = new Date(`${c.date}T${c.time || '12:00'}:00`);
      if (!isNaN(parsedDate.getTime())) {
        combinedDateStr = parsedDate.toISOString();
      } else {
        const parts = (c.date || '').split(/[-/]/);
        if (parts.length === 3) {
          if (parts[2].length === 4) {
            const reordered = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T${c.time || '12:00'}:00`);
            if (!isNaN(reordered.getTime())) {
              combinedDateStr = reordered.toISOString();
            }
          }
        }
      }
    } catch (dateErr) {
      console.warn('Date parsing failed, using default:', dateErr);
    }

    const tagsArr = (c.tags || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const tagsJson = JSON.stringify(tagsArr);

    const apiBase = await getBaseUrl();
    const uploadsList = c.receiptImageName ? [`${apiBase}/uploads/${c.receiptImageName}`] : [];

    try {
      let response;
      if (c.isCommitted && c.committedTransactionId) {
        response = await api.put(`/api/transactions/${c.committedTransactionId}`, {
          date: combinedDateStr,
          description: c.description,
          amount: signedAmt,
          type: tType,
          category: finalCategory,
          subcategory: c.subcategory,
          paymentMethod: c.paymentMethod,
          account: c.account,
          notes: c.note,
          tags: tagsJson,
          merchantName: c.merchantName,
          location: c.location,
          favorite: c.favorite,
          receipts: uploadsList
        });
      } else {
        response = await api.post('/api/transactions', {
          date: combinedDateStr,
          description: c.description,
          amount: signedAmt,
          type: tType,
          category: finalCategory,
          subcategory: c.subcategory,
          paymentMethod: c.paymentMethod,
          account: c.account,
          notes: c.note,
          tags: tagsJson,
          merchantName: c.merchantName,
          location: c.location,
          favorite: c.favorite,
          receipts: uploadsList
        });
      }

      const txnId = c.committedTransactionId || response.data.id;

      const updated = messages.map(m => {
        if (m.id === msgId) {
          return {
            ...m,
            customizer: {
              ...c,
              isCommitted: true,
              committedTransactionId: txnId,
              isMinimized: true
            }
          };
        }
        return m;
      });
      setMessages(updated);
      saveHistory(updated);

    } catch (err: any) {
      console.error(err);
      Alert.alert('Save Failed', `Could not record the transaction. Error: ${err.message || err}`);
    }
  };

  const handleDismissCustomizer = (msgId: string) => {
    const updated = messages.filter(m => m.id !== msgId);
    setMessages(updated);
    saveHistory(updated);
  };

  const handleClearHistory = () => {
    Alert.alert(
      'Clear History',
      'Are you sure you want to delete all chat history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            const initial = [
              {
                id: 'welcome',
                sender: 'ai' as const,
                text: 'Hello! I am your AI Ledger Assistant. Describe your transaction naturally (e.g., "Spent 1250 at Dominos for pizza in Karimpur happy mood"), or scan an attachment below.'
              }
            ];
            setMessages(initial);
            saveHistory(initial);
          }
        }
      ]
    );
  };

  const handleAddTag = (msgId: string) => {
    if (!tagInputValue.trim()) return;
    const msg = messages.find(m => m.id === msgId);
    if (msg && msg.customizer) {
      const tagArray = msg.customizer.tags ? msg.customizer.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      if (!tagArray.includes(tagInputValue.trim().toLowerCase())) {
        const newTags = [...tagArray, tagInputValue.trim().toLowerCase()].join(', ');
        handleUpdateField(msgId, 'tags', newTags);
      }
    }
    setTagInputValue('');
    setShowAddTagInput(null);
  };

  const handleRemoveTag = (msgId: string, tagToRemove: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (msg && msg.customizer) {
      const tagArray = msg.customizer.tags ? msg.customizer.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
      const newTags = tagArray.filter(t => t !== tagToRemove).join(', ');
      handleUpdateField(msgId, 'tags', newTags);
    }
  };

  const handleHubPress = () => {
    navigation.navigate('Hub');
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.background} />
      
      {/* Background Blobs for vibrant color backdrop */}
      <View style={[styles.blob1, { backgroundColor: isDark ? 'rgba(139, 92, 246, 0.16)' : 'rgba(139, 92, 246, 0.08)' }]} pointerEvents="none" />
      <View style={[styles.blob2, { backgroundColor: isDark ? 'rgba(6, 182, 212, 0.14)' : 'rgba(6, 182, 212, 0.07)' }]} pointerEvents="none" />
      <View style={[styles.blob3, { backgroundColor: isDark ? 'rgba(244, 63, 94, 0.14)' : 'rgba(244, 63, 94, 0.07)' }]} pointerEvents="none" />
      <View style={[styles.blob4, { backgroundColor: isDark ? 'rgba(245, 158, 11, 0.12)' : 'rgba(245, 158, 11, 0.06)' }]} pointerEvents="none" />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        style={styles.keyboardContainer}
      >
        {/* HEADER SECTION */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, { backgroundColor: colors.inputBackground }]}>
            <ArrowLeftIcon color={colors.text} size={16} />
          </TouchableOpacity>
          
          <View style={[styles.headerBrandGroup, { backgroundColor: isDark ? '#1e1b4b' : '#e0e7ff', borderColor: isDark ? '#4338ca' : '#c7d2fe', borderWidth: 1 }]}>
            <View style={[styles.pulseIndicator, { backgroundColor: '#6366f1' }]} />
            <Text style={[styles.brandText, { color: isDark ? '#e0e7ff' : '#4338ca' }]}>Passbook AI</Text>
            <ChevronDownIcon color={isDark ? '#a5b4fc' : '#6366f1'} size={10} />
          </View>

          <TouchableOpacity
            onPress={() => {
              setActiveTab('Home');
              navigation.navigate('MainTab');
            }}
            style={[styles.headerBtn, { backgroundColor: colors.inputBackground }]}
          >
            <HomeIcon color={colors.text} size={16} />
          </TouchableOpacity>
        </View>

        {/* MESSAGES THREAD */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
          onLayout={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.length > 1 && (
            <TouchableOpacity onPress={handleClearHistory} style={[styles.clearHistoryBtn, { borderColor: colors.border }]}>
              <Text style={[styles.clearHistoryText, { color: colors.subText }]}>Clear Chat History</Text>
            </TouchableOpacity>
          )}

          {messages.map(m => {
            const isUser = m.sender === 'user';
            return (
              <View key={m.id} style={[styles.msgContainer, isUser ? styles.msgUser : styles.msgAI]}>
                <Text style={[styles.senderLabel, { color: colors.subText }]}>
                  {isUser ? 'You' : 'Passbook Assistant'}
                </Text>

                {isUser ? (
                  <View style={[styles.bubbleUser, { backgroundColor: '#4f46e5', shadowColor: '#4f46e5' }]}>
                    <Text style={[styles.bubbleUserText, { color: '#ffffff' }]}>{m.text}</Text>
                    {m.imageUrl && (
                      <View style={[styles.bubbleImageContainer, { borderColor: colors.border, backgroundColor: colors.card }]}>
                        <View style={[styles.attachmentHeader, { borderBottomColor: colors.border }]}>
                          <Text style={[styles.attachmentText, { color: colors.subText }]}>attachment_file.png</Text>
                        </View>
                        <Image source={{ uri: m.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
                      </View>
                    )}
                  </View>
                ) : (
                  <View style={styles.aiMessageWrapper}>
                    <View style={[
                      styles.bubbleAI,
                      {
                        backgroundColor: isDark ? 'rgba(24, 50, 53, 0.95)' : 'rgba(240, 253, 244, 0.95)',
                        borderColor: isDark ? '#10b981' : '#bbf7d0',
                        shadowColor: isDark ? '#10b981' : '#cbd5e1',
                      }
                    ]}>
                      <Text style={[styles.bubbleAIText, { color: isDark ? '#cbd5e1' : '#0f172a' }]}>{m.text}</Text>
                      {m.imageUrl && (
                        <View style={[styles.bubbleImageContainer, { borderColor: colors.border, backgroundColor: colors.background }]}>
                          <View style={[styles.attachmentHeader, { borderBottomColor: colors.border }]}>
                            <Text style={[styles.attachmentText, { color: colors.subText }]}>scan_preview.png</Text>
                          </View>
                          <Image source={{ uri: m.imageUrl }} style={styles.bubbleImage} resizeMode="cover" />
                        </View>
                      )}
                    </View>

                    {/* CUSTOMIZER CARD */}
                    {m.customizer && (
                      m.customizer.isMinimized ? (
                        /* Minimized committed ledger entry view */
                        <TouchableOpacity
                          activeOpacity={0.8}
                          onPress={() => {
                            handleUpdateField(m.id, 'isMinimized', false);
                            scrollToBottom();
                          }}
                          style={[
                            styles.minimizedCard,
                            {
                              backgroundColor: colors.card,
                              borderColor: colors.border,
                              borderLeftColor: m.customizer.type === 'Income'
                                ? '#2fb09b'
                                : m.customizer.type === 'Transfer'
                                ? '#71717a'
                                : '#ef4444',
                              borderBottomColor: m.customizer.type === 'Income'
                                ? '#2fb09b'
                                : m.customizer.type === 'Transfer'
                                ? '#71717a'
                                : '#ef4444',
                            }
                          ]}
                        >
                          <View style={styles.minimizedLeft}>
                            <View style={[
                              styles.circleMarker,
                              { backgroundColor: m.customizer.type === 'Income' ? 'rgba(47,176,155,0.15)' : m.customizer.type === 'Transfer' ? 'rgba(113,113,122,0.15)' : 'rgba(239,68,68,0.15)' }
                            ]}>
                              <Text style={[
                                styles.circleMarkerText,
                                { color: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#71717a' : '#ef4444' }
                              ]}>
                                {m.customizer.type === 'Income' ? '↓' : m.customizer.type === 'Transfer' ? '⇄' : '↑'}
                              </Text>
                            </View>
                            <View style={styles.minimizedMeta}>
                              <Text style={[styles.minimizedAmt, { color: colors.text }]}>
                                ₹{m.customizer.amount} {m.customizer.type}
                              </Text>
                              <Text style={[styles.minimizedDesc, { color: colors.subText }]} numberOfLines={1}>
                                {m.customizer.type === 'Transfer'
                                  ? `${m.customizer.account} ➔ ${m.customizer.subcategory}`
                                  : `${m.customizer.description || (typeof m.customizer.category === 'object' ? m.customizer.category.name : m.customizer.category)}`}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.customizeLink}>Customize</Text>
                        </TouchableOpacity>
                      ) : (
                        /* Expanded details customizer card */
                        <View style={[
                          styles.expandedCard,
                          {
                            backgroundColor: colors.card,
                            borderColor: colors.border,
                            borderLeftColor: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#71717a' : '#ef4444',
                            borderBottomColor: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#71717a' : '#ef4444',
                          }
                        ]}>
                          
                          {/* Title description input */}
                          <TextInput
                            style={[styles.cardInputTitle, { color: colors.text }]}
                            value={m.customizer.description}
                            onChangeText={val => handleUpdateField(m.id, 'description', val)}
                            placeholder="Description..."
                            placeholderTextColor={colors.subText}
                          />

                          {/* Date and Amount row */}
                          <View style={styles.cardRow}>
                            <View style={styles.col}>
                              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Date</Text>
                              <TouchableOpacity
                                onPress={() => setShowDatePickerId(m.id)}
                                style={[styles.inlineDatepickerBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                              >
                                <Text style={[styles.inlineDatepickerText, { color: colors.text }]}>
                                  {parseSafeDate(m.customizer.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </Text>
                                <CalendarIcon color={colors.subText} size={10} />
                              </TouchableOpacity>
                              {showDatePickerId === m.id && (
                                <DateTimePicker
                                  value={parseSafeDate(m.customizer.date)}
                                  mode="date"
                                  display="default"
                                  onChange={(event, date) => {
                                    setShowDatePickerId(null);
                                    if (date) {
                                      handleUpdateField(m.id, 'date', date.toISOString().split('T')[0]);
                                    }
                                  }}
                                />
                              )}
                            </View>
                            
                            <View style={[styles.col, { alignItems: 'flex-end' }]}>
                              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Amount</Text>
                              <View style={styles.amountInputWrap}>
                                <Text style={[styles.currencySign, { color: colors.text }]}>₹</Text>
                                <TextInput
                                  style={[styles.cardInputAmount, { color: colors.text }]}
                                  keyboardType="numeric"
                                  value={String(m.customizer.amount)}
                                  onChangeText={val => handleUpdateField(m.id, 'amount', parseFloat(val) || 0)}
                                />
                              </View>
                            </View>
                          </View>

                          {/* Dashed container enclosing type & category selection */}
                          <View style={[
                            styles.dashedContainer,
                            {
                              borderColor: m.customizer.type === 'Income'
                                ? 'rgba(47,176,155,0.4)'
                                : m.customizer.type === 'Transfer'
                                ? '#cbd5e1'
                                : 'rgba(239,68,68,0.4)',
                            }
                          ]}>
                            {/* Type Selector */}
                            <View style={styles.flex1}>
                              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Type</Text>
                              <TouchableOpacity
                                onPress={() => setActiveDropdown(activeDropdown === `${m.id}_type` ? null : `${m.id}_type`)}
                                style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={[
                                    styles.typeSelectCircle,
                                    { backgroundColor: m.customizer.type === 'Income' ? 'rgba(47,176,155,0.15)' : m.customizer.type === 'Transfer' ? 'rgba(113,113,122,0.15)' : 'rgba(239,68,68,0.15)' }
                                  ]}>
                                    <Text style={[
                                      styles.typeSelectCircleText,
                                      { color: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#71717a' : '#ef4444' }
                                    ]}>
                                      {m.customizer.type === 'Income' ? '↓' : m.customizer.type === 'Transfer' ? '⇄' : '↑'}
                                    </Text>
                                  </View>
                                  <Text style={[
                                    styles.dropdownSelectText,
                                    { color: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#71717a' : '#ef4444' }
                                  ]}>
                                    {m.customizer.type}
                                  </Text>
                                </View>
                                <ChevronDownIcon color={colors.subText} size={10} />
                              </TouchableOpacity>

                              {activeDropdown === `${m.id}_type` && (
                                <View style={[styles.dropdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                  {(['Expense', 'Income', 'Transfer'] as const).map(tVal => (
                                    <TouchableOpacity
                                      key={tVal}
                                      onPress={() => {
                                        handleUpdateField(m.id, 'type', tVal);
                                        if (tVal === 'Transfer') {
                                          handleUpdateField(m.id, 'category', 'Money Transfers');
                                        }
                                        setActiveDropdown(null);
                                      }}
                                      style={styles.dropdownCardItem}
                                    >
                                      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[
                                          styles.typeSelectCircle,
                                          { backgroundColor: tVal === 'Income' ? 'rgba(47,176,155,0.15)' : tVal === 'Transfer' ? 'rgba(113,113,122,0.15)' : 'rgba(239,68,68,0.15)' }
                                        ]}>
                                          <Text style={[
                                            styles.typeSelectCircleText,
                                            { color: tVal === 'Income' ? '#2fb09b' : tVal === 'Transfer' ? '#71717a' : '#ef4444' }
                                          ]}>
                                            {tVal === 'Income' ? '↓' : tVal === 'Transfer' ? '⇄' : '↑'}
                                          </Text>
                                        </View>
                                        <Text style={[styles.dropdownCardText, { color: colors.text }]}>{tVal}</Text>
                                      </View>
                                      {m.customizer?.type === tVal && <CheckIcon color="#10b981" size={10} />}
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                            </View>

                            {/* Category Selector */}
                            <View style={[styles.flex1, { marginLeft: 8 }]}>
                              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Category</Text>
                              <TouchableOpacity
                                onPress={() => setActiveDropdown(activeDropdown === `${m.id}_cat` ? null : `${m.id}_cat`)}
                                style={[styles.dropdownSelectBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4 }}>
                                  <Text style={{ fontSize: 10, marginRight: 4 }}>{getCategoryEmoji(typeof m.customizer.category === 'object' ? m.customizer.category.name : m.customizer.category, m.customizer.type)}</Text>
                                  <Text style={[styles.dropdownSelectText, { color: colors.text }]} numberOfLines={1}>
                                    {typeof m.customizer.category === 'object' ? m.customizer.category.name : m.customizer.category}
                                  </Text>
                                </View>
                                <ChevronDownIcon color={colors.subText} size={10} />
                              </TouchableOpacity>

                              {activeDropdown === `${m.id}_cat` && (
                                <View style={[styles.dropdownCard, styles.categoryDropdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                  <ScrollView nestedScrollEnabled style={{ maxHeight: 120 }}>
                                    {CATEGORIES.map(c => (
                                      <TouchableOpacity
                                        key={c}
                                        onPress={() => {
                                          handleUpdateField(m.id, 'category', c);
                                          setActiveDropdown(null);
                                        }}
                                        style={styles.dropdownCardItem}
                                      >
                                        <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                                          <Text style={{ fontSize: 10, marginRight: 4 }}>{getCategoryEmoji(c, m.customizer?.type)}</Text>
                                          <Text style={[styles.dropdownCardText, { color: colors.text }]} numberOfLines={1}>{c}</Text>
                                        </View>
                                        {m.customizer?.category === c && <CheckIcon color="#10b981" size={10} />}
                                      </TouchableOpacity>
                                    ))}
                                  </ScrollView>
                                </View>
                              )}
                            </View>
                          </View>

                          {/* Tags Section */}
                          {m.customizer.type !== 'Transfer' && (
                            <View style={styles.tagsContainer}>
                              <Text style={[styles.fieldLabel, { color: colors.subText }]}>Tags</Text>
                              <View style={styles.tagWrap}>
                                {m.customizer.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, tIdx) => (
                                  <View key={tIdx} style={[styles.tagBadge, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                    <Text style={[styles.tagBadgeText, { color: colors.text }]}>{tag}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveTag(m.id, tag)}>
                                      <Text style={[styles.removeTagText, { color: colors.subText }]}>×</Text>
                                    </TouchableOpacity>
                                  </View>
                                ))}

                                {showAddTagInput === m.id ? (
                                  <TextInput
                                    style={[styles.addTagInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                    placeholder="Tag..."
                                    placeholderTextColor={colors.subText}
                                    autoFocus
                                    value={tagInputValue}
                                    onChangeText={setTagInputValue}
                                    onSubmitEditing={() => handleAddTag(m.id)}
                                    onBlur={() => setShowAddTagInput(null)}
                                  />
                                ) : (
                                  <TouchableOpacity
                                    onPress={() => setShowAddTagInput(m.id)}
                                    style={[styles.addTagBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                  >
                                    <Text style={[styles.addTagBtnText, { color: colors.text }]}>+</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )}

                          {/* Advanced expandable Details */}
                          <View style={[styles.advancedDivider, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                              onPress={() => setExpandedDetails(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                              style={styles.advancedToggle}
                            >
                              <Text style={styles.advancedToggleText}>
                                {expandedDetails[m.id] ? 'Hide Advanced Details' : 'Show Advanced Details'}
                              </Text>
                              <ChevronDownIcon color="#2fb09b" size={10} />
                            </TouchableOpacity>

                            {expandedDetails[m.id] && (
                              <View style={styles.advancedBlock}>
                                {m.customizer.type === 'Transfer' ? (
                                  <View style={styles.cardRow}>
                                    <View style={styles.flex1}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>From Account</Text>
                                      <TextInput
                                        style={[styles.advancedInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                        value={m.customizer.account}
                                        onChangeText={val => handleUpdateField(m.id, 'account', val)}
                                      />
                                    </View>
                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>To Account</Text>
                                      <TextInput
                                        style={[styles.advancedInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                        value={m.customizer.subcategory}
                                        onChangeText={val => handleUpdateField(m.id, 'subcategory', val)}
                                      />
                                    </View>
                                  </View>
                                ) : (
                                  <View style={styles.cardRow}>
                                    <View style={styles.flex1}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>Method</Text>
                                      <TouchableOpacity
                                        onPress={() => setActiveDropdown(activeDropdown === `${m.id}_method` ? null : `${m.id}_method`)}
                                        style={[styles.advancedSelectBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                      >
                                        <Text style={[styles.advancedSelectBoxText, { color: colors.text }]} numberOfLines={1}>
                                          {m.customizer.paymentMethod}
                                        </Text>
                                        <ChevronDownIcon color={colors.subText} size={10} />
                                      </TouchableOpacity>

                                      {activeDropdown === `${m.id}_method` && (
                                        <View style={[styles.dropdownCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                                          {['UPI', 'Card', 'Cash', 'Bank Transfer'].map(method => (
                                            <TouchableOpacity
                                              key={method}
                                              onPress={() => {
                                                handleUpdateField(m.id, 'paymentMethod', method);
                                                setActiveDropdown(null);
                                              }}
                                              style={styles.dropdownCardItem}
                                            >
                                              <Text style={[styles.dropdownCardText, { color: colors.text }]}>{method}</Text>
                                              {m.customizer?.paymentMethod === method && <CheckIcon color="#10b981" size={10} />}
                                            </TouchableOpacity>
                                          ))}
                                        </View>
                                      )}
                                    </View>

                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>Account</Text>
                                      <TextInput
                                        style={[styles.advancedInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                        value={m.customizer.account}
                                        onChangeText={val => handleUpdateField(m.id, 'account', val)}
                                      />
                                    </View>

                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>Time</Text>
                                      <TouchableOpacity
                                        onPress={() => setShowTimePickerId(m.id)}
                                        style={[styles.advancedSelectBox, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                                      >
                                        <Text style={[styles.advancedSelectBoxText, { color: colors.text }]}>{m.customizer.time}</Text>
                                      </TouchableOpacity>

                                      {showTimePickerId === m.id && (
                                        <DateTimePicker
                                          value={(() => {
                                            const timeParts = (m.customizer.time || '12:00').split(':');
                                            const d = new Date();
                                            d.setHours(parseInt(timeParts[0], 10) || 12);
                                            d.setMinutes(parseInt(timeParts[1], 10) || 0);
                                            d.setSeconds(0);
                                            return d;
                                          })()}
                                          mode="time"
                                          display="default"
                                          is24Hour={true}
                                          onChange={(event, time) => {
                                            setShowTimePickerId(null);
                                            if (time) {
                                              const formattedTime = time.toTimeString().split(' ')[0].slice(0, 5);
                                              handleUpdateField(m.id, 'time', formattedTime);
                                            }
                                          }}
                                        />
                                      )}
                                    </View>
                                  </View>
                                )}

                                {m.customizer.type === 'Expense' && (
                                  <View style={styles.cardRow}>
                                    <View style={styles.flex1}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>Merchant</Text>
                                      <TextInput
                                        style={[styles.advancedInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                        value={m.customizer.merchantName}
                                        onChangeText={val => handleUpdateField(m.id, 'merchantName', val)}
                                        placeholder="e.g. Dominos"
                                        placeholderTextColor={colors.subText}
                                      />
                                    </View>
                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={[styles.fieldLabel, { color: colors.subText }]}>Location</Text>
                                      <View style={[styles.locationInputWrap, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                                        <MapPinIcon color={colors.subText} size={10} />
                                        <TextInput
                                          style={[{ flex: 1, paddingLeft: 4, height: 26, borderWidth: 0, fontSize: 8.5, fontWeight: '700', color: colors.text }]}
                                          value={m.customizer.location}
                                          onChangeText={val => handleUpdateField(m.id, 'location', val)}
                                          placeholder="e.g. Karimpur"
                                          placeholderTextColor={colors.subText}
                                        />
                                      </View>
                                    </View>
                                  </View>
                                )}

                                <View>
                                  <Text style={[styles.fieldLabel, { color: colors.subText }]}>Notes Log</Text>
                                  <TextInput
                                    style={[styles.notesTextarea, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                    multiline
                                    numberOfLines={2}
                                    value={m.customizer.note}
                                    onChangeText={val => handleUpdateField(m.id, 'note', val)}
                                    placeholder="Notes..."
                                    placeholderTextColor={colors.subText}
                                  />
                                </View>

                                {m.customizer.type !== 'Transfer' && (
                                  <View>
                                    <View style={styles.itemsHeader}>
                                      <Text style={[styles.fieldLabel, { marginBottom: 0, color: colors.subText }]}>
                                        Extracted Items ({m.customizer.items.length})
                                      </Text>
                                      <TouchableOpacity onPress={() => handleAddItemRow(m.id)}>
                                        <Text style={styles.addItemText}>+ Add Item</Text>
                                      </TouchableOpacity>
                                    </View>

                                    {m.customizer.items.map((item, itemIdx) => (
                                      <View key={itemIdx} style={styles.itemRow}>
                                        <TextInput
                                          style={[styles.itemNameInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                          value={item.name}
                                          onChangeText={val => handleUpdateItem(m.id, itemIdx, 'name', val)}
                                          placeholder="Item name"
                                          placeholderTextColor={colors.subText}
                                        />
                                        <TextInput
                                          style={[styles.itemPriceInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                                          keyboardType="numeric"
                                          value={String(item.price)}
                                          onChangeText={val => handleUpdateItem(m.id, itemIdx, 'price', val)}
                                          placeholder="Price"
                                          placeholderTextColor={colors.subText}
                                        />
                                        <TouchableOpacity onPress={() => handleDeleteItemRow(m.id, itemIdx)}>
                                          <TrashIcon color={colors.subText} size={12} />
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                  </View>
                                )}

                              </View>
                            )}
                          </View>

                          {/* Footer Action Bar */}
                          <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                              onPress={() => handleUpdateField(m.id, 'favorite', !m.customizer?.favorite)}
                              style={[styles.footerBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                            >
                              <StarIcon
                                color={m.customizer.favorite ? '#f59e0b' : colors.subText}
                                size={14}
                                fill={m.customizer.favorite ? '#f59e0b' : 'none'}
                              />
                            </TouchableOpacity>

                            <View style={styles.footerRight}>
                              <TouchableOpacity
                                onPress={() => handleSaveCustomizer(m.id)}
                                style={[styles.footerBtn, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                              >
                                <CheckIcon color="#10b981" size={14} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDismissCustomizer(m.id)}
                                style={[styles.footerBtn, { marginLeft: 8, backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                              >
                                <TrashIcon color="#ef4444" size={14} />
                              </TouchableOpacity>
                            </View>
                          </View>

                        </View>
                      )
                    )}
                  </View>
                )}
              </View>
            );
          })}

          {loading && (
            <View style={styles.loadingWrapper}>
              <ActivityIndicator size="small" color="#2fb09b" />
              <Text style={styles.loadingText}>Passbook AI parsing transaction...</Text>
            </View>
          )}
        </ScrollView>

        {/* COMBINED SCANNER & TEXT INPUT BAR */}
        <View style={[
          styles.inputBarContainer,
          {
            backgroundColor: isDark ? 'rgba(24, 50, 53, 0.95)' : 'rgba(255, 255, 255, 0.95)',
            borderRadius: 24,
            marginHorizontal: 16,
            marginBottom: 0
          }
        ]}>
          {selectedImage && (
            <View style={[styles.attachmentPreviewBar, { borderColor: colors.border }]}>
              <Image source={{ uri: selectedImage }} style={styles.attachmentPreviewImage} />
              <View style={styles.attachmentPreviewInfo}>
                <Text style={[styles.attachmentPreviewName, { color: colors.text }]} numberOfLines={1}>
                  Selected Receipt Image
                </Text>
                <Text style={[styles.attachmentPreviewSub, { color: colors.subText }]}>
                  Ready to scan & index
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSelectedImage(null)} style={[styles.attachmentCloseBtn, { backgroundColor: colors.border }]}>
                <Text style={{ color: colors.text, fontSize: 10, fontWeight: 'bold' }}>×</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={[styles.inputForm, { backgroundColor: colors.inputBackground }]}>
            <View style={styles.scannerActions}>
              {/* Receipt Scan mock button */}
              <TouchableOpacity onPress={handleCameraPress} style={styles.scanBtn}>
                <CameraIcon color="#10b981" size={16} />
              </TouchableOpacity>
            </View>

            <TextInput
              ref={inputRef}
              style={[styles.inputText, { color: colors.text }]}
              placeholder="Type or describe transaction..."
              placeholderTextColor={colors.subText}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              editable={!loading}
              onFocus={() => setKeyboardVisible(true)}
              onBlur={() => setKeyboardVisible(false)}
            />

            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendBtn,
                !(inputText.trim() || selectedImage) && { backgroundColor: colors.border },
                (inputText.trim() || selectedImage) && { backgroundColor: '#10b981' }
              ]}
              disabled={loading || !(inputText.trim() || selectedImage)}
            >
              <SendIcon color={(inputText.trim() || selectedImage) ? '#122325' : colors.subText} size={14} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputBarFooter}>
            <Text style={[styles.inputBarFooterText, { color: colors.subText }]}># Ask Passbook AI Assistant</Text>
            <TouchableOpacity onPress={() => handleMockScan('item')} style={styles.quickScanTextBtn}>
              <CameraIcon color="#10b981" size={10} />
              <Text style={styles.quickScanText}>Mock Photo Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MODULAR BOTTOM TAB BAR */}
        {!keyboardVisible && <BottomTabBar activeTab="Chat" />}

      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  keyboardContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'android' ? 48 : 36,
    paddingBottom: 12,
    backgroundColor: '#183235',
    borderBottomWidth: 1,
    borderBottomColor: '#1f4246',
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  headerBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1f4246',
  },
  headerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pulseIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2fb09b',
    marginRight: 6,
  },
  brandText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#f8fafc',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
  },
  msgContainer: {
    marginBottom: 16,
    width: '100%',
  },
  msgUser: {
    alignItems: 'flex-end',
  },
  msgAI: {
    alignItems: 'flex-start',
  },
  senderLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#7ea0a4',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  bubbleUser: {
    backgroundColor: '#4f46e5',
    padding: 14,
    borderRadius: 20,
    borderTopRightRadius: 4,
    maxWidth: '85%',
    elevation: 3,
    shadowColor: '#4f46e5',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  bubbleUserText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#ffffff',
    lineHeight: 18,
  },
  aiMessageWrapper: {
    width: '100%',
    maxWidth: '90%',
  },
  bubbleAI: {
    padding: 14,
    borderRadius: 20,
    borderTopLeftRadius: 4,
    borderWidth: 1.5,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  bubbleAIText: {
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  loadingWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 12,
  },
  loadingText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#2fb09b',
    textTransform: 'uppercase',
    marginLeft: 8,
  },
  minimizedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    marginTop: 8,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
  },
  minimizedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  circleMarker: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  circleMarkerText: {
    fontSize: 10,
    fontWeight: '900',
  },
  minimizedMeta: {
    flex: 1,
  },
  minimizedAmt: {
    fontSize: 10,
    fontWeight: '900',
    color: '#1e293b',
  },
  minimizedDesc: {
    fontSize: 8,
    fontWeight: '700',
    color: '#94a3b8',
    textTransform: 'uppercase',
  },
  customizeLink: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2fb09b',
    textTransform: 'uppercase',
  },
  expandedCard: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 6,
    borderBottomWidth: 6,
    marginTop: 8,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cardInputTitle: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#0f172a',
    padding: 0,
    borderWidth: 0,
    marginBottom: 8,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  col: {
    flex: 1,
  },
  flex1: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 7.5,
    fontWeight: '900',
    color: '#94a3b8',
    textTransform: 'uppercase',
    marginBottom: 2,
    letterSpacing: 0.5,
  },
  inlineDatepickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 90,
  },
  inlineDatepickerText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#334155',
  },
  amountInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  currencySign: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
    marginRight: 2,
  },
  cardInputAmount: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1e293b',
    padding: 0,
    borderWidth: 0,
    width: 70,
    textAlign: 'right',
  },
  dashedContainer: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderRadius: 10,
    padding: 8,
    flexDirection: 'row',
    marginBottom: 10,
  },
  dropdownSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  dropdownSelectText: {
    fontSize: 8.5,
    fontWeight: '900',
  },
  dropdownCard: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginTop: 2,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    zIndex: 999,
    paddingVertical: 2,
  },
  categoryDropdown: {
    width: 140,
    right: 0,
    left: undefined,
  },
  dropdownCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  dropdownCardText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#334155',
  },
  tagsContainer: {
    marginBottom: 10,
  },
  tagWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
  tagBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginRight: 6,
    marginBottom: 6,
  },
  tagBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#475569',
  },
  removeTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#94a3b8',
    marginLeft: 4,
  },
  addTagBtn: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#f1f5f9',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  addTagBtnText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748b',
  },
  addTagInput: {
    borderWidth: 1,
    borderColor: '#2fb09b',
    borderRadius: 10,
    height: 20,
    width: 60,
    paddingHorizontal: 6,
    fontSize: 8.5,
    fontWeight: '800',
    color: '#1e293b',
    backgroundColor: '#ffffff',
    marginBottom: 6,
  },
  advancedDivider: {
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
  },
  advancedToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  advancedToggleText: {
    fontSize: 8.5,
    fontWeight: '900',
    color: '#2fb09b',
    marginRight: 4,
    textTransform: 'uppercase',
  },
  advancedBlock: {
    marginTop: 8,
  },
  advancedInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    height: 26,
    paddingHorizontal: 8,
    fontSize: 8.5,
    fontWeight: '700',
    color: '#334155',
  },
  advancedSelectBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    height: 26,
    paddingHorizontal: 8,
  },
  advancedSelectBoxText: {
    fontSize: 8.5,
    fontWeight: '800',
    color: '#334155',
  },
  locationInputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 6,
    height: 26,
  },
  notesTextarea: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 6,
    fontSize: 8.5,
    fontWeight: '700',
    color: '#334155',
    textAlignVertical: 'top',
    height: 40,
    marginTop: 2,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 4,
  },
  addItemText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#2fb09b',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemNameInput: {
    flex: 2,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    height: 24,
    paddingHorizontal: 6,
    fontSize: 8,
    color: '#334155',
  },
  itemPriceInput: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    height: 24,
    paddingHorizontal: 6,
    marginHorizontal: 6,
    fontSize: 8,
    fontWeight: '800',
    color: '#334155',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 8,
    marginTop: 10,
  },
  footerBtn: {
    padding: 6,
    backgroundColor: '#f8fafc',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerRight: {
    flexDirection: 'row',
  },
  inputBarContainer: {
    backgroundColor: '#183235',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 12,
    marginBottom: 0,
    // Flat style (removed borders and shadows)
    borderWidth: 0,
    elevation: 0,
    shadowColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
  },
  inputForm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122325',
    borderRadius: 16,
    paddingHorizontal: 8,
    height: 40,
    // Flat style (no border)
    borderWidth: 0,
  },
  scannerActions: {
    marginRight: 8,
  },
  scanBtn: {
    padding: 4,
  },
  inputText: {
    flex: 1,
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    padding: 0,
  },
  sendBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },
  sendBtnDisabled: {
    backgroundColor: '#1f4246',
  },
  inputBarFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  inputBarFooterText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#7ea0a4',
  },
  quickScanTextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickScanText: {
    fontSize: 8,
    fontWeight: '900',
    color: '#10b981',
    marginLeft: 3,
  },
  bottomTabBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 56,
    backgroundColor: '#09090b',
    borderTopWidth: 1,
    borderTopColor: '#1f4246',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    zIndex: 99,
  },
  tabBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#94a3b8',
    marginTop: 2,
    textTransform: 'uppercase',
  },
  centerTabWrapper: {
    width: 60,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  centerTabBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  headerBrandGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f4246',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
  },
  clearHistoryBtn: {
    alignSelf: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.2)',
    borderRadius: 12,
    paddingVertical: 4,
    paddingHorizontal: 12,
    marginBottom: 16,
  },
  clearHistoryText: {
    color: '#ef4444',
    fontSize: 9,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  bubbleImageContainer: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 12,
    overflow: 'hidden',
    maxWidth: 220,
    backgroundColor: '#f8fafc',
  },
  attachmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  attachmentText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#64748b',
    textTransform: 'uppercase',
  },
  bubbleImage: {
    width: 220,
    height: 120,
  },
  typeSelectCircle: {
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  typeSelectCircleText: {
    fontSize: 8,
    fontWeight: '900',
  },
  blob1: {
    position: 'absolute',
    top: 50,
    left: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    zIndex: -1,
  },
  blob2: {
    position: 'absolute',
    bottom: 180,
    right: -120,
    width: 350,
    height: 350,
    borderRadius: 175,
    zIndex: -1,
  },
  blob3: {
    position: 'absolute',
    top: '40%',
    left: -80,
    width: 200,
    height: 200,
    borderRadius: 100,
    zIndex: -1,
  },
  blob4: {
    position: 'absolute',
    bottom: 50,
    left: '20%',
    width: 250,
    height: 250,
    borderRadius: 125,
    zIndex: -1,
  },
  attachmentPreviewBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderWidth: 1,
    borderRadius: 12,
    padding: 8,
    marginBottom: 8,
  },
  attachmentPreviewImage: {
    width: 36,
    height: 36,
    borderRadius: 8,
    marginRight: 8,
  },
  attachmentPreviewInfo: {
    flex: 1,
  },
  attachmentPreviewName: {
    fontSize: 10,
    fontWeight: '800',
  },
  attachmentPreviewSub: {
    fontSize: 8,
    fontWeight: '600',
  },
  attachmentCloseBtn: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
