import { Tabs } from 'expo-router';
import CustomTabBar from '../../components/CustomTabBar';

// ملاحظة: ThemeProvider أصبح في app/_layout.tsx حتى تشترك
// صفحة تسجيل الدخول والتطبيق في نفس حالة الثيم.
export default function TabsLayout() {
  return (
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,  // بدون شريط علوي
        lazy: false,
        detachInactiveScreens: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
        }}
      />
      <Tabs.Screen
        name="subscribers"
        options={{
          title: 'المشتركين',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'الإعدادات',
        }}
      />
    </Tabs>
  );
}
