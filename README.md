# Ishtiraki Pro - Mobile App 📱

تطبيق محمول لإدارة الاشتراكات والمشتركين مبني باستخدام React Native و Expo

## 🌟 المميزات

- إدارة المشتركين والاشتراكات
- واجهة مستخدم عصرية وسهلة الاستخدام
- دعم اللغة العربية
- إشعارات تلقائية
- قاعدة بيانات محلية مع SQLite
- تصميم متجاوب لجميع أحجام الشاشات

## 🚀 تشغيل المشروع

1. تثبيت المتطلبات

   ```bash
   npm install
   ```

2. تشغيل التطبيق

   ```bash
   npx expo start
   ```

3. خيارات التشغيل:
   - [Android Emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
   - [iOS Simulator](https://docs.expo.dev/workflow/ios-simulator/)
   - [Expo Go](https://expo.dev/go) على الجهاز المحمول

## 📱 التقنيات المستخدمة

- **React Native** - إطار عمل التطبيق
- **Expo** - منصة التطوير
- **SQLite** - قاعدة البيانات المحلية
- **Expo Router** - التنقل بين الصفحات
- **TypeScript** - اللغة البرمجية
- **i18n-js** - دعم متعدد اللغات

## 📂 هيكل المشروع

```
app/
├── (tabs)/           # صفحات التطبيق الرئيسية
├── _layout.tsx       # التخطيط العام
components/           # مكونات واجهة المستخدم
src/
├── database/         # إعدادات قاعدة البيانات
├── services/         # الخدمات والوظائف المساعدة
└── i18n.ts          # ملفات الترجمة

```

## 🛠 البناء للإنتاج

```bash
# بناء للأندرويد
expo build:android

# بناء لـ iOS
expo build:ios
```

## 🤝 المساهمة

مرحب بالمساهمات! يرجى فتح issue أو إرسال pull request.

## 📄 الترخيص

هذا المشروع مرخص تحت رخصة MIT