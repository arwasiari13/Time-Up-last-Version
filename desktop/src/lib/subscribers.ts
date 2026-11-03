import { t } from './i18n';

/**
 * كل عرض سجل مستقل في Firestore (users/{uid}/subscribers)،
 * وهنا نجمع السجلات التي تخص نفس الشخص (نفس الاسم + الهاتف) كما في تطبيق الهاتف.
 */
export interface Subscriber {
  id: string;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  start_date: string;
  end_date: string;
  price?: string;
  offer?: string;
  color?: string;
  created_at?: string;
}

export interface SubscriberWithDays extends Subscriber {
  daysLeft: number;
}

export interface PersonGroup {
  key: string;
  name: string;
  phone: string;
  address: string;
  items: SubscriberWithDays[];
  primary: SubscriberWithDays;
}

export type StatusKey = 'active' | 'expiring' | 'expired';

export const parseLocalDate = (value?: string): Date | null => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12);
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const daysLeftOf = (endDate?: string): number => {
  const end = parseLocalDate(endDate);
  if (!end) return 0;
  return Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
};

export const formatDate = (value?: string) => {
  const date = parseLocalDate(value);
  if (!date) return '—';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

/** نسبة المدة المنقضية من الاشتراك: 0 في البداية، 1 عند الانتهاء */
export const progressOf = (startDate?: string, endDate?: string) => {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) return 0;
  const total = end.getTime() - start.getTime();
  if (total <= 0) return Date.now() >= end.getTime() ? 1 : 0;
  return Math.min(1, Math.max(0, (Date.now() - start.getTime()) / total));
};

export const statusOf = (daysLeft: number): StatusKey =>
  daysLeft < 0 ? 'expired' : daysLeft <= 7 ? 'expiring' : 'active';

export const STATUS_COLORS: Record<StatusKey, string> = {
  active: '#22C55E',
  expiring: '#FBBF24',
  expired: '#EF4444',
};

/** اسم الحالة باللغة المختارة */
export const statusLabel = (status: StatusKey) => t(`status.${status}`);

const normalizeName = (value?: string) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const normalizePhone = (value?: string) => String(value || '').replace(/[^0-9]/g, '');

export const personKey = (sub: Subscriber) =>
  `${normalizeName(sub.first_name)}|${normalizeName(sub.last_name)}|${normalizePhone(sub.phone)}`;

/** يجمع الاشتراكات حسب الشخص — الأقرب انتهاءً أولاً */
export const groupByPerson = (list: SubscriberWithDays[]): PersonGroup[] => {
  const map = new Map<string, SubscriberWithDays[]>();
  const order: string[] = [];

  list.forEach((sub) => {
    const key = personKey(sub);
    const existing = map.get(key);
    if (existing) existing.push(sub);
    else {
      map.set(key, [sub]);
      order.push(key);
    }
  });

  return order.map((key) => {
    const original = map.get(key)!;
    const first = original[0];
    const items = [...original].sort((a, b) => a.daysLeft - b.daysLeft);
    return {
      key,
      name: `${first.first_name} ${first.last_name}`.trim(),
      phone: first.phone || '',
      address: first.address || '',
      items,
      primary: items[0],
    };
  });
};

export const moneyOf = (price?: string) => Number(price) || 0;

export const formatMoney = (amount: number) => `${amount.toLocaleString('en-US')} DZD`;
