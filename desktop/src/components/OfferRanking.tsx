import { t } from '../lib/i18n';
import { formatMoney } from '../lib/subscribers';
import { readableOn } from '../lib/offers';

export interface OfferStat {
  name: string;
  color: string;
  count: number;
  revenue: number;
}

interface Props {
  data: OfferStat[];
}

/** ترتيب العروض حسب عدد الاشتراكات، مع إيراد كل عرض */
export default function OfferRanking({ data }: Props) {
  if (data.length === 0) return <p className="empty">{t('dash.noOffers')}</p>;

  const max = Math.max(...data.map((offer) => offer.count), 1);

  return (
    <div>
      {data.map((offer, index) => (
        <div className="rank-row" key={offer.name}>
          <span style={{ width: 14, color: 'var(--muted)', fontSize: 12, fontWeight: 700 }}>
            {index + 1}
          </span>
          <span
            className="rank-badge"
            style={{ background: offer.color, color: readableOn(offer.color) }}
          >
            {offer.name.charAt(0).toUpperCase()}
          </span>
          <div className="rank-body">
            <div className="rank-top">
              <span style={{ fontWeight: 600 }}>{offer.name}</span>
              <span className="muted">
                {offer.count} · {formatMoney(offer.revenue)}
              </span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{ width: `${(offer.count / max) * 100}%`, background: offer.color }}
              />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
