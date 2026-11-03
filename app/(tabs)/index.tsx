import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useIsFocused, useNavigation } from '@react-navigation/native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Animated, Easing, Image, KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, TouchableWithoutFeedback, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import ScreenBackground from '../../components/ScreenBackground';
import OfferPicker from '../../components/OfferPicker';
import { addUserOffer } from '../../src/database/offersDb';
import SubscriberDetailsModal, { formatDate } from '../../components/SubscriberDetailsModal';
import SubscriberListModal from '../../components/SubscriberListModal';
import OfferProgressList from '../../components/OfferProgressList';
import DurationChips from '../../components/DurationChips';
import { groupByPerson, PersonGroup } from '../../src/utils/subscriberGroups';
import { Donut, OfferRanking, RevenueBars } from '../../components/DashboardCharts';
import { DEFAULT_OFFER_COLOR, getAccentOnSurface, getMutedBorderColor, getMutedCardColor, getOfferIcon, getReadableTextColor } from '../../src/constants/offers';
import { useTheme } from '../../hooks/useTheme';
import { useTabSwipeNavigation } from '../../hooks/useTabSwipeNavigation';
import { addSubscriber, getAllSubscribers, initDatabase } from '../../src/database/db';
import { onSyncComplete } from '../../src/database/syncEngine';
import { scheduleSubscriberNotifications } from '../../src/services/notificationService';
import I18n from '../../src/i18n';

interface Subscriber {
  id?: string;
  first_name: string;
  last_name: string;
  phone: string;
  address?: string;
  start_date: string;
  end_date: string;
  price: string;
  offer?: string;
  color?: string;
  daysLeft: number;
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

// all = الأشخاص، subscriptions = كل الاشتراكات (الشخص بعرضين = اشتراكان)
type ListKey = 'all' | 'subscriptions' | 'active' | 'expiring' | 'expired';

// ألوان بطاقات الحالات — المنتهي بالأحمر
const STATUS_COLORS: Record<ListKey, string> = {
  all: '#00bcd4',
  subscriptions: '#818cf8',
  active: '#00bcd4',
  expiring: '#fbbf24',
  expired: '#ef4444',
};

/** المشتركون حسب الحالة، الأقرب انتهاءً أولاً */
const filterByStatus = <T extends { daysLeft: number }>(list: T[], key: ListKey) =>
  list
    .filter((s) =>
      key === 'all' || key === 'subscriptions'
        ? true
        : key === 'active'
        ? s.daysLeft > 7
        : key === 'expiring'
        ? s.daysLeft >= 0 && s.daysLeft <= 7
        : s.daysLeft < 0
    )
    .sort((a, b) => a.daysLeft - b.daysLeft);

export default function Dashboard() {
  const navigation = useNavigation<any>();
  const { effectiveTheme } = useTheme();
  
  // حالات الـ Modal والنموذج
  const [modalVisible, setModalVisible] = useState(false);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [currentDetailsSubscriber, setCurrentDetailsSubscriber] = useState<any>(null);

  const [currentDetailsOffers, setCurrentDetailsOffers] = useState<any[]>([]);

  const openDetailsModal = (subscriber: any, offers?: any[]) => {
    setCurrentDetailsSubscriber(subscriber);
    setCurrentDetailsOffers(offers ?? [subscriber]);
    setDetailsModalVisible(true);
  };

  const closeDetailsModal = () => {
    setDetailsModalVisible(false);
    setCurrentDetailsSubscriber(null);
  };

  // قائمة الأسماء عند الضغط على بطاقة إحصائية
  const [listKey, setListKey] = useState<ListKey | null>(null);

  const openFromList = (group: { key: string }) => {
    setListKey(null);
    // التفاصيل تعرض كل عروض الشخص، وليس فقط عروض هذه الحالة
    const person = personGroups.find((g) => g.key === group.key);
    if (!person) return;
    // ننتظر إغلاق النافذة الأولى قبل فتح التفاصيل
    setTimeout(() => openDetailsModal(person.primary, person.items), 350);
  };
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
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // أنيميشن العنوان
  const titleAnim = useRef(new Animated.Value(-60)).current;
  const subtitleAnim = useRef(new Animated.Value(-50)).current;

  // أنيميشن واحد لكل البطاقات (معًا)
  const cardAnim = useRef(new Animated.Value(50)).current;
  // أنيميشن المودال (ارتداد من الأسفل)
  const modalAnim = useRef(new Animated.Value(0)).current;
  const { swipeGesture, swipeAnimatedStyle } = useTabSwipeNavigation('index', { disabled: modalVisible });

  const isFocused = useIsFocused();

  const processedSubscribers = useMemo(() => subscribers.map((sub) => {
    const end = parseDateStringAsLocalDate(sub.end_date);
    const today = new Date();
    const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000*60*60*24));
    return { ...sub, daysLeft };
  }), [subscribers]);

  const stats = useMemo(() => ({
    totalSubscribers: processedSubscribers.length,
    activeSubscriptions: processedSubscribers.filter(s => s.daysLeft > 7).length,
    expiringThisWeek: processedSubscribers.filter(s => s.daysLeft >= 0 && s.daysLeft <= 7).length,
    expiredSubscriptions: processedSubscribers.filter(s => s.daysLeft < 0).length,
  }), [processedSubscribers]);

  // تحميل بيانات المشتركين من قاعدة البيانات
  const loadSubscribers = useCallback(() => {
    setLoading(true);
    setError(null);
    getAllSubscribers((data: Subscriber[]) => {
      try {
        const processed = data.map((sub) => {
          const end = parseDateStringAsLocalDate(sub.end_date);
          const today = new Date();
          const daysLeft = Math.ceil((end.getTime() - today.getTime()) / (1000*60*60*24));
          return { ...sub, daysLeft };
        });
        setSubscribers(processed);
      } catch (e) {
        console.error('Error processing subscribers:', e);
        setError(I18n.t('loadFailed'));
      } finally {
        setLoading(false);
      }
    });
  }, []);

  // قائمة المشتركين الحديثين (أحدث 5 مشتركين)
  // كل شخص مرة واحدة مع كل عروضه (القائمة مرتبة من الأحدث)
  const personGroups = useMemo(() => groupByPerson(processedSubscribers), [processedSubscribers]);
  const recentGroups = personGroups.slice(0, 5);

  // تحميل البيانات عند دخول الصفحة أو العودة إليها
  useEffect(() => {
    if (isFocused) {
      initDatabase();
      loadSubscribers();
    }
  }, [isFocused, loadSubscribers]);

  // بعد كل مزامنة (مثلاً بعد تسجيل الدخول) نعيد القراءة
  useEffect(() => {
    const unsubscribe = onSyncComplete(() => loadSubscribers());
    return () => {
      unsubscribe();
    };
  }, [loadSubscribers]);

  useEffect(() => {
    if (isFocused) {
      // إعادة تعيين القيم
      titleAnim.setValue(-60);
      subtitleAnim.setValue(-50);
      cardAnim.setValue(50);

      // تشغيل كل شيء معًا
      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(subtitleAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        Animated.timing(cardAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
      ]).start();
    }
  }, [isFocused, titleAnim, subtitleAnim, cardAnim]);

  // Hide tab bar when modal is open
  useEffect(() => {
    if (modalVisible) {
      navigation.setOptions({
        tabBarStyle: { display: 'none' }
      });
    } else {
      navigation.setOptions({
        tabBarStyle: { display: 'flex' }
      });
    }
  }, [modalVisible, navigation]);

  // دالة لتطبيق الأنيميشن على كل البطاقات
  const getCardStyle = () => ({
    transform: [{ translateY: cardAnim }],
    opacity: cardAnim.interpolate({
      inputRange: [0, 50],
      outputRange: [1, 0],
    }),
  });

  // دوال الـ Modal
  const openModal = () => {
    setModalVisible(true);
    Animated.timing(modalAnim, {
      toValue: 1,
      duration: 800,
      easing: Easing.elastic(1.2),
      useNativeDriver: true,
    }).start();
  };

  const closeModal = () => {
    Animated.timing(modalAnim, {
      toValue: 0,
      duration: 400,
      easing: Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start(() => {
      setModalVisible(false);
      // إعادة تعيين الحقول
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

  // Form validation states for Modal
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!firstName.trim()) errors.firstName = I18n.t('firstNameRequired');
    if (!lastName.trim()) errors.lastName = I18n.t('lastNameRequired');
    if (!phone.trim()) errors.phone = I18n.t('phoneRequired');
    if (!price.trim()) errors.price = I18n.t('priceRequired');
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      alert(Object.values(formErrors).join('\n'));
      return;
    }

    const endDateStr = formatDateToISO(endDate);
    const startDateStr = formatDateToISO(startDate);

    // العرض المكتوب يدوياً يُحفظ في قائمة العروض ليظهر في كل مكان
    if (offer.trim()) {
      addUserOffer(offer.trim(), color, () => {});
    }

    addSubscriber(firstName, lastName, phone, address, startDateStr, endDateStr, price, offer, color, async (insertId: number) => {
      // جدولة الإشعارات للمشترك الجديد
      await scheduleSubscriberNotifications(insertId, firstName, lastName, endDateStr);
      loadSubscribers();
      closeModal();
    });
  };

  // بطاقة شخص في "آخر المشتركين": كل عروضه مع شريط التقدّم
  const RecentSubscriberItem = ({ group }: { group: PersonGroup<Subscriber> }) => {
    const sub = group.primary;
    const status =
      sub.daysLeft < 0
        ? { label: I18n.t('expired'), bg: '#FEE2E2', fg: '#B91C1C' }
        : sub.daysLeft <= 7
        ? { label: I18n.t('expiring'), bg: '#FEF3C7', fg: '#B45309' }
        : { label: I18n.t('active'), bg: '#DCFCE7', fg: '#15803D' };

    // لون البطاقة من العرض الأقرب انتهاءً — تدرّج هادئ بدل اللون الصارخ
    const isDark = effectiveTheme === 'dark';
    const offerColor = sub.color || DEFAULT_OFFER_COLOR;
    const cardColor = getMutedCardColor(offerColor, isDark);
    const borderColor = getMutedBorderColor(offerColor, isDark);
    const onCard = isDark ? '#E5E7EB' : '#1F2937';

    return (
      <Animated.View style={getCardStyle()}>
        <TouchableOpacity
          activeOpacity={0.7}
          onPress={() => openDetailsModal(sub, group.items)}
          className="p-4 rounded-xl mb-2"
          style={{
            backgroundColor: cardColor,
            borderWidth: 1,
            borderColor: borderColor,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: isDark ? 0.25 : 0.06,
            shadowRadius: 8,
            elevation: 3,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
            {/* أيقونة الخدمة */}
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: offerColor,
              }}
            >
              <Ionicons name={getOfferIcon(sub.offer) as any} size={22} color={getReadableTextColor(offerColor)} />
            </View>

            <Text numberOfLines={1} style={{ flex: 1, fontSize: 16, fontWeight: '700', color: onCard }}>
              {group.name}
            </Text>

            <View style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: status.bg }}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: status.fg }}>{status.label}</Text>
            </View>
          </View>

          {/* كل عرض: الاسم + تاريخ الانتهاء، وتحته شريط التقدّم */}
          <View style={{ marginTop: 12 }}>
            <OfferProgressList items={group.items} isDark={isDark} />
          </View>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderAddSubscriberModal = () => (
    <Modal visible={modalVisible} transparent animationType="none" onRequestClose={closeModal}>
      <View style={{ flex: 1 }}>
        {/* خلفية ضبابية داكنة مثل الصورة */}
        <BlurView
          style={StyleSheet.absoluteFill}
          tint="dark"
          intensity={85}
        />
        {/* overlay */}
        <Animated.View className="flex-1 justify-end" style={{ transform: [{ translateY: modalAnim.interpolate({ inputRange: [0,1], outputRange: [600,0] }) }] }}>
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={{ flex: 1 }}
            keyboardVerticalOffset={0}
          >
            <TouchableWithoutFeedback onPress={closeModal}>
              <View className="flex-1 justify-end">
                <TouchableWithoutFeedback onPress={() => {}}>
                  <View 
                    className={`rounded-t-[28px] px-6 pt-5 ${effectiveTheme === 'dark' ? 'bg-slate-900' : 'bg-white'}`}
                    style={{
                      paddingBottom: 0,
                      maxHeight: Platform.OS === 'android' ? '90%' : '95%',
                      minHeight: Platform.OS === 'android' ? '75%' : '88%',
                      elevation: 20,
                      ...(Platform.OS !== 'web' && {
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: -4 },
                        shadowOpacity: 0.25,
                        shadowRadius: 10,
                      }),
                    }}
                  >
                  {/* Header */}
                  <View className="flex-row justify-between items-center px-0 pt-0 pb-5">
                    <Text className={`text-xl font-bold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>{I18n.t('addSubscriberTitle')}</Text>
                    <TouchableOpacity onPress={closeModal}>
                      <Text className={`text-[34px] ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'}`}>×</Text>
                    </TouchableOpacity>
                  </View>

                  <ScrollView 
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
                  >
                    <TextInput 
                      className={`p-4 mb-4 text-base rounded-xl border-2 ${(formErrors.firstName || formErrors.lastName) ? 'border-red-500' : effectiveTheme === 'dark' ? 'border-slate-600' : 'border-gray-200'} ${effectiveTheme === 'dark' ? 'bg-slate-800 text-gray-200' : 'bg-gray-50 text-black'}`}
                      placeholder={I18n.t('firstName')} 
                      value={firstName} 
                      onChangeText={(text) => {
                        setFirstName(text);
                        if (formErrors.firstName) setFormErrors({...formErrors, firstName: ''});
                      }} 
                    />
                    {formErrors.firstName && <Text className="text-red-500 text-sm mb-2 ml-2">{formErrors.firstName}</Text>}
                    <TextInput 
                      className={`p-4 mb-4 text-base rounded-xl border-2 ${effectiveTheme === 'dark' ? 'bg-slate-800 border-slate-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-black'}`}
                      placeholder={I18n.t('lastName')} 
                      value={lastName} 
                      onChangeText={setLastName} 
                    />
                    {formErrors.lastName && <Text className="text-red-500 text-sm mb-2">{formErrors.lastName}</Text>}

                    <View className={`flex-row items-center rounded-[14px] mb-4 border ${effectiveTheme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <Text className={`pl-4 pr-1 text-base font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>0</Text>
                      <TextInput
                        className={`flex-1 py-4 pr-4 text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-black'}`}
                        placeholder="XXX XX XX XX"
                        value={phone}
                        // أرقام فقط، وبحد أقصى 9 خانات (بعد الصفر)
                        onChangeText={(text) => setPhone(text.replace(/[^0-9]/g, '').slice(0, 9))}
                        keyboardType="number-pad"
                        maxLength={9}
                      />
                    </View>
                    {formErrors.phone && <Text className="text-red-500 text-sm mb-2">{formErrors.phone}</Text>}

                    <TextInput 
                      className={`p-4 mb-4 text-base rounded-xl border-2 ${effectiveTheme === 'dark' ? 'bg-slate-800 border-slate-600 text-gray-200' : 'bg-gray-50 border-gray-200 text-black'}`}
                      placeholder="Cité ..., Cheraga 16000"
                      value={address}
                      onChangeText={setAddress}
                    />

                    {/* العرض + اللون */}
                    <OfferPicker
                      offer={offer}
                      color={color}
                      onChangeOffer={setOffer}
                      onChangeColor={setColor}
                    />

                    {/* Start Date */}
                    <View className="relative my-2">
                      <Text className={`absolute left-4 -top-2 px-1.5 text-xs font-semibold z-10 ${effectiveTheme === 'dark' ? 'bg-slate-800 text-cyan-400' : 'bg-gray-50 text-blue-600'}`}>
                        {I18n.t('startDate')}
                      </Text>
                      <TouchableOpacity 
                        className={`flex-row items-center justify-between border-2 rounded-2xl px-4 py-4 my-2 ${effectiveTheme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
                        style={{
                          elevation: 3,
                          ...(Platform.OS !== 'web' && {
                            shadowColor: effectiveTheme === 'dark' ? '#000' : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: effectiveTheme === 'dark' ? 0.3 : 0.1,
                            shadowRadius: 4,
                          }),
                        }}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <TextInput 
                          className={`flex-1 text-base font-medium pr-2 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}
                          value={startDate.toLocaleDateString('en-US')} 
                          editable={false}
                          placeholder={I18n.t('selectStartDate')}
                          placeholderTextColor={effectiveTheme === 'dark' ? '#888' : '#9CA3AF'}
                        />
                        <Ionicons name="calendar-outline" size={22} color={effectiveTheme === 'dark' ? '#00B8DB' : '#0092B8'} />
                      </TouchableOpacity>
                    </View>

                    {showStartDatePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={(_event, selectedDate) => {
                          setShowStartDatePicker(false);
                          if (selectedDate) setStartDate(selectedDate);
                        }}
                      />
                    )}

                    {/* مدة سريعة: أسبوع / شهر / سنة... تحسب تاريخ النهاية */}
                    <DurationChips
                      startDate={startDate}
                      endDate={endDate}
                      onPick={setEndDate}
                      isDark={effectiveTheme === 'dark'}
                    />

                    {/* End Date */}
                    <View className="relative my-2">
                      <Text className={`absolute left-4 -top-2 px-1.5 text-xs font-semibold z-10 ${effectiveTheme === 'dark' ? 'bg-slate-800 text-cyan-400' : 'bg-gray-50 text-blue-600'}`}>
                        {I18n.t('endDate')}
                      </Text>
                      <TouchableOpacity 
                        className={`flex-row items-center justify-between border-2 rounded-2xl px-4 py-4 my-2 ${effectiveTheme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-200'}`}
                        style={{
                          elevation: 3,
                          ...(Platform.OS !== 'web' && {
                            shadowColor: effectiveTheme === 'dark' ? '#000' : '#000',
                            shadowOffset: { width: 0, height: 2 },
                            shadowOpacity: effectiveTheme === 'dark' ? 0.3 : 0.1,
                            shadowRadius: 4,
                          }),
                        }}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <TextInput 
                          className={`flex-1 text-base font-medium pr-2 ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}
                          value={endDate.toLocaleDateString('en-US')} 
                          editable={false}
                          placeholder={I18n.t('selectEndDate')}
                          placeholderTextColor={effectiveTheme === 'dark' ? '#888' : '#9CA3AF'}
                        />
                        <Ionicons name="calendar-outline" size={22} color={effectiveTheme === 'dark' ? '#00B8DB' : '#0092B8'} />
                      </TouchableOpacity>
                    </View>

                    {showEndDatePicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={(_event, selectedDate) => {
                          setShowEndDatePicker(false);
                          if (selectedDate) setEndDate(selectedDate);
                        }}
                      />
                    )}

                    {/* Price Field مع لاحقة ,00 DZD */}
                    <View className={`flex-row items-center mb-4 rounded-xl border-2 ${effectiveTheme === 'dark' ? 'bg-slate-800 border-slate-600' : 'bg-gray-50 border-gray-200'}`}>
                      <TextInput
                        className={`flex-1 p-4 text-base ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-black'}`}
                        placeholder="Price"
                        value={price}
                        onChangeText={(text) => setPrice(text.replace(/[^0-9]/g, ''))}
                        keyboardType="number-pad"
                      />
                      <Text className={`pr-4 text-base font-semibold ${effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>,00 DZD</Text>
                    </View>
                    {formErrors.price && <Text className="text-red-500 text-sm mb-2">{formErrors.price}</Text>}

                    <View className="flex-row mt-5 gap-3">
                      <TouchableOpacity 
                        style={{
                          flex: 1,
                          padding: 16,
                          alignItems: 'center',
                          backgroundColor: effectiveTheme === 'dark' ? '#1F2937' : '#FFFFFF',
                          borderRadius: 12,
                          borderWidth: 2,
                          borderColor: effectiveTheme === 'dark' ? '#475569' : '#E5E7EB',
                          elevation: 6,
                          ...(Platform.OS !== 'web' && {
                            shadowColor: '#6B7280',
                            shadowOffset: { width: 0, height: 3 },
                            shadowOpacity: 0.15,
                            shadowRadius: 6,
                          }),
                        }}
                        onPress={closeModal}
                      >
                        <Text className={`text-[17px] font-semibold ${effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'}`}>{I18n.t('cancel')}</Text>
                      </TouchableOpacity>
                      <TouchableOpacity 
                        style={{
                          flex: 1,
                          borderRadius: 12,
                          elevation: 8,
                          ...(Platform.OS !== 'web' && {
                            shadowColor: '#00B8DB',
                            shadowOffset: { width: 0, height: 4 },
                            shadowOpacity: 0.3,
                            shadowRadius: 8,
                          }),
                        }}
                        onPress={handleSave}
                      >
                        <LinearGradient
                          colors={['#00B8DB', '#0092B8']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={{
                            padding: 16,
                            borderRadius: 12,
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                        >
                          <Text className="text-white text-[17px] font-bold">{I18n.t('save')}</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </ScrollView>
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </Animated.View>
      </View>
    </Modal>
  );

  return (
    <ScreenBackground>
      <GestureDetector gesture={swipeGesture}>
        <Reanimated.View style={[{ flex: 1 }, swipeAnimatedStyle]}>
          {renderContent()}
        </Reanimated.View>
      </GestureDetector>

      <SubscriberDetailsModal
        visible={detailsModalVisible}
        subscriber={currentDetailsSubscriber}
        onClose={closeDetailsModal}
        offers={currentDetailsOffers}
      />

      <SubscriberListModal
        visible={listKey !== null}
        title={
          listKey === 'all'
            ? I18n.t('totalSubscribers')
            : listKey === 'subscriptions'
            ? I18n.t('totalSubscriptions')
            : listKey
            ? I18n.t(listKey)
            : ''
        }
        // بطاقة الاشتراكات: سطر لكل اشتراك، حتى يطابق العدد ما في البطاقة
        grouped={listKey !== 'subscriptions'}
        accent={listKey ? STATUS_COLORS[listKey] : STATUS_COLORS.all}
        subscribers={listKey ? filterByStatus(processedSubscribers, listKey) : []}
        onClose={() => setListKey(null)}
        onSelect={openFromList}
      />
    </ScreenBackground>
  );
  function renderContent() {
    const isDark = effectiveTheme === 'dark';
    const text = isDark ? '#ffffff' : '#0d1525';
    const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.55)';
    const cardStyle = {
      backgroundColor: isDark ? 'rgba(15,23,40,0.9)' : 'rgba(255,255,255,0.97)',
      borderWidth: 1,
      borderColor: isDark ? 'rgba(0,188,212,0.16)' : 'rgba(0,188,212,0.22)',
      borderRadius: 16,
      padding: 16,
    } as const;

    // إحصائيات محسوبة من بيانات المشتركين الحقيقية
    const counts = {
      all: processedSubscribers.length,
      active: processedSubscribers.filter((s) => s.daysLeft > 7).length,
      expiring: processedSubscribers.filter((s) => s.daysLeft >= 0 && s.daysLeft <= 7).length,
      expired: processedSubscribers.filter((s) => s.daysLeft < 0).length,
    };

    const totalRevenue = processedSubscribers
      // الإيرادات منذ اليوم الأول: كل الاشتراكات، بما فيها المنتهية
      .reduce((sum, s) => sum + (Number(s.price) || 0), 0);

    // ترتيب العروض حسب عدد المشتركين
    const grouped = new Map<string, { name: string; color: string; count: number; revenue: number }>();
    processedSubscribers.forEach((sub) => {
      const name = (sub.offer || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const existing = grouped.get(key);
      const priceValue = Number(sub.price) || 0;
      if (existing) {
        existing.count += 1;
        existing.revenue += priceValue;
      } else {
        grouped.set(key, {
          name,
          color: sub.color || DEFAULT_OFFER_COLOR,
          count: 1,
          revenue: priceValue,
        });
      }
    });
    const ranking = Array.from(grouped.values()).sort((a, b) => b.count - a.count);

    const donutData = [
      { label: I18n.t('active'), value: counts.active, color: '#00bcd4' },
      { label: I18n.t('expiring'), value: counts.expiring, color: '#fbbf24' },
      { label: I18n.t('expired'), value: counts.expired, color: STATUS_COLORS.expired },
    ];

    // عدد الأشخاص (وليس العروض) في كل حالة — نفس عدد الأسماء في القائمة
    const peopleIn = (key: ListKey) => groupByPerson(filterByStatus(processedSubscribers, key)).length;

    // بطاقات الحالات — الضغط عليها يفتح قائمة الأسماء
    const statCards: { key: ListKey; label: string; value: number; color: string }[] = [
      { key: 'all', label: I18n.t('totalSubscribers'), value: peopleIn('all'), color: text },
      { key: 'subscriptions', label: I18n.t('totalSubscriptions'), value: processedSubscribers.length, color: STATUS_COLORS.subscriptions },
      { key: 'active', label: I18n.t('active'), value: peopleIn('active'), color: STATUS_COLORS.active },
      { key: 'expiring', label: I18n.t('expiring'), value: peopleIn('expiring'), color: STATUS_COLORS.expiring },
      { key: 'expired', label: I18n.t('expired'), value: peopleIn('expired'), color: STATUS_COLORS.expired },
    ];

    return (
      <Animated.ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24, paddingHorizontal: 16, paddingTop: 40 }}
      >
        {/* الشعار */}
        <Animated.View
          style={{
            alignItems: 'flex-start',
            marginBottom: 10,
            transform: [{ translateY: titleAnim }],
            opacity: titleAnim.interpolate({ inputRange: [-60, 0], outputRange: [0, 1] }),
          }}
        >
          <Text
            style={{
              fontSize: 26,
              fontWeight: '700',
              color: isDark ? '#00B8DB' : '#0092B8',
            }}
          >
            {I18n.t('appName')}
          </Text>
        </Animated.View>

        {/* العنوان والملخّص */}
        <Animated.View
          style={{
            marginBottom: 16,
            transform: [{ translateY: subtitleAnim }],
            opacity: subtitleAnim.interpolate({ inputRange: [-50, 0], outputRange: [0, 1] }),
          }}
        >
          <Text style={{ fontSize: 24, fontWeight: '700', color: text }}>{I18n.t('dashboard')}</Text>
          <Text style={{ fontSize: 13, color: muted, marginTop: 2 }}>
            {personGroups.length} {I18n.t('clients')} · {counts.all} {I18n.t('subscriptionsCount')} · {ranking.length} {I18n.t('offers')} ·{' '}
            <Text style={{ color: '#00bcd4', fontWeight: '600' }}>{totalRevenue} DZD</Text>
          </Text>
        </Animated.View>

        {error && (
          <View style={[cardStyle, { marginBottom: 16, borderColor: '#ef4444' }]}>
            <Text style={{ color: '#ef4444', fontWeight: '500' }}>{error}</Text>
          </View>
        )}
        {loading && (
          <View style={[cardStyle, { marginBottom: 16, alignItems: 'center' }]}>
            <ActivityIndicator size="large" color="#0092B8" />
            <Text style={{ marginTop: 8, color: muted }}>{I18n.t('loading')}</Text>
          </View>
        )}

        {/* زر إضافة مشترك */}
        <Animated.View style={getCardStyle()}>
          <TouchableOpacity activeOpacity={0.85} onPress={openModal} style={{ marginBottom: 16 }}>
            <LinearGradient
              colors={['#00bcd4', '#0097a7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={{
                borderRadius: 16,
                paddingVertical: 18,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 30,
                  height: 30,
                  borderRadius: 15,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255,255,255,0.22)',
                }}
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </View>
              <Text style={{ color: '#ffffff', fontSize: 17, fontWeight: '700' }}>
                {I18n.t('addSubscriber').replace('+ ', '')}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </Animated.View>

        {/* بطاقات الإحصائيات */}
        <Animated.View
          style={[getCardStyle(), { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 }]}
        >
          {statCards.map((s) => (
            <TouchableOpacity
              key={s.key}
              activeOpacity={0.75}
              onPress={() => setListKey(s.key)}
              style={[
                cardStyle,
                { flexGrow: 1, flexBasis: '45%' },
                s.key === 'expired' && {
                  borderColor: isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.4)',
                },
              ]}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                <Text
                  // سطران كحد أقصى، والخط يصغر تلقائياً حتى يظهر النص كاملاً داخل البطاقة
                  numberOfLines={2}
                  adjustsFontSizeToFit
                  minimumFontScale={0.75}
                  style={{
                    flex: 1,
                    fontSize: 11,
                    fontWeight: '600',
                    letterSpacing: 0.5,
                    textTransform: 'uppercase',
                    color: s.key === 'expired' ? STATUS_COLORS.expired : muted,
                  }}
                >
                  {s.label}
                </Text>
                <Ionicons name="chevron-forward" size={14} color={muted} />
              </View>
              <Text style={{ fontSize: 28, fontWeight: '700', marginTop: 6, color: s.color }}>
                {s.value}
              </Text>
            </TouchableOpacity>
          ))}

          {/* الإيرادات منذ البداية — آخر بطاقة في الشبكة (2×3) */}
          <View style={[cardStyle, { flexGrow: 1, flexBasis: '45%' }]}>
            <Text
              style={{
                fontSize: 11,
                fontWeight: '600',
                letterSpacing: 1,
                textTransform: 'uppercase',
                color: muted,
              }}
            >
              {I18n.t('totalRevenue')}
            </Text>
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              style={{ fontSize: 28, fontWeight: '700', marginTop: 6, color: '#00bcd4' }}
            >
              {totalRevenue}
              <Text style={{ fontSize: 14, fontWeight: '600' }}> DZD</Text>
            </Text>
          </View>
        </Animated.View>

        {/* العروض الأكثر استعمالاً */}
        <Animated.View style={[getCardStyle(), cardStyle, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{I18n.t('mostUsedOffers')}</Text>
          <Text style={{ fontSize: 11, color: muted, marginBottom: 14 }}>
            {I18n.t('rankedBySubscribers')}
          </Text>
          <OfferRanking data={ranking} isDark={isDark} textColor={text} mutedColor={muted} />
        </Animated.View>

        {/* توزيع الحالات */}
        <Animated.View style={[getCardStyle(), cardStyle, { marginBottom: 16 }]}>
          <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{I18n.t('statusBreakdown')}</Text>
          <Text style={{ fontSize: 11, color: muted }}>{I18n.t('shareOfAll')}</Text>
          <Donut data={donutData} total={counts.all} isDark={isDark} textColor={text} />
          <View style={{ gap: 8, marginTop: 12 }}>
            {donutData.map((seg) => (
              <View key={seg.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: seg.color }} />
                <Text style={{ flex: 1, fontSize: 12, color: muted }}>{seg.label}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: text }}>{seg.value}</Text>
                <Text style={{ fontSize: 12, color: muted }}>
                  ({counts.all ? Math.round((seg.value / counts.all) * 100) : 0}%)
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* الإيرادات حسب العرض */}
        {ranking.length > 0 && (
          <Animated.View style={[getCardStyle(), cardStyle, { marginBottom: 16 }]}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: text }}>{I18n.t('revenueByOffer')}</Text>
            <Text style={{ fontSize: 11, color: muted, marginBottom: 10 }}>
              {I18n.t('revenuePerOffer')}
            </Text>
            <RevenueBars
              data={ranking.map((r) => ({ label: r.name, value: r.revenue, color: r.color }))}
              isDark={isDark}
              mutedColor={muted}
              textColor={text}
            />
          </Animated.View>
        )}

        {/* آخر المشتركين */}
        <Animated.View style={{ marginBottom: 8 }}>
          <Text style={{ fontSize: 16, fontWeight: '600', marginBottom: 12, color: text }}>
            {I18n.t('recentSubscribers')}
          </Text>
          {recentGroups.map((group) => (
            <RecentSubscriberItem key={group.key} group={group} />
          ))}
        </Animated.View>

        {/* Add Subscriber Modal */}
        {renderAddSubscriberModal()}
      </Animated.ScrollView>
    );
  }
}
