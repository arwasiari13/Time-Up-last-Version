import { useMemo, useState } from 'react';
import { COLOR_PALETTE, DEFAULT_OFFER_COLOR, offerColor, readableOn } from '../lib/offers';
import { t } from '../lib/i18n';
import { formatMoney, moneyOf, SubscriberWithDays } from '../lib/subscribers';
import { showToast } from '../lib/toast';
import { SavedOffer } from '../lib/useData';
import { createOffer, removeOffer } from '../lib/writes';

interface Props {
  uid: string;
  rows: SubscriberWithDays[] | null;
  savedOffers: SavedOffer[];
}

export default function Offers({ uid, rows, savedOffers }: Props) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(DEFAULT_OFFER_COLOR);
  const [error, setError] = useState('');

  const list = rows || [];

  // كم اشتراكاً وكم إيراداً لكل عرض
  const usage = useMemo(() => {
    const map = new Map<string, { count: number; revenue: number }>();
    list.forEach((row) => {
      const key = (row.offer || '').trim().toLowerCase();
      if (!key) return;
      const current = map.get(key);
      if (current) {
        current.count += 1;
        current.revenue += moneyOf(row.price);
      } else {
        map.set(key, { count: 1, revenue: moneyOf(row.price) });
      }
    });
    return map;
  }, [list]);

  const savedNames = savedOffers.map((offer) => offer.name.trim().toLowerCase());
  // عروض مستعملة عند المشتركين لكنها غير محفوظة في القائمة
  const unsaved = useMemo(() => {
    const seen = new Map<string, { name: string; color: string }>();
    list.forEach((row) => {
      const offerName = (row.offer || '').trim();
      if (!offerName) return;
      const key = offerName.toLowerCase();
      if (!savedNames.includes(key) && !seen.has(key)) {
        seen.set(key, { name: offerName, color: row.color || DEFAULT_OFFER_COLOR });
      }
    });
    return Array.from(seen.values());
  }, [list, savedNames]);

  const add = (offerName: string, offerColorValue: string) => {
    const clean = offerName.trim();
    if (!clean) {
      setError(t('offers.errName'));
      return;
    }
    if (savedNames.includes(clean.toLowerCase())) {
      setError(t('offers.errExists', { name: clean }));
      return;
    }
    setError('');
    createOffer(uid, clean, offerColorValue);
    setName('');
    setColor(DEFAULT_OFFER_COLOR);
    showToast(t('toast.offerAdded', { name: clean }));
  };

  const remove = (offer: SavedOffer) => {
    const used = usage.get(offer.name.trim().toLowerCase())?.count || 0;
    const warning = used ? `\n\n${t('offers.removeWarning', { count: used })}` : '';
    if (!confirm(`${t('offers.removeConfirm', { name: offer.name })}${warning}`)) return;
    removeOffer(uid, offer.id);
    showToast(t('toast.offerRemoved', { name: offer.name }));
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('offers.title')}</h1>
          <p className="page-sub">
            {t('offers.subtitle')}
          </p>
        </div>
      </div>

      <section className="panel" style={{ marginBottom: 18 }}>
        <h2>{t('offers.addTitle')}</h2>
        <p className="panel-sub">{t('offers.addSub')}</p>

        <div className="toolbar">
          <input
            className="search-input"
            placeholder={t('offers.namePlaceholder')}
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') add(name, color);
            }}
          />
          <button
            className="primary-btn"
            style={{ width: 'auto', padding: '10px 22px', marginTop: 0 }}
            onClick={() => add(name, color)}
          >
            {t('common.add')}
          </button>
        </div>

        <div className="palette" style={{ marginBottom: 6 }}>
          {COLOR_PALETTE.map((swatch) => (
            <button
              key={swatch}
              className={color.toLowerCase() === swatch.toLowerCase() ? 'swatch-btn on' : 'swatch-btn'}
              style={{ background: swatch }}
              onClick={() => setColor(swatch)}
              title={swatch}
            />
          ))}
        </div>

        {error && (
          <p className="error-text" style={{ textAlign: 'left' }}>
            {error}
          </p>
        )}

      </section>

      <div className="section-head" style={{ marginTop: 0 }}>
        <h2>{t('offers.yours', { count: savedOffers.length })}</h2>
      </div>

      {savedOffers.length === 0 ? (
        <p className="empty">{t('offers.none')}</p>
      ) : (
        <div className="offer-grid">
          {savedOffers.map((offer) => {
            const color = offerColor(offer.name, offer.color);
            const used = usage.get(offer.name.trim().toLowerCase());
            return (
              <div className="offer-card" key={offer.id}>
                <span
                  className="rank-badge"
                  style={{ background: color, color: readableOn(color) }}
                >
                  {offer.name.charAt(0).toUpperCase()}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700 }}>{offer.name}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {used
                      ? `${used.count} ${
                          used.count === 1 ? t('common.subscription') : t('common.subscriptions')
                        } · ${formatMoney(used.revenue)}`
                      : t('offers.notUsed')}
                  </div>
                </div>
                <button className="chip danger" onClick={() => remove(offer)}>
                  {t('offers.remove')}
                </button>
              </div>
            );
          })}
        </div>
      )}

      {unsaved.length > 0 && (
        <>
          <div className="section-head">
            <h2>{t('offers.usedNotSaved')}</h2>
          </div>
          <div className="chip-row">
            {unsaved.map((item) => {
              const color = offerColor(item.name, item.color);
              return (
                <button
                  key={item.name}
                  className="chip offer"
                  style={{ borderColor: color, color }}
                  onClick={() => add(item.name, color)}
                  title={t('offers.addToYours')}
                >
                  <span className="swatch" style={{ background: color }} />
                  {item.name} +
                </button>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
