/**
 * كل عرض محفوظ كسجل مستقل في قاعدة البيانات، فتبقى المزامنة والإشعارات
 * والحذف تعمل لكل عرض على حدة.
 * هنا نجمع السجلات التي تخص نفس الشخص (نفس الاسم + نفس الهاتف)
 * لعرضها في بطاقة واحدة بدل ظهور الشخص مرتين.
 */
export interface GroupableSubscriber {
  id?: string | number;
  first_name: string;
  last_name: string;
  phone?: string;
  address?: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  daysLeft: number;
}

export interface PersonGroup<T extends GroupableSubscriber> {
  key: string;
  first_name: string;
  last_name: string;
  name: string;
  phone: string;
  address: string;
  /** عروض الشخص — الأقرب انتهاءً أولاً */
  items: T[];
  /** العرض الأقرب انتهاءً: يحدد لون البطاقة وحالتها */
  primary: T;
}

const normalizeName = (value?: string) =>
  String(value || '').trim().replace(/\s+/g, ' ').toLowerCase();

const normalizePhone = (value?: string) => String(value || '').replace(/[^0-9]/g, '');

/** مفتاح الشخص: الاسم الكامل + الهاتف */
export const personKey = (sub: { first_name: string; last_name: string; phone?: string }) =>
  `${normalizeName(sub.first_name)}|${normalizeName(sub.last_name)}|${normalizePhone(sub.phone)}`;

/** يجمع العروض حسب الشخص، مع الحفاظ على ترتيب القائمة الأصلية */
export function groupByPerson<T extends GroupableSubscriber>(list: T[]): PersonGroup<T>[] {
  const map = new Map<string, T[]>();
  const order: string[] = [];

  list.forEach((sub) => {
    const key = personKey(sub);
    const existing = map.get(key);
    if (existing) {
      existing.push(sub);
    } else {
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
      first_name: first.first_name,
      last_name: first.last_name,
      name: `${first.first_name} ${first.last_name}`.trim(),
      phone: first.phone || '',
      address: first.address || '',
      items,
      primary: items[0],
    };
  });
}

const parseLocalDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12, 0, 0, 0);
  }
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

/** نسبة المدة المنقضية من الاشتراك: 0 في البداية، 1 عند الانتهاء */
export function getOfferProgress(startDate?: string, endDate?: string): number {
  const start = parseLocalDate(startDate);
  const end = parseLocalDate(endDate);
  if (!start || !end) return 0;

  const now = Date.now();
  const total = end.getTime() - start.getTime();
  if (total <= 0) return now >= end.getTime() ? 1 : 0;

  return Math.min(1, Math.max(0, (now - start.getTime()) / total));
}
