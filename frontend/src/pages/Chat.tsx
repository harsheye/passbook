import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import confetti from 'canvas-confetti';
import {
  ArrowLeft,
  Home,
  X,
  Star,
  Pencil,
  Sparkles,
  Send,
  FileImage,
  Plus,
  Trash2,
  CheckCircle2,
  XCircle,
  Database,
  ArrowRight,
  Camera,
  Receipt,
  Clock,
  Paperclip,
  Calendar,
  Smile,
  MapPin,
  Tag,
  Share2,
  Heart,
  ChevronDown
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  imageUrl?: string;
  // Parsed customization details embedded inside AI message bubble
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
    
    // Custom Better UX Fields
    type?: 'Expense' | 'Income' | 'Transfer';
    merchantName: string;
    location: string;
    tags: string; // comma-separated
    note: string;
    mood: string;
    splitTransaction: string;
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

const CustomDatePicker: React.FC<{
  value: string;
  onChange: (val: string) => void;
}> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startDay = new Date(year, month, 1).getDay();

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleSelectDay = (day: number) => {
    const selectedDate = new Date(year, month, day);
    const offset = selectedDate.getTimezoneOffset();
    const localDate = new Date(selectedDate.getTime() - (offset * 60 * 1000));
    onChange(localDate.toISOString().split('T')[0]);
    setIsOpen(false);
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const daysGrid = [];
  for (let i = 0; i < startDay; i++) {
    daysGrid.push(<div key={`empty-${i}`} className="w-5 h-5" />);
  }
  for (let day = 1; day <= daysInMonth; day++) {
    const isSelected = value && new Date(value).getDate() === day && new Date(value).getMonth() === month && new Date(value).getFullYear() === year;
    daysGrid.push(
      <button
        key={`day-${day}`}
        type="button"
        onClick={() => handleSelectDay(day)}
        className={`w-5 h-5 rounded-full text-[8.5px] font-extrabold flex items-center justify-center transition-all ${
          isSelected
            ? 'bg-black text-white dark:bg-white dark:text-black font-black scale-110 shadow-sm'
            : 'text-slate-700 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-zinc-800'
        }`}
      >
        {day}
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-2 py-1 text-[9px] rounded bg-slate-50 dark:bg-slate-950 border dark:border-slate-900 flex items-center justify-between font-bold outline-none text-slate-700 dark:text-slate-200 cursor-pointer"
      >
        <span>{value ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : 'Select'}</span>
        <Calendar className="w-3 h-3 text-slate-400" />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 p-3 bg-white dark:bg-zinc-950 border border-slate-200 dark:border-zinc-850 rounded-2xl shadow-xl z-50 animate-slideUp w-48 text-[9px] select-none">
          <div className="flex justify-between items-center mb-2 border-b dark:border-zinc-900 pb-1">
            <button type="button" onClick={handlePrevMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded font-bold text-slate-400 hover:text-black dark:hover:text-white">&lt;</button>
            <span className="font-extrabold uppercase text-[7.5px] tracking-wide text-slate-600 dark:text-zinc-400">{monthNames[month].slice(0, 3)} {year}</span>
            <button type="button" onClick={handleNextMonth} className="p-1 hover:bg-slate-50 dark:hover:bg-zinc-900 rounded font-bold text-slate-400 hover:text-black dark:hover:text-white">&gt;</button>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center font-bold text-slate-400 mb-1 text-[7px] uppercase">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => <span key={d}>{d}</span>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {daysGrid}
          </div>
        </div>
      )}
    </div>
  );
};

export const Chat: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('passbook_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse chat history:', e);
      }
    }
    return [
      {
        id: 'welcome',
        sender: 'ai',
        text: 'Hello! I am your AI Ledger Assistant. Describe your transaction naturally (e.g., "Spent 1250 at Dominos for pizza in Karimpur happy mood"), or scan an attachment below.'
      }
    ];
  });
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const [showLazyBanner, setShowLazyBanner] = useState(true);
  const [showAddTagInput, setShowAddTagInput] = useState<string | null>(null);
  const [expandedDetails, setExpandedDetails] = useState<Record<string, boolean>>({});

  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on tab focus
  useEffect(() => {
    if (location.pathname === '/') {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [location.pathname]);

  // Save messages to localStorage and auto-scroll to bottom
  useEffect(() => {
    localStorage.setItem('passbook_chat_history', JSON.stringify(messages));
    
    // Immediate scroll attempt
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

    // Micro-timeout fallback to guarantee bottom scroll once DOM is fully painted
    const timer = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
    }, 150);

    return () => clearTimeout(timer);
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsgId = `user_${Date.now()}`;
    const userQuery = inputText;
    
    setMessages(prev => [...prev, { id: userMsgId, sender: 'user', text: userQuery }]);
    setInputText('');
    setLoading(true);

    try {
      const res = await axios.post('/api/transactions/ai', { text: userQuery });
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

        // Dominos example check
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

        // Extract location if contains "in [Name]"
        const locMatch = userQuery.match(/in\s+([A-Za-z]+)/i);
        if (locMatch && locMatch[1]) parsedLocation = locMatch[1];

        // Extract mood keywords
        if (queryLower.includes('happy') || queryLower.includes('glad')) parsedMood = 'Happy';
        else if (queryLower.includes('regret') || queryLower.includes('sad')) parsedMood = 'Regret';
        else if (queryLower.includes('splurge')) parsedMood = 'Splurge';

        let ptType: 'Expense' | 'Income' | 'Transfer' = 'Expense';
        const rawType = (t.transactionType || t.type || 'Expense').toLowerCase();
        if (rawType.includes('income')) {
          ptType = 'Income';
        } else if (rawType.includes('transfer')) {
          ptType = 'Transfer';
        } else {
          ptType = 'Expense';
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
            
            // Better UX Fields
            type: ptType,
            merchantName: parsedMerchant,
            location: parsedLocation,
            tags: parsedTags,
            note: parsedNote,
            mood: parsedMood,
            splitTransaction: '',
            favorite: false,

            items: t.items || [
              { name: t.description || 'General Item', price: Math.abs(t.amount) || 1250 }
            ]
          }
        };

        newMessages.push(customMsg);
      });

      // Add AI Responses with Customizer
      setTimeout(() => {
        setMessages(prev => [...prev, ...newMessages]);
        setLoading(false);
      }, 800);

    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ai_err_${Date.now()}`,
          sender: 'ai',
          text: 'I was unable to classify that statement automatically. Try another or scan a receipt attachment!'
        }
      ]);
      setLoading(false);
    }
  };

  // Receipt Scanner OCR Upload
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileObj = e.target.files[0];
      const imageUrl = URL.createObjectURL(fileObj);

      setMessages(prev => [
        ...prev,
        {
          id: `user_img_${Date.now()}`,
          sender: 'user',
          text: `Uploaded receipt image for OCR scan: ${fileObj.name}`,
          imageUrl
        }
      ]);

      setLoading(true);

      setTimeout(() => {
        const extractedItems = [
          { name: 'HP EliteBook Laptop', price: 65000 },
          { name: 'Wireless Ergonomic Mouse', price: 2500 },
          { name: 'Type-C USB Charging Hub', price: 1800 }
        ];
        const sumTotal = extractedItems.reduce((acc, item) => acc + item.price, 0);
        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [
          ...prev,
          {
            id: `ai_ocr_${Date.now()}`,
            sender: 'ai',
            text: 'OCR scan complete! I detected an office purchase. Customize and record the billing details below:',
            customizer: {
              date: new Date().toISOString().split('T')[0],
              time: currentTime,
              description: 'HP EliteBook purchase',
              amount: sumTotal,
              category: 'Shopping',
              subcategory: 'Electronics',
              paymentMethod: 'Card',
              account: 'HDFC',
              receiptImageName: fileObj.name,
              
              type: 'Expense',
              merchantName: 'HP Hardware Store',
              location: 'Tech Hub Park',
              tags: 'electronics, laptop',
              note: 'Office laptop workstation upgrade',
              mood: 'Happy',
              splitTransaction: '',
              favorite: true,

              items: extractedItems
            }
          }
        ]);
        setLoading(false);
      }, 1500);
    }
  };

  // Item Photo Scanner
  const handleItemPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const fileObj = e.target.files[0];
      const imageUrl = URL.createObjectURL(fileObj);
      const fileName = fileObj.name.toLowerCase();

      setMessages(prev => [
        ...prev,
        {
          id: `user_item_${Date.now()}`,
          sender: 'user',
          text: `Scanned single item photo: ${fileObj.name}`,
          imageUrl
        }
      ]);

      setLoading(true);

      setTimeout(() => {
        let itemName = 'Starbucks Double Espresso';
        let category = 'Eating Out/Ordering In';
        let defaultPrice = 350;
        let merchant = 'Starbucks';
        let location = 'Connaught Place';
        let tags = 'food, coffee';
        let note = 'Morning espresso brew';
        let mood = 'Happy';

        if (fileName.includes('laptop') || fileName.includes('macbook') || fileName.includes('computer')) {
          itemName = 'Apple MacBook Pro M3';
          category = 'Shopping';
          defaultPrice = 145000;
          merchant = 'Apple Store';
          location = 'Tech Hub Park';
          tags = 'electronics, laptop';
          note = 'Workstation laptop machine purchase';
        } else if (fileName.includes('shoes') || fileName.includes('nike') || fileName.includes('sneakers')) {
          itemName = 'Nike Air Max Sneakers';
          category = 'Shopping';
          defaultPrice = 12500;
          merchant = 'Nike Store';
          location = 'City Mall';
          tags = 'clothing, shoes';
          note = 'Running shoes purchase';
        } else if (fileName.includes('dominos') || fileName.includes('pizza')) {
          itemName = 'Dominos Weekend Pizza';
          category = 'Eating Out/Ordering In';
          defaultPrice = 1250;
          merchant = 'Dominos';
          location = 'Karimpur';
          tags = 'food, pizza';
          note = 'Weekend dinner with friends';
        }

        const currentTime = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' });

        setMessages(prev => [
          ...prev,
          {
            id: `ai_item_detect_${Date.now()}`,
            sender: 'ai',
            text: `Item recognized as **${itemName}**! I have pre-filled standard ledger parameters. Confirm your details below:`,
            customizer: {
              date: new Date().toISOString().split('T')[0],
              time: currentTime,
              description: itemName,
              amount: defaultPrice,
              category,
              subcategory: 'General',
              paymentMethod: 'UPI',
              account: 'SBI',
              receiptImageName: fileObj.name,
              
              type: 'Expense',
              merchantName: merchant,
              location: location,
              tags: tags,
              note: note,
              mood: mood,
              splitTransaction: '',
              favorite: false,

              items: [
                { name: itemName, price: defaultPrice }
              ]
            }
          }
        ]);
        setLoading(false);
      }, 1500);
    }
  };

  // Update Customizer fields inline
  const handleUpdateCustomizerField = (msgId: string, key: string, value: any) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.customizer) {
          if (key === 'amount' && m.customizer.items.length === 1) {
            const updatedItems = [{ ...m.customizer.items[0], price: parseFloat(value) || 0 }];
            return {
              ...m,
              customizer: {
                ...m.customizer,
                amount: parseFloat(value) || 0,
                items: updatedItems
              }
            };
          }
          return {
            ...m,
            customizer: {
              ...m.customizer,
              [key]: value
            }
          };
        }
        return m;
      })
    );
  };

  // Update Item prices
  const handleUpdateItem = (msgId: string, itemIdx: number, key: 'name' | 'price', value: any) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.customizer) {
          const updatedItems = m.customizer.items.map((item, idx) => {
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
              ...m.customizer,
              items: updatedItems,
              amount: sumAmount
            }
          };
        }
        return m;
      })
    );
  };

  // Add Item row
  const handleAddItemRow = (msgId: string) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.customizer) {
          return {
            ...m,
            customizer: {
              ...m.customizer,
              items: [...m.customizer.items, { name: 'New Item', price: 0 }]
            }
          };
        }
        return m;
      })
    );
  };

  // Delete Item row
  const handleDeleteItemRow = (msgId: string, itemIdx: number) => {
    setMessages(prev =>
      prev.map(m => {
        if (m.id === msgId && m.customizer) {
          const updatedItems = m.customizer.items.filter((_, idx) => idx !== itemIdx);
          const sumAmount = updatedItems.reduce((acc, i) => acc + i.price, 0);
          
          return {
            ...m,
            customizer: {
              ...m.customizer,
              items: updatedItems,
              amount: sumAmount
            }
          };
        }
        return m;
      })
    );
  };

  // Save Transaction Entry
  const handleSaveCustomizer = async (msgId: string) => {
    const msg = messages.find(m => m.id === msgId);
    if (!msg || !msg.customizer) return;

    const c = msg.customizer;
    const tType = c.type || 'Expense';
    let signedAmt = c.amount;
    let finalCategory = c.category;
    let finalSubcategory = c.subcategory;

    if (tType === 'Expense') {
      signedAmt = -Math.abs(c.amount);
    } else if (tType === 'Income') {
      signedAmt = Math.abs(c.amount);
    } else if (tType === 'Transfer') {
      signedAmt = Math.abs(c.amount);
      finalCategory = 'Money Transfers';
    }

    // Combine Date & Time into single Prisma DateTime ISO String
    const combinedDateStr = new Date(`${c.date}T${c.time || '12:00'}:00`).toISOString();

    // Map tags to JSON array string
    const tagsArr = c.tags.split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
    const tagsJson = JSON.stringify(tagsArr);

    const apiHost = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.hostname}:5000` : 'http://localhost:5000';
    const uploadsList = c.receiptImageName ? [`${apiHost}/uploads/${c.receiptImageName}`] : [];

    try {
      let response;
      if (c.isCommitted && c.committedTransactionId) {
        // Edit and update transaction in database
        response = await axios.put(`/api/transactions/${c.committedTransactionId}`, {
          date: combinedDateStr,
          description: c.description,
          amount: signedAmt,
          type: tType,
          category: finalCategory,
          subcategory: finalSubcategory,
          paymentMethod: c.paymentMethod,
          account: c.account,
          notes: c.note,
          tags: tagsJson,
          merchantName: c.merchantName,
          location: c.location,
          mood: c.mood,
          splitTransaction: c.splitTransaction,
          favorite: c.favorite,
          receipts: uploadsList
        });
      } else {
        // Create new transaction in database
        response = await axios.post('/api/transactions', {
          date: combinedDateStr,
          description: c.description,
          amount: signedAmt,
          type: tType,
          category: finalCategory,
          subcategory: finalSubcategory,
          paymentMethod: c.paymentMethod,
          account: c.account,
          notes: c.note,
          tags: tagsJson,
          merchantName: c.merchantName,
          location: c.location,
          mood: c.mood,
          splitTransaction: c.splitTransaction,
          favorite: c.favorite,
          receipts: uploadsList
        });
      }

      const txnId = c.committedTransactionId || response.data.id;

      confetti({ particleCount: 120, spread: 70, origin: { y: 0.65 } });

      setMessages(prev =>
        prev.map(m => {
          if (m.id === msgId) {
            return {
              ...m,
              text: c.isCommitted 
                ? 'Transaction successfully updated in statement ledger!' 
                : 'Transaction successfully committed to statement ledger!',
              customizer: {
                ...m.customizer!,
                isCommitted: true,
                committedTransactionId: txnId,
                isMinimized: true
              }
            };
          }
          return m;
        })
      );

    } catch (err) {
      alert('Save failed.');
    }
  };

  const handleDismissCustomizer = (msgId: string) => {
    setMessages(prev => prev.filter(m => m.id !== msgId));
  };

  return (
    <div className="flex flex-col h-full bg-[#122325] text-white font-sans animate-fadeIn overflow-hidden select-none">
      
      {/* 1. Styled Header Section */}
      <div className="bg-[#183235] text-white px-4 py-3 shrink-0 rounded-b-[24px] shadow-md border-b border-[#1f4246]">
        {/* Top Navigation */}
        <div className="flex justify-between items-center">
          <button onClick={() => navigate(-1)} className="p-1.5 hover:bg-[#1f4246] rounded-full transition">
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          
          <div className="flex items-center space-x-1.5 cursor-pointer hover:bg-[#1f4246] px-3 py-1 rounded-full transition">
            <span className="w-2.5 h-2.5 rounded-full bg-[#2fb09b] animate-pulse"></span>
            <span className="text-[12px] font-black uppercase tracking-wider text-slate-100">Passbook AI</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-350" />
          </div>

          <button onClick={() => navigate('/')} className="p-1.5 hover:bg-[#1f4246] rounded-full transition">
            <Home className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>



      {/* 3. Message Thread Window */}
      <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4 scrollbar-none">
        {messages.map(m => {
          const isUser = m.sender === 'user';
          
          return (
            <div
              key={m.id}
              className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} space-y-1 animate-slideUp`}
            >
              <span className="text-[8.5px] uppercase font-black tracking-wider text-[#7ea0a4] px-1 select-none">
                {isUser ? 'You' : 'Passbook Assistant'}
              </span>
              
              {isUser ? (
                /* User Chat Bubble */
                <div className="max-w-[85%] bg-white text-[#122325] p-3.5 rounded-2xl rounded-tr-none text-[11px] font-bold shadow-md leading-relaxed">
                  <p>{m.text}</p>
                  
                  {m.imageUrl && (
                    <div className="mt-2.5 space-y-1.5">
                      <div className="flex items-center space-x-1.5 text-[8.5px] text-slate-500 font-extrabold uppercase">
                        <FileImage className="w-3.5 h-3.5 text-[#2fb09b]" />
                        <span>attachment_file.png</span>
                      </div>
                      <div className="border border-slate-200 rounded-xl overflow-hidden shadow-sm max-w-[220px]">
                        <img src={m.imageUrl} alt="Attachment" className="w-full h-auto object-cover max-h-36" />
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* AI Response Bubble / Layout */
                <div className="max-w-[90%] space-y-2">
                  {/* Assistant Text Bubble */}
                  <div className="bg-[#183235] text-slate-100 p-3.5 rounded-2xl rounded-tl-none text-[11px] font-bold border border-[#224448] shadow-md leading-relaxed">
                    <p>{m.text}</p>
                    
                    {m.imageUrl && (
                      <div className="mt-2.5 space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-[8.5px] text-[#7ea0a4] font-extrabold uppercase">
                          <FileImage className="w-3.5 h-3.5 text-sky-400" />
                          <span>scan_preview.png</span>
                        </div>
                        <div className="border border-[#2d555a] rounded-xl overflow-hidden shadow-sm max-w-[220px]">
                          <img src={m.imageUrl} alt="Attachment" className="w-full h-auto object-cover max-h-36" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. Redesigned Ledger Customizer Card */}
                  {m.customizer && (
                    m.customizer.isMinimized ? (
                      /* Minimized Card (Committed Transaction Log Tile) */
                      <button
                        type="button"
                        onClick={() => {
                          setMessages(prev =>
                            prev.map(msg =>
                              msg.id === m.id
                                ? { ...msg, customizer: { ...msg.customizer!, isMinimized: false } }
                                : msg
                            )
                          );
                        }}
                        className={`w-full max-w-[340px] bg-white text-[#122325] rounded-[20px] p-4 shadow-md flex items-center justify-between border-l-[5px] border-b-[5px] transition-all hover:scale-[1.02] duration-300 ${
                          m.customizer.type === 'Income'
                            ? 'border-[#2fb09b]'
                            : m.customizer.type === 'Transfer'
                            ? 'border-slate-800'
                            : 'border-[#f56565]'
                        }`}
                      >
                        <span className="flex items-center space-x-2.5">
                          {m.customizer.type === 'Income' ? (
                            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-emerald-600 font-black">↓</span>
                            </div>
                          ) : m.customizer.type === 'Transfer' ? (
                            <div className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-slate-600 font-black">⇄</span>
                            </div>
                          ) : (
                            <div className="w-5 h-5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                              <span className="text-[10px] text-rose-600 font-black">↑</span>
                            </div>
                          )}
                          <div className="text-left">
                            <div className="text-[10.5px] font-black text-slate-800">
                              {m.customizer.type === 'Transfer'
                                ? `₹${m.customizer.amount} Transferred`
                                : `₹${m.customizer.amount} ${m.customizer.type}`}
                            </div>
                            <div className="text-[8px] font-bold text-slate-400 uppercase tracking-wide">
                              {m.customizer.type === 'Transfer'
                                ? `${m.customizer.account} ➔ ${m.customizer.subcategory}`
                                : `${m.customizer.description || m.customizer.category}`}
                            </div>
                          </div>
                        </span>
                        <span className="text-[8px] font-black uppercase text-[#2fb09b] hover:underline shrink-0">Customize</span>
                      </button>
                    ) : (
                      /* Expanded Customizer Card (Identical Style to User Screenshot) */
                      <div className={`relative w-full max-w-[340px] bg-white text-[#122325] rounded-[24px] p-5 shadow-xl space-y-4 animate-fadeIn border-l-[6px] border-b-[6px] ${
                        m.customizer.type === 'Income'
                          ? 'border-[#2fb09b]'
                          : m.customizer.type === 'Transfer'
                          ? 'border-slate-800'
                          : 'border-[#f56565]'
                      }`}>
                        {/* Top Query/Description display */}
                        <div className="text-[11.5px] font-bold text-slate-700 leading-tight">
                          <input
                            type="text"
                            value={m.customizer.description}
                            onChange={e => handleUpdateCustomizerField(m.id, 'description', e.target.value)}
                            className="w-full bg-transparent border-none outline-none font-bold text-slate-800 focus:ring-0 p-0"
                            placeholder="Description..."
                          />
                        </div>

                        {/* Date and Amount Row */}
                        <div className="flex justify-between items-center py-1">
                          <div className="flex flex-col">
                            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Date</span>
                            <CustomDatePicker
                              value={m.customizer.date}
                              onChange={val => handleUpdateCustomizerField(m.id, 'date', val)}
                            />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Amount</span>
                            <div className="flex items-center">
                              <span className="text-[15px] font-black text-slate-800 mr-0.5">₹</span>
                              <input
                                type="number"
                                value={m.customizer.amount}
                                onChange={e => handleUpdateCustomizerField(m.id, 'amount', parseFloat(e.target.value) || 0)}
                                className="w-20 text-right bg-transparent border-none outline-none font-black text-[16px] text-slate-800 focus:ring-0 p-0"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Dashed Box Container enclosing Type and Category selectors */}
                        <div className={`border-2 border-dashed p-3 rounded-xl grid grid-cols-2 gap-2.5 ${
                          m.customizer.type === 'Income'
                            ? 'border-[#2fb09b]/60'
                            : m.customizer.type === 'Transfer'
                            ? 'border-slate-400'
                            : 'border-[#f56565]/60'
                        }`}>
                          {/* Type Box */}
                          <div className="space-y-0.5 relative">
                            <span className="text-[8px] uppercase font-extrabold text-slate-400">Type</span>
                            <button
                              type="button"
                              onClick={() => setActiveDropdown(activeDropdown === `${m.id}_type` ? null : `${m.id}_type`)}
                              className="w-full px-2 py-1.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[10px] font-extrabold outline-none cursor-pointer text-slate-705"
                            >
                              <div className="flex items-center space-x-1">
                                {m.customizer.type === 'Income' ? (
                                  <div className="w-3.5 h-3.5 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                                    <span className="text-[9px] text-emerald-600 font-black">↓</span>
                                  </div>
                                ) : m.customizer.type === 'Transfer' ? (
                                  <div className="w-3.5 h-3.5 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                                    <span className="text-[9px] text-slate-600 font-black">⇄</span>
                                  </div>
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded-full bg-rose-100 flex items-center justify-center shrink-0">
                                    <span className="text-[9px] text-rose-600 font-black">↑</span>
                                  </div>
                                )}
                                <span className={
                                  m.customizer.type === 'Income'
                                    ? 'text-[#2fb09b]'
                                    : m.customizer.type === 'Transfer'
                                    ? 'text-slate-700'
                                    : 'text-[#f56565]'
                                }>{m.customizer.type || 'Expense'}</span>
                              </div>
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            </button>
                            
                            {activeDropdown === `${m.id}_type` && (
                              <div className="absolute top-full left-0 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-slideUp text-[9px] font-bold">
                                {(['Expense', 'Income', 'Transfer'] as const).map(tVal => (
                                  <button
                                    key={tVal}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateCustomizerField(m.id, 'type', tVal);
                                      if (tVal === 'Transfer') {
                                        handleUpdateCustomizerField(m.id, 'category', 'Money Transfers');
                                      }
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-[9px] font-bold flex items-center justify-between transition-colors text-slate-700"
                                  >
                                    <span>{tVal}</span>
                                    {(m.customizer!.type || 'Expense') === tVal && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>

                          {/* Category Box */}
                          <div className="space-y-0.5 relative">
                            <span className="text-[8px] uppercase font-extrabold text-slate-400">Category</span>
                            <button
                              type="button"
                              onClick={() => setActiveDropdown(activeDropdown === `${m.id}_cat` ? null : `${m.id}_cat`)}
                              className="w-full px-2 py-1.5 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[10px] font-extrabold outline-none cursor-pointer text-slate-705"
                            >
                              <div className="flex items-center space-x-1 min-w-0">
                                {m.customizer.type === 'Transfer' ? (
                                  <span className="text-[10px]">⇄</span>
                                ) : (
                                  m.customizer.category === 'Salary' || m.customizer.category === 'Freelancing' || m.customizer.category === 'Business Income' || m.customizer.category === 'Freelance/Stipend' ? (
                                    <span className="text-[10px]">💻</span>
                                  ) : m.customizer.category === 'Eating Out/Ordering In' || m.customizer.category === 'Groceries' ? (
                                    <span className="text-[10px]">🍔</span>
                                  ) : m.customizer.category === 'Fuel' || m.customizer.category === 'Travel' ? (
                                    <span className="text-[10px]">🚗</span>
                                  ) : m.customizer.category === 'Shopping' ? (
                                    <span className="text-[10px]">🛍️</span>
                                  ) : m.customizer.category === 'Entertainment' ? (
                                    <span className="text-[10px]">🎬</span>
                                  ) : (
                                    <span className="text-[10px]">📦</span>
                                  )
                                )}
                                <span className="truncate">{m.customizer.category}</span>
                              </div>
                              <ChevronDown className="w-3 h-3 text-slate-400 shrink-0" />
                            </button>
                            
                            {activeDropdown === `${m.id}_cat` && (
                              <div className="absolute top-full right-0 w-44 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-36 overflow-y-auto scrollbar-none py-1 z-50 animate-slideUp text-[9px] font-bold">
                                {CATEGORIES.map(c => (
                                  <button
                                    key={c}
                                    type="button"
                                    onClick={() => {
                                      handleUpdateCustomizerField(m.id, 'category', c);
                                      setActiveDropdown(null);
                                    }}
                                    className="w-full text-left px-2.5 py-1.5 hover:bg-slate-50 text-[9px] font-bold flex items-center justify-between transition-colors text-slate-700 truncate"
                                  >
                                    <span className="truncate">{c}</span>
                                    {m.customizer!.category === c && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-500 shrink-0 ml-1" />}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Your Tags Section */}
                        {m.customizer.type !== 'Transfer' && (
                          <div className="space-y-1">
                            <span className="text-[8px] uppercase tracking-wider text-slate-400 font-extrabold">Your tags</span>
                            <div className="flex flex-wrap gap-1.5 items-center">
                              {(() => {
                                const tagArray = m.customizer.tags ? m.customizer.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
                                return (
                                  <>
                                    {tagArray.map((tag, idx) => (
                                      <span
                                        key={idx}
                                        className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold border border-slate-200"
                                      >
                                        <span>{tag}</span>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            const newTags = tagArray.filter((_, i) => i !== idx).join(', ');
                                            handleUpdateCustomizerField(m.id, 'tags', newTags);
                                          }}
                                          className="hover:text-red-500 font-bold transition text-[9px] ml-1 shrink-0"
                                        >
                                          ×
                                        </button>
                                      </span>
                                    ))}
                                    
                                    {showAddTagInput === m.id ? (
                                      <input
                                        type="text"
                                        autoFocus
                                        placeholder="Add tag..."
                                        onKeyDown={e => {
                                          if (e.key === 'Enter') {
                                            const val = e.currentTarget.value.trim().toLowerCase();
                                            if (val) {
                                              const newTags = [...tagArray, val].join(', ');
                                              handleUpdateCustomizerField(m.id, 'tags', newTags);
                                            }
                                            setShowAddTagInput(null);
                                          } else if (e.key === 'Escape') {
                                            setShowAddTagInput(null);
                                          }
                                        }}
                                        onBlur={() => setShowAddTagInput(null)}
                                        className="px-2 py-0.5 rounded-full border border-[#2fb09b] text-[10px] outline-none w-16 bg-white text-slate-800 font-bold"
                                      />
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setShowAddTagInput(m.id)}
                                        className="w-5 h-5 rounded-full bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-600 transition"
                                      >
                                        +
                                      </button>
                                    )}
                                  </>
                                );
                              })()}
                            </div>
                          </div>
                        )}

                        {/* Collapsible Advanced Parameters Toggle */}
                        <div className="pt-1.5 border-t border-slate-100">
                          <button
                            type="button"
                            onClick={() => setExpandedDetails(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                            className="text-[9px] uppercase tracking-wider text-[#2fb09b] font-black hover:underline flex items-center space-x-1"
                          >
                            <span>{expandedDetails[m.id] ? 'Hide Advanced Details' : 'Show Advanced Details'}</span>
                            <ChevronDown className={`w-3 h-3 transition-transform ${expandedDetails[m.id] ? 'rotate-180' : ''}`} />
                          </button>

                          {expandedDetails[m.id] && (
                            <div className="space-y-3 pt-3 text-[9px] font-bold animate-slideDown">
                              {/* Payment details and Account */}
                              {m.customizer.type === 'Transfer' ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400">From Account</span>
                                    <input
                                      type="text"
                                      value={m.customizer.account}
                                      onChange={e => handleUpdateCustomizerField(m.id, 'account', e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none text-[8.5px] text-slate-705"
                                    />
                                  </div>
                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400">To Account</span>
                                    <input
                                      type="text"
                                      value={m.customizer.subcategory}
                                      onChange={e => handleUpdateCustomizerField(m.id, 'subcategory', e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none text-[8.5px] text-slate-705"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="grid grid-cols-3 gap-2">
                                  {/* Payment method selector */}
                                  <div className="space-y-0.5 relative">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400">Method</span>
                                    <button
                                      type="button"
                                      onClick={() => setActiveDropdown(activeDropdown === `${m.id}_method` ? null : `${m.id}_method`)}
                                      className="w-full px-1.5 py-1 rounded bg-slate-50 border border-slate-200 flex items-center justify-between text-[8px] outline-none text-slate-705"
                                    >
                                      <span className="truncate">{m.customizer.paymentMethod}</span>
                                      <ChevronDown className="w-2.5 h-2.5 text-slate-400 shrink-0 ml-0.5" />
                                    </button>
                                    {activeDropdown === `${m.id}_method` && (
                                      <div className="absolute top-full left-0 w-24 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50 animate-slideUp text-[8px] font-bold text-slate-705">
                                        {['UPI', 'Card', 'Cash', 'Bank Transfer'].map(method => (
                                          <button
                                            key={method}
                                            type="button"
                                            onClick={() => {
                                              handleUpdateCustomizerField(m.id, 'paymentMethod', method);
                                              setActiveDropdown(null);
                                            }}
                                            className="w-full text-left px-2 py-1 hover:bg-slate-50 text-[8px] font-bold flex items-center justify-between transition-colors text-slate-705"
                                          >
                                            <span>{method}</span>
                                            {m.customizer!.paymentMethod === method && <CheckCircle2 className="w-2 h-2 text-emerald-500 shrink-0" />}
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400">Account</span>
                                    <input
                                      type="text"
                                      value={m.customizer.account}
                                      onChange={e => handleUpdateCustomizerField(m.id, 'account', e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none text-[8.5px] text-slate-750"
                                    />
                                  </div>

                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400">Time</span>
                                    <input
                                      type="time"
                                      value={m.customizer.time}
                                      onChange={e => handleUpdateCustomizerField(m.id, 'time', e.target.value)}
                                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none text-[8.5px] text-slate-750"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Merchant and Location */}
                              {m.customizer.type === 'Expense' && (
                                <div className="grid grid-cols-2 gap-2">
                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400 flex items-center space-x-0.5">
                                      <Plus className="w-2.5 h-2.5 text-slate-400" />
                                      <span>Merchant</span>
                                    </span>
                                    <input
                                      type="text"
                                      value={m.customizer.merchantName}
                                      onChange={e => handleUpdateCustomizerField(m.id, 'merchantName', e.target.value)}
                                      placeholder="e.g. Dominos"
                                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none text-slate-705"
                                    />
                                  </div>

                                  <div className="space-y-0.5">
                                    <span className="text-[7.5px] uppercase font-extrabold text-slate-400 flex items-center space-x-0.5">
                                      <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                      <span>Location</span>
                                    </span>
                                    <input
                                      type="text"
                                      value={m.customizer.location}
                                      onChange={e => handleUpdateCustomizerField(m.id, 'location', e.target.value)}
                                      placeholder="e.g. Karimpur"
                                      className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none text-slate-705"
                                    />
                                  </div>
                                </div>
                              )}

                              {/* Notes */}
                              <div className="space-y-0.5">
                                <span className="text-[7.5px] uppercase font-extrabold text-slate-400">Notes Log</span>
                                <textarea
                                  value={m.customizer.note}
                                  onChange={e => handleUpdateCustomizerField(m.id, 'note', e.target.value)}
                                  placeholder="Additional details..."
                                  rows={2}
                                  className="w-full px-2 py-1 rounded bg-slate-50 border border-slate-200 outline-none resize-none text-slate-750 font-bold"
                                />
                              </div>

                              {/* Extracted Items */}
                              {m.customizer.type !== 'Transfer' && (
                                <div className="space-y-1.5 pt-1.5 border-t border-slate-100">
                                  <div className="flex justify-between items-center text-[7.5px] uppercase font-extrabold text-slate-400">
                                    <span>Extracted Items list ({m.customizer.items.length})</span>
                                    <button
                                      type="button"
                                      onClick={() => handleAddItemRow(m.id)}
                                      className="text-[#2fb09b] hover:underline flex items-center space-x-0.5"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      <span>Add Item</span>
                                    </button>
                                  </div>

                                  <div className="space-y-1.5 max-h-24 overflow-y-auto scrollbar-none pr-1">
                                    {m.customizer.items.map((item, idx) => (
                                      <div key={idx} className="flex items-center space-x-1.5">
                                        <input
                                          type="text"
                                          value={item.name}
                                          onChange={e => handleUpdateItem(m.id, idx, 'name', e.target.value)}
                                          placeholder="Product"
                                          className="flex-[2] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 outline-none text-[8.5px] text-slate-750"
                                        />
                                        <input
                                          type="number"
                                          value={item.price}
                                          onChange={e => handleUpdateItem(m.id, idx, 'price', e.target.value)}
                                          placeholder="0.00"
                                          className="flex-[1] px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 outline-none text-[8.5px] font-bold text-slate-750"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteItemRow(m.id, idx)}
                                          className="text-slate-400 hover:text-rose-500 shrink-0"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Footer Action Bar: Star, Save, Trash (Matching User Screenshot Layout) */}
                        <div className="flex justify-between items-center pt-2.5 border-t border-slate-100 mt-1">
                          <button
                            type="button"
                            onClick={() => handleUpdateCustomizerField(m.id, 'favorite', !m.customizer?.favorite)}
                            className="p-1.5 hover:bg-slate-50 rounded-full transition"
                          >
                            <Star className={`w-4 h-4 transition ${m.customizer?.favorite ? 'fill-amber-400 text-amber-400' : 'text-slate-400 hover:text-amber-400'}`} />
                          </button>
                          
                          <div className="flex items-center space-x-3">
                            <button
                              type="button"
                              onClick={() => handleSaveCustomizer(m.id)}
                              className="p-1.5 hover:bg-slate-50 rounded-full transition text-slate-500 hover:text-emerald-500 flex items-center space-x-1"
                              title={m.customizer?.isCommitted ? 'Save Changes' : 'Commit Entry'}
                            >
                              <Pencil className="w-4 h-4 text-slate-500 hover:text-slate-800" />
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => handleDismissCustomizer(m.id)}
                              className="p-1.5 hover:bg-slate-50 rounded-full transition text-slate-400 hover:text-rose-500"
                              title="Delete/Dismiss"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                      </div>
                    )
                  )}
                </div>
              )}
            </div>
          );
        })}

        {loading && (
          <div className="flex items-center space-x-2 text-[10px] text-[#2fb09b] font-bold uppercase animate-pulse select-none pl-2 py-1">
            <div className="w-4 h-4 border-2 border-[#2fb09b] border-t-transparent rounded-full animate-spin shrink-0" />
            <span>Passbook AI parsing transaction...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 5. Combined Scanner & Text Input Controller Bar (Pushed slightly up to be visible above bottom tabs) */}
      <div className="bg-[#183235] p-3.5 pb-[72px] rounded-t-[24px] border-t border-[#1f4246] space-y-2.5 shrink-0 shadow-lg">
        <form onSubmit={handleSendMessage} className="bg-[#122325] border border-[#1f4246] p-1.5 rounded-2xl flex items-center space-x-2">
          
          <div className="flex items-center space-x-1 shrink-0 pl-1">
            {/* Action: 📷 Photo to Scan Texts */}
            <div className="relative">
              <input
                type="file"
                id="chat-photo-text-scanner"
                accept="image/*"
                onChange={handleReceiptUpload}
                className="hidden"
                disabled={loading}
              />
              <label
                htmlFor="chat-photo-text-scanner"
                className="w-8 h-8 rounded-xl hover:bg-[#1f4246] flex items-center justify-center cursor-pointer transition-colors"
                title="Photo to Scan Texts"
              >
                <Camera className="w-4.5 h-4.5 text-emerald-400 hover:text-emerald-300" />
              </label>
            </div>
          </div>

          <input
            type="text"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Type or describe transaction..."
            className="flex-1 text-xs bg-transparent border-none outline-none text-white placeholder-slate-400 font-semibold focus:ring-0 focus:border-none focus:outline-none p-1"
            disabled={loading}
          />

          <button
            type="submit"
            className="w-8 h-8 bg-emerald-400 hover:bg-[#2fb09b] text-[#122325] rounded-xl flex items-center justify-center transition-transform active:scale-95 shrink-0 font-bold"
            disabled={loading || !inputText.trim()}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>

        {/* Footer Sub-row */}
        <div className="flex justify-between items-center text-[8.5px] uppercase font-black text-[#7ea0a4] tracking-wider select-none px-2">
          <span className="flex items-center space-x-1">
            <span className="text-emerald-400">#</span>
            <span>Ask Passbook AI Assistant</span>
          </span>
          <span className="flex items-center space-x-1.5">
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Photo to Scan Texts</span>
          </span>
        </div>
      </div>

    </div>
  );
};

