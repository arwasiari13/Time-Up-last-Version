import { useEffect, useMemo, useState } from 'react';
import ClientCard from '../components/ClientCard';
import ClientDetails from '../components/ClientDetails';
import InvoiceModal from '../components/InvoiceModal';
import SubscriberForm from '../components/SubscriberForm';
import { t } from '../lib/i18n';
import { offerColor } from '../lib/offers';
import {
  groupByPerson,
  PersonGroup,
  StatusKey,
  statusOf,
  SubscriberWithDays,
} from '../lib/subscribers';
import { showToast } from '../lib/toast';
import { SavedOffer } from '../lib/useData';
import { removeSubscribers } from '../lib/writes';

type StatusFilter = 'all' | StatusKey;
type SortKey = 'soonest' | 'newest' | 'name';

type FormState =
  | { mode: 'add' }
  | { mode: 'edit'; item: SubscriberWithDays }
  | { mode: 'addOffer'; group: PersonGroup }
  | null;

interface Props {
  uid: string;
  rows: SubscriberWithDays[] | null;
  error: string;
  savedOffers: SavedOffer[];
  initialFilter?: StatusFilter;
  /** اشتراك نفتح تفاصيل صاحبه مباشرة (قادم من إشعار ويندوز) */
  focusId?: string | null;
  onFocusHandled?: () => void;
}

const STATUS_TABS: { key: StatusFilter; labelKey: string }[] = [
  { key: 'all', labelKey: 'common.all' },
  { key: 'active', labelKey: 'status.active' },
  { key: 'expiring', labelKey: 'status.expiring' },
  { key: 'expired', labelKey: 'status.expired' },
];

export default function Subscribers({
  uid,
  rows,
  error,
  savedOffers,
  initialFilter = 'all',
  focusId,
  onFocusHandled,
}: Props) {
  const [status, setStatus] = useState<StatusFilter>(initialFilter);
  const [offer, setOffer] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('soonest');
  const [selected, setSelected] = useState<PersonGroup | null>(null);
  const [invoice, setInvoice] = useState<PersonGroup | null>(null);
  const [form, setForm] = useState<FormState>(null);

  const list = rows || [];

  // فتح تفاصيل المشترك القادم من إشعار ويندوز
  useEffect(() => {
    if (!focusId || !rows || rows.length === 0) return;
    const group = groupByPerson(rows).find((person) =>
      person.items.some((item) => item.id === focusId)
    );
    if (group) setSelected(group);
    onFocusHandled?.();
  }, [focusId, rows]);

  // عدد الأشخاص في كل تبويب
  const counts = useMemo(() => {
    const people = (subset: SubscriberWithDays[]) => groupByPerson(subset).length;
    return {
      all: people(list),
      active: people(list.filter((row) => statusOf(row.daysLeft) === 'active')),
      expiring: people(list.filter((row) => statusOf(row.daysLeft) === 'expiring')),
      expired: people(list.filter((row) => statusOf(row.daysLeft) === 'expired')),
    };
  }, [list]);

  // العروض المحفوظة + العروض المستعملة فعلاً
  const offerChips = useMemo(() => {
    const seen = new Map<string, string>();
    savedOffers.forEach((saved) => {
      const name = (saved.name || '').trim();
      if (name) seen.set(name.toLowerCase(), name);
    });
    list.forEach((row) => {
      const name = (row.offer || '').trim();
      if (name && !seen.has(name.toLowerCase())) seen.set(name.toLowerCase(), name);
    });
    return Array.from(seen.values()).sort((a, b) => a.localeCompare(b));
  }, [savedOffers, list]);

  const colorForOffer = (name: string) => {
    const saved = savedOffers.find((item) => item.name.trim().toLowerCase() === name.toLowerCase());
    if (saved?.color) return saved.color;
    const used = list.find((row) => (row.offer || '').trim().toLowerCase() === name.toLowerCase());
    return offerColor(name, used?.color);
  };

  const groups = useMemo(() => {
    const query = search.trim().toLowerCase();

    const filtered = list.filter((row) => {
      if (status !== 'all' && statusOf(row.daysLeft) !== status) return false;
      if (offer && (row.offer || '').trim().toLowerCase() !== offer.toLowerCase()) return false;
      if (!query) return true;
      return (
        `${row.first_name} ${row.last_name}`.toLowerCase().includes(query) ||
        (row.phone || '').includes(query) ||
        (row.address || '').toLowerCase().includes(query) ||
        (row.offer || '').toLowerCase().includes(query)
      );
    });

    const people = groupByPerson(filtered);

    if (sort === 'soonest') people.sort((a, b) => a.primary.daysLeft - b.primary.daysLeft);
    if (sort === 'name') people.sort((a, b) => a.name.localeCompare(b.name));
    // 'newest' يحافظ على ترتيب القائمة (الأحدث أولاً)

    return people;
  }, [list, status, offer, search, sort]);

  const deletePerson = (group: PersonGroup) => {
    const count = group.items.length;
    const message =
      count > 1
        ? t('subs.deleteMany', { name: group.name, count })
        : t('subs.deleteOne', { name: group.name });
    if (!confirm(`${message}\n\n${t('common.cannotUndo')}`)) return;
    // الحذف يتم محلياً فوراً ويُرفع عند عودة الاتصال
    removeSubscribers(
      uid,
      group.items.map((item) => item.id)
    );
    setSelected(null);
    showToast(count > 1 ? t('toast.deletedMany', { count }) : t('toast.deleted'));
  };

  const deleteOne = (item: SubscriberWithDays) => {
    if (!confirm(`${t('subs.deleteOffer', { offer: item.offer || '—' })}\n\n${t('common.cannotUndo')}`))
      return;
    removeSubscribers(uid, [item.id]);
    setSelected(null);
    showToast(t('toast.deleted'));
  };

  if (rows === null) return <p className="empty">{t('subs.loading')}</p>;

  return (
    <>
      <div className="page-head">
        <div>
          <h1 className="page-title">{t('subs.title')}</h1>
          <p className="page-sub">
            {counts.all} {counts.all === 1 ? t('common.client') : t('common.clients')} ·{' '}
            {list.length} {list.length === 1 ? t('common.subscription') : t('common.subscriptions')}
          </p>
        </div>
        <div className="head-actions">
          <button className="add-btn" onClick={() => setForm({ mode: 'add' })}>
            {t('subs.addSubscriber')}
          </button>
        </div>
      </div>

      {error && (
        <p className="error-text" style={{ textAlign: 'left' }}>
          {error}
        </p>
      )}

      <div className="toolbar">
        <input
          className="search-input"
          placeholder={t('subs.search')}
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <select
          className="sort-select"
          value={sort}
          onChange={(event) => setSort(event.target.value as SortKey)}
          title={t('subs.sortSoonest')}
        >
          <option value="soonest">{t('subs.sortSoonest')}</option>
          <option value="newest">{t('subs.sortNewest')}</option>
          <option value="name">{t('subs.sortName')}</option>
        </select>
      </div>

      <div className="chip-row">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            className={status === tab.key ? 'chip active' : 'chip'}
            onClick={() => setStatus(tab.key)}
          >
            {t(tab.labelKey)} ({counts[tab.key]})
          </button>
        ))}
      </div>

      {offerChips.length > 0 && (
        <div className="chip-row">
          <button className={offer === null ? 'chip active' : 'chip'} onClick={() => setOffer(null)}>
            {t('subs.allOffers')}
          </button>
          {offerChips.map((name) => {
            const color = colorForOffer(name);
            const isOn = offer?.toLowerCase() === name.toLowerCase();
            return (
              <button
                key={name}
                className="chip offer"
                // الضغط مرة أخرى يلغي الفلتر
                onClick={() => setOffer(isOn ? null : name)}
                style={
                  isOn
                    ? { background: color, borderColor: color, color: '#ffffff' }
                    : { borderColor: color, color }
                }
              >
                <span className="swatch" style={{ background: isOn ? '#ffffff' : color }} />
                {name}
              </button>
            );
          })}
        </div>
      )}

      {groups.length === 0 ? (
        <p className="empty">{t('subs.noMatch')}</p>
      ) : (
        <div className="client-grid">
          {groups.map((group) => (
            <div key={group.key} className="card-click" onClick={() => setSelected(group)}>
              <ClientCard
                group={group}
                footer={
                  <>
                    <button
                      className="chip"
                      onClick={(event) => {
                        event.stopPropagation();
                        setInvoice(group);
                      }}
                    >
                      {t('common.invoice')}
                    </button>
                    <button
                      className="chip"
                      onClick={(event) => {
                        event.stopPropagation();
                        setForm({ mode: 'edit', item: group.primary });
                      }}
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      className="chip danger"
                      onClick={(event) => {
                        event.stopPropagation();
                        deletePerson(group);
                      }}
                    >
                      {t('common.delete')}
                    </button>
                  </>
                }
              />
            </div>
          ))}
        </div>
      )}

      {selected && (
        <ClientDetails
          group={selected}
          onClose={() => setSelected(null)}
          onInvoice={(group) => {
            setSelected(null);
            setInvoice(group);
          }}
          onAddOffer={(group) => {
            setSelected(null);
            setForm({ mode: 'addOffer', group });
          }}
          onEdit={(item) => {
            setSelected(null);
            setForm({ mode: 'edit', item });
          }}
          onDelete={deleteOne}
        />
      )}

      {invoice && <InvoiceModal group={invoice} onClose={() => setInvoice(null)} />}

      {form && (
        <SubscriberForm
          uid={uid}
          savedOffers={savedOffers}
          editing={form.mode === 'edit' ? form.item : null}
          presetPerson={
            form.mode === 'addOffer'
              ? {
                  first_name: form.group.primary.first_name,
                  last_name: form.group.primary.last_name,
                  phone: form.group.phone,
                  address: form.group.address,
                }
              : null
          }
          onClose={() => setForm(null)}
        />
      )}
    </>
  );
}
