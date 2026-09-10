import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import { StyleProp, View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * الخلفية الأصلية للتطبيق: تدرّج داكن في الوضع الليلي، وأبيض في الوضع النهاري.
 * تُستخدم في كل الصفحات بما فيها صفحة تسجيل الدخول.
 */
export const BG_DARK = ['#020618', '#0F172B', '#020618'] as const;
export const BG_LIGHT = '#FFFFFF';

interface Props {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

export default function ScreenBackground({ children, style }: Props) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  if (isDark) {
    return (
      <LinearGradient
        colors={[...BG_DARK]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[{ flex: 1 }, style]}
      >
        {children}
      </LinearGradient>
    );
  }

  return <View style={[{ flex: 1, backgroundColor: BG_LIGHT }, style]}>{children}</View>;
}
