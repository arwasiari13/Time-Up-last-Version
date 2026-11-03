import type { ReactNode } from 'react';
import { offerColor, readableOn, withAlpha } from '../lib/offers';
import {
  formatDate,
  PersonGroup,
  progressOf,
  STATUS_COLORS,
  statusLabel,
  statusOf,
} from '../lib/subscribers';

interface Props {
  group: PersonGroup;
  /** أزرار تظهر أسفل البطاقة (فاتورة / تعديل / حذف) */
  footer?: ReactNode;
}

const initialsOf = (name: string) =>
  name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('') || '?';

/** بطاقة عميل: كل عروضه مع تاريخ الانتهاء وشريط التقدّم */
export default function ClientCard({ group, footer }: Props) {
  const primaryColor = offerColor(group.primary.offer, group.primary.color);
  const status = statusOf(group.primary.daysLeft);

  return (
    <div className="client-card">
      <div className="client-head">
        <div
          className="client-avatar"
          style={{ background: primaryColor, color: readableOn(primaryColor) }}
        >
          {initialsOf(group.name)}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="client-name">{group.name || '—'}</div>
          <div className="client-phone">
            {group.phone ? (group.phone.length === 9 ? `0${group.phone}` : group.phone) : '—'}
          </div>
        </div>
        <span
          className="pill"
          style={{
            background: withAlpha(STATUS_COLORS[status], 0.16),
            color: STATUS_COLORS[status],
          }}
        >
          {statusLabel(status)}
        </span>
      </div>

      {group.items.map((item) => {
        const color = offerColor(item.offer, item.color);
        const expired = item.daysLeft < 0;
        return (
          <div className="offer-line" key={item.id}>
            <div className="offer-top">
              <span className="offer-name" style={{ color }}>
                {item.offer || '—'}
              </span>
              <span className={expired ? 'offer-date expired' : 'offer-date'}>
                {formatDate(item.end_date)}
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${Math.round(progressOf(item.start_date, item.end_date) * 100)}%`,
                  background: color,
                }}
              />
            </div>
          </div>
        );
      })}

      {footer && <div className="card-actions">{footer}</div>}
    </div>
  );
}
