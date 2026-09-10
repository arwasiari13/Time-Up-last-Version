/**
 * العروض/الخدمات الجاهزة مع ألوان علاماتها التجارية.
 * المستخدم يستطيع اختيار واحدة منها أو كتابة عرض آخر واختيار لون له.
 */
export interface OfferPreset {
  name: string;
  color: string;
  icon: string; // اسم أيقونة Ionicons
}

export const OFFER_PRESETS: OfferPreset[] = [
  { name: 'Netflix', color: '#E50914', icon: 'film-outline' },
  { name: 'YouTube', color: '#FF0000', icon: 'logo-youtube' },
  { name: 'Spotify', color: '#1DB954', icon: 'musical-notes-outline' },
  { name: 'Duolingo', color: '#58CC02', icon: 'language-outline' },
  { name: 'Gemini', color: '#4285F4', icon: 'sparkles-outline' },
  { name: 'ChatGPT', color: '#10A37F', icon: 'chatbubble-ellipses-outline' },
  { name: 'Disney+', color: '#113CCF', icon: 'star-outline' },
  { name: 'Prime Video', color: '#00A8E1', icon: 'videocam-outline' },
  { name: 'Shahid', color: '#1BB99A', icon: 'tv-outline' },
  { name: 'Anghami', color: '#8E2DE2', icon: 'headset-outline' },
  { name: 'Canva', color: '#00C4CC', icon: 'color-palette-outline' },
  { name: 'Adobe', color: '#FA0F00', icon: 'brush-outline' },
  { name: 'Microsoft 365', color: '#F25022', icon: 'briefcase-outline' },
  { name: 'Apple', color: '#8E8E93', icon: 'logo-apple' },
  { name: 'Internet', color: '#00BCD4', icon: 'wifi-outline' },
];

/** ألوان إضافية لمن يختار عرضاً غير موجود في القائمة */
export const COLOR_PALETTE: string[] = [
  '#00BCD4', '#0097A7', '#4285F4', '#3F51B5', '#8E2DE2', '#E91E63',
  '#F44336', '#FF6D00', '#FFB300', '#58CC02', '#10A37F', '#607D8B',
];

export const DEFAULT_OFFER_COLOR = '#00BCD4';

/** يبحث عن لون العرض حسب الاسم (غير حسّاس لحالة الأحرف) */
export const findPresetByName = (name?: string): OfferPreset | undefined => {
  if (!name) return undefined;
  const normalized = name.trim().toLowerCase();
  return OFFER_PRESETS.find((preset) => preset.name.toLowerCase() === normalized);
};

/** أيقونة العرض — تُستخدم بدل الحروف الأولى */
export const getOfferIcon = (offer?: string): string =>
  findPresetByName(offer)?.icon || 'pricetag-outline';

/** الحروف الأولى التي تظهر في المربع الملوّن */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const a = (firstName || '').trim().charAt(0);
  const b = (lastName || '').trim().charAt(0);
  const initials = `${a}${b}`.toUpperCase();
  return initials || '?';
};

const hexToRgb = (hex: string) => {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return { r: 0, g: 188, b: 212 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

const toHex = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

/** يمزج لونين — weight هو نسبة اللون الأول (0..1) */
export const mixColors = (colorA: string, colorB: string, weight: number): string => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const w = Math.max(0, Math.min(1, weight));
  return `#${toHex(a.r * w + b.r * (1 - w))}${toHex(a.g * w + b.g * (1 - w))}${toHex(a.b * w + b.b * (1 - w))}`;
};

/** خلفية البطاقة: لون العرض ممزوج بلون السطح — هادئ وليس صارخاً */
export const getMutedCardColor = (color: string, isDark: boolean): string =>
  mixColors(color || DEFAULT_OFFER_COLOR, isDark ? '#141d2e' : '#ffffff', isDark ? 0.18 : 0.12);

/** حدّ خفيف بلون العرض */
export const getMutedBorderColor = (color: string, isDark: boolean): string =>
  mixColors(color || DEFAULT_OFFER_COLOR, isDark ? '#141d2e' : '#ffffff', isDark ? 0.45 : 0.35);

/** لون العرض بصيغة مقروءة فوق سطح فاتح/داكن */
export const getAccentOnSurface = (color: string, isDark: boolean): string =>
  isDark
    ? mixColors(color || DEFAULT_OFFER_COLOR, '#ffffff', 0.72)
    : mixColors(color || DEFAULT_OFFER_COLOR, '#000000', 0.82);

/** لون نص مقروء (أبيض/أسود) فوق لون الخلفية */
export const getReadableTextColor = (hex: string): string => {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  // معادلة السطوع النسبي
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1F2937' : '#FFFFFF';
};
