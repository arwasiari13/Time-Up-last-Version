import { t } from '../lib/i18n';
import { offerColor, readableOn, withAlpha } from '../lib/offers';
import {
  formatDate,
  formatMoney,
  moneyOf,
  PersonGroup,
  progressOf,
  STATUS_COLORS,
  statusLabel,
  statusOf,
  SubscriberWithDays,
} from '../lib/subscribers';

interface Props {
  group: PersonGroup;
  onClose: () => void;
  onInvoice: (group: PersonGroup) => void;
  onAddOffer: (group: PersonGroup) => void;
  onEdit: (item: SubscriberWithDays) => void;
  onDelete: (item: SubscriberWithDays) => void;
}

const daysText = (daysLeft: number) =>
  daysLeft < 0
    ? t('details.expiredAgo', { days: Math.abs(daysLeft) })
    : daysLeft === 0
    ? t('details.endsToday')
    : daysLeft === 1
    ? t('details.oneDayLeft')
    : t('details.daysLeft', { days: daysLeft });

/** لوحة جانبية بكل تفاصيل العميل وعروضه، مع أزرار التعديل والحذف */
export default function ClientDetails({
  group,
  onClose,
  onInvoice,
  onAddOffer,
  onEdit,
  onDelete,
}: Props) {
  const total = group.items.reduce((sum, item) => sum + moneyOf(item.price), 0);

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <aside className="drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <div style={{ flex: 1 }}>
            <h2 style={{ margin: 0, fontSize: 20 }}>{group.name || '—'}</h2>
            <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13 }}>
              {group.items.length}{' '}
              {group.items.length === 1 ? t('common.subscription') : t('common.subscriptions')} ·{' '}
              {formatMoney(total)}
            </p>
          </div>
          <button className="drawer-close" onClick={onClose} title={t('common.close')}>
            ×
          </button>
        </div>

        <div className="chip-row">
          <button className="chip" onClick={() => onInvoice(group)}>
            {t('common.invoice')}
          </button>
          <button className="chip" onClick={() => onAddOffer(group)}>
            {t('details.addAnotherOffer')}
          </button>
        </div>

        <div className="detail-row">
          <span className="k">{t('details.phone')}</span>
          <span>
            {group.phone ? (group.phone.length === 9 ? `0${group.phone}` : group.phone) : '—'}
          </span>
        </div>
        <div className="detail-row" style={{ marginBottom: 18 }}>
          <span className="k">{t('details.address')}</span>
          <span style={{ textAlign: 'end', maxWidth: 240 }}>{group.address || '—'}</span>
        </div>

        {group.items.map((item) => {
          const color = offerColor(item.offer, item.color);
          const status = statusOf(item.daysLeft);
          return (
            <div className="offer-box" key={item.id}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <span
                  className="rank-badge"
                  style={{ background: color, color: readableOn(color), width: 28, height: 28 }}
                >
                  {(item.offer || '?').charAt(0).toUpperCase()}
                </span>
                <span style={{ flex: 1, fontWeight: 700 }}>{item.offer || '—'}</span>
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

              <div className="bar-track" style={{ marginBottom: 10 }}>
                <div
                  className="bar-fill"
                  style={{
                    width: `${Math.round(progressOf(item.start_date, item.end_date) * 100)}%`,
                    background: color,
                  }}
                />
              </div>

              <div className="detail-row" style={{ padding: '6px 0' }}>
                <span className="k">{t('details.starts')}</span>
                <span>{formatDate(item.start_date)}</span>
              </div>
              <div className="detail-row" style={{ padding: '6px 0' }}>
                <span className="k">{t('details.ends')}</span>
                <span>{formatDate(item.end_date)}</span>
              </div>
              <div className="detail-row" style={{ padding: '6px 0' }}>
                <span className="k">{t('details.remaining')}</span>
                <span style={{ color: item.daysLeft < 0 ? 'var(--red)' : undefined }}>
                  {daysText(item.daysLeft)}
                </span>
              </div>
              <div className="detail-row" style={{ padding: '6px 0', borderBottom: 0 }}>
                <span className="k">{t('details.price')}</span>
                <span>{item.price ? formatMoney(moneyOf(item.price)) : '—'}</span>
              </div>

              <div className="card-actions">
                <button className="chip" onClick={() => onEdit(item)}>
                  {t('common.edit')}
                </button>
                <button className="chip danger" onClick={() => onDelete(item)}>
                  {t('common.delete')}
                </button>
              </div>
            </div>
          );
        })}
      </aside>
    </div>
  );
}
