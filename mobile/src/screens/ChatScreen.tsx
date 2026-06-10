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
  BackHandler
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { StackNavigationProp } from '@react-navigation/stack';
import DateTimePicker from '@react-native-community/datetimepicker';
import { api, getBaseUrl } from '../api/api';
import { BottomTabBar } from '../components/BottomTabBar';
import { useTheme } from '../context/ThemeContext';
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
    category: string;
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

  // States
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
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

  // Handle Android hardware back button to navigate to Dashboard
  useEffect(() => {
    const backAction = () => {
      navigation.navigate('Dashboard');
      return true; // prevent default behavior
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );

    return () => backHandler.remove();
  }, [navigation]);

  const handleCameraPress = () => {
    Alert.alert(
      'Mock Scanner Selector',
      'Choose what to upload and scan:',
      [
        {
          text: 'Scan Receipt (OCR)',
          onPress: () => handleMockScan('receipt'),
        },
        {
          text: 'Mock Photo Scan',
          onPress: () => handleMockScan('item'),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ]
    );
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
    if (!inputText.trim()) return;

    const userMsgId = `user_${Date.now()}`;
    const userQuery = inputText;
    
    const updatedMsgs = [...messages, { id: userMsgId, sender: 'user' as const, text: userQuery }];
    setMessages(updatedMsgs);
    saveHistory(updatedMsgs);
    setInputText('');
    setLoading(true);
    scrollToBottom();

    try {
      const res = await api.post('/api/transactions/ai', { text: userQuery });
      const txnsList = res.data.transactions || [res.data.transaction];
      
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
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
            category: t.category || 'Eating Out/Ordering In',
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
      const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });
      
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

    const combinedDateStr = new Date(`${c.date}T${c.time || '12:00'}:00`).toISOString();
    const tagsArr = c.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
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
            text: c.isCommitted
              ? 'Transaction successfully updated in statement ledger!'
              : 'Transaction successfully committed to statement ledger!',
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
      Alert.alert('Success', c.isCommitted ? 'Transaction updated successfully!' : 'Transaction saved to ledger!');

    } catch (err) {
      console.error(err);
      Alert.alert('Save Failed', 'Could not record the transaction. Check backend connection.');
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardContainer}
      >
        {/* HEADER SECTION */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={[styles.headerBtn, { backgroundColor: colors.inputBackground }]}>
            <ArrowLeftIcon color={colors.text} size={16} />
          </TouchableOpacity>
          
          <View style={[styles.headerBrandGroup, { backgroundColor: isDark ? '#1f4246' : colors.inputBackground }]}>
            <View style={[styles.pulseIndicator, { backgroundColor: isDark ? '#2fb09b' : '#10b981' }]} />
            <Text style={[styles.brandText, { color: colors.text }]}>Passbook AI</Text>
            <ChevronDownIcon color={colors.subText} size={10} />
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Dashboard')} style={[styles.headerBtn, { backgroundColor: colors.inputBackground }]}>
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
                  <View style={[styles.bubbleUser, { backgroundColor: isDark ? '#ffffff' : colors.inputBackground }]}>
                    <Text style={[styles.bubbleUserText, { color: isDark ? '#122325' : colors.text }]}>{m.text}</Text>
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
                    <View style={[styles.bubbleAI, { backgroundColor: colors.card, borderColor: colors.border }]}>
                      <Text style={[styles.bubbleAIText, { color: colors.text }]}>{m.text}</Text>
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
                          onPress={() => handleUpdateField(m.id, 'isMinimized', false)}
                          style={[
                            styles.minimizedCard,
                            {
                              borderLeftColor: m.customizer.type === 'Income'
                                ? '#2fb09b'
                                : m.customizer.type === 'Transfer'
                                ? '#4b5563'
                                : '#ef4444',
                              borderBottomColor: m.customizer.type === 'Income'
                                ? '#2fb09b'
                                : m.customizer.type === 'Transfer'
                                ? '#4b5563'
                                : '#ef4444',
                            }
                          ]}
                        >
                          <View style={styles.minimizedLeft}>
                            <View style={[
                              styles.circleMarker,
                              { backgroundColor: m.customizer.type === 'Income' ? '#d1fae5' : m.customizer.type === 'Transfer' ? '#f3f4f6' : '#fee2e2' }
                            ]}>
                              <Text style={[
                                styles.circleMarkerText,
                                { color: m.customizer.type === 'Income' ? '#059669' : m.customizer.type === 'Transfer' ? '#4b5563' : '#dc2626' }
                              ]}>
                                {m.customizer.type === 'Income' ? '↓' : m.customizer.type === 'Transfer' ? '⇄' : '↑'}
                              </Text>
                            </View>
                            <View style={styles.minimizedMeta}>
                              <Text style={styles.minimizedAmt}>
                                ₹{m.customizer.amount} {m.customizer.type}
                              </Text>
                              <Text style={styles.minimizedDesc} numberOfLines={1}>
                                {m.customizer.type === 'Transfer'
                                  ? `${m.customizer.account} ➔ ${m.customizer.subcategory}`
                                  : `${m.customizer.description || m.customizer.category}`}
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
                            borderLeftColor: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#4b5563' : '#ef4444',
                            borderBottomColor: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#4b5563' : '#ef4444',
                          }
                        ]}>
                          
                          {/* Title description input */}
                          <TextInput
                            style={styles.cardInputTitle}
                            value={m.customizer.description}
                            onChangeText={val => handleUpdateField(m.id, 'description', val)}
                            placeholder="Description..."
                            placeholderTextColor="#94a3b8"
                          />

                          {/* Date and Amount row */}
                          <View style={styles.cardRow}>
                            <View style={styles.col}>
                              <Text style={styles.fieldLabel}>Date</Text>
                              <TouchableOpacity
                                onPress={() => setShowDatePickerId(m.id)}
                                style={styles.inlineDatepickerBtn}
                              >
                                <Text style={styles.inlineDatepickerText}>
                                  {new Date(m.customizer.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                                </Text>
                                <CalendarIcon color="#94a3b8" size={10} />
                              </TouchableOpacity>
                              {showDatePickerId === m.id && (
                                <DateTimePicker
                                  value={new Date(m.customizer.date)}
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
                              <Text style={styles.fieldLabel}>Amount</Text>
                              <View style={styles.amountInputWrap}>
                                <Text style={styles.currencySign}>₹</Text>
                                <TextInput
                                  style={styles.cardInputAmount}
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
                              <Text style={styles.fieldLabel}>Type</Text>
                              <TouchableOpacity
                                onPress={() => setActiveDropdown(activeDropdown === `${m.id}_type` ? null : `${m.id}_type`)}
                                style={styles.dropdownSelectBox}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                  <View style={[
                                    styles.typeSelectCircle,
                                    { backgroundColor: m.customizer.type === 'Income' ? '#e6f7f4' : m.customizer.type === 'Transfer' ? '#f3f4f6' : '#fee2e2' }
                                  ]}>
                                    <Text style={[
                                      styles.typeSelectCircleText,
                                      { color: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#4b5563' : '#ef4444' }
                                    ]}>
                                      {m.customizer.type === 'Income' ? '↓' : m.customizer.type === 'Transfer' ? '⇄' : '↑'}
                                    </Text>
                                  </View>
                                  <Text style={[
                                    styles.dropdownSelectText,
                                    { color: m.customizer.type === 'Income' ? '#2fb09b' : m.customizer.type === 'Transfer' ? '#4b5563' : '#ef4444' }
                                  ]}>
                                    {m.customizer.type}
                                  </Text>
                                </View>
                                <ChevronDownIcon color="#94a3b8" size={10} />
                              </TouchableOpacity>

                              {activeDropdown === `${m.id}_type` && (
                                <View style={styles.dropdownCard}>
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
                                          { backgroundColor: tVal === 'Income' ? '#e6f7f4' : tVal === 'Transfer' ? '#f3f4f6' : '#fee2e2' }
                                        ]}>
                                          <Text style={[
                                            styles.typeSelectCircleText,
                                            { color: tVal === 'Income' ? '#2fb09b' : tVal === 'Transfer' ? '#4b5563' : '#ef4444' }
                                          ]}>
                                            {tVal === 'Income' ? '↓' : tVal === 'Transfer' ? '⇄' : '↑'}
                                          </Text>
                                        </View>
                                        <Text style={styles.dropdownCardText}>{tVal}</Text>
                                      </View>
                                      {m.customizer?.type === tVal && <CheckIcon color="#10b981" size={10} />}
                                    </TouchableOpacity>
                                  ))}
                                </View>
                              )}
                            </View>

                            {/* Category Selector */}
                            <View style={[styles.flex1, { marginLeft: 8 }]}>
                              <Text style={styles.fieldLabel}>Category</Text>
                              <TouchableOpacity
                                onPress={() => setActiveDropdown(activeDropdown === `${m.id}_cat` ? null : `${m.id}_cat`)}
                                style={styles.dropdownSelectBox}
                              >
                                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 4 }}>
                                  <Text style={{ fontSize: 10, marginRight: 4 }}>{getCategoryEmoji(m.customizer.category, m.customizer.type)}</Text>
                                  <Text style={styles.dropdownSelectText} numberOfLines={1}>
                                    {m.customizer.category}
                                  </Text>
                                </View>
                                <ChevronDownIcon color="#94a3b8" size={10} />
                              </TouchableOpacity>

                              {activeDropdown === `${m.id}_cat` && (
                                <View style={[styles.dropdownCard, styles.categoryDropdown]}>
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
                                          <Text style={styles.dropdownCardText} numberOfLines={1}>{c}</Text>
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
                              <Text style={styles.fieldLabel}>Tags</Text>
                              <View style={styles.tagWrap}>
                                {m.customizer.tags.split(',').map(t => t.trim()).filter(Boolean).map((tag, tIdx) => (
                                  <View key={tIdx} style={styles.tagBadge}>
                                    <Text style={styles.tagBadgeText}>{tag}</Text>
                                    <TouchableOpacity onPress={() => handleRemoveTag(m.id, tag)}>
                                      <Text style={styles.removeTagText}>×</Text>
                                    </TouchableOpacity>
                                  </View>
                                ))}

                                {showAddTagInput === m.id ? (
                                  <TextInput
                                    style={styles.addTagInput}
                                    placeholder="Tag..."
                                    placeholderTextColor="#94a3b8"
                                    autoFocus
                                    value={tagInputValue}
                                    onChangeText={setTagInputValue}
                                    onSubmitEditing={() => handleAddTag(m.id)}
                                    onBlur={() => setShowAddTagInput(null)}
                                  />
                                ) : (
                                  <TouchableOpacity
                                    onPress={() => setShowAddTagInput(m.id)}
                                    style={styles.addTagBtn}
                                  >
                                    <Text style={styles.addTagBtnText}>+</Text>
                                  </TouchableOpacity>
                                )}
                              </View>
                            </View>
                          )}

                          {/* Advanced expandable Details */}
                          <View style={styles.advancedDivider}>
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
                                      <Text style={styles.fieldLabel}>From Account</Text>
                                      <TextInput
                                        style={styles.advancedInput}
                                        value={m.customizer.account}
                                        onChangeText={val => handleUpdateField(m.id, 'account', val)}
                                      />
                                    </View>
                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={styles.fieldLabel}>To Account</Text>
                                      <TextInput
                                        style={styles.advancedInput}
                                        value={m.customizer.subcategory}
                                        onChangeText={val => handleUpdateField(m.id, 'subcategory', val)}
                                      />
                                    </View>
                                  </View>
                                ) : (
                                  <View style={styles.cardRow}>
                                    <View style={styles.flex1}>
                                      <Text style={styles.fieldLabel}>Method</Text>
                                      <TouchableOpacity
                                        onPress={() => setActiveDropdown(activeDropdown === `${m.id}_method` ? null : `${m.id}_method`)}
                                        style={styles.advancedSelectBox}
                                      >
                                        <Text style={styles.advancedSelectBoxText} numberOfLines={1}>
                                          {m.customizer.paymentMethod}
                                        </Text>
                                        <ChevronDownIcon color="#94a3b8" size={10} />
                                      </TouchableOpacity>

                                      {activeDropdown === `${m.id}_method` && (
                                        <View style={styles.dropdownCard}>
                                          {['UPI', 'Card', 'Cash', 'Bank Transfer'].map(method => (
                                            <TouchableOpacity
                                              key={method}
                                              onPress={() => {
                                                handleUpdateField(m.id, 'paymentMethod', method);
                                                setActiveDropdown(null);
                                              }}
                                              style={styles.dropdownCardItem}
                                            >
                                              <Text style={styles.dropdownCardText}>{method}</Text>
                                              {m.customizer?.paymentMethod === method && <CheckIcon color="#10b981" size={10} />}
                                            </TouchableOpacity>
                                          ))}
                                        </View>
                                      )}
                                    </View>

                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={styles.fieldLabel}>Account</Text>
                                      <TextInput
                                        style={styles.advancedInput}
                                        value={m.customizer.account}
                                        onChangeText={val => handleUpdateField(m.id, 'account', val)}
                                      />
                                    </View>

                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={styles.fieldLabel}>Time</Text>
                                      <TouchableOpacity
                                        onPress={() => setShowTimePickerId(m.id)}
                                        style={styles.advancedSelectBox}
                                      >
                                        <Text style={styles.advancedSelectBoxText}>{m.customizer.time}</Text>
                                      </TouchableOpacity>

                                      {showTimePickerId === m.id && (
                                        <DateTimePicker
                                          value={new Date(`2000-01-01T${m.customizer.time}:00`)}
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
                                      <Text style={styles.fieldLabel}>Merchant</Text>
                                      <TextInput
                                        style={styles.advancedInput}
                                        value={m.customizer.merchantName}
                                        onChangeText={val => handleUpdateField(m.id, 'merchantName', val)}
                                        placeholder="e.g. Dominos"
                                        placeholderTextColor="#94a3b8"
                                      />
                                    </View>
                                    <View style={[styles.flex1, { marginLeft: 8 }]}>
                                      <Text style={styles.fieldLabel}>Location</Text>
                                      <View style={styles.locationInputWrap}>
                                        <MapPinIcon color="#94a3b8" size={10} />
                                        <TextInput
                                          style={[styles.advancedInput, { flex: 1, paddingLeft: 4, height: 26, borderWidth: 0 }]}
                                          value={m.customizer.location}
                                          onChangeText={val => handleUpdateField(m.id, 'location', val)}
                                          placeholder="e.g. Karimpur"
                                          placeholderTextColor="#94a3b8"
                                        />
                                      </View>
                                    </View>
                                  </View>
                                )}

                                <View>
                                  <Text style={styles.fieldLabel}>Notes Log</Text>
                                  <TextInput
                                    style={styles.notesTextarea}
                                    multiline
                                    numberOfLines={2}
                                    value={m.customizer.note}
                                    onChangeText={val => handleUpdateField(m.id, 'note', val)}
                                    placeholder="Notes..."
                                    placeholderTextColor="#94a3b8"
                                  />
                                </View>

                                {m.customizer.type !== 'Transfer' && (
                                  <View>
                                    <View style={styles.itemsHeader}>
                                      <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                                        Extracted Items ({m.customizer.items.length})
                                      </Text>
                                      <TouchableOpacity onPress={() => handleAddItemRow(m.id)}>
                                        <Text style={styles.addItemText}>+ Add Item</Text>
                                      </TouchableOpacity>
                                    </View>

                                    {m.customizer.items.map((item, itemIdx) => (
                                      <View key={itemIdx} style={styles.itemRow}>
                                        <TextInput
                                          style={styles.itemNameInput}
                                          value={item.name}
                                          onChangeText={val => handleUpdateItem(m.id, itemIdx, 'name', val)}
                                          placeholder="Item name"
                                          placeholderTextColor="#94a3b8"
                                        />
                                        <TextInput
                                          style={styles.itemPriceInput}
                                          keyboardType="numeric"
                                          value={String(item.price)}
                                          onChangeText={val => handleUpdateItem(m.id, itemIdx, 'price', val)}
                                          placeholder="Price"
                                          placeholderTextColor="#94a3b8"
                                        />
                                        <TouchableOpacity onPress={() => handleDeleteItemRow(m.id, itemIdx)}>
                                          <TrashIcon color="#71717a" size={12} />
                                        </TouchableOpacity>
                                      </View>
                                    ))}
                                  </View>
                                )}

                              </View>
                            )}
                          </View>

                          {/* Footer Action Bar */}
                          <View style={styles.cardFooter}>
                            <TouchableOpacity
                              onPress={() => handleUpdateField(m.id, 'favorite', !m.customizer?.favorite)}
                              style={styles.footerBtn}
                            >
                              <StarIcon
                                color={m.customizer.favorite ? '#f59e0b' : '#94a3b8'}
                                size={14}
                                fill={m.customizer.favorite ? '#f59e0b' : 'none'}
                              />
                            </TouchableOpacity>

                            <View style={styles.footerRight}>
                              <TouchableOpacity
                                onPress={() => handleSaveCustomizer(m.id)}
                                style={styles.footerBtn}
                              >
                                <PencilIcon color="#10b981" size={14} />
                              </TouchableOpacity>

                              <TouchableOpacity
                                onPress={() => handleDismissCustomizer(m.id)}
                                style={[styles.footerBtn, { marginLeft: 8 }]}
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
        <View style={[styles.inputBarContainer, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <View style={[styles.inputForm, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
            <View style={styles.scannerActions}>
              {/* Receipt Scan mock button */}
              <TouchableOpacity onPress={handleCameraPress} style={styles.scanBtn}>
                <CameraIcon color="#10b981" size={16} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.inputText, { color: colors.text }]}
              placeholder="Type or describe transaction..."
              placeholderTextColor={colors.subText}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSend}
              editable={!loading}
            />

            <TouchableOpacity
              onPress={handleSend}
              style={[styles.sendBtn, !inputText.trim() && { backgroundColor: colors.border }, inputText.trim() && { backgroundColor: '#10b981' }]}
              disabled={loading || !inputText.trim()}
            >
              <SendIcon color={inputText.trim() ? '#122325' : colors.subText} size={14} />
            </TouchableOpacity>
          </View>

          <View style={styles.inputBarFooter}>
            <Text style={styles.inputBarFooterText}># Ask Passbook AI Assistant</Text>
            <TouchableOpacity onPress={() => handleMockScan('item')} style={styles.quickScanTextBtn}>
              <CameraIcon color="#10b981" size={10} />
              <Text style={styles.quickScanText}>Mock Photo Scan</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* MODULAR BOTTOM TAB BAR */}
        <BottomTabBar activeTab="Chat" />

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
    paddingVertical: 12,
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
    paddingBottom: 24,
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
    backgroundColor: '#ffffff',
    padding: 12,
    borderRadius: 16,
    borderTopRightRadius: 0,
    maxWidth: '85%',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  bubbleUserText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#122325',
    lineHeight: 15,
  },
  aiMessageWrapper: {
    width: '100%',
    maxWidth: '90%',
  },
  bubbleAI: {
    backgroundColor: '#183235',
    padding: 12,
    borderRadius: 16,
    borderTopLeftRadius: 0,
    borderWidth: 1,
    borderColor: '#224448',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
  bubbleAIText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#cbd5e1',
    lineHeight: 15,
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
    borderTopWidth: 1,
    borderTopColor: '#1f4246',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inputForm: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#122325',
    borderWidth: 1,
    borderColor: '#1f4246',
    borderRadius: 16,
    paddingHorizontal: 8,
    height: 40,
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
});
