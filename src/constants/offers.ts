export const COLOR_PALETTE: string[] = [
  '#00BCD4',
  '#0097A7',
  '#4285F4',
  '#3F51B5',
  '#8E2DE2',
  '#E91E63',
  '#F44336',
  '#FF6D00',
  '#FFB300',
  '#58CC02',
  '#10A37F',
  '#607D8B',
];

export const DEFAULT_OFFER_COLOR = '#00BCD4';

export const getOfferIcon = (_offer?: string): string => 'pricetag-outline';

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

const toHex = (n: number) =>
  Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');

export const mixColors = (colorA: string, colorB: string, weight: number): string => {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  const w = Math.max(0, Math.min(1, weight));
  return `#${toHex(a.r * w + b.r * (1 - w))}${toHex(a.g * w + b.g * (1 - w))}${toHex(a.b * w + b.b * (1 - w))}`;
};

export const getMutedCardColor = (color: string, isDark: boolean): string =>
  mixColors(color || DEFAULT_OFFER_COLOR, isDark ? '#141d2e' : '#ffffff', isDark ? 0.18 : 0.12);

export const getMutedBorderColor = (color: string, isDark: boolean): string =>
  mixColors(color || DEFAULT_OFFER_COLOR, isDark ? '#141d2e' : '#ffffff', isDark ? 0.45 : 0.35);

export const getAccentOnSurface = (color: string, isDark: boolean): string =>
  isDark
    ? mixColors(color || DEFAULT_OFFER_COLOR, '#ffffff', 0.72)
    : mixColors(color || DEFAULT_OFFER_COLOR, '#000000', 0.82);

export const getReadableTextColor = (hex: string): string => {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return '#FFFFFF';
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1F2937' : '#FFFFFF';
};
