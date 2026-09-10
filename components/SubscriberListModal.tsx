import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_OFFER_COLOR, getOfferIcon, getReadableTextColor } from '../src/constants/offers';
import I18n from '../src/i18n';
import { groupByPerson, PersonGroup } from '../src/utils/subscriberGroups';
import { formatDate } from './SubscriberDetailsModal';

export interface ListSubscriber {
  id?: string | number;
  first_name: string;
  last_name: string;
  phone?: string;
  offer?: string;
  color?: string;
  start_date: string;
  end_date: string;
  created_at?: string;
  daysLeft: number;
}

interface Props {
  visible: boolean;
  title: string;
  /** لون العنوان والعدّاد — نفس لون بطاقة الإحصائية */
  accent: string;
  subscribers: ListSubscriber[];
  onClose: () => void;
  /** الضغط على اسم يفتح تفاصيله */
  onSelect?: (group: PersonGroup<ListSubscriber>) => void;
  /** true: كل شخص مرة واحدة. false: سطر لكل اشتراك */
  grouped?: boolean;
}

/** نافذة صغيرة بخلفية ضبابية: أسماء المشتركين مع عروضهم — كل شخص مرة واحدة */
export default function SubscriberListModal({
  visible,
  title,
  accent,
  subscribers,
  onClose,
  onSelect,
  grouped = true,
}: Props) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const text = isDark ? '#ffffff' : '#0d1525';
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.5)';
  const rowBg = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(13,21,37,0.03)';

  const groups = grouped
    ? groupByPerson(subscribers)
    : subscribers.map((sub) => groupByPerson([sub])[0]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          {/* الخلفية الضبابية */}
          <BlurView
            style={StyleSheet.absoluteFill}
            tint={isDark ? 'dark' : 'light'}
            intensity={60}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />

          {/* البطاقة الصغيرة */}
          <TouchableWithoutFeedback onPress={() => {}}>
            <View
              style={[
                styles.card,
                {
                  backgroundColor: isDark ? 'rgba(15,23,40,0.98)' : '#ffffff',
                  borderColor: isDark ? 'rgba(0,188,212,0.22)' : 'rgba(0,188,212,0.28)',
                },
              ]}
            >
              {/* الرأس */}
              <View style={styles.header}>
                <Text style={[styles.title, { color: accent }]} numberOfLines={1}>
                  {title}
                </Text>
                <View style={[styles.countBadge, { backgroundColor: `${accent}26` }]}>
                  <Text style={[styles.countText, { color: accent }]}>{groups.length}</Text>
                </View>
                <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                  <Ionicons name="close" size={20} color={muted} />
                </Pressable>
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,21,37,0.08)' },
                ]}
              />

              {groups.length === 0 ? (
                <Text style={[styles.empty, { color: muted }]}>{I18n.t('noSubscribers')}</Text>
              ) : (
                <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
                  {groups.map((group, index) => {
                    const primary = group.primary;
                    const offerColor = primary.color || DEFAULT_OFFER_COLOR;
                    const offersText = group.items.map((item) => item.offer || '-').join(' · ');
                    return (
                      <TouchableOpacity
                        key={`${group.key}-${index}`}
                        activeOpacity={0.7}
                        disabled={!onSelect}
                        onPress={() => onSelect?.(group)}
                        style={[styles.row, { backgroundColor: rowBg }]}
                      >
                        <View style={[styles.icon, { backgroundColor: offerColor }]}>
                          <Ionicons
                            name={getOfferIcon(primary.offer) as any}
                            size={16}
                            color={getReadableTextColor(offerColor)}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.name, { color: text }]} numberOfLines={1}>
                            {group.name}
                          </Text>
                          <Text style={[styles.offer, { color: muted }]} numberOfLines={1}>
                            {offersText}
                          </Text>
                        </View>
                        <Text
                          style={[styles.date, { color: primary.daysLeft < 0 ? '#ef4444' : muted }]}
                        >
                          {formatDate(primary.end_date)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 24,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { flex: 1, fontSize: 18, fontWeight: '700' },
  countBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 },
  countText: { fontSize: 13, fontWeight: '700' },
  closeBtn: { padding: 4 },
  divider: { height: 1, marginVertical: 14 },
  empty: { fontSize: 14, textAlign: 'center', paddingVertical: 20 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 10,
    borderRadius: 14,
    marginBottom: 8,
  },
  icon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '600' },
  offer: { fontSize: 12, fontWeight: '500', marginTop: 2 },
  date: { fontSize: 11, fontWeight: '600' },
});
