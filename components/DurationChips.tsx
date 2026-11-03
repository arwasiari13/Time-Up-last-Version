import React, { useEffect, useRef } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import I18n from '../src/i18n';

interface PeriodDef {
  key: string;
  labelKey: string;
  days?: number;
  months?: number;
}

interface Props {
  startDate: Date;
  endDate: Date;
  /** يُستدعى بتاريخ النهاية المحسوب — يبقى قابلاً للتعديل يدوياً بعد ذلك */
  onPick: (end: Date) => void;
  isDark: boolean;
}

const PERIODS: PeriodDef[] = [
  { key: 'week', labelKey: 'durationWeek', days: 7 },
  { key: 'month', labelKey: 'durationMonth', months: 1 },
  { key: '3months', labelKey: 'duration3Months', months: 3 },
  { key: '6months', labelKey: 'duration6Months', months: 6 },
  { key: 'year', labelKey: 'durationYear', months: 12 },
];

/** إضافة أشهر مع الحفاظ على اليوم، أو آخر يوم في الشهر إن كان أقصر (31 يناير + شهر = 28 فبراير) */
const addMonthsClamped = (date: Date, months: number) => {
  const result = new Date(date.getFullYear(), date.getMonth() + months, 1, 12, 0, 0, 0);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(date.getDate(), lastDay));
  return result;
};

const addPeriod = (start: Date, period: PeriodDef) =>
  period.days
    ? new Date(start.getFullYear(), start.getMonth(), start.getDate() + period.days, 12, 0, 0, 0)
    : addMonthsClamped(start, period.months || 0);

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/**
 * أزرار سريعة لمدة الاشتراك: تحسب تاريخ النهاية من تاريخ البداية.
 *
 * تاريخ النهاية "يتبع" تاريخ البداية: إذا كانت النهاية = البداية + مدة من القائمة
 * ثم غيّر المستخدم البداية فقط، تتحرك النهاية بنفس المدة.
 * لا نلمس النهاية إذا عدّلها المستخدم يدوياً لتاريخ آخر، أو إذا تغيّر التاريخان معاً
 * (مثلاً عند التبديل بين عروض نفس الشخص في نافذة التعديل).
 */
export default function DurationChips({ startDate, endDate, onPick, isDark }: Props) {
  const prevStartRef = useRef(startDate);
  const prevEndRef = useRef(endDate);

  useEffect(() => {
    const prevStart = prevStartRef.current;
    const prevEnd = prevEndRef.current;
    prevStartRef.current = startDate;
    prevEndRef.current = endDate;

    const startChanged = !sameDay(prevStart, startDate);
    const endChanged = !sameDay(prevEnd, endDate);
    // نتدخل فقط عندما تتغير البداية وحدها
    if (!startChanged || endChanged) return;

    const followed = PERIODS.find((period) => sameDay(endDate, addPeriod(prevStart, period)));
    if (followed) onPick(addPeriod(startDate, followed));
  }, [startDate, endDate, onPick]);

  return (
    <View style={{ marginBottom: 12 }}>
      <Text
        style={{
          fontSize: 13,
          fontWeight: '600',
          marginBottom: 8,
          color: isDark ? '#9CA3AF' : '#6B7280',
        }}
      >
        {I18n.t('quickDuration')}
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {PERIODS.map((period) => {
            const end = addPeriod(startDate, period);
            // الزر المطابق للتواريخ الحالية يظهر مختاراً
            const selected = sameDay(end, endDate);
            return (
              <TouchableOpacity
                key={period.key}
                activeOpacity={0.8}
                onPress={() => onPick(end)}
                style={{
                  paddingHorizontal: 14,
                  paddingVertical: 8,
                  borderRadius: 20,
                  borderWidth: 1,
                  borderColor: selected ? '#00B8DB' : isDark ? '#475569' : '#E5E7EB',
                  backgroundColor: selected ? '#00B8DB' : isDark ? '#1E293B' : '#F9FAFB',
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '600',
                    color: selected ? '#FFFFFF' : isDark ? '#E5E7EB' : '#374151',
                  }}
                >
                  {I18n.t(period.labelKey)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}
