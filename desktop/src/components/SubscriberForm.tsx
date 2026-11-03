import { useEffect, useRef, useState } from 'react';
import { COLOR_PALETTE, DEFAULT_OFFER_COLOR, offerColor, readableOn } from '../lib/offers';
import { SubscriberWithDays } from '../lib/subscribers';
import { t } from '../lib/i18n';
import { showToast } from '../lib/toast';
import { SavedOffer } from '../lib/useData';
import { createSubscriber, saveSubscriber, SubscriberInput } from '../lib/writes';

interface Props {
  uid: string;
  savedOffers: SavedOffer[];
  /** اشتراك موجود = تعديل، بدونه = إضافة */
  editing?: SubscriberWithDays | null;
  /** بيانات شخص جاهزة (إضافة عرض آخر لنفس الشخص) */
  presetPerson?: { first_name: string; last_name: string; phone: string; address: string } | null;
  onClose: () => void;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

/** إضافة أشهر مع الحفاظ على اليوم، أو آخر يوم في الشهر إن كان أقصر */
const addMonths = (dateIso: string, months: number) => {
  const [year, month, day] = dateIso.split('-').map(Number);
  const result = new Date(year, month - 1 + months, 1, 12);
  const lastDay = new Date(result.getFullYear(), result.getMonth() + 1, 0).getDate();
  result.setDate(Math.min(day, lastDay));
  return toIso(result);
};

const addDays = (dateIso: string, days: number) => {
  const [year, month, day] = dateIso.split('-').map(Number);
  return toIso(new Date(year, month - 1, day + days, 12));
};

/** بدون توقيت UTC حتى لا يتغيّر اليوم */
function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const DURATIONS = [
  { labelKey: 'form.week', apply: (start: string) => addDays(start, 7) },
  { labelKey: 'form.month', apply: (start: string) => addMonths(start, 1) },
  { labelKey: 'form.months3', apply: (start: string) => addMonths(start, 3) },
  { labelKey: 'form.months6', apply: (start: string) => addMonths(start, 6) },
  { labelKey: 'form.year', apply: (start: string) => addMonths(start, 12) },
];

export default function SubscriberForm({ uid, savedOffers, editing, presetPerson, onClose }: Props) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [offer, setOffer] = useState('');
  const [color, setColor] = useState(DEFAULT_OFFER_COLOR);
  const [startDate, setStartDate] = useState(todayIso());
  const [endDate, setEndDate] = useState(todayIso());
  const [price, setPrice] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editing) {
      setFirstName(editing.first_name || '');
      setLastName(editing.last_name || '');
      setPhone(editing.phone || '');
      setAddress(editing.address || '');
      setOffer(editing.offer || '');
      setColor(offerColor(editing.offer, editing.color));
      setStartDate(editing.start_date || todayIso());
      setEndDate(editing.end_date || todayIso());
      setPrice(editing.price || '');
    } else if (presetPerson) {
      setFirstName(presetPerson.first_name);
      setLastName(presetPerson.last_name);
      setPhone(presetPerson.phone);
      setAddress(presetPerson.address);
    }
  }, [editing, presetPerson]);

  // تاريخ النهاية "يتبع" تاريخ البداية: إذا كانت النهاية = البداية + مدة من الأزرار
  // ثم غيّر المستخدم البداية وحدها، تتحرك النهاية بنفس المدة.
  const previousStart = useRef(startDate);
  const previousEnd = useRef(endDate);

  useEffect(() => {
    const priorStart = previousStart.current;
    const priorEnd = previousEnd.current;
    previousStart.current = startDate;
    previousEnd.current = endDate;

    // نتدخل فقط عندما تتغير البداية وحدها
    if (startDate === priorStart || endDate !== priorEnd) return;

    const followed = DURATIONS.find((duration) => duration.apply(priorStart) === endDate);
    if (followed) setEndDate(followed.apply(startDate));
  }, [startDate, endDate]);

  const pickOffer = (name: string, pickedColor: string) => {
    setOffer(name);
    setColor(pickedColor);
  };

  const submit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!firstName.trim() || !lastName.trim()) {
      setError(t('form.errNames'));
      return;
    }
    if (!price.trim()) {
      setError(t('form.errPrice'));
      return;
    }
    if (endDate < startDate) {
      setError(t('form.errDates'));
      return;
    }

    const input: SubscriberInput = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      phone: phone.trim(),
      address: address.trim(),
      start_date: startDate,
      end_date: endDate,
      price: price.trim(),
      offer: offer.trim(),
      color,
    };

    setError('');
    // الحفظ يتم محلياً فوراً (حتى بدون إنترنت) ويُرفع تلقائياً عند عودة الاتصال
    if (editing) saveSubscriber(uid, editing.id, input);
    else createSubscriber(uid, input);
    showToast(editing ? t('toast.saved') : t('toast.added'));
    onClose();
  };

  const title = editing
    ? t('form.editSubscription')
    : presetPerson
    ? t('form.addOfferFor', { name: `${presetPerson.first_name} ${presetPerson.last_name}` })
    : t('form.addSubscriber');

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head">
          <h2 style={{ margin: 0, fontSize: 19, flex: 1 }}>{title}</h2>
          <button className="drawer-close" onClick={onClose} title={t('common.close')}>
            ×
          </button>
        </div>

        <form onSubmit={submit}>
          {!presetPerson && (
            <div className="form-grid">
              <div className="field">
                <label>{t('form.firstName')}</label>
                <input value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
              </div>
              <div className="field">
                <label>{t('form.lastName')}</label>
                <input value={lastName} onChange={(e) => setLastName(e.target.value)} />
              </div>
              <div className="field">
                <label>{t('form.phone')}</label>
                <div className="phone-input">
                  <span>0</span>
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, '').slice(0, 9))}
                    placeholder="XXX XX XX XX"
                  />
                </div>
              </div>
              <div className="field">
                <label>{t('form.address')}</label>
                <input value={address} onChange={(e) => setAddress(e.target.value)} />
              </div>
            </div>
          )}

          <div className="field">
            <label>{t('form.offer')}</label>
            <input
              value={offer}
              onChange={(e) => setOffer(e.target.value)}
              placeholder={t('form.offerPlaceholder')}
            />
          </div>

          {savedOffers.length > 0 && (
            <div className="chip-row" style={{ marginTop: 10 }}>
              {savedOffers.map((saved) => {
                const savedColor = offerColor(saved.name, saved.color);
                const isOn = offer.trim().toLowerCase() === saved.name.toLowerCase();
                return (
                  <button
                    type="button"
                    key={saved.id}
                    className="chip offer"
                    onClick={() => pickOffer(saved.name, savedColor)}
                    style={
                      isOn
                        ? {
                            background: savedColor,
                            borderColor: savedColor,
                            color: readableOn(savedColor),
                          }
                        : { borderColor: savedColor, color: savedColor }
                    }
                  >
                    <span
                      className="swatch"
                      style={{ background: isOn ? readableOn(savedColor) : savedColor }}
                    />
                    {saved.name}
                  </button>
                );
              })}
            </div>
          )}

          <div className="field">
            <label>{t('form.colour')}</label>
            <div className="palette">
              {COLOR_PALETTE.map((swatch) => (
                <button
                  type="button"
                  key={swatch}
                  className={
                    color.toLowerCase() === swatch.toLowerCase() ? 'swatch-btn on' : 'swatch-btn'
                  }
                  style={{ background: swatch }}
                  onClick={() => setColor(swatch)}
                  title={swatch}
                />
              ))}
            </div>
          </div>

          <div className="form-grid">
            <div className="field">
              <label>{t('form.startDate')}</label>
              <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="field">
              <label>{t('form.endDate')}</label>
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          </div>

          {/* مدة سريعة — تحسب تاريخ النهاية من تاريخ البداية */}
          <div className="chip-row">
            {DURATIONS.map((duration) => {
              const value = duration.apply(startDate);
              return (
                <button
                  type="button"
                  key={duration.labelKey}
                  className={endDate === value ? 'chip active' : 'chip'}
                  onClick={() => setEndDate(value)}
                >
                  {t(duration.labelKey)}
                </button>
              );
            })}
          </div>

          <div className="field">
            <label>{t('form.price')}</label>
            <div className="price-input">
              <input
                value={price}
                onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="1500"
              />
              <span>,00 DZD</span>
            </div>
          </div>

          {error && (
            <p className="error-text" style={{ textAlign: 'left' }}>
              {error}
            </p>
          )}

          <div className="form-actions">
            <button type="button" className="chip" onClick={onClose}>
              {t('common.cancel')}
            </button>
            <button className="primary-btn" style={{ width: 'auto', padding: '11px 26px' }}>
              {editing ? t('common.saveChanges') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
