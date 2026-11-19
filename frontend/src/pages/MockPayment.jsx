import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CreditCard, Lock, ArrowRight, XCircle, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

/**
 * Mock Payment Page
 * Simulates a bank-hosted payment page.
 * Card number must be exactly 10 digits to succeed.
 */
export default function MockPayment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [processing, setProcessing] = useState(false);
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [error, setError] = useState('');

  const orderRef = searchParams.get('ref');
  const txnId = searchParams.get('txn');
  const amount = parseInt(searchParams.get('amount') || '1999');

  // Only keep digits from card number
  const rawDigits = cardNumber.replace(/\D/g, '');

  const formatCardNumber = (value) => {
    const digits = value.replace(/\D/g, '');
    // Group in sets of 4 for visual display
    return digits.replace(/(.{4})/g, '$1 ').trim();
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setCardNumber(formatted);
    setError('');
  };

  const formatExpiry = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) {
      return digits.slice(0, 2) + '/' + digits.slice(2);
    }
    return digits;
  };

  const handleExpiryChange = (e) => {
    setExpiry(formatExpiry(e.target.value));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Validate: exactly 10 digits
    if (rawDigits.length !== 10) {
      setError(
        rawDigits.length < 10
          ? `Numri i kartës duhet të ketë saktësisht 10 shifra. Ju keni shkruar ${rawDigits.length}.`
          : `Numri i kartës duhet të ketë saktësisht 10 shifra. Ju keni shkruar ${rawDigits.length}.`
      );
      toast.error('Numri i kartës nuk është i vlefshëm!', {
        icon: '❌',
        style: {
          background: '#1e1b2e',
          color: '#f87171',
          border: '1px solid rgba(248, 113, 113, 0.2)',
        },
      });
      return;
    }

    if (!cardHolder.trim()) {
      setError('Ju lutem shkruani emrin e mbajtësit të kartës.');
      return;
    }

    if (!expiry || expiry.length < 5) {
      setError('Ju lutem shkruani datën e skadencës (MM/VV).');
      return;
    }

    if (!cvv || cvv.length < 3) {
      setError('Ju lutem shkruani kodin CVV (3 shifra).');
      return;
    }

    // Card number is exactly 10 digits — process payment
    setProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));

      const response = await fetch('/mock/bank/simulate-callback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderReference: orderRef,
          status: 'success',
        }),
      });

      if (!response.ok) throw new Error('Callback failed');

      toast.custom(
        (t) => (
          <div
            className={`${
              t.visible ? 'animate-enter' : 'animate-leave'
            } max-w-md w-full bg-gradient-to-br from-[#1a1630] to-[#0f172a] shadow-2xl rounded-2xl border border-green-500/20 p-6`}
          >
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center flex-shrink-0">
                <CheckCircle className="w-6 h-6 text-green-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-bold text-base mb-1">Pagesa u krye me sukses! 🎉</h3>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Kredencialet për Aktivizimin e ValaTV do ju dërgohen me Email, si dhe do të shfaqen tek Të dhënat e Llogarisë (posa llogaria të aktivizohet).
                </p>
              </div>
            </div>
          </div>
        ),
        { duration: 6000 }
      );

      setTimeout(() => {
        navigate('/payment-success');
      }, 2000);
    } catch (error) {
      toast.error('Diçka shkoi keq. Ju lutem provoni përsëri.');
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md">
        {/* Bank Banner */}
        <div className="mb-6 p-4 rounded-xl bg-brand-purple-500/5 border border-brand-purple-500/20 text-center">
          <p className="text-brand-purple-300 text-sm font-medium">
            🏦 Portali i Pagesës Bankare
          </p>
          <p className="text-dark-500 text-xs mt-1">
            Pagesë e sigurt me verifikim 3D-Secure
          </p>
        </div>

        {/* Payment Form */}
        <form onSubmit={handleSubmit} className="glass-card p-8 glow-border">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-dark-800 border border-dark-700 mb-4">
              <CreditCard className="w-7 h-7 text-brand-purple-400" />
            </div>
            <h2 className="text-xl font-bold text-white">Pagesë e Sigurt</h2>
            <p className="text-dark-400 text-sm mt-1">Abonimi ValaTV</p>
          </div>

          {/* Amount */}
          <div className="p-4 rounded-xl bg-dark-800/60 border border-dark-700/30 mb-6 text-center">
            <p className="text-dark-400 text-xs uppercase tracking-wider">Shuma Totale</p>
            <p className="text-3xl font-black text-white mt-1">€{(amount / 100).toFixed(2)}</p>
            <p className="text-dark-500 text-xs mt-1">Referenca: {orderRef}</p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Card Form */}
          <div className="space-y-4 mb-6">
            {/* Card Number */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Numri i Kartës</label>
              <div className="relative">
                <input
                  type="text"
                  value={cardNumber}
                  onChange={handleCardNumberChange}
                  placeholder="Shkruani numrin e kartës"
                  maxLength={14}
                  className="input-field font-mono pr-16"
                  disabled={processing}
                />
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono ${
                  rawDigits.length === 10 ? 'text-green-400' : rawDigits.length > 10 ? 'text-red-400' : 'text-dark-500'
                }`}>
                  {rawDigits.length}/10
                </span>
              </div>
            </div>

            {/* Card Holder */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Mbajtësi i Kartës</label>
              <input
                type="text"
                value={cardHolder}
                onChange={(e) => setCardHolder(e.target.value)}
                placeholder="Emri dhe Mbiemri"
                className="input-field"
                disabled={processing}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Expiry */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Skadenca</label>
                <input
                  type="text"
                  value={expiry}
                  onChange={handleExpiryChange}
                  placeholder="MM/VV"
                  maxLength={5}
                  className="input-field font-mono"
                  disabled={processing}
                />
              </div>
              {/* CVV */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">CVV</label>
                <input
                  type="text"
                  value={cvv}
                  onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 3))}
                  placeholder="•••"
                  maxLength={3}
                  className="input-field font-mono"
                  disabled={processing}
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={processing}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <div className="flex items-center gap-3">
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Duke procesuar...</span>
              </div>
            ) : (
              <>
                <Lock className="w-4 h-4" />
                Paguaj €{(amount / 100).toFixed(2)}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-2 mt-4 text-dark-500 text-xs">
            <Lock className="w-3.5 h-3.5" />
            Pagesë e sigurt me verifikim 3D-Secure
          </div>
        </form>
      </div>
    </div>
  );
}
