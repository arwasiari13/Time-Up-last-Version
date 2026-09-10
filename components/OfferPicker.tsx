import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  COLOR_PALETTE,
  DEFAULT_OFFER_COLOR,
  getOfferIcon,
  getReadableTextColor,
} from '../src/constants/offers';
import { getUserOffers } from '../src/database/offersDb';
import { onSyncComplete } from '../src/database/syncEngine';
import I18n from '../src/i18n';

interface Props {
  offer: string;
  color: string;
  onChangeOffer: (offer: string) => void;
  onChangeColor: (color: string) => void;
}

interface UserOffer {
  id: string;
  name: string;
  color: string;
}

/**
 * اختيار العرض من قائمة المستخدم (التي يبنيها من الإعدادات:
 * "تعديل الاشتراكات المتاحة")، مع إمكانية كتابة عرض جديد يدوياً.
 */
export default function OfferPicker({ offer, color, onChangeOffer, onChangeColor }: Props) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';
  const isFocused = useIsFocused();

  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    getUserOffers((rows: UserOffer[]) => {
      setOffers(rows);
      setLoading(false);
    });
  }, []);

  // نعيد التحميل عند العودة للصفحة حتى تظهر العروض المضافة حديثاً
  useEffect(() => {
    if (isFocused) load();
  }, [isFocused, load]);

  // بعد المزامنة (مثلاً أول دخول) نعيد القراءة حتى تظهر العروض القادمة من السحابة
  useEffect(() => {
    const unsubscribe = onSyncComplete(() => load());
    return () => {
      unsubscribe();
    };
  }, [load]);

  const selectOffer = (name: string, offerColor: string) => {
    if (offer.trim().toLowerCase() === name.toLowerCase()) {
      onChangeOffer(''); // الضغط مرة أخرى يلغي الاختيار
      return;
    }
    onChangeOffer(name);
    onChangeColor(offerColor || DEFAULT_OFFER_COLOR);
  };

  const handleTextChange = (text: string) => {
    onChangeOffer(text);
    // لو طابق النص عرضاً محفوظاً، نأخذ لونه تلقائياً
    const match = offers.find((o) => o.name.trim().toLowerCase() === text.trim().toLowerCase());
    if (match) onChangeColor(match.color || DEFAULT_OFFER_COLOR);
  };

  const labelColor = isDark ? '#D1D5DB' : '#4B5563';
  const isCustom = !offers.some((o) => o.name.trim().toLowerCase() === offer.trim().toLowerCase());

  return (
    <View style={{ marginBottom: 16 }}>
      {/* حقل كتابة العرض */}
      <TextInput
        style={{
          backgroundColor: isDark ? '#1E293B' : '#F9FAFB',
          color: isDark ? '#E5E7EB' : '#000000',
          borderColor: isDark ? '#4B5563' : '#E5E7EB',
          borderRadius: 12,
          padding: 16,
          fontSize: 16,
          borderWidth: 2,
        }}
        placeholder={I18n.t('offer')}
        placeholderTextColor={isDark ? '#9CA3AF' : '#6B7280'}
        value={offer}
        onChangeText={handleTextChange}
      />

      {/* عروض المستخدم المحفوظة */}
      <Text style={{ fontSize: 13, color: labelColor, marginTop: 12, marginBottom: 8 }}>
        {loading
          ? I18n.t('loadingOffers')
          : offers.length === 0
          ? I18n.t('noSavedOffers')
          : I18n.t('yourOffers')}
      </Text>

      {offers.length > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}>
            {offers.map((item) => {
              const selected = offer.trim().toLowerCase() === item.name.toLowerCase();
              const itemColor = item.color || DEFAULT_OFFER_COLOR;
              return (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.8}
                  onPress={() => selectOffer(item.name, itemColor)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 6,
                    paddingHorizontal: 12,
                    paddingVertical: 8,
                    borderRadius: 20,
                    borderWidth: selected ? 0 : 1,
                    borderColor: isDark ? '#4B5563' : '#E5E7EB',
                    backgroundColor: selected ? itemColor : isDark ? '#1E293B' : '#F9FAFB',
                  }}
                >
                  <Ionicons
                    name={getOfferIcon(item.name) as any}
                    size={14}
                    color={selected ? getReadableTextColor(itemColor) : itemColor}
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: '600',
                      color: selected
                        ? getReadableTextColor(itemColor)
                        : isDark
                        ? '#E5E7EB'
                        : '#1F2937',
                    }}
                  >
                    {item.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      )}

      {/* اللون يظهر فقط لعرض مكتوب يدوياً — العروض المحفوظة لها لونها */}
      {isCustom && offer.trim().length > 0 && (
        <>
          <Text style={{ fontSize: 13, color: labelColor, marginTop: 14, marginBottom: 8 }}>
            {I18n.t('color')}
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 10, paddingRight: 8, paddingVertical: 2 }}>
              {COLOR_PALETTE.map((swatch) => {
                const selected = color?.toLowerCase() === swatch.toLowerCase();
                return (
                  <TouchableOpacity
                    key={swatch}
                    activeOpacity={0.8}
                    onPress={() => onChangeColor(swatch)}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 17,
                      backgroundColor: swatch,
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderWidth: selected ? 3 : 0,
                      borderColor: isDark ? '#FFFFFF' : '#1F2937',
                    }}
                  >
                    {selected && (
                      <Ionicons name="checkmark" size={16} color={getReadableTextColor(swatch)} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </>
      )}
    </View>
  );
}
