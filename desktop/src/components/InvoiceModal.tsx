import { t } from '../lib/i18n';
import { formatDate, formatMoney, moneyOf, PersonGroup } from '../lib/subscribers';

interface Props {
  group: PersonGroup;
  onClose: () => void;
}

const BUSINESS_ADDRESS = 'Constantine, Algeria';

/** فاتورة بسيطة يمكن طباعتها أو حفظها PDF */
export default function InvoiceModal({ group, onClose }: Props) {
  const total = group.items.reduce((sum, item) => sum + moneyOf(item.price), 0);
  const today = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const phone = group.phone
    ? group.phone.length === 9
      ? `0${group.phone}`
      : group.phone
    : '—';

  const qrData = [
    'Time Up Invoice',
    `Name:${group.name}`,
    `Phone:${phone}`,
    ...group.items.map(
      (item) => `${item.offer || '-'}:${item.start_date}>${item.end_date}:${item.price || '0'}DZD`
    ),
    `Total:${total} DZD`,
    `Date:${today}`,
  ].join('|');

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
    qrData
  )}`;

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="modal invoice-modal" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-head no-print">
          <h2 style={{ margin: 0, fontSize: 19, flex: 1 }}>{t('invoice.title')}</h2>
          <button className="drawer-close" onClick={onClose} title={t('common.close')}>
            ×
          </button>
        </div>

        <div className="invoice-sheet">
          <div className="invoice-top">
            <div>
              <div className="invoice-brand">TIME UP</div>
              <div className="invoice-muted">{BUSINESS_ADDRESS}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="invoice-label">{t('invoice.subscriptionInvoice')}</div>
              <div className="invoice-muted">{today}</div>
            </div>
          </div>

          <div className="invoice-billed">
            <div className="invoice-label">{t('invoice.billedTo')}</div>
            <div className="invoice-name">{group.name || '—'}</div>
            <div className="invoice-muted">{phone}</div>
            {group.address && <div className="invoice-muted">{group.address}</div>}
          </div>

          <table className="invoice-table">
            <thead>
              <tr>
                <th>{t('invoice.offer')}</th>
                <th>{t('invoice.start')}</th>
                <th>{t('invoice.end')}</th>
                <th style={{ textAlign: 'right' }}>{t('invoice.price')}</th>
              </tr>
            </thead>
            <tbody>
              {group.items.map((item) => (
                <tr key={item.id}>
                  <td>{item.offer || '—'}</td>
                  <td>{formatDate(item.start_date)}</td>
                  <td>{formatDate(item.end_date)}</td>
                  <td style={{ textAlign: 'right' }}>
                    {item.price ? formatMoney(moneyOf(item.price)) : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3} style={{ textAlign: 'right', fontWeight: 700 }}>
                  {t('invoice.total')}
                </td>
                <td style={{ textAlign: 'right', fontWeight: 700 }}>{formatMoney(total)}</td>
              </tr>
            </tfoot>
          </table>

          {/* رمز QR يحمل ملخّص الفاتورة — نفس خدمة تطبيق الهاتف */}
          <div className="invoice-qr">
            <img
              src={qrUrl}
              alt="Invoice QR code"
              width={140}
              height={140}
              onError={(event) => {
                // بدون إنترنت لا يظهر الرمز — نخفيه بدل صورة مكسورة
                const box = event.currentTarget.parentElement;
                if (box) box.style.display = 'none';
              }}
            />
            <div className="invoice-muted">{t('invoice.scan')}</div>
          </div>

          <p className="invoice-thanks">{t('invoice.thanks')}</p>
        </div>

        <div className="form-actions no-print">
          <button className="chip" onClick={onClose}>
            {t('common.close')}
          </button>
          <button
            className="primary-btn"
            style={{ width: 'auto', padding: '11px 26px' }}
            onClick={() => window.print()}
          >
            {t('invoice.print')}
          </button>
        </div>
      </div>
    </div>
  );
}
