import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import ScreenBackground from '../components/ScreenBackground';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import I18n from '../src/i18n';

const ACCENT = '#00bcd4';
const ACCENT_DEEP = '#0097a7';

const LOGO_DARK = require('../assets/images/logo-dark.png');
const LOGO_LIGHT = require('../assets/images/logo-light.png');

// أبعاد الشعارين بعد القص: 879x319 و 979x493
const LOGO_WIDTH = 230;
const LOGO_DARK_RATIO = 879 / 319;
const LOGO_LIGHT_RATIO = 979 / 493;

export default function LoginScreen() {
  const { effectiveTheme, setTheme } = useTheme();
  const { signIn } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [focused, setFocused] = useState<'username' | 'password' | null>(null);

  const d = effectiveTheme === 'dark';

  const handleLogin = async () => {
    setError('');
    setSubmitting(true);
    try {
      await signIn(username, password);
      // التوجيه يتم تلقائياً من خلال البوابة في _layout
    } catch (e: any) {
      const messages: Record<string, string> = {
        EMPTY_FIELDS: 'الرجاء إدخال اسم المستخدم ورمز الدخول',
        INVALID_CREDENTIALS: 'اسم المستخدم أو رمز الدخول غير صحيح',
        DISABLED: 'هذا الحساب موقوف، يرجى التواصل مع المسؤول',
        TOO_MANY_ATTEMPTS: 'محاولات كثيرة، انتظر قليلاً ثم أعد المحاولة',
        NETWORK: 'لا يوجد اتصال بالإنترنت، تحقق من الشبكة',
      };
      setError(messages[e?.message] || 'تعذر تسجيل الدخول، حاول مرة أخرى');
      setSubmitting(false);
    }
  };

  const inputStyle = (field: 'username' | 'password') => [
    styles.input,
    {
      backgroundColor: d ? 'rgba(255,255,255,0.05)' : 'rgba(0,150,180,0.07)',
      borderColor:
        focused === field
          ? ACCENT
          : d
          ? 'rgba(0,188,212,0.2)'
          : 'rgba(0,188,212,0.3)',
      color: d ? '#ffffff' : '#0d1525',
    },
  ];

  const labelColor = d ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.55)';
  const placeholderColor = d ? 'rgba(255,255,255,0.3)' : 'rgba(13,21,37,0.35)';

  return (
    <ScreenBackground>
      <StatusBar style={d ? 'light' : 'dark'} />

      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.card,
              {
                backgroundColor: d ? 'rgba(15,23,40,0.95)' : 'rgba(255,255,255,0.97)',
                borderColor: d ? 'rgba(0,188,212,0.18)' : 'rgba(0,188,212,0.25)',
                shadowColor: d ? '#000000' : '#0096b4',
                shadowOpacity: d ? 0.6 : 0.12,
              },
            ]}
          >
            {/* زر تبديل الثيم */}
            <Pressable
              onPress={() => setTheme(d ? 'light' : 'dark')}
              hitSlop={8}
              accessibilityLabel="Toggle theme"
              style={[
                styles.themeToggle,
                { backgroundColor: d ? 'rgba(0,188,212,0.15)' : 'rgba(0,150,180,0.1)' },
              ]}
            >
              <Ionicons name={d ? 'sunny-outline' : 'moon'} size={16} color={ACCENT} />
            </Pressable>

            {/* الشعار */}
            <View style={styles.logoWrap}>
              <Image
                source={d ? LOGO_DARK : LOGO_LIGHT}
                // النسبتان مختلفتان بين الشعارين، لذلك نحسب الارتفاع من العرض
                style={[styles.logo, { height: LOGO_WIDTH / (d ? LOGO_DARK_RATIO : LOGO_LIGHT_RATIO) }]}
                resizeMode="contain"
                accessibilityLabel="Time Up"
              />
            </View>

            {/* اسم المستخدم */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: labelColor }]}>USERNAME</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="person-outline"
                  size={16}
                  color={d ? 'rgba(0,188,212,0.7)' : ACCENT_DEEP}
                  style={styles.leftIcon}
                />
                <TextInput
                  value={username}
                  onChangeText={setUsername}
                  placeholder="Enter your username"
                  placeholderTextColor={placeholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused('username')}
                  onBlur={() => setFocused(null)}
                  style={inputStyle('username')}
                />
              </View>
            </View>

            {/* كلمة المرور */}
            <View style={styles.field}>
              <Text style={[styles.label, { color: labelColor }]}>PASSWORD</Text>
              <View style={styles.inputWrap}>
                <Ionicons
                  name="lock-closed-outline"
                  size={16}
                  color={d ? 'rgba(0,188,212,0.7)' : ACCENT_DEEP}
                  style={styles.leftIcon}
                />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Enter your password"
                  placeholderTextColor={placeholderColor}
                  secureTextEntry={!showPass}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onFocus={() => setFocused('password')}
                  onBlur={() => setFocused(null)}
                  onSubmitEditing={handleLogin}
                  style={[inputStyle('password'), styles.inputWithTrailing]}
                />
                <Pressable
                  onPress={() => setShowPass(!showPass)}
                  hitSlop={8}
                  style={styles.rightIcon}
                >
                  <Ionicons
                    name={showPass ? 'eye-off-outline' : 'eye-outline'}
                    size={16}
                    color={d ? 'rgba(255,255,255,0.35)' : 'rgba(13,21,37,0.35)'}
                  />
                </Pressable>
              </View>
            </View>

            {/* نسيت كلمة المرور */}
            <Pressable style={styles.forgot} hitSlop={6}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            {/* زر الدخول */}
            <Pressable
              onPress={handleLogin}
              disabled={submitting}
              style={({ pressed }) => [styles.buttonShadow, pressed && styles.buttonPressed]}
            >
              <LinearGradient
                colors={[ACCENT, ACCENT_DEEP]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.button}
              >
                {submitting ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.buttonText}>Log In</Text>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          {/* Built in Constantine · Made in Algeria — سطر واحد أسفل البطاقة */}
          <View style={styles.footer}>
            <Ionicons name="heart" size={11} color="#EF4444" />
            <Text
              style={[
                styles.footerText,
                { color: d ? 'rgba(255,255,255,0.55)' : 'rgba(13,21,37,0.55)' },
              ]}
            >
              {I18n.t('builtIn')} · 🇩🇿 {I18n.t('madeIn')}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ScreenBackground>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card: {
    width: '100%',
    maxWidth: 384,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 32,
    gap: 20,
    shadowOffset: { width: 0, height: 8 },
    shadowRadius: 48,
    elevation: 12,
  },
  themeToggle: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  logoWrap: { width: '100%', alignItems: 'center', justifyContent: 'center', height: 124, marginBottom: -8 },
  logo: { width: LOGO_WIDTH },
  field: { gap: 6 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 1.5 },
  inputWrap: { position: 'relative', justifyContent: 'center' },
  leftIcon: { position: 'absolute', left: 14, zIndex: 1 },
  rightIcon: { position: 'absolute', right: 14, zIndex: 1 },
  input: {
    width: '100%',
    paddingLeft: 40,
    paddingRight: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    fontSize: 14,
    fontWeight: '500',
  },
  inputWithTrailing: { paddingRight: 44 },
  forgot: { alignSelf: 'flex-end', marginTop: -8 },
  forgotText: { fontSize: 12, fontWeight: '500', color: ACCENT },
  error: { color: '#ff6b6b', fontSize: 12, textAlign: 'center' },
  buttonShadow: {
    borderRadius: 12,
    shadowColor: ACCENT,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 6,
  },
  buttonPressed: { opacity: 0.85, transform: [{ translateY: 1 }] },
  button: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#ffffff', fontSize: 14, fontWeight: '700', letterSpacing: 0.5 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, marginTop: 18 },
  footerText: { fontSize: 11, fontWeight: '500' },
});
