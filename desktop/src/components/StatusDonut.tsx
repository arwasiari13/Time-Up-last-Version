import { t } from '../lib/i18n';
interface Segment {
  label: string;
  value: number;
  color: string;
}

interface Props {
  data: Segment[];
  total: number;
}

/** حلقة توزيع الحالات — SVG بدون أي مكتبة */
export default function StatusDonut({ data, total }: Props) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="donut-wrap">
      <div style={{ position: 'relative', width: 150, height: 150 }}>
        <svg width="150" height="150" viewBox="0 0 150 150">
          <circle
            cx="75"
            cy="75"
            r={radius}
            fill="none"
            stroke="var(--track)"
            strokeWidth="16"
          />
          {data.map((segment) => {
            if (!total || !segment.value) return null;
            const length = (segment.value / total) * circumference;
            const dash = (
              <circle
                key={segment.label}
                cx="75"
                cy="75"
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth="16"
                strokeDasharray={`${length} ${circumference - length}`}
                strokeDashoffset={-offset}
                strokeLinecap="round"
                transform="rotate(-90 75 75)"
              />
            );
            offset += length;
            return dash;
          })}
        </svg>
        <div
          className="donut-center"
          style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
        >
          <div className="donut-total">{total}</div>
          <div className="donut-caption">{t('dash.total')}</div>
        </div>
      </div>

      <div className="legend">
        {data.map((segment) => (
          <div className="legend-row" key={segment.label}>
            <span className="swatch" style={{ background: segment.color }} />
            <span className="name">{segment.label}</span>
            <span className="value">{segment.value}</span>
            <span className="name" style={{ flex: 'none' }}>
              {total ? Math.round((segment.value / total) * 100) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
