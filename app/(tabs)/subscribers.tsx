// استيرادات React الأساسية
import React, { useEffect, useMemo, useRef, useState } from 'react';
// مكونات React Native للواجهة والأنيميشن
import { Alert, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, Share, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
// هوك للتحقق من حالة التركيز على الصفحة والتنقل
import { useIsFocused, useNavigation } from '@react-navigation/native';
// مكتبة الأيقونات
import { Ionicons } from '@expo/vector-icons';
// مكتبة التدرجات اللونية
import { LinearGradient } from 'expo-linear-gradient';
import * as Print from 'expo-print';
// مكتبة تأثير الضباب/الشفافية
import { BlurView } from 'expo-blur';
// مكتبة اختيار التاريخ
import DateTimePicker from '@react-native-community/datetimepicker';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
// هوك نظام الثيم
import OfferPicker from '../../components/OfferPicker';
import ScreenBackground from '../../components/ScreenBackground';
import { addUserOffer, getUserOffers } from '../../src/database/offersDb';
import { onSyncComplete } from '../../src/database/syncEngine';
import SubscriberDetailsModal from '../../components/SubscriberDetailsModal';
import OfferProgressList from '../../components/OfferProgressList';
import { groupByPerson, personKey } from '../../src/utils/subscriberGroups';
import { DEFAULT_OFFER_COLOR, getAccentOnSurface, getMutedBorderColor, getMutedCardColor, getOfferIcon, getReadableTextColor } from '../../src/constants/offers';
import { useTheme } from '../../hooks/useTheme';
import { useTabSwipeNavigation } from '../../hooks/useTabSwipeNavigation';
// استيراد دوال قاعدة البيانات
import { addSubscriber, deleteSubscriber, getAllSubscribers, initDatabase, updateSubscriber } from '../../src/database/db';
// استيراد خدمة الإشعارات
import { scheduleSubscriberNotifications, cancelSubscriberNotificationsById } from '../../src/services/notificationService';
import I18n from '../../src/i18n';
// تعريف نوع المشترك
interface Subscriber {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  start_date: string;
  end_date: string;
  price: string;
  offer: string;
  color: string;
  status: string;
  created_at: string;
  name: string; // محسوب
  daysLeft: number; // محسوب
}

const formatDateToISO = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateStringAsLocalDate = (value: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }
  return new Date(value);
};

const formatDateForInvoice = (value?: string) => {
  if (!value) return '-';
  const date = parseDateStringAsLocalDate(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'numeric', day: 'numeric' });
};

const getRemainingDays = (value?: string) => {
  if (!value) return null;
  const end = parseDateStringAsLocalDate(value);
  if (Number.isNaN(end.getTime())) return null;
  const today = new Date();
  return Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

const INVOICE_BUSINESS_ADDRESS = 'Constantine, Algeria';
const INVOICE_BUSINESS_PHONE = '+213 000 00 00 00';

// المكون الرئيسي لصفحة إدارة المشتركين
export default function Dashboard() {
  // استخدام الثيم
  const { effectiveTheme } = useTheme();
  
  // حالة التصفية
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // حالات المودال
  const [modalVisible, setModalVisible] = useState(false);
  const [invoiceModalVisible, setInvoiceModalVisible] = useState(false); // مودال الفاتورة
  const [isEditMode, setIsEditMode] = useState(false); // وضع التعديل
  const [currentInvoiceSubscriber, setCurrentInvoiceSubscriber] = useState<any>(null); // المشترك الحالي للفاتورة
  const [selectedOffer, setSelectedOffer] = useState<string | null>(null); // فلتر العرض
  const [detailsModalVisible, setDetailsModalVisible] = useState(false); // مودال التفاصيل
  const [currentDetailsSubscriber, setCurrentDetailsSubscriber] = useState<any>(null);
  const [currentSubscriber, setCurrentSubscriber] = useState<any>(null); // المشترك الحالي للتعديل
  const [editingGroupItems, setEditingGroupItems] = useState<Subscriber[]>([]); // كل عروض الشخص الذي نعدّله
  const [addOfferMode, setAddOfferMode] = useState(false); // إضافة عرض آخر لنفس الشخص
  const [currentDetailsOffers, setCurrentDetailsOffers] = useState<any[]>([]); // عروض الشخص في نافذة التفاصيل
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date());
  const [price, setPrice] = useState('');
  const [offer, setOffer] = useState('');
  const [color, setColor] = useState(DEFAULT_OFFER_COLOR);
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [isFilterSwipeActive, setIsFilterSwipeActive] = useState(false);
  const filterReleaseTimeoutRef = useRef<any>(null);
  const { swipeGesture, swipeAnimatedStyle } = useTabSwipeNavigation('subscribers', {
    disabled: modalVisible || invoiceModalVisible || isFilterSwipeActive,
  });
  
  // بيانات المشتركين
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  // العروض المحفوظة من الإعدادات — تظهر في أزرار الفلترة أيضاً
  const [savedOffers, setSavedOffers] = useState<{ name: string; color: string }[]>([]);


  
  // متغيرات الأنيميشن والمراجع
  const searchShadowAnim = useRef(new Animated.Value(0)).current; // أنيميشن ظل شريط البحث
  const searchInputRef = useRef<TextInput>(null);                 // مرجع لحقل البحث
  const modalAnim = useRef(new Animated.Value(0)).current;        // أنيميشن المودال
  const invoiceModalAnim = useRef(new Animated.Value(0)).current; // أنيميشن مودال الفاتورة
  
  // أنيميشن البطاقات (نفس الآلية في الصفحة الرئيسية)
  const cardAnim = useRef(new Animated.Value(50)).current;
  
  // قيم أنيميشن العناوين عند دخول الصفحة
  const titleAnim = useRef(new Animated.Value(-60)).current;     // أنيميشن عنواه "Time Up"
  const subtitleAnim = useRef(new Animated.Value(-50)).current;  // أنيميشن عنواه "Subscribers"
  
  // حالة تركيز المستخدم على هل الصفحة
  const isFocused = useIsFocused();
  const navigation = useNavigation<any>();

  // Hide tab bar when modals are open
  useEffect(() => {
    if (modalVisible || invoiceModalVisible) {
      navigation.setOptions({
        tabBarStyle: { display: 'none' }
      });
    } else {
      navigation.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    }
  }, [modalVisible, invoiceModalVisible, navigation]);

  // تشغيل أنيميشن الدخول عند تركيز المستخدم على الصفحة
  useEffect(() => {
    if (isFocused) {
      // إعادة تعيين قيم الأنيميشن للبداية
      titleAnim.setValue(-60);
      subtitleAnim.setValue(-50);
      cardAnim.setValue(50);
      
      // تشغيل كل شيء معاً (نفس الصفحة الرئيسية)
      Animated.parallel([
        Animated.timing(titleAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(subtitleAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(cardAnim, {
          toValue: 0,
          duration: 600,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isFocused, titleAnim, subtitleAnim, cardAnim]);

  // تحميل البيانات من قاعدة البيانات عند العودة للصفحة
  const loadSubscribers = () => {
    getAllSubscribers((data: Subscriber[]) => {
      const processedData = data.map(sub => {
        const end = parseDateStringAsLocalDate(sub.end_date);
        const today = new Date();
        const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return {
          ...sub,
          name: `${sub.first_name} ${sub.last_name}`,
          daysLeft,
        };
      });
      setSubscribers(processedData);
    });
  };

  const loadSavedOffers = () => {
    getUserOffers((rows: { name: string; color: string }[]) => setSavedOffers(rows || []));
  };

  useEffect(() => {
    if (isFocused) {
      initDatabase();
      loadSubscribers();
      loadSavedOffers();
    }
  }, [isFocused]);

  // بعد كل مزامنة (مثلاً بعد تسجيل الدخول) نعيد القراءة
  useEffect(() => {
    const unsubscribe = onSyncComplete(() => {
      loadSubscribers();
      loadSavedOffers();
    });
    return () => {
      unsubscribe();
    };
  }, []);

  // دالة لتطبيق الأنيميشن على كل البطاقات (نفس الصفحة الرئيسية)
  const getCardStyle = () => ({
    transform: [{ translateY: cardAnim }],
    opacity: cardAnim.interpolate({
      inputRange: [0, 50],
      outputRange: [1, 0],
    }),
  });

  
  // دالة تحديد لون شارة الأيام
  const getDaysLeftBadgeStyle = (daysLeft: number) => {
    if (daysLeft < 0) {
      return {
        backgroundColor: effectiveTheme === 'dark' ? '#441306' : '#FEE2E2',
        textColor: effectiveTheme === 'dark' ? '#FF6467' : '#DC2626',
      };
    } else if (daysLeft <= 7) {
      return {
        backgroundColor: effectiveTheme === 'dark' ? '#441306' : '#FEF3C7',
        textColor: effectiveTheme === 'dark' ? '#FF8904' : '#D97706'
      };
    } else {
      return {
        backgroundColor: effectiveTheme === 'dark' ? '#032E15' : '#DCFCE7',
        textColor: effectiveTheme === 'dark' ? '#05DF72' : '#166534'
      };
    }
  };
  
  // دالة تحديد نص الأيام
  const getDaysLeftText = (daysLeft: number) => {
    if (daysLeft < 0) {
      return 'Expired';
    } else if (daysLeft === 1) {
      return '1 day left';
    } else {
      return `${daysLeft} days left`;
    }
  };
  
  // دالة تصفية المشتركين حسب الفلتر + البحث
  // استخدام useMemo لتجنب إعادة الحساب غير الضروري
  // العروض الموجودة فعلاً في البيانات (بدون تكرار) لعرضها كأزرار فلترة
  const availableOffers = useMemo(() => {
    const seen = new Map<string, string>();
    const addName = (value?: string) => {
      const name = (value || '').trim();
      if (!name) return;
      if (!seen.has(name.toLowerCase())) {
        seen.set(name.toLowerCase(), name);
      }
    };
    // العروض المحفوظة + العروض المستعملة فعلاً عند المشتركين
    savedOffers.forEach((saved) => addName(saved.name));
    subscribers.forEach((sub) => addName(sub.offer));
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [subscribers, savedOffers]);

  // لون كل عرض يؤخذ من أول مشترك يستخدمه
  const offerColorOf = (offerName: string) => {
    // لون العرض المحفوظ أولاً، وإلا لون أول مشترك يستخدمه
    const saved = savedOffers.find(
      (o) => (o.name || '').trim().toLowerCase() === offerName.toLowerCase()
    );
    if (saved?.color) return saved.color;
    const match = subscribers.find(
      (sub) => (sub.offer || '').trim().toLowerCase() === offerName.toLowerCase()
    );
    return match?.color || DEFAULT_OFFER_COLOR;
  };

  const filteredSubscribers = useMemo(() => {
    const filterByStatus = (list: Subscriber[]) => {
      if (selectedFilter === 'active') {
        return list.filter(sub => sub.daysLeft > 7);
      }
      if (selectedFilter === 'expiring') {
        return list.filter(sub => sub.daysLeft >= 0 && sub.daysLeft <= 7);
      }
      if (selectedFilter === 'expired') {
        return list.filter(sub => sub.daysLeft < 0);
      }
      return list;
    };

    const statusFiltered = filterByStatus(subscribers).filter((sub) =>
      selectedOffer
        ? (sub.offer || '').trim().toLowerCase() === selectedOffer.toLowerCase()
        : true
    );
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return statusFiltered;
    }

    return statusFiltered.filter((sub) => {
      const fullName = `${sub.first_name} ${sub.last_name}`.toLowerCase();
      const phoneValue = (sub.phone || '').toLowerCase();
      const addressValue = (sub.address || '').toLowerCase();
      const offerValue = (sub.offer || '').toLowerCase();

      return (
        fullName.includes(normalizedQuery) ||
        phoneValue.includes(normalizedQuery) ||
        addressValue.includes(normalizedQuery) ||
        offerValue.includes(normalizedQuery)
      );
    });
  }, [selectedFilter, subscribers, searchQuery, selectedOffer]);

  // بطاقة واحدة لكل شخص مهما كان عدد عروضه
  const filteredGroups = useMemo(() => groupByPerson(filteredSubscribers), [filteredSubscribers]);

  // كل عروض الشخص (من القائمة كاملة وليس المصفّاة فقط) — للتعديل والتفاصيل والحذف
  const itemsOfPerson = (key: string) =>
    subscribers.filter((sub) => personKey(sub) === key).sort((a, b) => a.daysLeft - b.daysLeft);

  // عدد الأشخاص (البطاقات) في كل تبويب — وليس عدد العروض
  const counts = useMemo(() => {
    const people = (list: Subscriber[]) => groupByPerson(list).length;
    return {
      all: people(subscribers),
      active: people(subscribers.filter(sub => sub.daysLeft > 7)),
      expiring: people(subscribers.filter(sub => sub.daysLeft >= 0 && sub.daysLeft <= 7)),
      expired: people(subscribers.filter(sub => sub.daysLeft < 0)),
    };
  }, [subscribers]);

  const lockFilterSwipe = () => {
    if (filterReleaseTimeoutRef.current) {
      clearTimeout(filterReleaseTimeoutRef.current);
      filterReleaseTimeoutRef.current = null;
    }
    setIsFilterSwipeActive(true);
  };

  const unlockFilterSwipeWithDelay = (delay = 220) => {
    if (filterReleaseTimeoutRef.current) {
      clearTimeout(filterReleaseTimeoutRef.current);
    }
    filterReleaseTimeoutRef.current = setTimeout(() => {
      setIsFilterSwipeActive(false);
      filterReleaseTimeoutRef.current = null;
    }, delay);
  };

  const onFilterSwipeStart = () => {
    lockFilterSwipe();
  };

  const onFilterSwipeEnd = () => {
    unlockFilterSwipeWithDelay();
  };

  useEffect(() => {
    return () => {
      if (filterReleaseTimeoutRef.current) {
        clearTimeout(filterReleaseTimeoutRef.current);
      }
    };
  }, []);



  // دوال تحكم في مودال إضافة مشترك جديد
  const openModal = () => {
    setIsEditMode(false);
    setModalVisible(true); // إظهار المودال
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  };

  // دالة فتح المودال في وضع التعديل
  const openEditModal = (subscriber: Subscriber, groupItems: Subscriber[] = [subscriber]) => {
    setIsEditMode(true);
    setAddOfferMode(false);
    setEditingGroupItems(groupItems);
    setCurrentSubscriber(subscriber);
    
    // ملء الحقول ببيانات المشترك الموجودة
    setFirstName(subscriber.first_name);
    setLastName(subscriber.last_name);
    setPhone(subscriber.phone);
    setAddress(subscriber.address);
    setStartDate(parseDateStringAsLocalDate(subscriber.start_date));
    setEndDate(parseDateStringAsLocalDate(subscriber.end_date));
    setPrice(subscriber.price);
    setOffer(subscriber.offer || '');
    setColor(subscriber.color || DEFAULT_OFFER_COLOR);

    setModalVisible(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  };

  // دالة فتح مودال التفاصيل
  const openDetailsModal = (subscriber: any, offers?: any[]) => {
    setCurrentDetailsSubscriber(subscriber);
    setCurrentDetailsOffers(offers ?? [subscriber]);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setCurrentDetailsSubscriber(null);
  };

  // دالة فتح مودال الفاتورة
  const openInvoiceModal = (subscriber: any) => {
    setCurrentInvoiceSubscriber(subscriber);
    setInvoiceModalVisible(true);
    Animated.timing(invoiceModalAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  };

  // دالة إغلاق مودال الفاتورة
  const closeInvoiceModal = () => {
    Animated.timing(invoiceModalAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setInvoiceModalVisible(false);
      setCurrentInvoiceSubscriber(null);
    });
  };

  const handleShareInvoice = async () => {
    if (!currentInvoiceSubscriber) return;

    const remainingDays = getRemainingDays(currentInvoiceSubscriber.end_date);
    const remainingText = remainingDays === null
      ? '-'
      : remainingDays < 0
      ? `Expired (${Math.abs(remainingDays)} days ago)`
      : `${remainingDays} days`;

    const invoiceMessage = [
      'Time Up - Subscription Invoice',
      '',
      `Subscriber: ${currentInvoiceSubscriber.first_name || ''} ${currentInvoiceSubscriber.last_name || ''}`.trim(),
      `Phone: ${currentInvoiceSubscriber.phone || '-'}`,
      `Address: ${currentInvoiceSubscriber.address || '-'}`,
      `Start Date: ${formatDateForInvoice(currentInvoiceSubscriber.start_date)}`,
      `End Date: ${formatDateForInvoice(currentInvoiceSubscriber.end_date)}`,
      `Remaining: ${remainingText}`,
      `Amount: ${currentInvoiceSubscriber.price || '-'} DZD`,
    ].join('\n');

    try {
      await Share.share({
        title: 'Time Up Invoice',
        message: invoiceMessage,
      });
    } catch (error) {
      console.log('Error sharing invoice:', error);
    }
  };

  const handlePrintInvoice = async () => {
    if (!currentInvoiceSubscriber) return;

    const remainingDays = getRemainingDays(currentInvoiceSubscriber.end_date);
    const remainingText = remainingDays === null
      ? '-'
      : remainingDays < 0
      ? `Expired (${Math.abs(remainingDays)} days ago)`
      : `${remainingDays} days left`;

    const html = `
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111827; }
            h1 { margin: 0 0 6px 0; color: #0891B2; }
            .sub { margin: 0; color: #4B5563; }
            .card { border: 1px solid #E5E7EB; border-radius: 10px; padding: 14px; margin-top: 14px; }
            .row { display: flex; justify-content: space-between; margin-bottom: 8px; }
            .key { color: #374151; font-weight: 600; }
            .val { color: #111827; }
          </style>
        </head>
        <body>
          <h1>Time Up</h1>
          <p class="sub">${INVOICE_BUSINESS_ADDRESS}</p>
          <p class="sub">${INVOICE_BUSINESS_PHONE}</p>

          <div class="card">
            <div class="row"><span class="key">Subscriber</span><span class="val">${(currentInvoiceSubscriber.first_name || '')} ${(currentInvoiceSubscriber.last_name || '')}</span></div>
            <div class="row"><span class="key">Phone</span><span class="val">${currentInvoiceSubscriber.phone || '-'}</span></div>
            <div class="row"><span class="key">Address</span><span class="val">${currentInvoiceSubscriber.address || '-'}</span></div>
            <div class="row"><span class="key">Start</span><span class="val">${formatDateForInvoice(currentInvoiceSubscriber.start_date)}</span></div>
            <div class="row"><span class="key">End</span><span class="val">${formatDateForInvoice(currentInvoiceSubscriber.end_date)}</span></div>
            <div class="row"><span class="key">Remaining</span><span class="val">${remainingText}</span></div>
            <div class="row"><span class="key">Amount</span><span class="val">${currentInvoiceSubscriber.price || '-'} DZD</span></div>
          </div>
        </body>
      </html>
    `;

    try {
      await Print.printAsync({ html });
    } catch (error) {
      console.log('Error printing invoice:', error);
    }
  };

  // دالة حفظ المشترك
  const handleSave = async () => {
    // في وضع "إضافة عرض آخر" بيانات الشخص موجودة مسبقاً — نتحقق من السعر فقط
    const personComplete = addOfferMode || (firstName && lastName && phone && address);
    if (!personComplete || !price) {
      alert('يرجى ملء جميع الحقول المطلوبة');
      return;
    }
    
    const startDateStr = formatDateToISO(startDate);
    const endDateStr = formatDateToISO(endDate);

    // العرض المكتوب يدوياً يُحفظ في قائمة العروض ليظهر في كل مكان.
    // addUserOffer يتجاهل المكرّر من تلقاء نفسه.
    if (offer.trim()) {
      addUserOffer(offer.trim(), color, () => {});
    }

    // باقي عروض نفس الشخص: نحدّث بياناته فيها أيضاً حتى تبقى في نفس البطاقة
    const siblings = editingGroupItems.filter(
      (sub) => addOfferMode || String(sub.id) !== String(currentSubscriber?.id)
    );

    const syncSiblings = async () => {
      const changed = siblings.filter(
        (sub) =>
          sub.first_name !== firstName ||
          sub.last_name !== lastName ||
          sub.phone !== phone ||
          sub.address !== address
      );
      for (const sub of changed) {
        await new Promise<void>((resolve) =>
          updateSubscriber(sub.id, firstName, lastName, phone, address, sub.start_date, sub.end_date, sub.price, sub.offer, sub.color, () => resolve())
        );
        try {
          await scheduleSubscriberNotifications(sub.id, firstName, lastName, sub.end_date);
        } catch (error) {
          console.log('⚠️ Failed to reschedule notifications for', sub.id, error);
        }
      }
    };

    const finish = async () => {
      await syncSiblings();
      loadSubscribers();
      closeModal();
    };

    if (addOfferMode) {
      // عرض جديد لنفس الشخص — بدون إعادة إدخال بياناته
      addSubscriber(firstName, lastName, phone, address, startDateStr, endDateStr, price, offer, color, async (insertId: any) => {
        await scheduleSubscriberNotifications(insertId, firstName, lastName, endDateStr);
        await finish();
      });
    } else if (isEditMode && currentSubscriber) {
      updateSubscriber(currentSubscriber.id, firstName, lastName, phone, address, startDateStr, endDateStr, price, offer, color, async () => {
        // إعادة جدولة الإشعارات بعد التعديل
        await scheduleSubscriberNotifications(currentSubscriber.id, firstName, lastName, endDateStr);
        await finish();
      });
    } else {
      addSubscriber(firstName, lastName, phone, address, startDateStr, endDateStr, price, offer, color, async (insertId: any) => {
        // جدولة الإشعارات للمشترك الجديد
        await scheduleSubscriberNotifications(insertId, firstName, lastName, endDateStr);
        await finish();
      });
    }
  };

  // دالة إغلاق المودال مع إعادة تعيين جميع الحقول
  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      setIsEditMode(false);
      setAddOfferMode(false);
      setEditingGroupItems([]);
      setCurrentSubscriber(null);
      setFirstName('');
      setLastName('');
      setPhone('');
      setAddress('');
      setStartDate(new Date());
      setEndDate(new Date());
      setPrice('');
      setOffer('');
      setColor(DEFAULT_OFFER_COLOR);
      setShowStartDatePicker(false);
      setShowEndDatePicker(false);
    });
  };

  // دالة حذف — عرض واحد، أو الشخص مع كل عروضه
  const handleDelete = async (items: Subscriber[], singleOffer = false) => {
    if (!items.length) return false;
    const name = `${items[0].first_name} ${items[0].last_name}`.trim();

    const title = singleOffer ? 'حذف العرض' : 'حذف المشترك';
    const message = singleOffer
      ? `هل تريد حذف عرض "${items[0].offer || '-'}" من ${name}؟`
      : items.length > 1
      ? `هل تريد حذف ${name} مع كل عروضه (${items.length})؟`
      : `هل تريد حذف ${name}؟`;

    // تأكيد قبل الحذف — الحذف لا يمكن التراجع عنه
    const confirmed = await new Promise<boolean>((resolve) => {
      Alert.alert(
        title,
        message,
        [
          { text: 'إلغاء', style: 'cancel', onPress: () => resolve(false) },
          { text: 'حذف', style: 'destructive', onPress: () => resolve(true) },
        ],
        { cancelable: true, onDismiss: () => resolve(false) }
      );
    });

    if (!confirmed) return false;

    for (const item of items) {
      try {
        await cancelSubscriberNotificationsById(item.id);
      } catch (error) {
        console.log('⚠️ Failed to cancel notifications for subscriber', item.id, error);
      }
      await new Promise<void>((resolve) => deleteSubscriber(item.id, () => resolve()));
    }
    loadSubscribers();
    return true;
  };

  /* ---------- إضافة عرض آخر لنفس الشخص (داخل نافذة التعديل) ---------- */

  // تعبئة حقول العرض فقط — بيانات الشخص تبقى كما هي
  const loadOfferFields = (sub: Subscriber) => {
    setStartDate(parseDateStringAsLocalDate(sub.start_date));
    setEndDate(parseDateStringAsLocalDate(sub.end_date));
    setPrice(sub.price);
    setOffer(sub.offer || '');
    setColor(sub.color || DEFAULT_OFFER_COLOR);
  };

  const selectOfferToEdit = (sub: Subscriber) => {
    setAddOfferMode(false);
    setCurrentSubscriber(sub);
    loadOfferFields(sub);
  };

  const startAddOffer = () => {
    setAddOfferMode(true);
    setOffer('');
    setColor(DEFAULT_OFFER_COLOR);
    setStartDate(new Date());
    setEndDate(new Date());
    setPrice('');
  };

  const handleDeleteCurrentOffer = async () => {
    if (!currentSubscriber) return;
    const deleted = await handleDelete([currentSubscriber], true);
    if (deleted) closeModal();
  };

  // أزرار عروض الشخص في أعلى نافذة التعديل + زر "إضافة عرض آخر"
  const renderOfferSwitcher = () => {
    const isDark = effectiveTheme === 'dark';
    const chipBase = {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 20,
      borderWidth: 1,
    } as const;

    return (
      <View style={{ marginBottom: 16 }}>
        <Text style={{ fontSize: 12, fontWeight: '600', marginBottom: 8, color: isDark ? '#9CA3AF' : '#6B7280' }}>
          {I18n.t('offersOfPerson')}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={{ flexDirection: 'row', gap: 8 }}>
            {editingGroupItems.map((item) => {
              const itemColor = item.color || DEFAULT_OFFER_COLOR;
              const selected = !addOfferMode && String(currentSubscriber?.id) === String(item.id);
              const fg = selected ? getReadableTextColor(itemColor) : getAccentOnSurface(itemColor, isDark);
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => selectOfferToEdit(item)}
                  style={[
                    chipBase,
                    {
                      backgroundColor: selected ? itemColor : getMutedCardColor(itemColor, isDark),
                      borderColor: selected ? itemColor : getMutedBorderColor(itemColor, isDark),
                    },
                  ]}
                >
                  <Ionicons name={getOfferIcon(item.offer) as any} size={14} color={fg} />
                  <Text style={{ fontSize: 13, fontWeight: '700', color: fg }}>{item.offer || '-'}</Text>
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={startAddOffer}
              style={[
                chipBase,
                {
                  borderStyle: 'dashed',
                  borderColor: '#00B8DB',
                  backgroundColor: addOfferMode ? '#00B8DB' : 'transparent',
                },
              ]}
            >
              <Ionicons name="add" size={16} color={addOfferMode ? '#FFFFFF' : '#00B8DB'} />
              <Text style={{ fontSize: 13, fontWeight: '700', color: addOfferMode ? '#FFFFFF' : '#00B8DB' }}>
                {I18n.t('addAnotherOffer')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    );
  };

  // في وضع "إضافة عرض آخر": بطاقة صغيرة باسم الشخص بدل إعادة كتابة بياناته
  const renderPersonBanner = () => {
    const isDark = effectiveTheme === 'dark';
    const phoneText = phone.length === 9 ? `0${phone}` : phone;
    return (
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 12,
          padding: 14,
          borderRadius: 12,
          marginBottom: 16,
          backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
        }}
      >
        <Ionicons name="person-circle-outline" size={30} color="#00B8DB" />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: isDark ? '#E5E7EB' : '#1F2937' }}>
            {`${firstName} ${lastName}`}
          </Text>
          <Text numberOfLines={1} style={{ fontSize: 13, marginTop: 2, color: isDark ? '#9CA3AF' : '#6B7280' }}>
            {phoneText}
            {address ? ` · ${address}` : ''}
          </Text>
        </View>
      </View>
    );
  };

  // استخدام دالة عادية بدلاً من functional component لتجنب إعادة الرسم
  function renderMainContent() {
    const invoiceRemainingDays = getRemainingDays(currentInvoiceSubscriber?.end_date);
    const invoiceRemainingText = invoiceRemainingDays === null
      ? '-'
      : invoiceRemainingDays < 0
      ? `Expired (${Math.abs(invoiceRemainingDays)} days ago)`
      : `${invoiceRemainingDays} days left`;

    const invoiceStatus = invoiceRemainingDays === null
      ? 'Unknown'
      : invoiceRemainingDays > 7
      ? 'Active'
      : invoiceRemainingDays >= 0
      ? 'Expiring Soon'
      : 'Expired';

    const invoiceQrData = [
      'Time Up Invoice',
      `ID:${currentInvoiceSubscriber?.id || '-'}`,
      `Name:${currentInvoiceSubscriber?.first_name || ''} ${currentInvoiceSubscriber?.last_name || ''}`.trim(),
      `Phone:${currentInvoiceSubscriber?.phone || '-'}`,
      `Start:${currentInvoiceSubscriber?.start_date || '-'}`,
      `End:${currentInvoiceSubscriber?.end_date || '-'}`,
      `Amount:${currentInvoiceSubscriber?.price || '-'} DZD`,
    ].join('|');

    const invoiceQrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(invoiceQrData)}`;

    return (
    <>
      {/* قسم العناوين الرئيسية */}
      <View style={{
        backgroundColor: 'transparent',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12
      }}>
        <Animated.Text
          style={{
            fontSize: 26,
            fontWeight: 'bold',
            color: effectiveTheme === 'dark' ? '#00B8DB' : '#0092B8',
            marginBottom: 4,
            transform: [{ translateY: titleAnim }],
            opacity: titleAnim.interpolate({
              inputRange: [-60, 0],
              outputRange: [0, 1],
            }),
          }}
        >
          {I18n.t('appName')}
        </Animated.Text>

        <Animated.Text
          style={{
            fontSize: 18,
            color: effectiveTheme === 'dark' ? '#E0E0E0' : '#6B7280',
            fontWeight: '500',
            transform: [{ translateY: subtitleAnim }],
            opacity: subtitleAnim.interpolate({
              inputRange: [-50, 0],
              outputRange: [0, 1],
            }),
          }}
        >
          {I18n.t('subscribers')}
        </Animated.Text>
      </View>

      {/* قسم البحث وفلاتر التصفية */}
      <View style={{
        backgroundColor: 'transparent',
        paddingBottom: 8
      }}>
        {/* شريط البحث مع أنيميشن الظل */}
        <View style={{
          paddingHorizontal: 16,
          paddingTop: 4,
          paddingBottom: 6
        }}>
          <Animated.View 
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: effectiveTheme === 'dark' ? '#0F172B' : '#FFFFFF',
              borderRadius: 10,
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderWidth: 1,
              borderColor: effectiveTheme === 'dark' ? '#2A2A2A' : '#E5E7EB',
              elevation: searchShadowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 8],
              }),
              shadowOpacity: searchShadowAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.02, 0.15],
              }),
              shadowColor: effectiveTheme === 'dark' ? '#000' : '#000',
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
            }}
          >
            <Ionicons name="search" size={20} color="#9CA3AF" style={{ marginRight: 8 }} />
            <TextInput 
              ref={searchInputRef}
              style={{
                flex: 1,
                fontSize: 14,
                color: effectiveTheme === 'dark' ? '#E5E7EB' : '#374151'
              }}
              placeholder={I18n.t('search')}
              placeholderTextColor="#9CA3AF"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
              onFocus={() => {
                Animated.timing(searchShadowAnim, {
                  toValue: 1,
                  duration: 200,
                  useNativeDriver: false,
                }).start();
              }}
              onBlur={() => {
                Animated.timing(searchShadowAnim, {
                  toValue: 0,
                  duration: 200,
                  useNativeDriver: false,
                }).start();
              }}
            />
          </Animated.View>
        </View>

        {/* أزرار فلترة حسب العرض — تظهر فقط العروض المضافة فعلاً */}
        {availableOffers.length > 0 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            onTouchStart={onFilterSwipeStart}
            onTouchEnd={onFilterSwipeEnd}
            onTouchCancel={onFilterSwipeEnd}
            onScrollBeginDrag={onFilterSwipeStart}
            onScrollEndDrag={onFilterSwipeEnd}
            onMomentumScrollBegin={onFilterSwipeStart}
            onMomentumScrollEnd={onFilterSwipeEnd}
            style={{ paddingBottom: 10 }}
          >
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              {/* زر إلغاء فلتر العرض */}
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setSelectedOffer(null)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 30,
                  borderWidth: 1,
                  backgroundColor:
                    selectedOffer === null
                      ? '#00B8DB'
                      : effectiveTheme === 'dark'
                      ? '#1E293B'
                      : '#F1F5F9',
                  borderColor:
                    selectedOffer === null
                      ? '#00B8DB'
                      : effectiveTheme === 'dark'
                      ? '#334155'
                      : '#E5E7EB',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color:
                      selectedOffer === null
                        ? '#FFFFFF'
                        : effectiveTheme === 'dark'
                        ? '#E5E7EB'
                        : '#1F2937',
                  }}
                >
                  {I18n.t('all')}
                </Text>
              </TouchableOpacity>

              {availableOffers.map((offerName) => {
                const isDark = effectiveTheme === 'dark';
                const offerColor = offerColorOf(offerName);
                const isSelected = selectedOffer?.toLowerCase() === offerName.toLowerCase();

                return (
                  <TouchableOpacity
                    key={offerName}
                    activeOpacity={0.8}
                    // الضغط مرة أخرى يلغي الفلتر
                    onPress={() => setSelectedOffer(isSelected ? null : offerName)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 6,
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 30,
                      backgroundColor: isSelected ? offerColor : getMutedCardColor(offerColor, isDark),
                      borderWidth: 1,
                      borderColor: isSelected ? offerColor : getMutedBorderColor(offerColor, isDark),
                    }}
                  >
                    <Ionicons
                      name={getOfferIcon(offerName) as any}
                      size={14}
                      color={isSelected ? getReadableTextColor(offerColor) : getAccentOnSurface(offerColor, isDark)}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '700',
                        color: isSelected
                          ? getReadableTextColor(offerColor)
                          : getAccentOnSurface(offerColor, isDark),
                      }}
                    >
                      {offerName}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}

        {/* تبويبات فلترة المشتركين حسب الحالة */}
        <ScrollView 
          horizontal={true}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
          onTouchStart={onFilterSwipeStart}
          onTouchEnd={onFilterSwipeEnd}
          onTouchCancel={onFilterSwipeEnd}
          onScrollBeginDrag={onFilterSwipeStart}
          onScrollEndDrag={onFilterSwipeEnd}
          onMomentumScrollBegin={onFilterSwipeStart}
          onMomentumScrollEnd={onFilterSwipeEnd}
          style={{
            paddingTop: 0,
            paddingBottom: 8
          }}
        >
          <View style={{
            flexDirection: 'row',
            gap: 8,
            alignItems: 'center'
          }}>
            <TouchableOpacity 
              style={selectedFilter === 'all' ? {
                borderRadius: 30,
                elevation: 14,
                shadowColor: '#00B8DB',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: effectiveTheme === 'dark' ? 0.75 : 0.5,
                shadowRadius: 18,
              } : {
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 30,
                backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F1F5F9'
              }}
              onPress={() => setSelectedFilter('all')}
            >
              {selectedFilter === 'all' ? (
                <LinearGradient
                  colors={['#00B8DB', '#0092B8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ 
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 30 
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>{I18n.t('all')} ({counts.all})</Text>
                </LinearGradient>
              ) : (
                <Text style={{
                  color: effectiveTheme === 'dark' ? '#CBD5E1' : '#475569',
                  fontSize: 15,
                  fontWeight: '500',
                  textAlign: 'center'
                }}>{I18n.t('all')} ({counts.all})</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={selectedFilter === 'active' ? {
                borderRadius: 30,
                elevation: 14,
                shadowColor: '#00B8DB',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: effectiveTheme === 'dark' ? 0.75 : 0.5,
                shadowRadius: 18,
              } : {
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 30,
                backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F1F5F9'
              }}
              onPress={() => setSelectedFilter('active')}
            >
              {selectedFilter === 'active' ? (
                <LinearGradient
                  colors={['#00B8DB', '#0092B8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ 
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 30 
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>{I18n.t('active')} ({counts.active})</Text>
                </LinearGradient>
              ) : (
                <Text style={{
                  color: effectiveTheme === 'dark' ? '#CBD5E1' : '#475569',
                  fontSize: 15,
                  fontWeight: '500',
                  textAlign: 'center'
                }}>{I18n.t('active')} ({counts.active})</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={selectedFilter === 'expiring' ? {
                borderRadius: 30,
                elevation: 14,
                shadowColor: '#00B8DB',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: effectiveTheme === 'dark' ? 0.75 : 0.5,
                shadowRadius: 18,
              } : {
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 30,
                backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F1F5F9'
              }}
              onPress={() => setSelectedFilter('expiring')}
            >
              {selectedFilter === 'expiring' ? (
                <LinearGradient
                  colors={['#00B8DB', '#0092B8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ 
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 30 
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>{I18n.t('expiringSoon')} ({counts.expiring})</Text>
                </LinearGradient>
              ) : (
                <Text style={{
                  color: effectiveTheme === 'dark' ? '#CBD5E1' : '#475569',
                  fontSize: 15,
                  fontWeight: '500',
                  textAlign: 'center'
                }}>{I18n.t('expiringSoon')} ({counts.expiring})</Text>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity 
              style={selectedFilter === 'expired' ? {
                borderRadius: 30,
                elevation: 14,
                shadowColor: '#00B8DB',
                shadowOffset: { width: 0, height: 10 },
                shadowOpacity: effectiveTheme === 'dark' ? 0.75 : 0.5,
                shadowRadius: 18,
              } : {
                paddingHorizontal: 20,
                paddingVertical: 10,
                borderRadius: 30,
                backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F1F5F9'
              }}
              onPress={() => setSelectedFilter('expired')}
            >
              {selectedFilter === 'expired' ? (
                <LinearGradient
                  colors={['#00B8DB', '#0092B8']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ 
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 30 
                  }}
                >
                  <Text style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '600',
                    textAlign: 'center'
                  }}>{I18n.t('expired')} ({counts.expired})</Text>
                </LinearGradient>
              ) : (
                <Text style={{
                  color: effectiveTheme === 'dark' ? '#CBD5E1' : '#475569',
                  fontSize: 15,
                  fontWeight: '500',
                  textAlign: 'center'
                }}>{I18n.t('expired')} ({counts.expired})</Text>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>



      {/* قائمة بطاقات المشتركين مع أنيميشن البطاقات */}
      <Animated.ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 8, paddingBottom: 120 }}
        style={{ flex: 1 }}
        scrollEventThrottle={16}
        bounces={true}
        alwaysBounceVertical={true}
      >
        {filteredGroups.map((group) => {
          // بطاقة واحدة لكل شخص — العرض الأقرب انتهاءً يحدد لونها وحالتها
          const item = group.primary;
          const isDark = effectiveTheme === 'dark';
          const offerColor = item.color || DEFAULT_OFFER_COLOR;
          const cardColor = getMutedCardColor(offerColor, isDark);
          const borderColor = getMutedBorderColor(offerColor, isDark);
          const onCard = isDark ? '#E5E7EB' : '#1F2937';
          const overlay = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.04)';

          return (
          <Animated.View key={group.key} style={getCardStyle()}>
            <View 
              style={{
                backgroundColor: cardColor,
                borderRadius: 16,
                borderWidth: 1,
                borderColor: borderColor,
                padding: 16,
                marginBottom: 12,
                marginHorizontal: 16,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: isDark ? 0.25 : 0.06,
                shadowRadius: 8,
                elevation: 3,
              }}
            >
              {/* الضغط على البطاقة يفتح نافذة التفاصيل */}
              <TouchableOpacity activeOpacity={0.7} onPress={() => openDetailsModal(item, itemsOfPerson(group.key))}>
              {/* الصف العلوي: أيقونة العرض + الاسم + الأيام المتبقية */}
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 12 }}>
                {/* أيقونة الخدمة بدل الحروف الأولى */}
                <View style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: offerColor,
                }}>
                  <Ionicons name={getOfferIcon(item.offer) as any} size={22} color={getReadableTextColor(offerColor)} />
                </View>

                <Text style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: onCard,
                  flex: 1
                }}>{group.name}</Text>
                <View 
                  style={{
                    paddingHorizontal: 12,
                    paddingVertical: 6,
                    borderRadius: 20,
                    backgroundColor: getDaysLeftBadgeStyle(item.daysLeft).backgroundColor
                  }}
                >
                  <Text 
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: getDaysLeftBadgeStyle(item.daysLeft).textColor
                    }}
                  >
                    {getDaysLeftText(item.daysLeft)}
                  </Text>
                </View>
              </View>

              {/* كل عروض الشخص: العرض + تاريخ الانتهاء، وتحته شريط تقدّم بلون العرض */}
              <View style={{ marginTop: 4, marginBottom: 16 }}>
                <OfferProgressList items={group.items} isDark={isDark} />
              </View>
              </TouchableOpacity>

              {/* الأزرار الثلاثة */}
              <View style={{
                backgroundColor: 'transparent',
                flexDirection: 'row',
                justifyContent: 'space-between',
                gap: 10,
                paddingHorizontal: 0,
                paddingVertical: 0
              }}>
                <TouchableOpacity 
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: overlay,
                    borderWidth: 1,
                    borderColor: overlay
                  }}
                  onPress={() => openInvoiceModal(item)}
                >
                  <Ionicons name="document-text-outline" size={16} color={onCard} />
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: onCard
                  }}>Invoice</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: overlay,
                    borderWidth: 1,
                    borderColor: overlay
                  }}
                  onPress={() => openEditModal(item, itemsOfPerson(group.key))}
                >
                  <Ionicons name="pencil" size={18} color={onCard} />
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: onCard
                  }}>Edit</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={{
                    flex: 1,
                    flexDirection: 'row',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    paddingVertical: 8,
                    paddingHorizontal: 10,
                    borderRadius: 8,
                    backgroundColor: overlay,
                    borderWidth: 1,
                    borderColor: overlay
                  }}
                  onPress={() => handleDelete(itemsOfPerson(group.key))}
                >
                  <Ionicons name="trash-outline" size={16} color="#EF4444" />
                  <Text style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: '#EF4444'
                  }}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
          );
        })}
      </Animated.ScrollView>
      
      {/* زر الإضافة العائم لإضافة مشترك جديد */}
      <TouchableOpacity 
        style={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          width: 56,
          height: 56,
          borderRadius: 28,
          elevation: 8,
          shadowColor: '#00B8DB',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
        }}
        onPress={openModal} 
        activeOpacity={0.8}
      >
        <LinearGradient
          colors={['#00B8DB', '#0092B8']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            justifyContent: 'center',
            alignItems: 'center'
          }}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
      
      {/* نافذة مودال إضافة مشترك جديد مع تأثيرات بصرية */}
      <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
        <View style={{ flex: 1 }}>
          <BlurView
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            tint="dark"
            intensity={85}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)'
            }}
          />
          
          <Animated.View
            style={{
              flex: 1,
              justifyContent: 'flex-end',
              backgroundColor: 'transparent',
              transform: [
                {
                  translateY: modalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={0}
            >
              <View style={{ flex: 1, justifyContent: 'flex-end' }}>
                <View 
                  style={{
                    backgroundColor: effectiveTheme === 'dark' ? '#0F172B' : '#FFFFFF',
                    borderTopLeftRadius: 28,
                    borderTopRightRadius: 28,
                    paddingHorizontal: 24,
                    paddingTop: 20,
                    paddingBottom: 0,
                    maxHeight: Platform.OS === 'android' ? '90%' : '95%',
                    minHeight: Platform.OS === 'android' ? '75%' : '88%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 20,
                  }}
                >
                      <View style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        paddingHorizontal: 0,
                        paddingTop: 0,
                        paddingBottom: 20
                      }}>
                        <Text style={{
                          fontSize: 20,
                          fontWeight: 'bold',
                          color: effectiveTheme === 'dark' ? '#E5E7EB' : '#1F2937'
                        }}>{addOfferMode ? I18n.t('addAnotherOffer') : isEditMode ? I18n.t('editSubscriber') : I18n.t('addSubscriberTitle')}</Text>
                        <TouchableOpacity onPress={closeModal}>
                          <Text style={{
                            fontSize: 34,
                            color: effectiveTheme === 'dark' ? '#D1D5DB' : '#9CA3AF'
                          }}>×</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <ScrollView 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                      >
                        {isEditMode && renderOfferSwitcher()}
                        {addOfferMode ? renderPersonBanner() : (
                        <>
                        <TextInput 
                          style={{
                            backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                            color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000',
                            borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            fontSize: 16,
                            borderWidth: 2,
                          }}
                          placeholder="First Name" 
                          placeholderTextColor={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={firstName} 
                          onChangeText={setFirstName} 
                        />
                        <TextInput 
                          style={{
                            backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                            color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000',
                            borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            fontSize: 16,
                            borderWidth: 2
                          }}
                          placeholder="Last Name" 
                          placeholderTextColor={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={lastName} 
                          onChangeText={setLastName} 
                        />
                        
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                          borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                          borderRadius: 12,
                          marginBottom: 16,
                          borderWidth: 2
                        }}>
                          <Text style={{
                            paddingLeft: 16,
                            paddingRight: 4,
                            fontSize: 16,
                            fontWeight: '600',
                            color: effectiveTheme === 'dark' ? '#E5E7EB' : '#1F2937'
                          }}>0</Text>
                          <TextInput
                            style={{
                              flex: 1,
                              paddingVertical: 16,
                              paddingRight: 16,
                              fontSize: 16,
                              letterSpacing: 1,
                              color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000'
                            }}
                            placeholder="XXX XX XX XX"
                            placeholderTextColor={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            value={phone}
                            // أرقام فقط، وبحد أقصى 9 خانات (بعد الصفر)
                            onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 9))}
                            keyboardType="number-pad"
                            maxLength={9}
                          />
                        </View>
                        
                        <TextInput 
                          style={{
                            backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                            color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000',
                            borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                            borderRadius: 12,
                            padding: 16,
                            marginBottom: 16,
                            fontSize: 16,
                            borderWidth: 2
                          }}
                          placeholder="Cité ..., Cheraga 16000"
                          placeholderTextColor={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                          value={address}
                          onChangeText={setAddress}
                        />
                        </>
                        )}

                        {/* العرض + اللون */}
                        <OfferPicker
                          offer={offer}
                          color={color}
                          onChangeOffer={setOffer}
                          onChangeColor={setColor}
                        />

                        {/* حقل تاريخ البداية */}
                        <TouchableOpacity 
                          style={{
                            backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                            borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            borderWidth: 1,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onPress={() => setShowStartDatePicker(true)}
                        >
                          <Text style={{
                            fontSize: 16,
                            color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000',
                            fontWeight: '500'
                          }}>{startDate.toLocaleDateString('en-US')}</Text>
                          <Text style={{
                            fontSize: 14,
                            color: effectiveTheme === 'dark' ? '#D1D5DB' : '#4B5563'
                          }}>Start Date</Text>
                        </TouchableOpacity>
                        
                        {/* حقل تاريخ النهاية */}
                        <TouchableOpacity 
                          style={{
                            backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                            borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                            borderRadius: 16,
                            padding: 16,
                            marginBottom: 16,
                            borderWidth: 1,
                            flexDirection: 'row',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                          onPress={() => setShowEndDatePicker(true)}
                        >
                          <Text style={{
                            fontSize: 16,
                            color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000',
                            fontWeight: '500'
                          }}>{endDate.toLocaleDateString('en-US')}</Text>
                          <Text style={{
                            fontSize: 14,
                            color: effectiveTheme === 'dark' ? '#D1D5DB' : '#4B5563'
                          }}>End Date</Text>
                        </TouchableOpacity>
                        
                        {/* حقل السعر مع لاحقة ,00 DZD */}
                        <View style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          backgroundColor: effectiveTheme === 'dark' ? '#1E293B' : '#F9FAFB',
                          borderColor: effectiveTheme === 'dark' ? '#4B5563' : '#E5E7EB',
                          borderRadius: 12,
                          marginBottom: 16,
                          borderWidth: 2,
                        }}>
                          <TextInput
                            style={{
                              flex: 1,
                              padding: 16,
                              fontSize: 16,
                              color: effectiveTheme === 'dark' ? '#E5E7EB' : '#000000',
                            }}
                            placeholder="Price"
                            placeholderTextColor={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
                            value={price}
                            onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
                            keyboardType="number-pad"
                          />
                          <Text style={{
                            paddingRight: 16,
                            fontSize: 16,
                            fontWeight: '600',
                            color: effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280',
                          }}>,00 DZD</Text>
                        </View>
                        
                        {/* DatePicker للتاريخ البداية */}
                        {showStartDatePicker && (
                          <DateTimePicker
                            value={startDate}
                            mode="date"
                            display="default"
                            onChange={(_event, selectedDate) => {
                              setShowStartDatePicker(false);
                              if (selectedDate) {
                                setStartDate(selectedDate);
                              }
                            }}
                          />
                        )}
                        
                        {/* DatePicker لتاريخ النهاية */}
                        {showEndDatePicker && (
                          <DateTimePicker
                            value={endDate}
                            mode="date"
                            display="default"
                            onChange={(_event, selectedDate) => {
                              setShowEndDatePicker(false);
                              if (selectedDate) {
                                setEndDate(selectedDate);
                              }
                            }}
                          />
                        )}
                        
                        {/* حذف عرض واحد فقط — عندما يكون للشخص أكثر من عرض */}
                        {isEditMode && !addOfferMode && currentSubscriber && editingGroupItems.length > 1 && (
                          <TouchableOpacity
                            onPress={handleDeleteCurrentOffer}
                            style={{
                              flexDirection: 'row',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 6,
                              paddingVertical: 12,
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: 'rgba(239,68,68,0.4)',
                              marginTop: 4,
                            }}
                          >
                            <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            <Text style={{ color: '#EF4444', fontWeight: '700', fontSize: 15 }}>
                              {I18n.t('deleteThisOffer')}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <View style={{ flexDirection: 'row', marginTop: 20, gap: 12 }}>
                          <TouchableOpacity 
                            style={{
                              flex: 1,
                              padding: 16,
                              alignItems: 'center',
                              backgroundColor: effectiveTheme === 'dark' ? '#1F2937' : '#FFFFFF',
                              borderRadius: 12,
                              borderWidth: 1,
                              borderColor: effectiveTheme === 'dark' ? '#475569' : '#E5E7EB',
                              elevation: 6,
                              shadowColor: '#6B7280',
                              shadowOffset: { width: 0, height: 3 },
                              shadowOpacity: 0.15,
                              shadowRadius: 6,
                            }}
                            onPress={closeModal}
                          >
                            <Text style={{
                              color: effectiveTheme === 'dark' ? '#E5E7EB' : '#374151',
                              fontSize: 17,
                              fontWeight: '600'
                            }}>Cancel</Text>
                          </TouchableOpacity>
                          <TouchableOpacity 
                            style={{
                              flex: 1,
                              borderRadius: 12,
                              elevation: 8,
                              shadowColor: '#00B8DB',
                              shadowOffset: { width: 0, height: 4 },
                              shadowOpacity: 0.3,
                              shadowRadius: 8,
                            }}
                            onPress={handleSave}
                          >
                            <LinearGradient
                              colors={['#00B8DB', '#0092B8']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{
                                padding: 16,
                                alignItems: 'center',
                                justifyContent: 'center',
                                borderRadius: 12,
                              }}
                            >
                              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700' }}>Save</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>

      {/* نافذة مودال الفاتورة مع نفس التأثيرات البصرية */}
      <Modal visible={invoiceModalVisible} transparent animationType="none" onRequestClose={closeInvoiceModal}>
        <View style={{ flex: 1 }}>
          <BlurView
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            tint="dark"
            intensity={85}
          />
          <View
            pointerEvents="none"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.4)'
            }}
          />
          
          <Animated.View
            className="flex-1 justify-end bg-transparent"
            style={{
              transform: [
                {
                  translateY: invoiceModalAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [600, 0],
                  }),
                },
              ],
            }}
          >
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
              style={{ flex: 1 }}
              keyboardVerticalOffset={0}
            >
              <View className="flex-1 justify-end">
                <View 
                  className={`${effectiveTheme === 'dark' ? 'bg-slate-900' : 'bg-white'} rounded-t-[28px] px-6 pt-5 pb-0`}
                  style={{
                    maxHeight: Platform.OS === 'android' ? '90%' : '95%',
                    minHeight: Platform.OS === 'android' ? '75%' : '88%',
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: -4 },
                    shadowOpacity: 0.25,
                    shadowRadius: 10,
                    elevation: 20,
                  }}
                >
                      <View className="flex-row justify-between items-center px-0 pt-0 pb-5">
                        <Text className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>Time Up</Text>
                        <TouchableOpacity onPress={closeInvoiceModal}>
                          <Text className={`text-[34px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-gray-400'}`}>×</Text>
                        </TouchableOpacity>
                      </View>
                      
                      <ScrollView 
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={{ paddingBottom: 40, flexGrow: 1 }}
                      >
                        {/* محتوى الفاتورة */}
                        <View className="py-5">
                          {/* Header */}
                          <View className="items-center mb-6">
                            <Text className="text-2xl font-bold text-cyan-600 mb-2">Time Up</Text>
                            <Text className="text-sm text-slate-500 mb-0.5">{INVOICE_BUSINESS_ADDRESS}</Text>
                            <Text className="text-sm text-slate-500 mb-0.5">{INVOICE_BUSINESS_PHONE}</Text>
                          </View>

                          {/* Invoice Title Button */}
                          <View className="items-center mb-4">
                            <View className="bg-cyan-600 px-6 py-3 rounded-xl">
                              <Text className="text-white text-base font-semibold">Subscription Invoice</Text>
                            </View>
                          </View>

                          {/* Invoice Date */}
                          <View className="items-center mb-6">
                            <Text className="text-base text-slate-500">{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</Text>
                          </View>

                          {/* Customer Information Card */}
                          <View className="bg-transparent rounded-xl p-0 mb-4">
                            <Text className={`text-[17px] font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-3`}>Customer Information</Text>
                            <View className={`${effectiveTheme === 'dark' ? 'bg-slate-800 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border-2`}>
                              <View className="flex-row justify-between items-center mb-3">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>First Name:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{currentInvoiceSubscriber?.first_name || '-'}</Text>
                              </View>
                              <View className="flex-row justify-between items-center mb-3">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Last Name:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{currentInvoiceSubscriber?.last_name || '-'}</Text>
                              </View>
                              <View className="flex-row justify-between items-center mb-3">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Phone Number:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{currentInvoiceSubscriber?.phone}</Text>
                              </View>
                              <View className="flex-row justify-between items-center mb-0">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Address:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{currentInvoiceSubscriber?.address}</Text>
                              </View>
                            </View>
                          </View>

                          {/* Subscription Information Card */}
                          <View className="bg-transparent rounded-xl p-0 mb-4">
                            <Text className={`text-[17px] font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-3`}>Subscription Information</Text>
                            <View className={`${effectiveTheme === 'dark' ? 'bg-slate-800 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border-2`}>
                              <View className="flex-row justify-between items-center mb-3">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Starts:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{formatDateForInvoice(currentInvoiceSubscriber?.start_date)}</Text>
                              </View>
                              <View className="flex-row justify-between items-center mb-3">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Ends:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{formatDateForInvoice(currentInvoiceSubscriber?.end_date)}</Text>
                              </View>
                              <View className="flex-row justify-between items-center mb-3">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Remaining:</Text>
                                <Text className={`text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'} font-semibold text-right flex-1 ml-3`}>{invoiceRemainingText}</Text>
                              </View>
                              <View className="flex-row justify-between items-center mb-0">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Status:</Text>
                                <View 
                                  className="px-3 py-1 rounded-full"
                                  style={{
                                    backgroundColor: (invoiceRemainingDays ?? -1) > 7 
                                      ? (effectiveTheme === 'dark' ? '#032E15' : '#DCFCE7')
                                      : (invoiceRemainingDays ?? -1) >= 0 
                                      ? (effectiveTheme === 'dark' ? '#441306' : '#FEF3C7')
                                      : (effectiveTheme === 'dark' ? '#441306' : '#FEE2E2')
                                  }}
                                >
                                  <Text 
                                    className="text-sm font-semibold"
                                    style={{
                                      color: (invoiceRemainingDays ?? -1) > 7 
                                        ? (effectiveTheme === 'dark' ? '#05DF72' : '#16A34A')
                                        : (invoiceRemainingDays ?? -1) >= 0 
                                        ? (effectiveTheme === 'dark' ? '#FF8904' : '#D97706')
                                        : (effectiveTheme === 'dark' ? '#FF6467' : '#DC2626')
                                    }}
                                  >
                                    {invoiceStatus}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          </View>

                          {/* Payment Information Card */}
                          <View className="bg-transparent rounded-xl p-0 mb-5">
                            <Text className={`text-[17px] font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'} mb-3`}>Payment Information</Text>
                            <View className={`${effectiveTheme === 'dark' ? 'bg-slate-800 border-gray-600' : 'bg-gray-50 border-gray-200'} rounded-xl p-4 border-2`}>
                              <View className="flex-row justify-between items-center mb-0">
                                <Text className={`text-[15px] ${effectiveTheme === 'dark' ? 'text-gray-300' : 'text-slate-600'} font-medium`}>Amount:</Text>
                                <Text className="text-lg text-cyan-600 font-bold text-right flex-1 ml-3">{currentInvoiceSubscriber?.price || '-'} DZD</Text>
                              </View>
                            </View>
                          </View>

                          {/* QR Code Section */}
                          <View className="items-center mb-5">
                            <View className="bg-white p-5 rounded-xl mb-3 border border-slate-200">
                              <Image
                                source={{ uri: invoiceQrUrl }}
                                style={{ width: 120, height: 120, borderRadius: 8 }}
                                resizeMode="contain"
                              />
                            </View>
                            <Text className="text-sm text-slate-500 text-center">Scan to verify invoice details</Text>
                          </View>
                        </View>
                        
                        <View className="flex-row gap-4 mt-5">
                          <TouchableOpacity className="flex-1 bg-cyan-600 flex-row items-center justify-center py-3.5 rounded-xl" onPress={handleShareInvoice}>
                            <Ionicons name="share-outline" size={20} color="white" style={{ marginRight: 2 }} />
                            <Text className="text-white text-base font-semibold ml-1.5">Share</Text>
                          </TouchableOpacity>
                          <TouchableOpacity className="flex-1 bg-white border-2 border-gray-300 flex-row items-center justify-center py-3.5 rounded-xl" onPress={handlePrintInvoice}>
                            <Ionicons name="print-outline" size={20} color="#374151" style={{ marginRight: 2 }} />
                            <Text className="text-gray-700 text-base font-semibold ml-1.5">Print</Text>
                          </TouchableOpacity>
                        </View>
                      </ScrollView>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Animated.View>
        </View>
      </Modal>
      
    </>
  );
  }

  return (
    <ScreenBackground>
      <SafeAreaView style={{ flex: 1, backgroundColor: 'transparent' }}>
        <GestureDetector gesture={swipeGesture}>
          <Reanimated.View style={[{ flex: 1 }, swipeAnimatedStyle]}>
            {renderMainContent()}
          </Reanimated.View>
        </GestureDetector>
      </SafeAreaView>

      <SubscriberDetailsModal
        visible={detailsModalVisible}
        subscriber={currentDetailsSubscriber}
        onClose={closeDetailsModal}
        offers={currentDetailsOffers}
      />
    </ScreenBackground>
  );
}
