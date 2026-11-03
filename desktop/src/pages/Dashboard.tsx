import { useMemo, useState } from 'react';
import type { StatusFilter } from '../App';
import ClientCard from '../components/ClientCard';
import SubscriberForm from '../components/SubscriberForm';
import OfferRanking, { OfferStat } from '../components/OfferRanking';
import StatusDonut from '../components/StatusDonut';
import { t } from '../lib/i18n';
import { offerColor } from '../lib/offers';
import { SavedOffer } from '../lib/useData';
import {
  formatMoney,
  groupByPerson,
  moneyOf,
  STATUS_COLORS,
  statusLabel,
  StatusKey,
  statusOf,
  SubscriberWithDays,
} from '../lib/subscribers';

interface Props {
  uid: string;
  savedOffers: SavedOffer[];
  rows: SubscriberWithDays[] | null;
  error: string;
  username: string;
  onOpenSubscribers: (filter: StatusFilter) => void;
}

const RECENT_COUNT = 6;

export default function Dashboard({
  uid,
  savedOffers,
  rows,
  error,
  username,
  onOpenSubscribers,
}: Props) {
  const [showForm, setShowForm] = useState(false);
  const stats = useMemo(() => {
    const list = rows || [];
    const people = groupByPerson(list);
    const subsIn = (status: StatusKey) => list.filter((row) => statusOf(row.daysLeft) === status);
    const peopleIn = (status: StatusKey) => groupByPerson(subsIn(status)).length;

    const byOffer = new Map<string, OfferStat>();
    list.forEach((row) => {
      const name = (row.offer || '').trim();
      if (!name) return;
      const key = name.toLowerCase();
      const current = byOffer.get(key);
      if (current) {
        current.count += 1;
        current.revenue += moneyOf(row.price);
      } else {
        byOffer.set(key, {
          name,
          color: offerColor(row.offer, row.color),
          count: 1,
          revenue: moneyOf(row.price),
        });
      }
    });

    return {
      people,
      clients: people.length,
      subscriptions: list.length,
      activePeople: peopleIn('active'),
      expiringPeople: peopleIn('expiring'),
      expiredPeople: peopleIn('expired'),
      activeSubs: subsIn('active').length,
      expiringSubs: subsIn('expiring').length,
      expiredSubs: subsIn('expired').length,
      revenue: list.reduce((sum, row) => sum + moneyOf(row.price), 0),
      offers: Array.from(byOffer.values()).sort((a, b) => b.count - a.count),
    };
  }, [rows]);

  if (rows === null) return <p className="empty">{t('common.loading')}</p>;

  const cards: { key: StatusFilter; label: string; value: string; color?: string }[] = [
    { key: 'all', label: t('dash.totalClients'), value: String(stats.clients) },
    { key: 'all', label: t('dash.totalSubscriptions'), value: String(stats.subscriptions), color: 'var(--indigo)' },
    { key: 'active', label: t('status.active'), value: String(stats.activePeople), color: 'var(--green)' },
    { key: 'expiring', label: t('status.expiring'), value: String(stats.expiringPeople), color: 'var(--amber)' },
    { key: 'expired', label: t('status.expired'), value: String(stats.expiredPeople), color: 'var(--red)' },
  ];

  const donutData = [
    { label: statusLabel('active'), value: stats.activeSubs, color: STATUS_COLORS.active },
    { label: statusLabel('expiring'), value: stats.expiringSubs, color: STATUS_COLORS.expiring },
    { label: statusLabel('expired'), value: stats.expiredSubs, color: STATUS_COLORS.expired },
  ];

  const recent = stats.people.slice(0, RECENT_COUNT);

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('dash.title')}</h1>
          <p className="page-sub">
            {username} · {stats.clients} {t('common.clients')} · {stats.subscriptions}{' '}
            {t('common.subscriptions')} ·{' '}
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
              {formatMoney(stats.revenue)}
            </span>
          </p>
        </div>
        <div className="head-actions">
          <button className="add-btn" onClick={() => setShowForm(true)}>
            {t('subs.addSubscriber')}
          </button>
        </div>
      </div>

      {error && <p className="error-text" style={{ textAlign: 'left' }}>{error}</p>}

      <div className="stat-grid">
        {cards.map((card) => (
          <button
            key={card.label}
            className="stat-card"
            onClick={() => onOpenSubscribers(card.key)}
            title={t('dash.openInSubscribers')}
          >
            <div className="stat-label">{card.label}</div>
            <div className="stat-value" style={{ color: card.color }}>
              {card.value}
            </div>
          </button>
        ))}

        <div className="stat-card revenue" style={{ cursor: 'default' }}>
          <div className="stat-label">{t('dash.revenue')}</div>
          <div className="stat-value" style={{ color: 'var(--accent)' }}>
            {stats.revenue.toLocaleString('en-US')}
            <small>DZD</small>
          </div>
        </div>
      </div>

      <div className="charts">
        <section className="panel">
          <h2>{t('dash.statusBreakdown')}</h2>
          <p className="panel-sub">{t('dash.statusSub')}</p>
          <StatusDonut data={donutData} total={stats.subscriptions} />
        </section>

        <section className="panel">
          <h2>{t('dash.mostUsed')}</h2>
          <p className="panel-sub">{t('dash.mostUsedSub')}</p>
          <OfferRanking data={stats.offers} />
        </section>
      </div>

      <div className="section-head">
        <h2>{t('dash.recent')}</h2>
        <button className="chip" onClick={() => onOpenSubscribers('all')}>
          {t('common.viewAll')}
        </button>
      </div>

      {recent.length === 0 ? (
        <p className="empty">{t('dash.noClients')}</p>
      ) : (
        <div className="client-grid">
          {recent.map((group) => (
            <ClientCard key={group.key} group={group} />
          ))}
        </div>
      )}

      {showForm && (
        <SubscriberForm uid={uid} savedOffers={savedOffers} onClose={() => setShowForm(false)} />
      )}
    </>
  );
}
