# نظام الثيم (Theme System) - TIME UP Mobile App

تم تطبيق نظام ثيم شامل ومنظم على تطبيق TIME UP Mobile مع دعم الوضع المظلم (Dark Mode) والفاتح (Light Mode).

## الميزات المطبقة

### 🎨 أنواع الثيم المدعومة
- **Light**: الوضع الفاتح (الافتراضي)
- **Dark**: الوضع المظلم
- **System**: يتبع إعدادات النظام تلقائياً

### 📱 الصفحات المحدثة
- ✅ الصفحة الرئيسية (Dashboard)
- ✅ صفحة المشتركين (Subscribers)
- ✅ صفحة الإعدادات (Settings) - مع أزرار التحكم
- ✅ شريط التنقل السفلي (CustomTabBar)

### 🔧 المكونات المطبقة

#### 1. ThemeContext (`contexts/ThemeContext.tsx`)
- إدارة حالة الثيم على مستوى التطبيق
- حفظ واسترداد إعدادات الثيم من AsyncStorage
- دعم تتبع ثيم النظام تلقائياً

#### 2. useTheme Hook (`hooks/useTheme.ts`)
- Hook مخصص للوصول السهل لحالة الثيم
- يوفر أمان من الأخطاء (Error handling)

#### 3. ThemeProvider
- يلف كامل التطبيق في `_layout.tsx`
- يوفر الثيم لجميع المكونات التابعة

## 🎯 كيفية الاستخدام

### في أي مكون:
```tsx
import { useTheme } from '../hooks/useTheme';

function MyComponent() {
  const { theme, effectiveTheme, setTheme } = useTheme();
  const styles = getStyles(effectiveTheme);
  
  return (
    <View style={styles.container}>
      {/* محتوى المكون */}
    </View>
  );
}

// إنشاء الستايل الديناميكي
const getStyles = (theme: 'light' | 'dark') =>
  StyleSheet.create({
    container: {
      backgroundColor: theme === 'dark' ? '#121212' : '#FFFFFF',
    },
    text: {
      color: theme === 'dark' ? '#E0E0E0' : '#374151',
    },
  });
```

### تغيير الثيم:
```tsx
const { setTheme } = useTheme();

// تعيين الوضع المظلم
setTheme('dark');

// تعيين الوضع الفاتح  
setTheme('light');

// اتباع النظام
setTheme('system');
```

## 🎨 نظام الألوان

### الوضع الفاتح (Light)
- خلفية رئيسية: `#FFFFFF`
- نص رئيسي: `#374151`
- نص ثانوي: `#6B7280`
- لون العلامة التجارية: `#0092B8`

### الوضع المظلم (Dark)
- خلفية رئيسية: `#121212`
- خلفية البطاقات: `#1E1E1E`
- خلفية الحقول: `#2A2A2A`
- نص رئيسي: `#E0E0E0`
- نص ثانوي: `#B0B0B0`
- لون العلامة التجارية: `#00B8DB`

## 📋 قائمة التحقق من التطبيق

- [x] إنشاء ThemeContext مع إدارة حالة شاملة
- [x] إنشاء useTheme hook للوصول السهل
- [x] تطبيق ThemeProvider في الـ Layout الرئيسي
- [x] تحديث صفحة الإعدادات مع أزرار التحكم
- [x] تحديث الصفحة الرئيسية مع جميع المكونات
- [x] تحديث صفحة المشتركين مع جميع العناصر
- [x] تحديث CustomTabBar مع الألوان الديناميكية
- [x] حفظ الإعدادات في AsyncStorage
- [x] دعم ثيم النظام التلقائي

## 🚀 خطوات التشغيل

1. تأكد من تثبيت `@react-native-async-storage/async-storage`:
```bash
npx expo install @react-native-async-storage/async-storage
```

2. شغل التطبيق:
```bash
npm start
# أو
expo start
```

3. اذهب إلى صفحة الإعدادات واختبر تغيير الثيم

## 📝 ملاحظات مهمة

- جميع الألوان تم تطبيقها بشكل ديناميكي
- يتم حفظ إعداد الثيم تلقائياً
- الثيم يتطبق فوراً على جميع الصفحات
- تم الحفاظ على جميع الأنيميشن والتأثيرات المرئية
- الكود منظم ومُوثق بالعربية

## 🔄 إضافات مستقبلية ممكنة

- إضافة المزيد من خيارات الثيم (مثل ثيم أزرق، أخضر)
- إضافة أنيميشن لانتقال الثيم
- إضافة إعدادات مخصصة للألوان
- دعم الثيم على مستوى النص (حجم الخط، النوع)

تم التطبيق بنجاح! 🎉