// src/utils/invoiceTemplate.ts
import { Invoice, InvoiceLineItem } from '../types';

const esc = (value: any) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

const hasValue = (v: unknown) => v !== null && v !== undefined && String(v).trim() !== '';
const infoCells = (entries: Array<[string, unknown]>) =>
  entries.filter(([, value]) => hasValue(value)).map(([label, value]) =>
    '<tr><td class="label">' + esc(label) + '</td><td colspan="3">' + esc(value) + '</td></tr>'
  ).join('');

export const buildConcretePumpInvoiceHtml = (
  invoice: Invoice,
  fallbackIssuerName = 'Concrete Pumping',
  fallbackIssuerEmail = ''
): string => {
  const issuerName = invoice.issuerName || fallbackIssuerName;
  const issuerEmail = invoice.issuerEmail || fallbackIssuerEmail;

  const showJobNumber = (invoice.jobReferences || []).some(ref => hasValue(ref.jobNumber));
  const showPoNumber = (invoice.jobReferences || []).some(ref => hasValue(ref.poNumber));
  const jobReferenceRows = (invoice.jobReferences || []).map((ref: any) =>
    '<tr>' +
      '<td>' + esc(ref.date || '') + '</td>' +
      '<td>' + esc(ref.address || '') + '</td>' +
      (showJobNumber ? '<td>' + esc(ref.jobNumber || '') + '</td>' : '') +
      (showPoNumber ? '<td>' + esc(ref.poNumber || '') + '</td>' : '') +
    '</tr>'
  ).join('');

  const jobReferencesSection = jobReferenceRows
    ? '<div class="refs-title">Job / PO References</div>' +
      '<table class="refs"><thead><tr><th>Date</th><th>Job / Site</th>' +
      (showJobNumber ? '<th>Job #</th>' : '') + (showPoNumber ? '<th>PO #</th>' : '') + '</tr></thead>' +
      '<tbody>' + jobReferenceRows + '</tbody></table>'
    : '';

  const rows = (invoice.lineItems || []).map((item: InvoiceLineItem) =>
    '<tr>' +
      '<td class="qty">' + esc(item.quantity) + '</td>' +
      '<td>' + esc(item.description) + '</td>' +
      '<td class="money">$' + Number(item.rate || 0).toFixed(2) + '</td>' +
      '<td class="money">$' + Number(item.amount || 0).toFixed(2) + '</td>' +
    '</tr>'
  ).join('');

  return (
    '<!DOCTYPE html>' +
    '<html><head><meta charset="UTF-8">' +
    '<style>' +
    '@page { size: letter; margin: 24px; }' +
    '* { box-sizing: border-box; }' +
    'body { font-family: Arial, Helvetica, sans-serif; color: #111; margin: 0; font-size: 12px; }' +
    '.sheet { border: 2px solid #111; width: 100%; }' +
    '.top { display: flex; justify-content: space-between; gap: 20px; padding: 16px; border-bottom: 2px solid #111; }' +
    '.company { font-size: 25px; font-weight: 800; letter-spacing: .4px; }' +
    '.company-sub { margin-top: 4px; color: #333; }' +
    '.invoice-box { min-width: 190px; text-align: right; }' +
    '.invoice-label { font-size: 13px; font-weight: 700; text-transform: uppercase; }' +
    '.invoice-number { font-size: 22px; font-weight: 800; }' +
    '.info { width: 100%; border-collapse: collapse; }' +
    '.info td { border-bottom: 1px solid #111; padding: 7px 8px; height: 28px; }' +
    '.info .label { width: 105px; font-weight: 700; background: #f3f3f3; }' +
    '.service-strip { width: 100%; border-collapse: collapse; }' +
    '.service-strip td { border-right: 1px solid #111; border-bottom: 2px solid #111; padding: 7px 6px; text-align: center; }' +
    '.service-strip td:last-child { border-right: none; }' +
    '.service-strip strong { display: block; font-size: 10px; text-transform: uppercase; margin-bottom: 3px; }' +
    '.refs-title { padding: 8px 8px 4px; font-weight: 800; font-size: 11px; text-transform: uppercase; }' +
    '.refs { width: 100%; border-collapse: collapse; }' +
    '.refs th, .refs td { border-right: 1px solid #111; border-bottom: 1px solid #111; padding: 6px; text-align: left; }' +
    '.refs th:last-child, .refs td:last-child { border-right: none; }' +
    '.refs th { background: #f3f3f3; font-size: 9px; text-transform: uppercase; }' +
    '.charges { width: 100%; border-collapse: collapse; }' +
    '.charges th, .charges td { border-right: 1px solid #111; border-bottom: 1px solid #111; padding: 7px 6px; }' +
    '.charges th:last-child, .charges td:last-child { border-right: none; }' +
    '.charges th { background: #efefef; text-transform: uppercase; font-size: 10px; }' +
    '.qty { width: 60px; text-align: center; }' +
    '.money { width: 95px; text-align: right; }' +
    '.bottom { display: flex; min-height: 105px; }' +
    '.terms { flex: 1; padding: 10px; border-right: 1px solid #111; }' +
    '.total-box { width: 235px; }' +
    '.total-row { display: flex; justify-content: space-between; padding: 8px 10px; border-bottom: 1px solid #111; }' +
    '.grand { font-size: 17px; font-weight: 800; border-bottom: none; }' +
    '.signature { padding: 16px 10px 10px; border-top: 2px solid #111; }' +
    '.signature-line { display: inline-block; width: 58%; border-bottom: 1px solid #111; margin-left: 8px; }' +
    '.fine { font-size: 9px; color: #333; margin-top: 8px; }' +
    '</style></head><body>' +
    '<div class="sheet">' +
    '<div class="top">' +
      '<div><div class="company">' + esc(issuerName) + '</div>' +
      (hasValue(issuerEmail) ? '<div class="company-sub">' + esc(issuerEmail) + '</div>' : '') + '</div>' +
      '<div class="invoice-box"><div class="invoice-label">Invoice</div>' +
      (hasValue(invoice.invoiceNumber) ? '<div class="invoice-number">' + esc(invoice.invoiceNumber) + '</div>' : '') + '</div>' +
    '</div>' +
    '<table class="info">' +
      infoCells([
        ['Customer', invoice.clientName],
        ['Date', invoice.date],
        ['Job Address', invoice.jobAddress],
        ['Phone', invoice.clientPhone],
        ['Due Date', invoice.dueDate],
        ['Billing Address', invoice.clientAddress],
      ]) +
    '</table>' +
    ([
      ['RMC', invoice.rmc], ['Due', invoice.dueTime],
      ['Arrive', invoice.arriveTime], ['Start', invoice.startTime], ['Finish', invoice.finishTime],
    ].some(([, value]) => hasValue(value))
      ? '<table class="service-strip"><tr>' +
        ([
          ['RMC', invoice.rmc], ['Due', invoice.dueTime],
          ['Arrive', invoice.arriveTime], ['Start', invoice.startTime], ['Finish', invoice.finishTime],
        ] as Array<[string, unknown]>).filter(([, value]) => hasValue(value)).map(([label, value]) =>
          '<td><strong>' + esc(label) + '</strong>' + esc(value) + '</td>'
        ).join('') +
        '</tr></table>'
      : '') +
    jobReferencesSection +
    '<table class="charges"><thead><tr><th class="qty">Qty.</th><th>Description</th><th class="money">Unit Price</th><th class="money">Amount</th></tr></thead>' +
    '<tbody>' + rows + '</tbody></table>' +
    '<div class="bottom">' +
      (hasValue(invoice.terms) || hasValue(invoice.notes)
        ? '<div class="terms"><strong>Terms / Notes</strong>' +
          (hasValue(invoice.terms) ? '<div style="margin-top:6px;">' + esc(invoice.terms) + '</div>' : '') +
          (hasValue(invoice.notes) ? '<div style="margin-top:6px;">' + esc(invoice.notes) + '</div>' : '') +
          '</div>'
        : '') +
      '<div class="total-box">' +
        '<div class="total-row"><span>Subtotal</span><strong>$' + Number(invoice.subtotal || 0).toFixed(2) + '</strong></div>' +
        (invoice.tax ? '<div class="total-row"><span>Tax</span><strong>$' + Number(invoice.tax).toFixed(2) + '</strong></div>' : '') +
        '<div class="total-row grand"><span>Total</span><span>$' + Number(invoice.total || 0).toFixed(2) + '</span></div>' +
      '</div>' +
    '</div>' +
    '<div class="signature">Authorized Signature <span class="signature-line"></span>' +
      '<div class="fine">Generated by PumpTracker. Payment terms and business policies are set by the issuing business.</div></div>' +
    '</div></body></html>'
  );
};
