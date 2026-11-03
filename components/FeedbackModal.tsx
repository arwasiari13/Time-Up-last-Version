import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import Constants from 'expo-constants';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { isOnline } from '../src/database/syncEngine';
import { db } from '../src/firebase';
import I18n from '../src/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
}

const MAX_LENGTH = 1000;
const ACCENT = '#00B8DB';

/** يرفض بعد مدة حتى لا يبقى الزر عالقاً إذا انقطع الاتصال أثناء الإرسال */
const withTimeout = <T,>(promise: Promise<T>, ms: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('TIMEOUT')), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error);
      }
    );
  });

/**
 * نافذة الملاحظات: تقييم اختياري (1–5 نجوم) + رسالة.
 * تُحفظ في Firestore → feedback، ويقرأها المشرف من لوحة الإدارة.
 */
export default function FeedbackModal({ visible, onClose }: Props) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (visible) {
      setRating(0);
      setMessage('');
    }
  }, [visible]);

  const send = async () => {
    const text = message.trim();
    if (!text) {
      Alert.alert(I18n.t('feedback'), I18n.t('feedbackEmpty'));
      return;
    }

    // بدون إنترنت لا نرسل، حتى لا تبقى الرسالة معلّقة وتُكرَّر لاحقاً
    if (!(await isOnline())) {
      Alert.alert(I18n.t('feedback'), I18n.t('feedbackOffline'));
      return;
    }

    setSending(true);
    try {
      await withTimeout(
        addDoc(collection(db, 'feedback'), {
          // مجهولة: لا نرسل الاسم ولا اسم المستخدم ولا المعرّف
          message: text,
          rating: rating || null,
          platform: Platform.OS,
          appVersion: Constants.expoConfig?.version || '',
          read: false,
          createdAt: serverTimestamp(),
        }),
        10000
      );
      Alert.alert(I18n.t('feedbackThanks'), I18n.t('feedbackThanksMsg'));
      onClose();
    } catch (error: any) {
      Alert.alert(
        I18n.t('feedback'),
        error?.message === 'TIMEOUT' ? I18n.t('feedbackOffline') : I18n.t('feedbackFailed')
      );
    } finally {
      setSending(false);
    }
  };

  const text = isDark ? '#ffffff' : '#0d1525';
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.55)';
  const surface = isDark ? 'rgba(15,23,40,0.98)' : '#ffffff';
  const inputBg = isDark ? '#1E293B' : '#F9FAFB';
  const border = isDark ? '#334155' : '#E5E7EB';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <BlurView style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} intensity={50} />
        <Pressable
          style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]}
          onPress={onClose}
        />

        <View style={[styles.sheet, { backgroundColor: surface }]}>
          {/* الرأس */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]}>{I18n.t('feedbackTitle')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={muted} />
            </Pressable>
          </View>
          <Text style={{ color: muted, fontSize: 13, marginBottom: 8 }}>
            {I18n.t('feedbackSubtitle')}
          </Text>

          {/* ملاحظة صغيرة: الرسالة مجهولة */}
          <View style={styles.note}>
            <Ionicons name="lock-closed-outline" size={12} color={ACCENT} />
            <Text style={{ color: muted, fontSize: 11, flex: 1 }}>{I18n.t('feedbackAnonymous')}</Text>
          </View>

          {/* التقييم — اختياري */}
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((value) => (
              <Pressable
                key={value}
                hitSlop={6}
                // الضغط على نفس النجمة مرة أخرى يلغي التقييم
                onPress={() => setRating(rating === value ? 0 : value)}
              >
                <Ionicons
                  name={value <= rating ? 'star' : 'star-outline'}
                  size={30}
                  color={value <= rating ? '#FBBF24' : muted}
                />
              </Pressable>
            ))}
          </View>

          {/* الرسالة */}
          <TextInput
            value={message}
            onChangeText={setMessage}
            placeholder={I18n.t('feedbackPlaceholder')}
            placeholderTextColor={muted}
            multiline
            maxLength={MAX_LENGTH}
            textAlignVertical="top"
            style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
          />
          <Text style={{ color: muted, fontSize: 11, textAlign: 'right', marginTop: 6 }}>
            {message.length}/{MAX_LENGTH}
          </Text>

          {/* إرسال */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={send}
            disabled={sending}
            style={[styles.sendBtn, { opacity: sending ? 0.6 : 1 }]}
          >
            {sending ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <>
                <Ionicons name="send" size={16} color="#ffffff" />
                <Text style={styles.sendText}>{I18n.t('feedbackSend')}</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 28,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  title: { fontSize: 18, fontWeight: '700' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  stars: { flexDirection: 'row', gap: 10, marginBottom: 16, justifyContent: 'center' },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15, minHeight: 130 },
  sendBtn: {
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: ACCENT,
    borderRadius: 12,
    paddingVertical: 14,
  },
  sendText: { color: '#ffffff', fontWeight: '700', fontSize: 16 },
});
