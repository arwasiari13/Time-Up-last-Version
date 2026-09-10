import React from 'react';
import { Text, View } from 'react-native';
import { DEFAULT_OFFER_COLOR, getAccentOnSurface } from '../src/constants/offers';
import { getOfferProgress } from '../src/utils/subscriberGroups';
import { formatDate } from './SubscriberDetailsModal';

export interface OfferLine {
  id?: string | number;
  offer?: string;
  color?: string;
  start_date: string;
  end_date: string;
  daysLeft: number;
}

interface Props {
  items: OfferLine[];
  isDark: boolean;
}

/**
 * لكل عرض سطران:
 *   العرض ............ تاريخ الانتهاء
 *   ▬▬▬▬▬▬▬▬▬▬▬▬ شريط تقدّم بلون العرض
 */
export default function OfferProgressList({ items, isDark }: Props) {
  const muted = isDark ? 'rgba(229,231,235,0.65)' : 'rgba(31,41,55,0.6)';
  const track = isDark ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.07)';

  return (
    <View style={{ gap: 10 }}>
      {items.map((item, index) => {
        const color = item.color || DEFAULT_OFFER_COLOR;
        const expired = item.daysLeft < 0;
        const progress = getOfferProgress(item.start_date, item.end_date);

        return (
          <View key={item.id ?? index}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
                marginBottom: 5,
              }}
            >
              <Text
                numberOfLines={1}
                style={{
                  flex: 1,
                  fontSize: 14,
                  fontWeight: '700',
                  color: getAccentOnSurface(color, isDark),
                }}
              >
                {item.offer || '-'}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '600', color: expired ? '#ef4444' : muted }}>
                {formatDate(item.end_date)}
              </Text>
            </View>

            <View style={{ height: 6, borderRadius: 3, overflow: 'hidden', backgroundColor: track }}>
              <View
                style={{
                  width: `${Math.round(progress * 100)}%`,
                  height: '100%',
                  borderRadius: 3,
                  backgroundColor: color,
                }}
              />
            </View>
          </View>
        );
      })}
    </View>
  );
}
