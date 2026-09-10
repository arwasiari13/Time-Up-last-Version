// src/i18n.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Localization from 'expo-localization';
import { I18n } from 'i18n-js';
import { I18nManager, Platform } from 'react-native';

// إنشاء مثيل من I18n
const i18n = new I18n();

// ترجمة بسيطة؛ ضيف المفاتيح اللي تحتاجها
const translations = {
  en: {
    appName: 'Time Up',
    dashboard: 'Dashboard',
    subscribers: 'Subscribers',
    settings: 'Settings',
    addSubscriber: '+ Add Subscriber',
    viewAll: 'View All',
    save: 'Save',
    cancel: 'Cancel',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    subscription: 'Subscription',
    totalSubscribers: 'Total Subscribers',
    activeSubscriptions: 'Active Subscriptions',
    expiredSubscriptions: 'Expired Subscriptions',
    expiringThisWeek: 'Expiring This Week',
    monthlyRevenue: 'Monthly Revenue',
    language: 'Language',
    theme: 'Theme',
    notifications: 'Notifications',
    privacy: 'Privacy',
    about: 'About',
    logout: 'Logout',
    search: 'Search subscribers...',
    noSubscribers: 'No subscribers found',
    addNew: 'Add New',
    edit: 'Edit',
    delete: 'Delete',
    confirm: 'Confirm',
    welcome: 'Welcome to Time Up',
    loading: 'Loading...',
    error: 'Error occurred',
    success: 'Success',
    warning: 'Warning',
    info: 'Information',
    all: 'All',
    active: 'Active',
    expiring: 'Expiring',
    expired: 'Expired',
    firstName: 'First Name',
    lastName: 'Last Name',
    phoneNumber: 'Phone Number',
    address: 'Address',
    startDate: 'Start Date',
    endDate: 'End Date',
    price: 'Price (DZD)',
    selectStartDate: 'Select start date',
    selectEndDate: 'Select end date',
    expiringSoon: 'Expiring Soon',
    recentSubscribers: 'Recent Subscribers',
    addSubscriberTitle: 'Add Subscriber',
    firstNameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    phoneRequired: 'Phone number is required',
    priceRequired: 'Price is required',
    total: 'total',
    offers: 'offers',
    noOffersYet: 'No offers yet.',
    mostUsedOffers: 'Most used offers',
    rankedBySubscribers: 'Ranked by number of subscribers',
    statusBreakdown: 'Status breakdown',
    shareOfAll: 'Share of all subscribers',
    revenueByOffer: 'Revenue by offer',
    revenuePerOffer: 'Income per offer (DZD)',
    offersOfPerson: 'Offers',
    addAnotherOffer: 'Add another offer',
    deleteThisOffer: 'Delete this offer',
    editSubscriber: 'Edit Subscriber',
    totalSubscriptions: 'Total Subscriptions',
    subscriptionsCount: 'subscriptions',
    totalRevenue: 'Revenue',
    manageOffers: 'Manage available offers',
    testNotifications: 'Test notifications',
    notifSendFailed: 'Could not send the notification. Make sure notifications are allowed for the app.',
    notifTestSent: 'Test notification sent',
    notifScheduledNow: 'Currently scheduled notifications',
    addOffer: 'Add offer',
    offerName: 'Offer name',
    color: 'Color',
    offer: 'Offer',
    pickKnownOffers: 'Or pick from known offers',
    noOffersAddBelow: 'No offers yet. Add one with the button below.',
    alreadyExists: 'Already exists',
    alreadyInListMsg: '"%{name}" is already in your list.',
    saveError: 'Save error',
    readError: 'Read error',
    deleteOffer: 'Delete offer',
    deleteOfferConfirm: 'Remove "%{name}" from your list?',
    loadingOffers: 'Loading offers…',
    noSavedOffers: 'No saved offers — add them in Settings → Manage available offers',
    yourOffers: 'Your offers',
    builtIn: 'Built in Constantine',
    madeIn: 'Made in Algeria',
    restartToApply: 'Close and reopen the app to apply the language direction.'
  },
  ar: {
    appName: 'TIME UP',
    dashboard: 'لوحة التحكم',
    subscribers: 'المشتركين',
    settings: 'الإعدادات',
    addSubscriber: '+ أضف مشترك',
    viewAll: 'عرض الكل',
    save: 'حفظ',
    cancel: 'إلغاء',
    name: 'الاسم',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    subscription: 'الاشتراك',
    totalSubscribers: 'إجمالي المشتركين',
    activeSubscriptions: 'الاشتراكات النشطة',
    expiredSubscriptions: 'الاشتراكات المنتهية',
    expiringThisWeek: 'ينتهي هذا الأسبوع',
    monthlyRevenue: 'الإيرادات الشهرية',
    language: 'اللغة',
    theme: 'المظهر',
    notifications: 'الإشعارات',
    privacy: 'الخصوصية',
    about: 'حول التطبيق',
    logout: 'تسجيل الخروج',
    search: 'البحث في المشتركين...',
    noSubscribers: 'لم يتم العثور على مشتركين',
    addNew: 'إضافة جديد',
    edit: 'تعديل',
    delete: 'حذف',
    confirm: 'تأكيد',
    welcome: 'مرحباً بكم في تايم أب',
    loading: 'جاري التحميل...',
    error: 'حدث خطأ',
    success: 'نجح',
    warning: 'تحذير',
    info: 'معلومات',
    all: 'الكل',
    active: 'نشط',
    expiring: 'ينتهي قريباً',
    expired: 'منتهي',
    firstName: 'الاسم الأول',
    lastName: 'الاسم الأخير',
    phoneNumber: 'رقم الهاتف',
    address: 'العنوان',
    startDate: 'تاريخ البداية',
    endDate: 'تاريخ النهاية',
    price: 'السعر (دج)',
    selectStartDate: 'اختر تاريخ البداية',
    selectEndDate: 'اختر تاريخ النهاية',
    expiringSoon: 'ينتهي قريباً',
    recentSubscribers: 'آخر المشتركين',
    addSubscriberTitle: 'إضافة مشترك',
    firstNameRequired: 'الاسم الأول مطلوب',
    lastNameRequired: 'الاسم الأخير مطلوب',
    phoneRequired: 'رقم الهاتف مطلوب',
    priceRequired: 'السعر مطلوب',
    total: 'المجموع',
    offers: 'عروض',
    noOffersYet: 'لا توجد عروض بعد.',
    mostUsedOffers: 'العروض الأكثر استعمالاً',
    rankedBySubscribers: 'حسب عدد المشتركين',
    statusBreakdown: 'توزيع الحالات',
    shareOfAll: 'النسبة من كل المشتركين',
    revenueByOffer: 'الإيرادات حسب العرض',
    revenuePerOffer: 'الدخل لكل عرض (دج)',
    offersOfPerson: 'العروض',
    addAnotherOffer: 'إضافة عرض آخر',
    deleteThisOffer: 'حذف هذا العرض',
    editSubscriber: 'تعديل المشترك',
    totalSubscriptions: 'إجمالي الاشتراكات',
    subscriptionsCount: 'اشتراكات',
    totalRevenue: 'الإيرادات',
    manageOffers: 'تعديل الاشتراكات المتاحة',
    testNotifications: 'اختبار الإشعارات',
    notifSendFailed: 'تعذر إرسال الإشعار. تأكد من السماح بالإشعارات للتطبيق.',
    notifTestSent: 'تم إرسال إشعار تجريبي',
    notifScheduledNow: 'الإشعارات المجدولة حالياً',
    addOffer: 'إضافة عرض',
    offerName: 'اسم العرض',
    color: 'اللون',
    offer: 'العرض',
    pickKnownOffers: 'أو اختر من العروض المعروفة',
    noOffersAddBelow: 'لا توجد عروض بعد. أضف عرضاً بالزر أدناه.',
    alreadyExists: 'موجود مسبقاً',
    alreadyInListMsg: '"%{name}" موجود في قائمتك.',
    saveError: 'خطأ في الحفظ',
    readError: 'خطأ في القراءة',
    deleteOffer: 'حذف العرض',
    deleteOfferConfirm: 'حذف "%{name}" من قائمتك؟',
    loadingOffers: 'جاري تحميل العروض…',
    noSavedOffers: 'لا توجد عروض محفوظة — أضفها من الإعدادات ← تعديل الاشتراكات المتاحة',
    yourOffers: 'عروضك',
    builtIn: 'صُنع في قسنطينة',
    madeIn: 'صُنع في الجزائر',
    restartToApply: 'أغلق التطبيق وأعد فتحه لتطبيق اتجاه اللغة.'
  },
  fr: {
    appName: 'Time Up',
    dashboard: 'Tableau de bord',
    subscribers: 'Abonnés',
    settings: 'Paramètres',
    addSubscriber: '+ Ajouter',
    viewAll: 'Voir tout',
    save: 'Enregistrer',
    cancel: 'Annuler',
    name: 'Nom',
    phone: 'Téléphone',
    email: 'E-mail',
    subscription: 'Abonnement',
    totalSubscribers: 'Total des abonnés',
    activeSubscriptions: 'Abonnements actifs',
    expiredSubscriptions: 'Abonnements expirés',
    monthlyRevenue: 'Revenus mensuels',
    language: 'Langue',
    theme: 'Thème',
    notifications: 'Notifications',
    privacy: 'Confidentialité',
    about: 'À propos',
    logout: 'Déconnexion',
    search: 'Rechercher des abonnés...',
    noSubscribers: 'Aucun abonné trouvé',
    addNew: 'Ajouter nouveau',
    edit: 'Modifier',
    delete: 'Supprimer',
    confirm: 'Confirmer',
    welcome: 'Bienvenue sur Time Up',
    loading: 'Chargement...',
    error: 'Erreur survenue',
    success: 'Succès',
    warning: 'Avertissement',
    info: 'Information',
    all: 'Tous',
    active: 'Actif',
    expiring: 'Expire bientôt',
    expired: 'Expiré',
    firstName: 'Prénom',
    lastName: 'Nom',
    phoneNumber: 'Numéro de téléphone',
    address: 'Adresse',
    startDate: 'Date de début',
    endDate: 'Date de fin',
    price: 'Prix (DZD)',
    selectStartDate: 'Sélectionner la date de début',
    selectEndDate: 'Sélectionner la date de fin',
    expiringSoon: 'Expire bientôt',
    recentSubscribers: 'Abonnés récents',
    addSubscriberTitle: 'Ajouter un abonné',
    firstNameRequired: 'Le prénom est requis',
    lastNameRequired: 'Le nom est requis',
    phoneRequired: 'Le numéro de téléphone est requis',
    priceRequired: 'Le prix est requis',
    expiringThisWeek: 'Expire cette semaine',
    total: 'total',
    offers: 'offres',
    noOffersYet: 'Aucune offre pour le moment.',
    mostUsedOffers: 'Offres les plus utilisées',
    rankedBySubscribers: "Classées par nombre d'abonnés",
    statusBreakdown: 'Répartition des statuts',
    shareOfAll: 'Part de tous les abonnés',
    revenueByOffer: 'Revenus par offre',
    revenuePerOffer: 'Montant par offre (DZD)',
    offersOfPerson: 'Offres',
    addAnotherOffer: 'Ajouter une autre offre',
    deleteThisOffer: 'Supprimer cette offre',
    editSubscriber: "Modifier l'abonné",
    totalSubscriptions: 'Total des abonnements',
    subscriptionsCount: 'abonnements',
    totalRevenue: 'Revenus',
    manageOffers: 'Gérer les offres disponibles',
    testNotifications: 'Tester les notifications',
    notifSendFailed: "Impossible d'envoyer la notification. Vérifiez que les notifications sont autorisées.",
    notifTestSent: 'Notification de test envoyée',
    notifScheduledNow: 'Notifications programmées',
    addOffer: 'Ajouter une offre',
    offerName: "Nom de l'offre",
    color: 'Couleur',
    offer: 'Offre',
    pickKnownOffers: 'Ou choisissez parmi les offres connues',
    noOffersAddBelow: 'Aucune offre. Ajoutez-en une avec le bouton ci-dessous.',
    alreadyExists: 'Existe déjà',
    alreadyInListMsg: '"%{name}" est déjà dans votre liste.',
    saveError: "Erreur d'enregistrement",
    readError: 'Erreur de lecture',
    deleteOffer: "Supprimer l'offre",
    deleteOfferConfirm: 'Retirer "%{name}" de votre liste ?',
    loadingOffers: 'Chargement des offres…',
    noSavedOffers: 'Aucune offre enregistrée — ajoutez-en dans Paramètres → Gérer les offres disponibles',
    yourOffers: 'Vos offres',
    builtIn: 'Conçu à Constantine',
    madeIn: 'Fabriqué en Algérie',
    restartToApply: "Fermez et rouvrez l'application pour appliquer le sens de la langue."
  }
};

i18n.translations = translations;
i18n.enableFallback = true;

// مفتاح لتخزين اختيار المستخدم
const STORAGE_KEY = '@timeup_locale';
type LocaleListener = (locale: string) => void;
const localeListeners = new Set<LocaleListener>();

function notifyLocaleChange(locale: string) {
  localeListeners.forEach((listener) => {
    try {
      listener(locale);
    } catch {
      // ignore listener errors
    }
  });
}

export function subscribeLocaleChange(listener: LocaleListener) {
  localeListeners.add(listener);
  listener(i18n.locale || 'en');

  return () => {
    localeListeners.delete(listener);
  };
}

export async function loadLocale() {
  try {
    const saved = await AsyncStorage.getItem(STORAGE_KEY);
    if (saved) {
      i18n.locale = saved;
      applyRTLIfNeeded(saved);
      notifyLocaleChange(saved);
      return saved;
    }
  } catch {
    // ignore
  }

  // إذا ما فيه اختيار محفوظ، نخمن من الجهاز
  const locales = Localization.getLocales();
  if (locales && locales.length > 0) {
    const device = locales[0].languageCode || 'en';
    const code = ['ar','en','fr'].includes(device) ? device : 'en';
    i18n.locale = code;
    applyRTLIfNeeded(code);
    notifyLocaleChange(code);
    return code;
  }

  i18n.locale = 'en';
  applyRTLIfNeeded('en');
  notifyLocaleChange('en');
  return 'en';
}

export async function setLocale(lang: string) {
  i18n.locale = lang;
  try {
    await AsyncStorage.setItem(STORAGE_KEY, lang);
  } catch {}
  applyRTLIfNeeded(lang);
  notifyLocaleChange(lang);
}

export function getCurrentLocale(): string {
  return i18n.locale;
}

function applyRTLIfNeeded(lang: string) {
  const isRTL = lang === 'ar';
  // لا نعمل forceRTL على الويب
  if (Platform.OS !== 'web') {
    // allowRTL(false) ضروري أيضاً: بدونه يبقى التطبيق من اليمين إذا كانت لغة الهاتف عربية
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
    // ملاحظة: تغيير RTL لا يظهر إلا بعد إعادة تشغيل التطبيق (needsRTLReload)
  }
}

/** true إذا كان اتجاه الواجهة الحالي لا يطابق اللغة — يلزم إعادة تشغيل التطبيق */
export function needsRTLReload(lang: string) {
  if (Platform.OS === 'web') return false;
  return I18nManager.isRTL !== (lang === 'ar');
}

export default i18n;