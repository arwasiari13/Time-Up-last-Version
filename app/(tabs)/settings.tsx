import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { reloadAppAsync } from 'expo';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Animated, DevSettings, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { GestureDetector } from 'react-native-gesture-handler';
import Reanimated from 'react-native-reanimated';
import ManageOffersModal from '../../components/ManageOffersModal';
import ScreenBackground from '../../components/ScreenBackground';
import { useAuth } from '../../contexts/AuthContext';
import { useTabSwipeNavigation } from '../../hooks/useTabSwipeNavigation';
import { useTheme } from '../../hooks/useTheme';
import I18n, { getCurrentLocale, needsRTLReload, setLocale } from '../../src/i18n';
import { getAllScheduledNotifications, sendTestNotification } from '../../src/services/notificationService';

export default function Dashboard() {
  // استخدام الثيم
  const { theme, effectiveTheme, setTheme } = useTheme();
  const { signOut } = useAuth();
  const [offersModalVisible, setOffersModalVisible] = useState(false);

  // اختبار الإشعارات: إرسال إشعار فوري + عرض عدد الإشعارات المجدولة
  const handleTestNotification = async () => {
    const sent = await sendTestNotification();
    if (!sent) {
      Alert.alert(I18n.t('notifications'), I18n.t('notifSendFailed'));
      return;
    }
    const scheduled = await getAllScheduledNotifications();
    Alert.alert(
      I18n.t('notifTestSent'),
      `${I18n.t('notifScheduledNow')}: ${scheduled?.length ?? 0}`
    );
  };
  const { swipeGesture, swipeAnimatedStyle } = useTabSwipeNavigation('settings');
  
  // حالة اللغة المختارة
  const [selectedLanguage, setSelectedLanguage] = useState('en');

  // دالة تغيير اللغة
  const changeLanguage = async (lang: string) => {
    const previousLang = getCurrentLocale();
    await setLocale(lang);
    setSelectedLanguage(lang);

    // الانتقال من/إلى العربية يغيّر اتجاه الواجهة، ولا يظهر إلا بعد إعادة التشغيل.
    // Updates.reloadAsync لا يعمل في Expo Go ولا في وضع التطوير، لذلك نستعمل reloadAppAsync.
    // وأي تغيير آخر للغة يحتاج إعادة تشغيل أيضاً: React Compiler يحفظ النصوص المترجمة
    // داخل كل شاشة مفتوحة، فبدون إعادة التشغيل تبقى بعض الكلمات باللغة القديمة.
    if (previousLang !== lang || needsRTLReload(lang)) {
      try {
        await reloadAppAsync('RTL direction changed');
      } catch {
        try {
          DevSettings.reload();
        } catch {
          Alert.alert('', I18n.t('restartToApply'));
        }
      }
    }
  };
  
  // قيم الأنيميشن
  const titleAnim = useRef(new Animated.Value(-60)).current;
  const subtitleAnim = useRef(new Animated.Value(-50)).current;
  // أنيميشن بطاقة اللغة
  const cardTranslateY = useRef(new Animated.Value(300)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  // أنيميشن بطاقة الثيم
  const themeTranslateY = useRef(new Animated.Value(300)).current;
  const themeOpacity = useRef(new Animated.Value(0)).current;
  // أنيميشن بطاقة About
  const aboutTranslateY = useRef(new Animated.Value(300)).current;
  const aboutOpacity = useRef(new Animated.Value(0)).current;
  // أنيميشن البطاقة الرابعة الصغيرة
  const extraTranslateY = useRef(new Animated.Value(300)).current;
  const extraOpacity = useRef(new Animated.Value(0)).current;
  const hasPlayedEntryAnimation = useRef(false);

  const isFocused = useIsFocused();

  // تحديث اللغة المحددة عند تحميل الصفحة
  useEffect(() => {
    setSelectedLanguage(getCurrentLocale());
  }, []);

  useEffect(() => {
    if (!isFocused) {
      return;
    }

    if (hasPlayedEntryAnimation.current) {
      titleAnim.setValue(-10);
      subtitleAnim.setValue(-8);
      cardTranslateY.setValue(18);
      cardOpacity.setValue(0.88);
      themeTranslateY.setValue(18);
      themeOpacity.setValue(0.88);
      aboutTranslateY.setValue(18);
      aboutOpacity.setValue(0.88);
      extraTranslateY.setValue(18);
      extraOpacity.setValue(0.88);

      Animated.parallel([
        Animated.timing(titleAnim, { toValue: 0, duration: 180, useNativeDriver: true }),
        Animated.timing(subtitleAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(cardTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(cardOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(themeTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(themeOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(aboutTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(aboutOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
        Animated.timing(extraTranslateY, { toValue: 0, duration: 220, useNativeDriver: true }),
        Animated.timing(extraOpacity, { toValue: 1, duration: 220, useNativeDriver: true }),
      ]).start();

      return;
    }

    hasPlayedEntryAnimation.current = true;

    Animated.parallel([
      Animated.timing(titleAnim, { toValue: 0, duration: 500, useNativeDriver: true }),
      Animated.timing(subtitleAnim, { toValue: 0, duration: 600, delay: 100, useNativeDriver: true }),

      // بطاقة اللغة
      Animated.spring(cardTranslateY, { toValue: 0, friction: 8, tension: 60, delay: 400, useNativeDriver: true }),
      Animated.timing(cardOpacity, { toValue: 1, duration: 800, delay: 400, useNativeDriver: true }),

      // بطاقة الثيم (تظهر في نفس الوقت مع بطاقة اللغة)
      Animated.spring(themeTranslateY, { toValue: 0, friction: 8, tension: 60, delay: 400, useNativeDriver: true }),
      Animated.timing(themeOpacity, { toValue: 1, duration: 800, delay: 400, useNativeDriver: true }),

      // بطاقة About (تظهر في نفس الوقت)
      Animated.spring(aboutTranslateY, { toValue: 0, friction: 8, tension: 60, delay: 400, useNativeDriver: true }),
      Animated.timing(aboutOpacity, { toValue: 1, duration: 800, delay: 400, useNativeDriver: true }),

      // البطاقة الرابعة الصغيرة
      Animated.spring(extraTranslateY, { toValue: 0, friction: 8, tension: 60, delay: 400, useNativeDriver: true }),
      Animated.timing(extraOpacity, { toValue: 1, duration: 800, delay: 400, useNativeDriver: true }),
    ]).start();
  }, [isFocused, titleAnim, subtitleAnim, cardTranslateY, cardOpacity, themeTranslateY, themeOpacity, aboutTranslateY, aboutOpacity, extraTranslateY, extraOpacity]);

  return (
    <ScreenBackground>
      <GestureDetector gesture={swipeGesture}>
        <Reanimated.View style={[{ flex: 1 }, swipeAnimatedStyle]}>
          {renderContent()}
        </Reanimated.View>
      </GestureDetector>

      <ManageOffersModal
        visible={offersModalVisible}
        onClose={() => setOffersModalVisible(false)}
      />
    </ScreenBackground>
  );

  function renderContent() {
    return (
      <ScrollView
        style={{ flex: 1, backgroundColor: 'transparent' }}
        contentContainerStyle={{ paddingBottom: 24 }}
        showsVerticalScrollIndicator={false}
      >
      {/* Header */}
      <View className="bg-transparent px-4 py-5" style={{ paddingHorizontal: 16, paddingVertical: 20 }}>
        <Animated.Text
          className={`text-[26px] font-bold mb-1 ${effectiveTheme === 'dark' ? 'text-[#00B8DB]' : 'text-[#0092B8]'}`}
          style={{
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
          className={`text-[18px] font-medium ${effectiveTheme === 'dark' ? 'text-[#E0E0E0]' : 'text-gray-500'}`}
          style={{
            transform: [{ translateY: subtitleAnim }],
            opacity: subtitleAnim.interpolate({
              inputRange: [-50, 0],
              outputRange: [0, 1],
            }),
          }}
        >
          {I18n.t('settings')}
        </Animated.Text>
      </View>

      {/* بطاقة اللغة مع الأنيميشن */}
      <Animated.View
        className="px-5 pt-4"
        style={{
          opacity: cardOpacity,
          transform: [{ translateY: cardTranslateY }],
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
      >
        <View className={`${
          effectiveTheme === 'dark' 
            ? 'bg-[#00B8DB]/10 shadow-black/30 shadow-[0_2px_8px]' 
            : 'bg-white shadow-black/5 shadow-[0_2px_8px]'
        } rounded-4xl p-4`}>
          {/* الجزء العلوي */}
          <View className="flex-row items-center mb-3">
            <View className={`w-8 h-8 rounded-lg ${
              effectiveTheme === 'dark' 
                ? 'bg-[#00B8DB]/20' 
                : 'bg-[#E0F7FA]'
            } justify-center items-center mr-3`}>
              <Ionicons name="globe-outline" size={20} color="#0891B2" />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-semibold mb-0.5 ${
                effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>{I18n.t('language')}</Text>
              <Text className={`text-xs leading-4 ${
                effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'
              }`}>Choose your preferred language</Text>
            </View>
          </View>

          {/* أزرار اللغة */}
          <View className="flex-row gap-2">
            <TouchableOpacity 
              className={`flex-1 py-2.5 px-4 rounded-xl items-center justify-center ${
                effectiveTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-50'
              } ${selectedLanguage === 'en' ? 'bg-[#0891B2] shadow-[#0891B2]/40 shadow-[0_6px_12px]' : ''}`}
              onPress={() => changeLanguage('en')}
            >
              <Text className={`text-sm font-medium text-center ${
                selectedLanguage === 'en' 
                  ? 'text-white' 
                  : effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>English</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className={`flex-1 py-2.5 px-4 rounded-xl items-center justify-center ${
                effectiveTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-50'
              } ${selectedLanguage === 'ar' ? 'bg-[#0891B2] shadow-[#0891B2]/40 shadow-[0_6px_12px]' : ''}`}
              onPress={() => changeLanguage('ar')}
            >
              <Text className={`text-sm font-medium text-center ${
                selectedLanguage === 'ar' 
                  ? 'text-white' 
                  : effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>العربية</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              className={`flex-1 py-2.5 px-4 rounded-xl items-center justify-center ${
                effectiveTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-50'
              } ${selectedLanguage === 'fr' ? 'bg-[#0891B2] shadow-[#0891B2]/40 shadow-[0_6px_12px]' : ''}`}
              onPress={() => changeLanguage('fr')}
            >
              <Text className={`text-sm font-medium text-center ${
                selectedLanguage === 'fr' 
                  ? 'text-white' 
                  : effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>Français</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* بطاقة الثيم - مطابقة 100% للصورة */}
      <Animated.View
        className="px-5 pt-4"
        style={{
          opacity: themeOpacity,
          transform: [{ translateY: themeTranslateY }],
          paddingHorizontal: 20,
          paddingTop: 16,
        }}
      >
        <View className={`${
          effectiveTheme === 'dark' 
            ? 'bg-[#00B8DB]/10 shadow-black/30 shadow-[0_2px_8px]' 
            : 'bg-white shadow-black/5 shadow-[0_2px_8px]'
        } rounded-4xl p-4`}>
          {/* العنوان + النص الفرعي */}
          <View className="flex-row items-center mb-3">
            <View className={`w-8 h-8 rounded-lg ${
              effectiveTheme === 'dark' 
                ? 'bg-[#8B5CF6]/20' 
                : 'bg-[#F3F0FF]'
            } justify-center items-center mr-3`}>
              <Ionicons name="sunny-outline" size={20} color="#8B5CF6" />
            </View>
            <View className="flex-1">
              <Text className={`text-base font-semibold mb-0.5 ${
                effectiveTheme === 'dark' ? 'text-gray-200' : 'text-gray-700'
              }`}>{I18n.t('theme')}</Text>
              <Text className={`text-xs leading-4 ${
                effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-400'
              }`}>Choose your display theme</Text>
            </View>
          </View>

          {/* الأزرار */}
          <View className="flex-row gap-1.5">
            {/* Light */}
            <TouchableOpacity 
              className={`flex-1 flex-row items-center justify-center gap-1 py-2.5 px-3 rounded-xl ${
                effectiveTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-50'
              } ${theme === 'light' ? 'bg-[#8B5CF6] shadow-[#8B5CF6]/40 shadow-[0_6px_12px]' : ''}`}
              onPress={() => setTheme('light')}
            >
              <Ionicons 
                name="sunny" 
                size={16} 
                color={theme === 'light' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text className={`text-[13px] font-medium ${
                theme === 'light' 
                  ? 'text-white' 
                  : effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>Light</Text>
            </TouchableOpacity>

            {/* Dark */}
            <TouchableOpacity 
              className={`flex-1 flex-row items-center justify-center gap-1 py-2.5 px-3 rounded-xl ${
                effectiveTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-50'
              } ${theme === 'dark' ? 'bg-[#8B5CF6] shadow-[#8B5CF6]/40 shadow-[0_6px_12px]' : ''}`}
              onPress={() => setTheme('dark')}
            >
              <Ionicons 
                name="moon" 
                size={16} 
                color={theme === 'dark' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text className={`text-[13px] font-medium ${
                theme === 'dark' 
                  ? 'text-white' 
                  : effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>Dark</Text>
            </TouchableOpacity>

            {/* System */}
            <TouchableOpacity 
              className={`flex-1 flex-row items-center justify-center gap-1 py-2.5 px-3 rounded-xl ${
                effectiveTheme === 'dark' ? 'bg-[#2A2A2A]' : 'bg-gray-50'
              } ${theme === 'system' ? 'bg-[#8B5CF6] shadow-[#8B5CF6]/40 shadow-[0_6px_12px]' : ''}`}
              onPress={() => setTheme('system')}
            >
              <Ionicons 
                name="settings" 
                size={16} 
                color={theme === 'system' ? '#FFFFFF' : '#9CA3AF'} 
              />
              <Text className={`text-[13px] font-medium ${
                theme === 'system' 
                  ? 'text-white' 
                  : effectiveTheme === 'dark' ? 'text-gray-400' : 'text-gray-500'
              }`}>System</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>

      {/* تعديل الاشتراكات المتاحة */}
      <Animated.View
        style={{
          opacity: extraOpacity,
          transform: [{ translateY: extraTranslateY }],
          paddingHorizontal: 24,
          paddingTop: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => setOffersModalVisible(true)}
          activeOpacity={0.8}
          className={`${
            effectiveTheme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-white'
          } rounded-3xl p-4 flex-row items-center`}
          style={{ gap: 12 }}
        >
          <View
            className={`w-9 h-9 rounded-lg items-center justify-center ${
              effectiveTheme === 'dark' ? 'bg-[#00B8DB]/20' : 'bg-[#E0F7FA]'
            }`}
          >
            <Ionicons name="pricetags-outline" size={18} color="#00B8DB" />
          </View>
          <Text
            className="flex-1 text-[15px] font-semibold"
            style={{ color: effectiveTheme === 'dark' ? '#E5E7EB' : '#1F2937' }}
          >
            {I18n.t('manageOffers')}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* اختبار الإشعارات */}
      <Animated.View
        style={{
          opacity: extraOpacity,
          transform: [{ translateY: extraTranslateY }],
          paddingHorizontal: 24,
          paddingTop: 12,
        }}
      >
        <TouchableOpacity
          onPress={handleTestNotification}
          activeOpacity={0.8}
          className={`${
            effectiveTheme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-white'
          } rounded-3xl p-4 flex-row items-center`}
          style={{ gap: 12 }}
        >
          <View
            className={`w-9 h-9 rounded-lg items-center justify-center ${
              effectiveTheme === 'dark' ? 'bg-[#00B8DB]/20' : 'bg-[#E0F7FA]'
            }`}
          >
            <Ionicons name="notifications-outline" size={18} color="#00B8DB" />
          </View>
          <Text
            className="flex-1 text-[15px] font-semibold"
            style={{ color: effectiveTheme === 'dark' ? '#E5E7EB' : '#1F2937' }}
          >
            {I18n.t('testNotifications')}
          </Text>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={effectiveTheme === 'dark' ? '#9CA3AF' : '#6B7280'}
          />
        </TouchableOpacity>
      </Animated.View>

      {/* زر تسجيل الخروج */}
      <Animated.View
        style={{
          opacity: extraOpacity,
          transform: [{ translateY: extraTranslateY }],
          paddingHorizontal: 24,
          paddingTop: 16,
        }}
      >
        <TouchableOpacity
          onPress={() => signOut()}
          activeOpacity={0.8}
          className={`${
            effectiveTheme === 'dark' ? 'bg-[#1E1E1E]' : 'bg-white'
          } rounded-3xl p-4 flex-row items-center justify-center`}
          style={{ gap: 8 }}
        >
          <Ionicons name="log-out-outline" size={18} color="#EF4444" />
          <Text className="text-[14px] font-semibold" style={{ color: '#EF4444' }}>
            {I18n.t('logout')}
          </Text>
        </TouchableOpacity>
      </Animated.View>

      {/* About — صغير وفي الوسط، أسفل الصفحة فوق "Built in Constantine" */}
      <Animated.View
        style={{
          opacity: aboutOpacity,
          transform: [{ translateY: aboutTranslateY }],
          alignItems: 'center',
          paddingHorizontal: 32,
          paddingTop: 28,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
          <Ionicons name="information-circle-outline" size={14} color="#0891B2" />
          <Text
            style={{
              fontSize: 12,
              fontWeight: '600',
              color: effectiveTheme === 'dark' ? '#D1D5DB' : '#4B5563',
            }}
          >
            {I18n.t('about')} · Version 1.0.0
          </Text>
        </View>
        <Text style={{ fontSize: 11, lineHeight: 15, marginTop: 3, textAlign: 'center', color: '#0891B2' }}>
          Professional subscription management for Algerian businesses
        </Text>
      </Animated.View>

      </ScrollView>
    );
  }
}

