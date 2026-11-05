import React, { useState } from 'react';
import { AlertCircle, Camera, CheckCircle2, Mail, MessageCircle, QrCode, ShieldCheck, X } from 'lucide-react';
import { SUBSCRIPTION_PLANS } from '../../services/subscriptionService';
import { MANUAL_PAYMENT_CONFIG } from '../../services/manualPaymentConfig';

const PENDING_PAYMENTS_KEY = 'cmf_manual_gcash_pending_payments';

interface PendingPayment {
  id: string;
  planId: string;
  referenceNumber: string;
  submittedAt: string;
  status: 'pending';
}

function loadPendingPayments(): PendingPayment[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(PENDING_PAYMENTS_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item): item is PendingPayment =>
      item && typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.planId === 'string' &&
      typeof item.referenceNumber === 'string' &&
      typeof item.submittedAt === 'string' &&
      item.status === 'pending'
    );
  } catch {
    return [];
  }
}

export const ManualPremiumPayment: React.FC = () => {
  const [selectedPlanId, setSelectedPlanId] = useState(SUBSCRIPTION_PLANS[0]?.id || '');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>(loadPendingPayments);
  const [formMessage, setFormMessage] = useState('');
  const [isQrExpanded, setIsQrExpanded] = useState(false);
  const selectedPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === selectedPlanId);

  const handleSaveReference = (event: React.FormEvent) => {
    event.preventDefault();
    const reference = referenceNumber.trim();
    if (!reference || !selectedPlan) {
      setFormMessage('Choose a plan and enter your GCash reference number.');
      return;
    }

    const nextPayment: PendingPayment = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      planId: selectedPlan.id,
      referenceNumber: reference,
      submittedAt: new Date().toISOString(),
      status: 'pending',
    };
    const updated = [nextPayment, ...pendingPayments];
    try {
      localStorage.setItem(PENDING_PAYMENTS_KEY, JSON.stringify(updated));
      setPendingPayments(updated);
      setReferenceNumber('');
      setFormMessage('Reference saved on this device as pending. It has not been sent to support.');
    } catch {
      setFormMessage('Could not save the pending reference on this device. Please message support directly.');
    }
  };

  const latestPending = pendingPayments[0];
  const latestPlan = SUBSCRIPTION_PLANS.find((plan) => plan.id === latestPending?.planId);
  const emailHref = `mailto:circaniabc@gmail.com?subject=Contractor%20Money%20Flow%20Support${latestPending ? `&body=${encodeURIComponent(`GCash verification #: ${latestPending.referenceNumber}\nPlan: ${latestPlan?.name || 'Premium'}\n\nI will attach my payment screenshot to this email.`)}` : ''}`;

  return (
    <section className="bg-white dark:bg-slate-900 rounded-3xl p-5 border border-amber-300 dark:border-amber-700/70 shadow-xs space-y-4">
      <div>
        <p className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-amber-700 dark:text-amber-300">Premium</p>
        <h3 className="mt-1 text-base font-extrabold text-slate-900 dark:text-white">Subscribe with GCash</h3>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-300">Choose a plan, pay using the details below, then send your verification number and payment screenshot to us.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {SUBSCRIPTION_PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            aria-pressed={selectedPlanId === plan.id}
            onClick={() => setSelectedPlanId(plan.id)}
            className={`rounded-2xl border p-3 text-left transition-colors ${selectedPlanId === plan.id ? 'border-amber-500 bg-amber-50 dark:bg-amber-950/40' : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800'}`}
          >
            <span className="block text-xs font-bold text-slate-900 dark:text-white">{plan.name}</span>
            <span className="mt-1 block text-sm font-extrabold text-amber-700 dark:text-amber-300">{plan.priceFormatted}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/70 p-3.5 space-y-2 text-xs text-slate-700 dark:text-slate-200">
        <p className="font-bold text-slate-900 dark:text-white">GCash payment instructions</p>
        <ol className="list-decimal pl-4 space-y-1.5">
          <li>Send the selected plan amount to the GCash account shown here.</li>
          <li>Save the GCash transaction reference number and take a screenshot of the payment receipt.</li>
          <li>Enter the reference number below, then send that number and manually attach the screenshot through Messenger or email.</li>
        </ol>

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
          <dt className="font-semibold">Account name</dt>
          <dd className="font-bold text-slate-900 dark:text-white">{MANUAL_PAYMENT_CONFIG.gcashAccountName || 'Not configured'}</dd>
          <dt className="font-semibold">GCash number</dt>
          <dd className="font-bold text-slate-900 dark:text-white">{MANUAL_PAYMENT_CONFIG.gcashAccountNumber || 'Not configured'}</dd>
        </dl>

        <div className="pt-2">
          <p className="mb-2 font-semibold text-slate-900 dark:text-white">GCash QR code</p>
          {MANUAL_PAYMENT_CONFIG.gcashQrImageUrl ? (
            <button
              type="button"
              onClick={() => setIsQrExpanded(true)}
              aria-label="Open larger GCash QR code"
              className="group mx-auto flex w-full max-w-64 flex-col items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 text-center shadow-sm transition hover:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700"
            >
              <img src={MANUAL_PAYMENT_CONFIG.gcashQrImageUrl} alt="GCash payment QR code; tap to enlarge" className="max-h-56 w-auto rounded-xl object-contain" />
              <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600 group-hover:text-amber-700 dark:text-slate-300 dark:group-hover:text-amber-300"><QrCode className="h-4 w-4" /> Tap to enlarge QR code</span>
            </button>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-4 text-center text-[11px] text-slate-500 dark:text-slate-400">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
                <Camera className="h-7 w-7" aria-hidden="true" />
              </div>
              <span className="font-semibold text-slate-700 dark:text-slate-200">GCash QR code is not yet available.</span>
              QR image not configured — set VITE_GCASH_QR_IMAGE_URL.
            </div>
          )}
        </div>
      </div>

      <p className="text-center text-xs font-semibold text-slate-700 dark:text-slate-200">Send verification # screenshot here on Messenger or type your verification # below.</p>
      <form onSubmit={handleSaveReference} className="space-y-2 border-t border-slate-200 dark:border-slate-700 pt-3">
        <label htmlFor="gcash-reference" className="block text-xs font-bold text-slate-800 dark:text-slate-200">GCash Reference / Verification Code</label>
        <input
          id="gcash-reference"
          type="text"
          inputMode="text"
          autoComplete="off"
          maxLength={100}
          value={referenceNumber}
          onChange={(event) => setReferenceNumber(event.target.value)}
          placeholder="Enter the reference number from your receipt"
          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white dark:placeholder-slate-400"
        />
        <button type="submit" className="w-full rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-extrabold text-slate-950 hover:bg-amber-400">
          SAVE REFERENCE AS PENDING
        </button>
        {formMessage && <p role="status" className="text-xs font-semibold text-slate-700 dark:text-slate-300">{formMessage}</p>}
      </form>

      <p className="text-xs leading-relaxed font-bold text-rose-700 dark:text-rose-300">
        Huwag kalimutan i-send ang verification # sa email na{' '}
        <a className="underline" href={emailHref}>circaniabc@gmail.com</a>
      </p>
      <a
        href="https://www.messenger.com/?utm_source=chatgpt.com"
        target="_blank"
        rel="noopener noreferrer"
        className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-2xl bg-blue-600 px-4 py-3 text-center text-xs font-extrabold tracking-wide text-white hover:bg-blue-700"
      >
        <span className="inline-flex items-center gap-2"><MessageCircle className="h-4 w-4" /> MESSAGE US ON MESSENGER</span>
        <span className="text-[11px] font-semibold normal-case tracking-normal text-blue-100">M.B</span>
      </a>
      <a href={emailHref} className="inline-flex items-center gap-2 text-xs font-bold text-amber-700 underline dark:text-amber-300">
        <Mail className="h-4 w-4" /> Email circaniabc@gmail.com
      </a>
      <p className="-mt-3 text-[11px] text-slate-500 dark:text-slate-400">Please manually attach your payment screenshot in Messenger or email, and include your verification number.</p>

      {latestPending && (
        <div role="status" className="rounded-2xl border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
          <p className="flex items-center gap-2 font-extrabold text-amber-900 dark:text-amber-200"><AlertCircle className="h-4 w-4" /> Payment status: Pending manual verification</p>
          <p className="mt-1 text-amber-900/90 dark:text-amber-100/90">Reference {latestPending.referenceNumber}{latestPlan ? ` · ${latestPlan.name}` : ''}. Saved only on this device; it has not been transmitted or verified.</p>
          <p className="mt-2 flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-300"><ShieldCheck className="h-3.5 w-3.5" /> A reference or screenshot alone does not prove payment. Premium is not activated by this form.</p>
        </div>
      )}
      {!latestPending && (
        <p className="flex items-start gap-2 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          Payment references stay pending until verified. Saving a reference does not send it, verify payment, or activate Premium.
        </p>
      )}

      {isQrExpanded && MANUAL_PAYMENT_CONFIG.gcashQrImageUrl && (
        <div
          role="presentation"
          onClick={() => setIsQrExpanded(false)}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/80 p-5"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Enlarged GCash QR code"
            onClick={(event) => event.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl bg-white p-4 shadow-2xl dark:bg-slate-900"
          >
            <button type="button" onClick={() => setIsQrExpanded(false)} aria-label="Close enlarged QR code" className="absolute right-3 top-3 z-10 rounded-full bg-slate-100 p-2 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-white">
              <X className="h-5 w-5" />
            </button>
            <img src={MANUAL_PAYMENT_CONFIG.gcashQrImageUrl} alt="Enlarged GCash payment QR code" className="mx-auto max-h-[80vh] w-auto max-w-full rounded-xl object-contain" />
            <p className="pt-3 text-center text-xs font-semibold text-slate-600 dark:text-slate-300">GCash QR code for M.B</p>
          </div>
        </div>
      )}
    </section>
  );
};
