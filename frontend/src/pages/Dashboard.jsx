import { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/client';
import AgreementModal from '../components/AgreementModal';
import {
  Trophy, Tv, Download, CreditCard, Copy, Check, ExternalLink,
  Smartphone, Monitor, Globe, Lock, AlertCircle, Sparkles, Eye, EyeOff,
  X, ArrowRight, CheckCircle, Phone, Mail, Tablet, Gift, ArrowDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import fbIcon from '../Logos/fb-icon.png';
import instaIcon from '../Logos/insta-icon.png';

export default function Dashboard() {
  const { user, refreshUser } = useAuth();
  const [pollExhausted, setPollExhausted] = useState(false);
  const [pollVersion, setPollVersion] = useState(0);

  // Derive credential status from user object directly (re-evaluated every render)
  const isPaid = user?.paymentStatus === 'paid';
  const hasCredentials = user?.ottProvisioned === true;
  const isBizPaid = user?.bizPaymentStatus === 'paid';
  const hasBizCredentials = user?.bizOttProvisioned === true;

  // Refresh user data on mount; poll if paid but credentials not yet provisioned.
  useEffect(() => {
    let active = true;
    const urlParams = new URLSearchParams(window.location.search);
    const fromPayment = urlParams.has('fromPayment');

    async function resetAndPoll() {
      // If NOT coming from TEB, reset any stale 'pending' status back to 'unpaid'
      if (!fromPayment) {
        try { await api.resetPendingPayment(); } catch {}
      }

      for (let i = 0; i < 10; i++) {
        if (!active) return;
        const u = await refreshUser();
        if (!active || !u) return;
        
        // Check if polling is needed for each package
        let personalNeedsPoll, bizNeedsPoll;
        
        if (fromPayment) {
          // Coming from payment: poll while status is 'pending' OR 'paid' without credentials
          personalNeedsPoll = u.paymentStatus === 'pending' || (u.paymentStatus === 'paid' && u.ottProvisioned !== true);
          bizNeedsPoll = u.bizPaymentStatus === 'pending' || (u.bizPaymentStatus === 'paid' && u.bizOttProvisioned !== true);
        } else {
          // Normal mode: only poll if already 'paid' but missing credentials
          personalNeedsPoll = u.paymentStatus === 'paid' && u.ottProvisioned !== true;
          bizNeedsPoll = u.bizPaymentStatus === 'paid' && u.bizOttProvisioned !== true;
        }
        
        if (!personalNeedsPoll && !bizNeedsPoll) {
          setPollVersion(v => v + 1);
          return;
        }
        await new Promise(r => setTimeout(r, 3000));
      }
      if (active) setPollExhausted(true);
    }

    resetAndPoll();
    return () => { active = false; };
  }, []);

  const [paymentLoading, setPaymentLoading] = useState(false);
  const [copiedField, setCopiedField] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showBizPassword, setShowBizPassword] = useState(false);

  // Track which package is being purchased
  const [activePackageType, setActivePackageType] = useState('personal');
  const [mobilePackageType, setMobilePackageType] = useState(null); // XXL, XL, L, M, S or null

  // ─── Agreement Modal State ───────────────────
  const [showAgreement, setShowAgreement] = useState(false);

  // ─── TEB Payment Form ────────────────────────
  const tebFormRef = useRef(null);
  const [tebGatewayUrl, setTebGatewayUrl] = useState('');
  const [tebFormParams, setTebFormParams] = useState({});

  // Helper: Check if user has Vala mobile number
  const hasValaNumber = () => {
    if (!user?.phone) return false;
    const phone = user.phone.replace(/\s+/g, '');
    const valaPatterns = ['+38344', '+38345', '+38346', '044', '045', '046'];
    return valaPatterns.some(pattern => phone.startsWith(pattern));
  };

  // Step 0: Open agreement modal first
  const handlePayClick = (packageType = 'personal') => {
    setActivePackageType(packageType);
    setMobilePackageType(null); // Clear mobile package type
    setShowAgreement(true);
  };

  // Step 0: Mobile package payment (XXL, XL, L, M, S)
  const handleMobilePackagePayClick = (mobilePackage) => {
    setActivePackageType('personal'); // Mobile packages are personal packages
    setMobilePackageType(mobilePackage); // Store XXL, XL, L, M, or S
    setShowAgreement(true);
  };

  // Step 0b: User accepted agreement — log it then create payment
  const handleAgreementAccept = async () => {
    setShowAgreement(false);
    try {
      await api.acceptAgreement('premium');
    } catch {
      // Non-blocking — proceed to payment even if logging fails
    }
    await handlePayment();
  };

  // Step 1: Create payment order, get TEB form params, auto-submit to bank
  const handlePayment = async () => {
    setPaymentLoading(true);
    try {
      const data = await api.createPayment(activePackageType, mobilePackageType);

      // Set the gateway URL and form params, then auto-submit
      setTebGatewayUrl(data.gatewayUrl);
      setTebFormParams(data.formParams);

      // Wait for state to render, then submit the hidden form
      setTimeout(() => {
        if (tebFormRef.current) {
          tebFormRef.current.submit();
        }
      }, 100);
    } catch (error) {
      toast.error(error.message);
      setPaymentLoading(false);
    }
  };

  const copyToClipboard = (text, field) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    toast.success('U kopjua në clipboard!');
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] px-4 py-8 sm:py-12">
      <div className="max-w-6xl mx-auto">
        {/* ─── Welcome Header ──────────────────────── */}
        <div className="mb-10">
          <h1 className="hidden md:block text-3xl sm:text-4xl font-bold text-white mb-2">
            Mirë se vjen, <span className="text-gradient">{user?.firstName}</span>! 
          </h1>
          <p className="text-dark-400 text-lg">
            {isPaid && isBizPaid
              ? 'Pakot e juaja ValaBoterori dhe ValaBoterori_BIZ janë aktive! Shijoni çdo ndeshje.'
              : isPaid
              ? 'Pakoja e juaj ValaBoterori është aktive! Shijoni çdo ndeshje.'
              : isBizPaid
              ? 'Pakoja e juaj ValaBoterori_BIZ është aktive! Shijoni çdo ndeshje.'
              : <span className="hidden md:inline">Përfundo abonimin për të filluar shikimin e ndeshjeve.</span>}
          </p>
        </div>

        {/* Mobile-only message banner */}
        {hasValaNumber() && !isPaid && (
          <div className="md:hidden mb-4 p-3 rounded-xl bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/20">
            <p className="text-white text-sm text-center flex items-center justify-center gap-2">
              <ArrowDown className="w-4 h-4" />
              Zbritni poshtë për pako mobile me GB bonus
            </p>
          </div>
        )}

        {/* ─── Main Content Wrapper (flex on mobile for reordering) ─────────── */}
        <div className="flex flex-col md:block">

        {/* ─── Desktop: Grid Layout | Mobile: Flattened for ordering ─────────── */}
        <div className="contents md:grid md:grid-cols-1 lg:grid-cols-3 md:gap-6 md:mb-6">

          {/* Payment / Credentials Cards wrapper - becomes transparent on mobile */}
          <div className="contents lg:grid lg:col-span-2 lg:grid-cols-2 lg:gap-6">

            {/* ── Card 1: Personal Package ── */}
            <div className="mb-6 md:mb-0 order-1">
            {hasCredentials ? (
              /* ── User HAS paid and has credentials ── */
              <div className="glass-card p-8 glow-border relative overflow-hidden h-full">
                {/* Decorative gradient */}
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-brand opacity-5 rounded-full blur-3xl" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Kredencialet tuaja</h2>
                    <p className="text-green-400 text-sm font-medium">✅ Abonimi Aktiv</p>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Username */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/60 border border-dark-700/30">
                    <div>
                      <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Përdoruesi</p>
                      <p className="text-white font-mono text-lg font-semibold">{user.ottUsername}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(user.ottUsername, 'username')}
                      className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                    >
                      {copiedField === 'username' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-dark-400" />
                      )}
                    </button>
                  </div>

                  {/* Password */}
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/60 border border-dark-700/30">
                    <div>
                      <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Fjalëkalimi</p>
                      <p className="text-white font-mono text-lg font-semibold">
                        {showPassword ? user.ottPassword : '••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPassword(!showPassword)}
                        className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5 text-dark-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-dark-400" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(user.ottPassword, 'password')}
                        className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                      >
                        {copiedField === 'password' ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-dark-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-dark-500 text-sm mt-4">
                  Përdorni këto kredenciale për t'u kyçur në aplikacionin TV Vala nga çdo pajisje.
                </p>
              </div>
            ) : isPaid && !hasCredentials ? (
              /* ── User HAS paid but credentials still provisioning ── */
              <div className="glass-card p-8 glow-border relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-brand opacity-5 rounded-full blur-3xl" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Pagesa u konfirmua!</h2>
                    <p className="text-yellow-400 text-sm font-medium">⏳ Kredencialet po krijohen...</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  {!pollExhausted ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin flex-shrink-0" />
                      <p className="text-dark-300 text-sm">Duke krijuar kredencialet tuaja, ju lutem prisni...</p>
                    </div>
                  ) : (
                    <p className="text-dark-300 text-sm">
                      Kredencialet tuaja janë duke u procesuar. Do t'i merrni me email së shpejti. 
                      Nëse nuk i merrni brenda disa minutave, ju lutem kontaktoni mbështetjen tonë.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ── User has NOT paid ── */
              <div className="glass-card p-5 glow-border relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-brand-pink-600/5 rounded-full blur-3xl" />

                <div className="flex items-center gap-2 mb-4">
                  <div className="w-9 h-9 rounded-xl bg-brand-pink-500/10 border border-brand-pink-500/20 flex items-center justify-center">
                    <AlertCircle className="w-4 h-4 text-brand-pink-400" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white">Aktivizo abonimin</h2>
                    <p className="text-dark-400 text-xs">Faza e Eliminimeve Direkte</p>
                  </div>
                </div>

                <div className="mb-4 p-4 rounded-xl bg-gradient-card border border-brand-purple-500/10">
                  <div className="text-center mb-3">
                    <p className="text-base font-bold text-white">ValaBoterori_FazaFinale</p>
                  </div>
                  <div className="flex items-baseline justify-center gap-2 mb-4">
                    <span className="text-2xl font-black text-gradient">€9,99</span>
                  </div>
                  <ul className="space-y-1">
                    {[
                      'Të gjitha ndeshjet LIVE, Ekskluzivisht në TV Vala',
                      'Deri në 5 pajisje digjitale',
                      '1 stream (qasje) njëkohësisht në TV Vala',
                      '2 Kanale, ValaSport1 & ValaSport2',
                      '104 GB falas për klientët e Vala Mobile, të vlefshme për TV Vala',
                  
                    ].map((item) => (
                      <li key={item} className="flex items-center gap-1.5 text-dark-300 text-xs">
                        <Check className="w-3.5 h-3.5 text-brand-purple-400 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => handlePayClick('personal')}
                  disabled={paymentLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {paymentLoading && activePackageType === 'personal' ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-3.5 h-3.5" />
                      Paguaj & Aktivizo — €9,99
                    </>
                  )}
                </button>

                <div className="flex items-center justify-center gap-1.5 mt-2 text-dark-500 text-xs">
                  <Lock className="w-3 h-3" />
                  Pagesë e sigurt përmes bankës me verifikim 3D-Secure
                </div>
              </div>
            )}
            </div>

            {/* ── Card 2: Business Package ── */}
            <div className="mb-6 md:mb-0 order-3 md:order-2">
            {hasBizCredentials ? (
              /* ── User HAS paid BIZ and has credentials ── */
              <div className="glass-card p-8 glow-border relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-brand opacity-5 rounded-full blur-3xl" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Kredencialet BIZ</h2>
                    <p className="text-green-400 text-sm font-medium">✅ Abonimi BIZ Aktiv</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/60 border border-dark-700/30">
                    <div>
                      <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Përdoruesi BIZ</p>
                      <p className="text-white font-mono text-lg font-semibold">{user.bizOttUsername}</p>
                    </div>
                    <button
                      onClick={() => copyToClipboard(user.bizOttUsername, 'biz-username')}
                      className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                    >
                      {copiedField === 'biz-username' ? (
                        <Check className="w-5 h-5 text-green-400" />
                      ) : (
                        <Copy className="w-5 h-5 text-dark-400" />
                      )}
                    </button>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-xl bg-dark-800/60 border border-dark-700/30">
                    <div>
                      <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Fjalëkalimi BIZ</p>
                      <p className="text-white font-mono text-lg font-semibold">
                        {showBizPassword ? user.bizOttPassword : '••••••••••'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowBizPassword(!showBizPassword)}
                        className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                      >
                        {showBizPassword ? (
                          <EyeOff className="w-5 h-5 text-dark-400" />
                        ) : (
                          <Eye className="w-5 h-5 text-dark-400" />
                        )}
                      </button>
                      <button
                        onClick={() => copyToClipboard(user.bizOttPassword, 'biz-password')}
                        className="p-2 rounded-lg hover:bg-dark-700/50 transition-colors"
                      >
                        {copiedField === 'biz-password' ? (
                          <Check className="w-5 h-5 text-green-400" />
                        ) : (
                          <Copy className="w-5 h-5 text-dark-400" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                <p className="text-dark-500 text-sm mt-4">
                  Përdorni këto kredenciale BIZ për t'u kyçur në aplikacionin TVVala.
                </p>
              </div>
            ) : isBizPaid && !hasBizCredentials ? (
              /* ── User HAS paid BIZ but credentials still provisioning ── */
              <div className="glass-card p-8 glow-border relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-brand opacity-5 rounded-full blur-3xl" />

                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">Pagesa BIZ u konfirmua!</h2>
                    <p className="text-yellow-400 text-sm font-medium">⏳ Kredencialet po krijohen...</p>
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/10">
                  {!pollExhausted ? (
                    <div className="flex items-center gap-3">
                      <div className="w-5 h-5 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin flex-shrink-0" />
                      <p className="text-dark-300 text-sm">Duke krijuar kredencialet tuaja BIZ, ju lutem prisni...</p>
                    </div>
                  ) : (
                    <p className="text-dark-300 text-sm">
                      Kredencialet tuaja BIZ janë duke u procesuar. Do t'i merrni me email së shpejti.
                      Nëse nuk i merrni brenda disa minutave, ju lutem kontaktoni mbështetjen tonë.
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* ── User has NOT paid BIZ ── */
              <div className="glass-card p-5 relative overflow-hidden h-full">
                <div className="absolute top-0 right-0 w-40 h-40 bg-purple-600/5 rounded-full blur-3xl" />

                {/* Only 4 Matches */}
                <div className="space-y-4 py-8">
                  <div className="flex items-center justify-center gap-3 text-white py-3">
                    <img src="/flags/fr.svg" alt="France" className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-lg font-bold">FRA</span>
                    <span className="text-base text-gray-400">vs</span>
                    <span className="text-lg font-bold">MAR</span>
                    <img src="/flags/ma.svg" alt="Morocco" className="w-10 h-10 rounded-full object-cover" />
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white py-3">
                    <img src="/flags/es.svg" alt="Spain" className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-lg font-bold">ESP</span>
                    <span className="text-base text-gray-400">vs</span>
                    <span className="text-lg font-bold">BEL</span>
                    <img src="/flags/be.svg" alt="Belgium" className="w-10 h-10 rounded-full object-cover" />
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white py-3">
                    <img src="/flags/no.svg" alt="Norway" className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-lg font-bold">NOR</span>
                    <span className="text-base text-gray-400">vs</span>
                    <span className="text-lg font-bold">ENG</span>
                    <img src="/flags/eng.svg" alt="England" className="w-10 h-10 rounded-full object-cover" />
                  </div>
                  <div className="flex items-center justify-center gap-3 text-white py-3">
                    <img src="/flags/ar.svg" alt="Argentina" className="w-10 h-10 rounded-full object-cover" />
                    <span className="text-lg font-bold">ARG</span>
                    <span className="text-base text-gray-400">vs</span>
                    <span className="text-lg font-bold">SUI</span>
                    <img src="/flags/ch.svg" alt="Switzerland" className="w-10 h-10 rounded-full object-cover" />
                  </div>
                </div>
              </div>
            )}
            </div>

          </div>{/* end payment cards wrapper */}

          {/* Supported Devices Card */}
          <div className="glass-card p-4 mb-6 md:mb-0 order-4 md:order-3">
            <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Tv className="w-4 h-4 text-brand-purple-400" />
              Pajisjet e Mbështetura
            </h3>
            <p className="text-dark-400 text-xs mb-3">Pajisjet që mbështeten nga platforma janë:</p>
            <div className="space-y-2">
              <DeviceRow icon={<Tv className="w-4 h-4" />} name="Samsung TV" desc="Tizen 5.5+, prodhim 2020 e tutje" />
              <DeviceRow icon={<Tv className="w-4 h-4" />} name="LG TV" desc="WebOS 5.0+, prodhim 2020 e tutje" />
              <DeviceRow icon={<Smartphone className="w-4 h-4" />} name="Android TV & Android Box" desc="Android OS 10 ose më i ri" />
              <DeviceRow icon={<Smartphone className="w-4 h-4" />} name="Telefon celular" desc="Android dhe iOS " />
              <DeviceRow icon={<Monitor className="w-4 h-4" />} name="Kompjuter & Laptop" desc="Google Chrome ose Mozilla Firefox" />
            </div>
          </div>
        </div>{/* end desktop grid layout */}

        {/* ─── New Package Cards Section (Vala Mobile Only) ─────────── */}
        {hasValaNumber() && !isPaid && (
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6 md:mb-0 order-2 md:order-last">
          
          {/* Pako XXL */}
          <div className="glass-card p-4 glow-border relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink-600/5 rounded-full blur-3xl" />
            <div className="p-4 rounded-xl bg-gradient-card border border-brand-purple-500/10">
              <div className="text-center mb-3">
                <p className="text-base font-bold text-white">ValaBoterori + XXL</p>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-xl font-black text-gradient">€19,99</span>
              </div>
              <ul className="space-y-1 mb-3">
                {[
                  'Të gjitha ndeshjet LIVE',
                  'Deri në 5 pajisje',
                  '1 stream njëkohësisht',
                  '2 Kanale',
                  '104 GB falas',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-dark-300 text-xs">
                    <Check className="w-3 h-3 text-brand-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* Bonus Package Badge */}
              <div className="bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-pink-900/40 rounded-2xl p-3 text-center shadow-lg border border-purple-500/30">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                </div>
                <p className="text-white text-lg font-black tracking-wide">+ PAKO XXL</p>
              </div>
            </div>
            <button
              onClick={() => handleMobilePackagePayClick('XXL')}
              disabled={paymentLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading && mobilePackageType === 'XXL' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Paguaj — €19.99
                </>
              )}
            </button>
          </div>

          {/* Pako XL */}
          <div className="glass-card p-4 glow-border relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink-600/5 rounded-full blur-3xl" />
            <div className="p-4 rounded-xl bg-gradient-card border border-brand-purple-500/10">
              <div className="text-center mb-3">
                <p className="text-base font-bold text-white">ValaBoterori + XL</p>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-xl font-black text-gradient">€19,99</span>
              </div>
              <ul className="space-y-1 mb-3">
                {[
                  'Të gjitha ndeshjet LIVE',
                  'Deri në 5 pajisje',
                  '1 stream njëkohësisht',
                  '2 Kanale',
                  '104 GB falas',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-dark-300 text-xs">
                    <Check className="w-3 h-3 text-brand-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* Bonus Package Badge */}
              <div className="bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-pink-900/40 rounded-2xl p-3 text-center shadow-lg border border-purple-500/30">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                </div>
                <p className="text-white text-lg font-black tracking-wide">+ PAKO XL</p>
              </div>
            </div>
            <button
              onClick={() => handleMobilePackagePayClick('XL')}
              disabled={paymentLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading && mobilePackageType === 'XL' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Paguaj — €19.99
                </>
              )}
            </button>
          </div>

          {/* Pako L */}
          <div className="glass-card p-4 glow-border relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink-600/5 rounded-full blur-3xl" />
            <div className="p-4 rounded-xl bg-gradient-card border border-brand-purple-500/10">
              <div className="text-center mb-3">
                <p className="text-base font-bold text-white">ValaBoterori + L</p>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-xl font-black text-gradient">€19,99</span>
              </div>
              <ul className="space-y-1 mb-3">
                {[
                  'Të gjitha ndeshjet LIVE',
                  'Deri në 5 pajisje',
                  '1 stream njëkohësisht',
                  '2 Kanale',
                  '104 GB falas',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-dark-300 text-xs">
                    <Check className="w-3 h-3 text-brand-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* Bonus Package Badge */}
              <div className="bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-pink-900/40 rounded-2xl p-3 text-center shadow-lg border border-purple-500/30">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                </div>
                <p className="text-white text-lg font-black tracking-wide">+ PAKO L</p>
              </div>
            </div>
            <button
              onClick={() => handleMobilePackagePayClick('L')}
              disabled={paymentLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading && mobilePackageType === 'L' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Paguaj — €19.99
                </>
              )}
            </button>
          </div>

          {/* Pako M */}
          <div className="glass-card p-4 glow-border relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink-600/5 rounded-full blur-3xl" />
            <div className="p-4 rounded-xl bg-gradient-card border border-brand-purple-500/10">
              <div className="text-center mb-3">
                <p className="text-base font-bold text-white">ValaBoterori + M</p>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-xl font-black text-gradient">€19,99</span>
              </div>
              <ul className="space-y-1 mb-3">
                {[
                  'Të gjitha ndeshjet LIVE',
                  'Deri në 5 pajisje',
                  '1 stream njëkohësisht',
                  '2 Kanale',
                  '104 GB falas',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-dark-300 text-xs">
                    <Check className="w-3 h-3 text-brand-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* Bonus Package Badge */}
              <div className="bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-pink-900/40 rounded-2xl p-3 text-center shadow-lg border border-purple-500/30">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                </div>
                <p className="text-white text-lg font-black tracking-wide">+ PAKO M</p>
              </div>
            </div>
            <button
              onClick={() => handleMobilePackagePayClick('M')}
              disabled={paymentLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading && mobilePackageType === 'M' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Paguaj — €19.99
                </>
              )}
            </button>
          </div>

          {/* Pako S */}
          <div className="glass-card p-4 glow-border relative overflow-hidden h-full">
            <div className="absolute top-0 right-0 w-32 h-32 bg-brand-pink-600/5 rounded-full blur-3xl" />
            <div className="p-4 rounded-xl bg-gradient-card border border-brand-purple-500/10">
              <div className="text-center mb-3">
                <p className="text-base font-bold text-white">ValaBoterori + S</p>
              </div>
              <div className="flex items-baseline justify-center gap-2 mb-3">
                <span className="text-xl font-black text-gradient">€19,99</span>
              </div>
              <ul className="space-y-1 mb-3">
                {[
                  'Të gjitha ndeshjet LIVE',
                  'Deri në 5 pajisje',
                  '1 stream njëkohësisht',
                  '2 Kanale',
                  '104 GB falas',
                ].map((item) => (
                  <li key={item} className="flex items-center gap-1.5 text-dark-300 text-xs">
                    <Check className="w-3 h-3 text-brand-purple-400 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
              {/* Bonus Package Badge */}
              <div className="bg-gradient-to-br from-purple-900/50 via-purple-800/40 to-pink-900/40 rounded-2xl p-3 text-center shadow-lg border border-purple-500/30">
                <div className="flex items-center justify-center gap-1.5 mb-1">
                  
                </div>
                <p className="text-white text-lg font-black tracking-wide">+ PAKO S</p>
              </div>
            </div>
            <button
              onClick={() => handleMobilePackagePayClick('S')}
              disabled={paymentLoading}
              className="w-full mt-3 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {paymentLoading && mobilePackageType === 'S' ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CreditCard className="w-3.5 h-3.5" />
                  Paguaj — €19.99
                </>
              )}
            </button>
          </div>

        </div>
        )}

        </div>{/* end main content wrapper for mobile reordering */}

        {/* ─── Account Info ─────────────────────────── */}
        <div className="glass-card p-8 mb-10">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy className="w-6 h-6 text-brand-purple-400" />
            Të dhënat e llogarisë
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-dark-800/40 border border-dark-700/20">
              <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Emri</p>
              <p className="text-white font-medium text-sm">{user?.firstName} {user?.lastName}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/40 border border-dark-700/20">
              <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Emaili</p>
              <p className="text-white font-medium text-sm truncate">{user?.email}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/40 border border-dark-700/20">
              <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Telefoni</p>
              <p className="text-white font-medium text-sm">{user?.phone}</p>
            </div>
            <div className="p-4 rounded-xl bg-dark-800/40 border border-dark-700/20">
              <p className="text-dark-400 text-xs uppercase tracking-wider mb-1">Statusi</p>
              <div className="flex flex-col gap-1">
                {hasCredentials ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 w-fit">✅ ValaBoterori - Aktiv</span>
                ) : isPaid ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">⏳ ValaBoterori - Në pritje</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">💳 ValaBoterori - I pa paguar</span>
                )}
                {hasBizCredentials ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20 w-fit">✅ ValaBoterori_BIZ - Aktiv</span>
                ) : isBizPaid ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20 w-fit">⏳ ValaBoterori_BIZ - Në pritje</span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 w-fit">💳 ValaBoterori_BIZ - I pa paguar</span>
                )}
              </div>
            </div>
          </div>
          {hasCredentials && (
            <div className="mt-6 p-5 rounded-xl bg-dark-800/40 border border-green-500/10">
              <p className="text-dark-400 text-xs uppercase tracking-wider font-medium mb-4">Kredencialet TV Vala — ValaBoterori</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-dark-700/30">
                  <div>
                    <p className="text-dark-500 text-xs mb-0.5">Përdoruesi</p>
                    <p className="text-white font-mono text-sm font-semibold">{user?.ottUsername}</p>
                  </div>
                  <button onClick={() => copyToClipboard(user.ottUsername, 'wide-username')} className="p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors">
                    {copiedField === 'wide-username' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-dark-400" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-dark-700/30">
                  <div>
                    <p className="text-dark-500 text-xs mb-0.5">Fjalëkalimi</p>
                    <p className="text-white font-mono text-sm font-semibold">{showPassword ? user?.ottPassword : '••••••••'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowPassword(!showPassword)} className="p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors">
                      {showPassword ? <EyeOff className="w-4 h-4 text-dark-400" /> : <Eye className="w-4 h-4 text-dark-400" />}
                    </button>
                    <button onClick={() => copyToClipboard(user.ottPassword, 'wide-password')} className="p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors">
                      {copiedField === 'wide-password' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-dark-400" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
          {hasBizCredentials && (
            <div className="mt-6 p-5 rounded-xl bg-dark-800/40 border border-green-500/10">
              <p className="text-dark-400 text-xs uppercase tracking-wider font-medium mb-4">Kredencialet TV Vala — ValaBoterori_BIZ</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-dark-700/30">
                  <div>
                    <p className="text-dark-500 text-xs mb-0.5">Përdoruesi BIZ</p>
                    <p className="text-white font-mono text-sm font-semibold">{user?.bizOttUsername}</p>
                  </div>
                  <button onClick={() => copyToClipboard(user.bizOttUsername, 'wide-biz-username')} className="p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors">
                    {copiedField === 'wide-biz-username' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-dark-400" />}
                  </button>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-dark-800/60 border border-dark-700/30">
                  <div>
                    <p className="text-dark-500 text-xs mb-0.5">Fjalëkalimi BIZ</p>
                    <p className="text-white font-mono text-sm font-semibold">{showBizPassword ? user?.bizOttPassword : '••••••••'}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setShowBizPassword(!showBizPassword)} className="p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors">
                      {showBizPassword ? <EyeOff className="w-4 h-4 text-dark-400" /> : <Eye className="w-4 h-4 text-dark-400" />}
                    </button>
                    <button onClick={() => copyToClipboard(user.bizOttPassword, 'wide-biz-password')} className="p-1.5 rounded-lg hover:bg-dark-700/50 transition-colors">
                      {copiedField === 'wide-biz-password' ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-dark-400" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ─── World Cup Info ──────────────────────── */}
        <div className="glass-card p-8 mb-10">
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
            <Trophy className="w-7 h-7 text-brand-purple-400" />
            Kupa e Botës FIFA 2026
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard value="48" label="Ekipe" />
            <StatCard value="104" label="Ndeshje" />
            <StatCard value="16" label="Qytete Pritëse" />
            <StatCard value="3" label="Shtete" subtitle="SHBA • Meksikë • Kanada" />
          </div>
          <div className="mt-6 p-4 rounded-xl bg-dark-800/40 border border-dark-700/20">
            <p className="text-dark-300 text-sm leading-relaxed">
              Kupa e Botës FIFA 2026 do të jetë më e madhja në histori, me 48 ekipe që do të konkurrojnë 
              në 16 qytete në SHBA, Meksikë, dhe Kanada. Mos humb asnjë moment — shiko çdo ndeshje live në TV Vala!
            </p>
          </div>
        </div>

        {/* ─── Download App Section ────────────────── */}
        <div className="glass-card p-8 mb-10">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Download className="w-7 h-7 text-brand-pink-400" />
            Shkarko Aplikacionin TV Vala
          </h2>
          <p className="text-dark-400 mb-6">Shiko nga çdo pajisje. Shkarko aplikacionin TV Vala dhe përdor kredencialet për t'u kyçur.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <DownloadCard
              icon={<Tv className="w-6 h-6" />}
              platform="Android TV & Box"
              subtitle="Google Play Store"
              link="https://play.google.com/store/search?q=TV%20Vala&c=apps"
            />
            <DownloadCard
              icon={<Tablet className="w-6 h-6" />}
              platform="Android Tablet & Phone"
              subtitle="Google Play Store"
              link="https://play.google.com/store/search?q=TV%20Vala&c=apps"
            />
            <DownloadCard
              icon={<Tablet className="w-6 h-6" />}
              platform="iOS Tablet & Phone"
              subtitle="Apple App Store"
              link="https://apps.apple.com/us/app/tv-vala/id6463457795"
            />
            {/* 🔒 OTT URLs — real Telekom hosts hidden (example.com placeholders) */}
            <DownloadCard
              icon={<Monitor className="w-6 h-6" />}
              platform="Desktop"
              subtitle="ott.example.com"
              link="https://ott.example.com/login"
            />
            <DownloadCard
              icon={<Tv className="w-6 h-6" />}
              platform="TV Browser"
              subtitle="https://ott-tv.example.com/"
              link="https://ott-tv.example.com/"
            />
            <DownloadCard
              icon={<Tv className="w-6 h-6" />}
              platform="Samsung TV"
              subtitle="Samsung TV App Store"
              link="https://www.samsung.com/us/tvs/smart-tv/samsung-tv-apps/"
            />
            <DownloadCard
              icon={<Tv className="w-6 h-6" />}
              platform="LG TV"
              subtitle="LG Content Store"
              link="https://us.lgappstv.com/main/integrated/search?searchText=vala"
            />
          </div>
        </div>

        {/* ─── Contact / Support Section ───────────── */}
        <div className="glass-card p-8">
          <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
            <Phone className="w-7 h-7 text-brand-purple-400" />
            Kontakto
          </h2>
          <p className="text-dark-400 mb-6">Na kontakto për çdo pyetje ose ndihmë teknike.</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Phone */}
            <a
              href="tel:080010000"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/40 border border-dark-700/20 hover:border-brand-purple-500/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-purple-500/20 group-hover:shadow-brand-pink-500/20 transition-shadow flex-shrink-0">
                <Phone className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">Telefoni</p>
                <p className="text-dark-400 text-sm">0800 10 000</p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:info@kosovotelecom.com"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/40 border border-dark-700/20 hover:border-brand-purple-500/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-purple-500/20 group-hover:shadow-brand-pink-500/20 transition-shadow flex-shrink-0">
                <Mail className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">Email</p>
                <p className="text-dark-400 text-sm truncate">info@kosovotelecom.com</p>
              </div>
            </a>

            {/* Facebook */}
            <a
              href="https://www.facebook.com/valamobile"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/40 border border-dark-700/20 hover:border-brand-purple-500/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-purple-500/20 group-hover:shadow-brand-pink-500/20 transition-shadow flex-shrink-0">
                <img src={fbIcon} alt="Facebook" className="w-6 h-6 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">Facebook</p>
                <p className="text-dark-400 text-sm">@valamobile</p>
              </div>
              <ExternalLink className="w-4 h-4 text-dark-500 group-hover:text-brand-purple-400 transition-colors flex-shrink-0" />
            </a>

            {/* Instagram */}
            <a
              href="https://www.instagram.com/vala_mobile"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/40 border border-dark-700/20 hover:border-brand-purple-500/30 transition-all duration-300 group"
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-purple-500/20 group-hover:shadow-brand-pink-500/20 transition-shadow flex-shrink-0">
                <img src={instaIcon} alt="Instagram" className="w-6 h-6 object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold">Instagram</p>
                <p className="text-dark-400 text-sm">@vala_mobile</p>
              </div>
              <ExternalLink className="w-4 h-4 text-dark-500 group-hover:text-brand-purple-400 transition-colors flex-shrink-0" />
            </a>
          </div>
        </div>
      </div>
      {/* ─── Agreement Modal ──────────────────────── */}
      {showAgreement && (
        <AgreementModal
          onAccept={handleAgreementAccept}
          onClose={() => setShowAgreement(false)}
        />
      )}
      {/* Hidden TEB Payment Form — auto-submits to bank gateway */}
      <form ref={tebFormRef} method="post" action={tebGatewayUrl} style={{ display: 'none' }}>
        {Object.entries(tebFormParams).map(([key, value]) => (
          <input type="hidden" name={key} value={value} key={key} />
        ))}
      </form>
    </div>
  );
}

/* ─── Sub Components ──────────────────────── */

function DeviceRow({ icon, name, desc }) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-dark-800/40 border border-dark-700/20">
      <div className="w-8 h-8 rounded-lg bg-brand-purple-500/10 border border-brand-purple-500/20 flex items-center justify-center flex-shrink-0 text-brand-purple-400">
        {icon}
      </div>
      <div>
        <p className="text-white text-sm font-semibold">{name}</p>
        <p className="text-dark-400 text-xs">{desc}</p>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <span className="text-dark-400 text-sm flex-shrink-0">{label}</span>
      <span className="text-dark-200 text-sm font-medium text-right">
        {value}
      </span>
    </div>
  );
}

function StatCard({ value, label, subtitle }) {
  return (
    <div className="text-center p-4 rounded-xl bg-dark-800/40 border border-dark-700/20 hover:border-brand-purple-500/20 transition-colors">
      <p className="text-3xl font-black text-gradient mb-1">{value}</p>
      <p className="text-dark-300 text-sm font-medium">{label}</p>
      {subtitle && <p className="text-dark-500 text-xs mt-1">{subtitle}</p>}
    </div>
  );
}

function DownloadCard({ icon, platform, subtitle, link }) {
  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/40 border border-dark-700/20 hover:border-brand-purple-500/30 transition-all duration-300 group"
    >
      <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center shadow-lg shadow-brand-purple-500/20 group-hover:shadow-brand-pink-500/20 transition-shadow flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-white font-semibold">{platform}</p>
        <p className="text-dark-400 text-sm">{subtitle}</p>
      </div>
      <ExternalLink className="w-4 h-4 text-dark-500 group-hover:text-brand-purple-400 transition-colors" />
    </a>
  );
}
