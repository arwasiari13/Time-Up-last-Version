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
    subscribers: 'Students',
    settings: 'Settings',
    addSubscriber: '+ Add Student',
    viewAll: 'View All',
    save: 'Save',
    cancel: 'Cancel',
    name: 'Name',
    phone: 'Phone',
    email: 'Email',
    subscription: 'Subject',
    totalSubscribers: 'Total Students',
    clients: 'students',
    activeSubscriptions: 'Active Enrollments',
    expiredSubscriptions: 'Expired Enrollments',
    expiringThisWeek: 'Expiring This Week',
    monthlyRevenue: 'Monthly Revenue',
    language: 'Language',
    theme: 'Theme',
    notifications: 'Notifications',
    privacy: 'Privacy',
    about: 'About',
    logout: 'Logout',
    search: 'Search students...',
    noSubscribers: 'No students found',
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
    recentSubscribers: 'Recent Students',
    addSubscriberTitle: 'Add Student',
    firstNameRequired: 'First name is required',
    lastNameRequired: 'Last name is required',
    phoneRequired: 'Phone number is required',
    priceRequired: 'Price is required',
    total: 'total',
    offers: 'subjects',
    noOffersYet: 'No subjects yet.',
    mostUsedOffers: 'Most popular subjects',
    rankedBySubscribers: 'Ranked by number of students',
    statusBreakdown: 'Status breakdown',
    shareOfAll: 'Share of all enrollments',
    revenueByOffer: 'Revenue by subject',
    revenuePerOffer: 'Income per subject (DZD)',
    offersOfPerson: 'Subjects',
    addAnotherOffer: 'Add another subject',
    deleteThisOffer: 'Delete this subject',
    editSubscriber: 'Edit Student',
    totalSubscriptions: 'Total Enrollments',
    subscriptionsCount: 'enrollments',
    totalRevenue: 'Revenue',
    manageOffers: 'Manage subjects',
    testNotifications: 'Test notifications',
    notifSendFailed: 'Could not send the notification. Make sure notifications are allowed for the app.',
    notifTestSent: 'Test notification sent',
    notifScheduledNow: 'Currently scheduled notifications',
    addOffer: 'Add subject',
    offerName: 'Subject name',
    color: 'Color',
    offer: 'Subject',
    noOffersAddBelow: 'No subjects yet. Add one with the button below.',
    alreadyExists: 'Already exists',
    alreadyInListMsg: '"%{name}" is already in your list.',
    saveError: 'Save error',
    readError: 'Read error',
    deleteOffer: 'Delete subject',
    deleteOfferConfirm: 'Remove "%{name}" from your list?',
    loadingOffers: 'Loading subjects…',
    noSavedOffers: 'No saved subjects — add them in Settings → Manage subjects',
    yourOffers: 'Your subjects',
    builtIn: 'Built in Constantine',
    madeIn: 'Made in Algeria',
    restartToApply: 'Close and reopen the app to apply the language direction.',
    quickDuration: 'Duration',
    durationWeek: '1 week',
    durationMonth: '1 month',
    duration3Months: '3 months',
    duration6Months: '6 months',
    durationYear: '1 year',
    feedback: 'Send feedback',
    feedbackTitle: 'Your feedback',
    feedbackSubtitle: 'Tell us what you like, what is missing, or any problem.',
    feedbackPlaceholder: 'Write your message…',
    feedbackSend: 'Send',
    feedbackThanks: 'Thank you!',
    feedbackThanksMsg: 'Your feedback was sent.',
    feedbackEmpty: 'Please write a message first.',
    feedbackOffline: 'No internet connection. Try again when you are online.',
    feedbackFailed: 'Could not send. Please try again.',
    feedbackAnonymous: 'Your feedback is anonymous — your name is not sent.',
    deleteStudent: 'Delete student',
    deleteSubjectOf: 'Delete the "%{offer}" subject from %{name}?',
    deleteStudentAll: 'Delete %{name} and all their subjects (%{count})?',
    deleteStudentOne: 'Delete %{name}?',
    fillRequired: 'Please fill in all required fields',
    loadFailed: 'Failed to load data',
    invoice: 'Invoice',
    invoiceDetails: 'Enrollment details',
    notifChannel: 'Enrollment reminders',
    notifEndingTitle: '⚠️ Enrollment ending soon',
    notifEndingSoonBody: "%{name}'s enrollment ends soon (%{date}).",
    notifEndsInBody: "%{name}'s enrollment ends %{when} (%{date})",
    notifTomorrow: 'tomorrow',
    notifIn2Days: 'in 2 days',
    notifInDays: 'in %{count} days',
    notifEndedTitle: '🔴 Enrollment ended!',
    notifEndedBody: "%{name}'s enrollment has ended. Contact them to renew.",
    notifEndedTodayBody: "%{name}'s enrollment ended today. Contact them to renew.",
    notifTestTitle: '🔔 Notification test',
    notifTestBody: 'Local notifications are working!'
  },
  ar: {
    appName: 'TIME UP',
    dashboard: 'لوحة التحكم',
    subscribers: 'التلاميذ',
    settings: 'الإعدادات',
    addSubscriber: '+ أضف تلميذ',
    viewAll: 'عرض الكل',
    save: 'حفظ',
    cancel: 'إلغاء',
    name: 'الاسم',
    phone: 'الهاتف',
    email: 'البريد الإلكتروني',
    subscription: 'المادة',
    totalSubscribers: 'إجمالي التلاميذ',
    clients: 'تلاميذ',
    activeSubscriptions: 'التسجيلات النشطة',
    expiredSubscriptions: 'التسجيلات المنتهية',
    expiringThisWeek: 'ينتهي هذا الأسبوع',
    monthlyRevenue: 'الإيرادات الشهرية',
    language: 'اللغة',
    theme: 'المظهر',
    notifications: 'الإشعارات',
    privacy: 'الخصوصية',
    about: 'حول التطبيق',
    logout: 'تسجيل الخروج',
    search: 'البحث في التلاميذ...',
    noSubscribers: 'لم يتم العثور على تلاميذ',
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
    recentSubscribers: 'آخر التلاميذ',
    addSubscriberTitle: 'إضافة تلميذ',
    firstNameRequired: 'الاسم الأول مطلوب',
    lastNameRequired: 'الاسم الأخير مطلوب',
    phoneRequired: 'رقم الهاتف مطلوب',
    priceRequired: 'السعر مطلوب',
    total: 'المجموع',
    offers: 'مواد',
    noOffersYet: 'لا توجد مواد بعد.',
    mostUsedOffers: 'المواد الأكثر طلباً',
    rankedBySubscribers: 'حسب عدد التلاميذ',
    statusBreakdown: 'توزيع الحالات',
    shareOfAll: 'النسبة من كل التسجيلات',
    revenueByOffer: 'الإيرادات حسب المادة',
    revenuePerOffer: 'الدخل لكل مادة (دج)',
    offersOfPerson: 'المواد',
    addAnotherOffer: 'إضافة مادة أخرى',
    deleteThisOffer: 'حذف هذه المادة',
    editSubscriber: 'تعديل التلميذ',
    totalSubscriptions: 'إجمالي التسجيلات',
    subscriptionsCount: 'تسجيلات',
    totalRevenue: 'الإيرادات',
    manageOffers: 'تعديل المواد',
    testNotifications: 'اختبار الإشعارات',
    notifSendFailed: 'تعذر إرسال الإشعار. تأكد من السماح بالإشعارات للتطبيق.',
    notifTestSent: 'تم إرسال إشعار تجريبي',
    notifScheduledNow: 'الإشعارات المجدولة حالياً',
    addOffer: 'إضافة مادة',
    offerName: 'اسم المادة',
    color: 'اللون',
    offer: 'المادة',
    noOffersAddBelow: 'لا توجد مواد بعد. أضف مادة بالزر أدناه.',
    alreadyExists: 'موجود مسبقاً',
    alreadyInListMsg: '"%{name}" موجود في قائمتك.',
    saveError: 'خطأ في الحفظ',
    readError: 'خطأ في القراءة',
    deleteOffer: 'حذف المادة',
    deleteOfferConfirm: 'حذف "%{name}" من قائمتك؟',
    loadingOffers: 'جاري تحميل المواد…',
    noSavedOffers: 'لا توجد مواد محفوظة — أضفها من الإعدادات ← تعديل المواد',
    yourOffers: 'موادك',
    builtIn: 'صُنع في قسنطينة',
    madeIn: 'صُنع في الجزائر',
    restartToApply: 'أغلق التطبيق وأعد فتحه لتطبيق اتجاه اللغة.',
    quickDuration: 'المدة',
    durationWeek: 'أسبوع',
    durationMonth: 'شهر',
    duration3Months: '3 أشهر',
    duration6Months: '6 أشهر',
    durationYear: 'سنة',
    feedback: 'أرسل ملاحظاتك',
    feedbackTitle: 'رأيك في التطبيق',
    feedbackSubtitle: 'أخبرنا بما يعجبك، ما ينقص، أو أي مشكلة.',
    feedbackPlaceholder: 'اكتب رسالتك…',
    feedbackSend: 'إرسال',
    feedbackThanks: 'شكراً لك!',
    feedbackThanksMsg: 'تم إرسال ملاحظتك.',
    feedbackEmpty: 'اكتب رسالة أولاً.',
    feedbackOffline: 'لا يوجد اتصال بالإنترنت. حاول مرة أخرى عند الاتصال.',
    feedbackFailed: 'تعذر الإرسال، حاول مرة أخرى.',
    feedbackAnonymous: 'ملاحظتك مجهولة — لا يُرسل اسمك.',
    deleteStudent: 'حذف التلميذ',
    deleteSubjectOf: 'هل تريد حذف مادة "%{offer}" من %{name}؟',
    deleteStudentAll: 'هل تريد حذف %{name} مع كل مواده (%{count})؟',
    deleteStudentOne: 'هل تريد حذف %{name}؟',
    fillRequired: 'يرجى ملء جميع الحقول المطلوبة',
    loadFailed: 'فشل في تحميل البيانات',
    invoice: 'فاتورة',
    invoiceDetails: 'معلومات التسجيل',
    notifChannel: 'تنبيهات التسجيلات',
    notifEndingTitle: '⚠️ تنبيه: تسجيل على وشك الانتهاء',
    notifEndingSoonBody: 'تسجيل %{name} سينتهي قريبًا (%{date}).',
    notifEndsInBody: 'تسجيل %{name} ينتهي %{when} (%{date})',
    notifTomorrow: 'غداً',
    notifIn2Days: 'خلال يومين',
    notifInDays: 'خلال %{count} أيام',
    notifEndedTitle: '🔴 انتهى التسجيل!',
    notifEndedBody: 'تسجيل %{name} منتهي. يرجى التواصل لتجديد التسجيل.',
    notifEndedTodayBody: 'تسجيل %{name} انتهى اليوم. يرجى التواصل لتجديد التسجيل.',
    notifTestTitle: '🔔 اختبار الإشعارات',
    notifTestBody: 'نظام الإشعارات المحلية يعمل بشكل صحيح!'
  },
  fr: {
    appName: 'Time Up',
    dashboard: 'Tableau de bord',
    subscribers: 'Élèves',
    settings: 'Paramètres',
    addSubscriber: '+ Ajouter',
    viewAll: 'Voir tout',
    save: 'Enregistrer',
    cancel: 'Annuler',
    name: 'Nom',
    phone: 'Téléphone',
    email: 'E-mail',
    subscription: 'Matière',
    totalSubscribers: 'Total des élèves',
    clients: 'élèves',
    activeSubscriptions: 'Inscriptions actives',
    expiredSubscriptions: 'Inscriptions expirées',
    monthlyRevenue: 'Revenus mensuels',
    language: 'Langue',
    theme: 'Thème',
    notifications: 'Notifications',
    privacy: 'Confidentialité',
    about: 'À propos',
    logout: 'Déconnexion',
    search: 'Rechercher des élèves...',
    noSubscribers: 'Aucun élève trouvé',
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
    recentSubscribers: 'Élèves récents',
    addSubscriberTitle: 'Ajouter un élève',
    firstNameRequired: 'Le prénom est requis',
    lastNameRequired: 'Le nom est requis',
    phoneRequired: 'Le numéro de téléphone est requis',
    priceRequired: 'Le prix est requis',
    expiringThisWeek: 'Expire cette semaine',
    total: 'total',
    offers: 'matières',
    noOffersYet: 'Aucune matière pour le moment.',
    mostUsedOffers: 'Matières les plus suivies',
    rankedBySubscribers: "Classées par nombre d'élèves",
    statusBreakdown: 'Répartition des statuts',
    shareOfAll: 'Part de toutes les inscriptions',
    revenueByOffer: 'Revenus par matière',
    revenuePerOffer: 'Montant par matière (DZD)',
    offersOfPerson: 'Matières',
    addAnotherOffer: 'Ajouter une autre matière',
    deleteThisOffer: 'Supprimer cette matière',
    editSubscriber: "Modifier l'élève",
    totalSubscriptions: 'Total des inscriptions',
    subscriptionsCount: 'inscriptions',
    totalRevenue: 'Revenus',
    manageOffers: 'Gérer les matières',
    testNotifications: 'Tester les notifications',
    notifSendFailed: "Impossible d'envoyer la notification. Vérifiez que les notifications sont autorisées.",
    notifTestSent: 'Notification de test envoyée',
    notifScheduledNow: 'Notifications programmées',
    addOffer: 'Ajouter une matière',
    offerName: 'Nom de la matière',
    color: 'Couleur',
    offer: 'Matière',
    noOffersAddBelow: 'Aucune matière. Ajoutez-en une avec le bouton ci-dessous.',
    alreadyExists: 'Existe déjà',
    alreadyInListMsg: '"%{name}" est déjà dans votre liste.',
    saveError: "Erreur d'enregistrement",
    readError: 'Erreur de lecture',
    deleteOffer: 'Supprimer la matière',
    deleteOfferConfirm: 'Retirer "%{name}" de votre liste ?',
    loadingOffers: 'Chargement des matières…',
    noSavedOffers: 'Aucune matière enregistrée — ajoutez-en dans Paramètres → Gérer les matières',
    yourOffers: 'Vos matières',
    builtIn: 'Conçu à Constantine',
    madeIn: 'Fabriqué en Algérie',
    restartToApply: "Fermez et rouvrez l'application pour appliquer le sens de la langue.",
    quickDuration: 'Durée',
    durationWeek: '1 semaine',
    durationMonth: '1 mois',
    duration3Months: '3 mois',
    duration6Months: '6 mois',
    durationYear: '1 an',
    feedback: 'Envoyer un avis',
    feedbackTitle: 'Votre avis',
    feedbackSubtitle: "Dites-nous ce qui vous plaît, ce qui manque ou tout problème.",
    feedbackPlaceholder: 'Écrivez votre message…',
    feedbackSend: 'Envoyer',
    feedbackThanks: 'Merci !',
    feedbackThanksMsg: 'Votre avis a été envoyé.',
    feedbackEmpty: "Écrivez d'abord un message.",
    feedbackOffline: 'Pas de connexion internet. Réessayez une fois connecté.',
    feedbackFailed: "Échec de l'envoi, réessayez.",
    feedbackAnonymous: "Votre avis est anonyme — votre nom n'est pas envoyé.",
    deleteStudent: "Supprimer l'élève",
    deleteSubjectOf: 'Supprimer la matière « %{offer} » de %{name} ?',
    deleteStudentAll: 'Supprimer %{name} et toutes ses matières (%{count}) ?',
    deleteStudentOne: 'Supprimer %{name} ?',
    fillRequired: 'Veuillez remplir tous les champs obligatoires',
    loadFailed: 'Échec du chargement des données',
    invoice: 'Facture',
    invoiceDetails: "Détails de l'inscription",
    notifChannel: 'Rappels des inscriptions',
    notifEndingTitle: '⚠️ Inscription bientôt terminée',
    notifEndingSoonBody: "L'inscription de %{name} se termine bientôt (%{date}).",
    notifEndsInBody: "L'inscription de %{name} se termine %{when} (%{date})",
    notifTomorrow: 'demain',
    notifIn2Days: 'dans 2 jours',
    notifInDays: 'dans %{count} jours',
    notifEndedTitle: '🔴 Inscription terminée !',
    notifEndedBody: "L'inscription de %{name} est terminée. Pensez à la renouveler.",
    notifEndedTodayBody: "L'inscription de %{name} s'est terminée aujourd'hui. Pensez à la renouveler.",
    notifTestTitle: '🔔 Test des notifications',
    notifTestBody: 'Les notifications locales fonctionnent !'
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
