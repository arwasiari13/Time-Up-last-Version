import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import {
  COLOR_PALETTE,
  DEFAULT_OFFER_COLOR,
  getOfferIcon,
  getReadableTextColor,
  OFFER_PRESETS,
} from '../src/constants/offers';
import { addUserOffer, deleteUserOffer, getUserOffers } from '../src/database/offersDb';
import { onSyncComplete } from '../src/database/syncEngine';
import I18n from '../src/i18n';

interface Props {
  visible: boolean;
  onClose: () => void;
}

export interface UserOffer {
  id: string;
  name: string;
  color: string;
}

export default function ManageOffersModal({ visible, onClose }: Props) {
  const { effectiveTheme } = useTheme();
  const isDark = effectiveTheme === 'dark';

  const [offers, setOffers] = useState<UserOffer[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_OFFER_COLOR);

  const load = useCallback(() => {
    setLoading(true);
    getUserOffers((rows: UserOffer[], error?: string) => {
      setOffers(rows);
      setLoading(false);
      if (error) Alert.alert(I18n.t('readError'), String(error));
    });
  }, []);

  useEffect(() => {
    if (visible) {
      load();
      setShowForm(false);
      setName('');
      setColor(DEFAULT_OFFER_COLOR);
    }
  }, [visible, load]);

  // انتهت مزامنة والنافذة مفتوحة — نعيد القراءة حتى تظهر عروض السحابة
  useEffect(() => {
    if (!visible) return;
    const unsubscribe = onSyncComplete(() => load());
    return () => {
      unsubscribe();
    };
  }, [visible, load]);

  const save =(offerName: string, offerColor: string) => {
    if (!offerName.trim()) return;
    setAdding(true);
    addUserOffer(offerName, offerColor, (id: string | null, error: string | null) => {
      setAdding(false);
      if (error === 'DUPLICATE') {
        Alert.alert(I18n.t('alreadyExists'), I18n.t('alreadyInListMsg', { name: offerName }));
        return;
      }
      if (error) {
        Alert.alert(I18n.t('saveError'), String(error));
        return;
      }
      setName('');
      setColor(DEFAULT_OFFER_COLOR);
      setShowForm(false);
      load();
    });
  };

  const remove = (offer: UserOffer) => {
    Alert.alert(I18n.t('deleteOffer'), I18n.t('deleteOfferConfirm', { name: offer.name }), [
      { text: I18n.t('cancel'), style: 'cancel' },
      {
        text: I18n.t('delete'),
        style: 'destructive',
        onPress: () => deleteUserOffer(offer.id, () => load()),
      },
    ]);
  };

  const savedNames = offers.map((o) => o.name.toLowerCase());
  const availablePresets = OFFER_PRESETS.filter((p) => !savedNames.includes(p.name.toLowerCase()));

  const text = isDark ? '#ffffff' : '#0d1525';
  const muted = isDark ? 'rgba(255,255,255,0.5)' : 'rgba(13,21,37,0.55)';
  const surface = isDark ? 'rgba(15,23,40,0.98)' : '#ffffff';
  const inputBg = isDark ? '#1E293B' : '#F9FAFB';
  const border = isDark ? '#334155' : '#E5E7EB';

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <BlurView style={StyleSheet.absoluteFill} tint={isDark ? 'dark' : 'light'} intensity={50} />
        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.25)' }]} />

        <View style={[styles.sheet, { backgroundColor: surface }]}>
          {/* الرأس */}
          <View style={styles.header}>
            <Text style={[styles.title, { color: text }]}>{I18n.t('manageOffers')}</Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={24} color={muted} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* قائمة العروض المحفوظة */}
            {loading ? (
              <ActivityIndicator style={{ marginVertical: 24 }} color={DEFAULT_OFFER_COLOR} />
            ) : offers.length === 0 ? (
              <Text style={{ color: muted, fontSize: 13, marginBottom: 16 }}>
                {I18n.t('noOffersAddBelow')}
              </Text>
            ) : (
              <View style={{ gap: 10, marginBottom: 16 }}>
                {offers.map((offer) => (
                  <View
                    key={offer.id}
                    style={[styles.row, { backgroundColor: inputBg, borderColor: border }]}
                  >
                    <View
                      style={[
                        styles.swatch,
                        { backgroundColor: offer.color || DEFAULT_OFFER_COLOR },
                      ]}
                    >
                      <Ionicons
                        name={getOfferIcon(offer.name) as any}
                        size={16}
                        color={getReadableTextColor(offer.color || DEFAULT_OFFER_COLOR)}
                      />
                    </View>
                    <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: text }}>
                      {offer.name}
                    </Text>
                    <Pressable onPress={() => remove(offer)} hitSlop={8}>
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}

            {/* زر + لإضافة عرض */}
            {!showForm && (
              <TouchableOpacity
                activeOpacity={0.8}
                onPress={() => setShowForm(true)}
                style={[styles.addBtn, { borderColor: DEFAULT_OFFER_COLOR }]}
              >
                <Ionicons name="add" size={20} color={DEFAULT_OFFER_COLOR} />
                <Text style={{ color: DEFAULT_OFFER_COLOR, fontWeight: '700', fontSize: 15 }}>
                  {I18n.t('addOffer')}
                </Text>
              </TouchableOpacity>
            )}

            {/* نموذج الإضافة */}
            {showForm && (
              <View style={{ marginTop: 4 }}>
                <Text style={[styles.label, { color: muted }]}>{I18n.t('offerName')}</Text>
                <TextInput
                  value={name}
                  onChangeText={setName}
                  placeholder="Netflix, Internet, ..."
                  placeholderTextColor={muted}
                  style={[styles.input, { backgroundColor: inputBg, borderColor: border, color: text }]}
                />

                <Text style={[styles.label, { color: muted }]}>{I18n.t('color')}</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={{ flexDirection: 'row', gap: 10, paddingVertical: 2 }}>
                    {COLOR_PALETTE.map((swatch) => {
                      const selected = color.toLowerCase() === swatch.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={swatch}
                          activeOpacity={0.8}
                          onPress={() => setColor(swatch)}
                          style={{
                            width: 34,
                            height: 34,
                            borderRadius: 17,
                            backgroundColor: swatch,
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderWidth: selected ? 3 : 0,
                            borderColor: isDark ? '#ffffff' : '#1F2937',
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

                <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
                  <TouchableOpacity
                    onPress={() => setShowForm(false)}
                    style={[styles.btn, { backgroundColor: inputBg, borderColor: border }]}
                  >
                    <Text style={{ color: text, fontWeight: '600' }}>{I18n.t('cancel')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => save(name, color)}
                    disabled={adding || !name.trim()}
                    style={[
                      styles.btn,
                      {
                        backgroundColor: DEFAULT_OFFER_COLOR,
                        borderColor: DEFAULT_OFFER_COLOR,
                        opacity: !name.trim() || adding ? 0.5 : 1,
                      },
                    ]}
                  >
                    <Text style={{ color: '#ffffff', fontWeight: '700' }}>
                      {adding ? '...' : I18n.t('save')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* عروض جاهزة للاختيار السريع */}
            {availablePresets.length > 0 && (
              <View style={{ marginTop: 22 }}>
                <Text style={[styles.label, { color: muted, marginTop: 0 }]}>
                  {I18n.t('pickKnownOffers')}
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {availablePresets.map((preset) => (
                    <TouchableOpacity
                      key={preset.name}
                      activeOpacity={0.8}
                      onPress={() => save(preset.name, preset.color)}
                      disabled={adding}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: border,
                        backgroundColor: inputBg,
                      }}
                    >
                      <Ionicons name={preset.icon as any} size={14} color={preset.color} />
                      <Text style={{ fontSize: 13, fontWeight: '600', color: text }}>
                        {preset.name}
                      </Text>
                      <Ionicons name="add" size={14} color={muted} />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={{ height: 30 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    maxHeight: '88%',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '700' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
  },
  swatch: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 14,
  },
  label: { fontSize: 12, fontWeight: '600', marginTop: 14, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, padding: 14, fontSize: 15 },
  btn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
});
