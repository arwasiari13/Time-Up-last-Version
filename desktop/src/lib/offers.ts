export const DEFAULT_OFFER_COLOR = '#00BCD4';

export const offerColor = (_offer?: string, saved?: string) => saved || DEFAULT_OFFER_COLOR;

const hexToRgb = (hex: string) => {
  const clean = (hex || '').replace('#', '');
  if (clean.length !== 6) return { r: 0, g: 188, b: 212 };
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
};

export const withAlpha = (hex: string, alpha: number) => {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export const readableOn = (hex: string) => {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? '#0d1525' : '#ffffff';
};

export const offerInitial = (offer?: string) => (offer || '?').trim().charAt(0).toUpperCase();

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
