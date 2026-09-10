import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, G, Line, Rect, Text as SvgText } from 'react-native-svg';
import I18n from '../src/i18n';

const ACCENT = '#00bcd4';

export interface Segment {
  label: string;
  value: number;
  color: string;
}

/* ---------- حلقة توزيع الحالات ---------- */
export function Donut({
  data,
  total,
  isDark,
  textColor,
}: {
  data: Segment[];
  total: number;
  isDark: boolean;
  textColor: string;
}) {
  const R = 52;
  const C = 2 * Math.PI * R;
  const track = isDark ? 'rgba(255,255,255,0.07)' : 'rgba(13,21,37,0.07)';

  let offset = 0;
  const arcs = data.map((seg) => {
    if (!total || !seg.value) return null;
    const len = (seg.value / total) * C;
    const arc = (
      <Circle
        key={seg.label}
        cx="75"
        cy="75"
        r={R}
        fill="none"
        stroke={seg.color}
        strokeWidth="16"
        strokeDasharray={`${len} ${C - len}`}
        strokeDashoffset={-offset}
        strokeLinecap="round"
        transform="rotate(-90 75 75)"
      />
    );
    offset += len;
    return arc;
  });

  return (
    <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 8 }}>
      <Svg width={150} height={150} viewBox="0 0 150 150">
        <Circle cx="75" cy="75" r={R} fill="none" stroke={track} strokeWidth="16" />
        {arcs}
      </Svg>
      <View style={{ position: 'absolute', alignItems: 'center' }}>
        <Text style={{ fontSize: 24, fontWeight: '700', color: textColor }}>{total}</Text>
        <Text
          style={{
            fontSize: 10,
            letterSpacing: 1.5,
            textTransform: 'uppercase',
            color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(13,21,37,0.45)',
          }}
        >
          {I18n.t('total')}
        </Text>
      </View>
    </View>
  );
}

/* ---------- أعمدة الإيرادات حسب العرض ---------- */
export function RevenueBars({
  data,
  isDark,
  mutedColor,
  textColor,
}: {
  data: Segment[];
  isDark: boolean;
  mutedColor: string;
  textColor: string;
}) {
  if (data.length === 0) return null;

  const max = Math.max(...data.map((x) => x.value), 1);
  const W = 560;
  const H = 190;
  const pad = 34;
  const bw = (W - pad * 2) / data.length;

  return (
    <Svg viewBox={`0 0 ${W} ${H}`} width="100%" height={190}>
      {[0.33, 0.66].map((g) => (
        <Line
          key={g}
          x1={pad}
          x2={W - pad}
          y1={pad + (H - pad * 2) * g}
          y2={pad + (H - pad * 2) * g}
          stroke={isDark ? 'rgba(255,255,255,0.07)' : 'rgba(13,21,37,0.08)'}
          strokeWidth="1"
        />
      ))}
      {data.map((s, i) => {
        const h = (s.value / max) * (H - pad * 2);
        const x = pad + i * bw + bw * 0.2;
        const w = bw * 0.6;
        const y = H - pad - h;
        return (
          <G key={s.label}>
            <Rect x={x} y={y} width={w} height={h} rx="5" fill={s.color} opacity={isDark ? 0.85 : 0.9} />
            <SvgText
              x={x + w / 2}
              y={y - 6}
              textAnchor="middle"
              fontSize="12"
              fontWeight="700"
              fill={textColor}
            >
              {s.value}
            </SvgText>
            <SvgText x={x + w / 2} y={H - pad + 16} textAnchor="middle" fontSize="11" fill={mutedColor}>
              {s.label.split(' ')[0]}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

/* ---------- ترتيب العروض الأكثر استعمالاً ---------- */
export function OfferRanking({
  data,
  isDark,
  textColor,
  mutedColor,
}: {
  data: { name: string; color: string; count: number; revenue: number }[];
  isDark: boolean;
  textColor: string;
  mutedColor: string;
}) {
  if (data.length === 0) {
    return <Text style={{ color: mutedColor, fontSize: 13 }}>{I18n.t('noOffersYet')}</Text>;
  }

  const maxCount = Math.max(...data.map((r) => r.count), 1);

  return (
    <View style={{ gap: 14 }}>
      {data.map((r, i) => (
        <View key={r.name} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 12, fontWeight: '700', width: 14, color: mutedColor }}>{i + 1}</Text>
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: r.color,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#ffffff' }}>
              {r.name.charAt(0).toUpperCase()}
            </Text>
          </View>

          <View style={{ flex: 1, minWidth: 0 }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 4,
              }}
            >
              <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: textColor, flex: 1 }}>
                {r.name}
              </Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: mutedColor, marginLeft: 8 }}>
                {r.count} · {r.revenue} DZD
              </Text>
            </View>
            <View
              style={{
                height: 8,
                borderRadius: 4,
                overflow: 'hidden',
                backgroundColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(13,21,37,0.06)',
              }}
            >
              <View
                style={{
                  height: '100%',
                  borderRadius: 4,
                  width: `${(r.count / maxCount) * 100}%`,
                  backgroundColor: ACCENT,
                }}
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
