import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { DEFAULT_OFFER_COLOR, getOfferIcon, getReadableTextColor } from '../src/constants/offers';
import I18n from '../src/i18n';

export interface DetailsSubscriber {
  name?: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  address?: string;
  start_date?: string;
  end_date?: string;
  price?: string;
  offer?: string;
  color?: string;
  daysLeft?: number;
}

interface Props {
  visible: boolean;
  subscriber: DetailsSubscriber | null;
  onClose: () => void;
  /** كل عروض الشخص — إذا كانت أكثر من واحد تُعرض كبطاقات صغيرة */
  offers?: DetailsSubscriber[];
  /** عند تمريرهما تظهر أزرار التعديل والحذف أسفل البطاقة */
  onEdit?: () => void;
  onDelete?: () => void;
}

const parseDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) {
    const [, y, m, d] = match;
    return new Date(Number(y), Number(m) - 1, Number(d), 12, 0, 0, 0);
  }
  return value ? new Date(value) : null;
};

export const formatDate = (value?: string) => {
  const date = parseDate(value);
  if (!date || Number.isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusOf = (daysLeft?: number) => {
  if (daysLeft === undefined || daysLeft === null) return { label: '-', bg: '#6B7280', fg: '#ffffff' };
  if (daysLeft < 0) return { label: I18n.t('expired'), bg: '#FEE2E2', fg: '#B91C1C' };
  if (daysLeft <= 7) return { label: I18n.t('expiring'), bg: '#FEF3C7', fg: '#B45309' };
  return { label: I18n.t('active'), bg: '#DCFCE7', fg: '#15803D' };
};

export default function SubscriberDetailsModal({ visible, subscriber, onClose, offers, onEdit, onDelete }: Props) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  if (!subscriber) return null;

  const name =
    subscriber.name || `${subscriber.first_name ?? ''} ${subscriber.last_name ?? ''}`.trim() || '-';
  const status = statusOf(subscriber.daysLeft);

  // أكثر من عرض: بيانات الشخص في الأعلى، وكل عرض في بطاقة صغيرة تحتها
  const multi = (offers?.length ?? 0) > 1;
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.5)';

  const personRows = [
    { icon: 'call-outline', label: I18n.t('phoneNumber'), value: subscriber.phone || '-' },
    { icon: 'location-outline', label: I18n.t('address'), value: subscriber.address || '-' },
  ];

  const rows: { icon: string; label: string; value: string }[] = multi
    ? personRows
    : [
        { icon: 'pricetag-outline', label: I18n.t('subscription'), value: subscriber.offer || '-' },
        ...personRows,
        { icon: 'play-outline', label: I18n.t('startDate'), value: formatDate(subscriber.start_date) },
        { icon: 'flag-outline', label: I18n.t('endDate'), value: formatDate(subscriber.end_date) },
        { icon: 'cash-outline', label: I18n.t('price'), value: subscriber.price ? `${subscriber.price} DZD` : '-' },
      ];

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
                {/* المربع الملوّن حسب لون العرض */}
                <View
                  style={[
                    styles.avatar,
                    { backgroundColor: subscriber.color || DEFAULT_OFFER_COLOR },
                  ]}
                >
                  <Ionicons
                    name={getOfferIcon(subscriber.offer) as any}
                    size={24}
                    color={getReadableTextColor(subscriber.color || DEFAULT_OFFER_COLOR)}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text
                    style={[styles.name, { color: isDark ? '#ffffff' : '#0d1525' }]}
                    numberOfLines={2}
                  >
                    {name}
                  </Text>
                  <View style={[styles.badge, { backgroundColor: status.bg }]}>
                    <Text style={[styles.badgeText, { color: status.fg }]}>{status.label}</Text>
                  </View>
                </View>
                <Pressable onPress={onClose} hitSlop={10} style={styles.closeBtn}>
                  <Ionicons
                    name="close"
                    size={20}
                    color={isDark ? 'rgba(255,255,255,0.6)' : 'rgba(13,21,37,0.5)'}
                  />
                </Pressable>
              </View>

              <View
                style={[
                  styles.divider,
                  { backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,21,37,0.08)' },
                ]}
              />

              <ScrollView style={{ maxHeight: 320 }} showsVerticalScrollIndicator={false}>
                {rows.map((row) => (
                  <View key={row.label} style={styles.row}>
                    <View
                      style={[
                        styles.iconWrap,
                        { backgroundColor: isDark ? 'rgba(0,188,212,0.15)' : 'rgba(0,150,180,0.1)' },
                      ]}
                    >
                      <Ionicons name={row.icon as any} size={16} color="#00bcd4" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text
                        style={[
                          styles.rowLabel,
                          { color: isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.5)' },
                        ]}
                      >
                        {row.label}
                      </Text>
                      <Text
                        style={[styles.rowValue, { color: isDark ? '#ffffff' : '#0d1525' }]}
                        numberOfLines={2}
                      >
                        {row.value}
                      </Text>
                    </View>
                  </View>
                ))}

                {/* عروض الشخص — عندما يكون مشتركاً في أكثر من عرض */}
                {multi &&
                  offers!.map((item, index) => {
                    const itemColor = item.color || DEFAULT_OFFER_COLOR;
                    const itemStatus = statusOf(item.daysLeft);
                    return (
                      <View
                        key={index}
                        style={[
                          styles.offerBlock,
                          { borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,21,37,0.08)' },
                        ]}
                      >
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                          <View style={[styles.offerIcon, { backgroundColor: itemColor }]}>
                            <Ionicons
                              name={getOfferIcon(item.offer) as any}
                              size={14}
                              color={getReadableTextColor(itemColor)}
                            />
                          </View>
                          <Text
                            numberOfLines={1}
                            style={{
                              flex: 1,
                              fontSize: 15,
                              fontWeight: '700',
                              color: isDark ? '#ffffff' : '#0d1525',
                            }}
                          >
                            {item.offer || '-'}
                          </Text>
                          <View style={[styles.badge, { backgroundColor: itemStatus.bg }]}>
                            <Text style={[styles.badgeText, { color: itemStatus.fg }]}>
                              {itemStatus.label}
                            </Text>
                          </View>
                        </View>
                        <Text style={{ fontSize: 12, color: muted, marginTop: 8 }}>
                          {formatDate(item.start_date)} → {formatDate(item.end_date)}
                          {'  ·  '}
                          {item.price ? `${item.price} DZD` : '-'}
                        </Text>
                      </View>
                    );
                  })}
              </ScrollView>

              {/* أزرار صغيرة للتعديل والحذف */}
              {(onEdit || onDelete) && (
                <View style={styles.actions}>
                  {onEdit && (
                    <Pressable
                      onPress={onEdit}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          backgroundColor: isDark ? 'rgba(0,188,212,0.15)' : 'rgba(0,150,180,0.1)',
                          borderColor: isDark ? 'rgba(0,188,212,0.3)' : 'rgba(0,150,180,0.25)',
                        },
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <Ionicons name="pencil" size={14} color="#00bcd4" />
                      <Text style={[styles.actionText, { color: '#00bcd4' }]}>{I18n.t('edit')}</Text>
                    </Pressable>
                  )}
                  {onDelete && (
                    <Pressable
                      onPress={onDelete}
                      style={({ pressed }) => [
                        styles.actionBtn,
                        {
                          backgroundColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)',
                          borderColor: isDark ? 'rgba(239,68,68,0.35)' : 'rgba(239,68,68,0.25)',
                        },
                        pressed && styles.actionPressed,
                      ]}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={[styles.actionText, { color: '#EF4444' }]}>{I18n.t('delete')}</Text>
                    </Pressable>
                  )}
                </View>
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
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 16,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  avatar: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 17, fontWeight: '700' },
  name: { fontSize: 19, fontWeight: '700', marginBottom: 8 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  closeBtn: { padding: 4 },
  divider: { height: 1, marginVertical: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  iconWrap: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  rowLabel: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, marginBottom: 2 },
  rowValue: { fontSize: 15, fontWeight: '500' },
  offerBlock: { borderWidth: 1, borderRadius: 14, padding: 12, marginBottom: 10 },
  offerIcon: { width: 28, height: 28, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  actions: { flexDirection: 'row', gap: 10, marginTop: 6 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  actionPressed: { opacity: 0.75 },
  actionText: { fontSize: 13, fontWeight: '700' },
});
