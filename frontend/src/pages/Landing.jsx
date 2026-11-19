import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Phone, Mail } from 'lucide-react';
import { Trophy, Tv, Shield, CreditCard, Zap, Star, ArrowRight, Play } from 'lucide-react';
import fifaValaLogo from '../Logos/New Logos/fwversioniiperditsuariapplikacionitvalaboterori/fifa-vala-width-800.png';
import tvValaLogo from '../Logos/tv-vala-logo.png';
import phoneIcon from '../Logos/phone-icon.png';
import fbIcon from '../Logos/fb-icon.png';
import instaIcon from '../Logos/insta-icon.png';

export default function Landing() {
  const [showContact, setShowContact] = useState(false);

  return (
    <div className="relative">
      {/* ─── Hero Section ──────────────────────────────── */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-4">
        {/* Extra glow for hero */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-purple-600/15 rounded-full blur-[200px]" />

        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Official Broadcaster Badge */}
          <div className="mb-8 mt-8">
            <img src={fifaValaLogo} alt="FIFA World Cup 2026 x TVVala" className="h-24 sm:h-32 md:h-44 w-auto mx-auto" />
          </div>

          {/* Main Heading */}
          <h1 className="text-2xl sm:text-3xl md:text-3xl font-black leading-tight mb-8 flex flex-col items-center">
            {/* Inline row with vertical pink dividers */}
            <div className="flex flex-row items-center justify-center gap-3 flex-wrap">
              <span className="text-white hover:scale-105 transition-transform duration-300">Çdo Ndeshje</span>
              <span className="w-0.5 h-6 sm:h-7 bg-gradient-to-b from-brand-purple-500 to-brand-pink-500 rounded-full opacity-90 shadow-[0_0_10px_rgba(236,72,153,0.6)] inline-block"></span>
              <span className="text-white hover:scale-105 transition-transform duration-300">Çdo Gol</span>
              <span className="w-0.5 h-6 sm:h-7 bg-gradient-to-b from-brand-purple-500 to-brand-pink-500 rounded-full opacity-90 shadow-[0_0_10px_rgba(236,72,153,0.6)] inline-block"></span>
              <span className="text-white hover:scale-105 transition-transform duration-300">Çdo Moment</span>
            </div>

            {/* GB promo line */}
            <span className="text-gradient text-lg sm:text-xl md:text-2xl font-bold mt-3">Përfito 104 GB falas për Vala Sport 1 dhe Vala Sport 2</span>
            
            {/* Visual separator */}
            <span className="h-1.5 w-24 md:w-32 bg-gradient-to-r from-brand-purple-500 to-brand-pink-500 rounded-full my-6 opacity-90 shadow-[0_0_15px_rgba(236,72,153,0.5)]"></span>
            
            <span className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-wide mt-2">
              Live vetëm në <span className="text-gradient">TV Vala</span>
            </span>
          </h1>

          <p className="text-sm sm:text-base text-dark-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Shiko Kupën e Botës FIFA 2026<span style={{fontSize: '0.75em', display: 'inline-block', transform: 'rotate(-90deg)', verticalAlign: '0.3em', lineHeight: 1, marginLeft: '2px'}}>™</span> drejtpërdrejt nga çdo pajisje. 
            Një pagesë e vetme për qasje të plotë në çdo ndeshje.
          </p>

          {/* Offer deadline */}
          {/* <p className="text-lg sm:text-xl font-semibold text-white-400 mb-6 tracking-wide">
             Përfito nga oferta deri më <span className="text-white">01.06.2026</span>
          </p> */}

          {/* Product Cards */}
          <div className="flex flex-row items-center justify-center gap-3 mb-10">
            {/* ValaBoterori */}
            <div className="glass-card px-3 sm:px-6 py-5 glow-border w-44 sm:w-64 text-center">
              <p className="text-xs font-semibold tracking-tight sm:tracking-widest text-brand-purple-400 mb-2 break-words">ValaBoterori_FazaFinale</p>
              <div className="flex items-baseline justify-center gap-1 sm:gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-black text-gradient">€9.99</span>
              </div>
              <p className="text-xs sm:text-sm h-5"></p>
            </div>

            {/* ValaBoterori BIZ */}
            <div className="glass-card px-3 sm:px-6 py-5 glow-border w-44 sm:w-64 text-center">
              <p className="text-xs font-semibold tracking-tight sm:tracking-widest text-brand-purple-400 mb-2 break-words">ValaBoterori + Pakot Mobile</p>
              <div className="flex items-baseline justify-center gap-1 sm:gap-2 mb-2">
                <span className="text-2xl sm:text-3xl font-black text-gradient">€19.99</span>
              </div>
              <p className="text-xs sm:text-sm"><span className="font-bold text-gradient tracking-tight sm:tracking-wide">XXL • XL • L • M • S</span></p>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/signup"
              className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold btn-gradient"
            >
              <Play className="w-5 h-5" />
              Fillo Tani
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link
              to="/login"
              className="flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-medium text-dark-200 border border-dark-600/50 hover:border-brand-purple-500/50 hover:text-white transition-all duration-300"
            >
              Ke tashmë një llogari? Kyçu
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Features Section ──────────────────────────── */}
      <section className="relative py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Pse <span className="text-gradient">TV Vala</span>?
            </h2>
            <p className="text-dark-400 text-lg max-w-xl mx-auto">
              Gjithçka që ju nevojitet për të shijuar ngjarjen më të madhe të futbollit në botë.            
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <FeatureCard
              icon={<Tv className="w-6 h-6" />}
              title="Pajisje të shumëfishta"
              description="Shiko në Android, iOS, Smart TV, ose në çfarëdo web browser-i."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="HD Streaming"
              description="Cilësi Full HD, me ndërprerje minimale."
            />
            <FeatureCard
              icon={<Shield className="w-6 h-6" />}
              title="Pagesë e sigurt"
              description="Siguri e nivelit bankar me verifikim 3D-Secure."
            />
            <FeatureCard
              icon={<CreditCard className="w-6 h-6" />}
              title="Një pagesë e vetme"
              description="Qasje e plotë ne TV Vala."
            />
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────── */}
      <section className="relative py-24 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
              Fillo të shikosh në <span className="text-gradient">3 Hapa të Thjeshtë</span>
            </h2>
          </div>

          <div className="space-y-6">
            <StepCard
              number="1"
              title="Krijo Llogarinë"
              description="Regjistrohu me emrin, emailin, dhe numrin e telefonit. Verifiko emailin me një kod të shpejtë."
            />
            <StepCard
              number="2"
              title="Paguaj njërën nga pakot"
              description="Bëj një pagesë të vetme të sigurt përmes partnerit tonë bankar. Pa tarifa të fshehura."
            />
            <StepCard
              number="3"
              title="Merr kredencialet dhe shiko ndeshjet"
              description="Merr menjëherë kredencialet e aplikacionit stream. Shkarko aplikacionin TV Vala dhe shijo çdo ndeshje!"
            />
          </div>

          <div className="text-center mt-12">
            <Link
              to="/signup"
              className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold btn-gradient"
            >
              <Trophy className="w-5 h-5" />
              Shiko Tani 
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────── */}
      <footer className="border-t border-dark-800/50 py-8 px-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <Link to="/" className="flex-shrink-0">
            <img src={tvValaLogo} alt="TVVala" className="h-8 w-auto" />
          </Link>
          <p className="text-dark-500 text-sm text-center">
            © 2026 Telekomi i Kosoves. Të gjitha të drejtat e rezervuara.
          </p>
          <div className="flex items-center gap-4 flex-shrink-0">
            <button onClick={() => setShowContact(true)}>
              <img src={phoneIcon} alt="Phone" className="h-5 w-auto opacity-60 hover:opacity-100 transition-opacity" />
            </button>
            <a href="https://www.facebook.com/valamobile" target="_blank" rel="noopener noreferrer">
              <img src={fbIcon} alt="Facebook" className="h-5 w-auto opacity-60 hover:opacity-100 transition-opacity" />
            </a>
            <a href="https://www.instagram.com/vala_mobile" target="_blank" rel="noopener noreferrer">
              <img src={instaIcon} alt="Instagram" className="h-5 w-auto opacity-60 hover:opacity-100 transition-opacity" />
            </a>
          </div>
        </div>
      </footer>

      {/* ─── Contact Popup ─────────────────────────────── */}
      {showContact && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowContact(false)} />
          <div className="relative glass-card p-8 w-full max-w-sm animate-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowContact(false)}
              className="absolute top-4 right-4 w-7 h-7 rounded-full bg-dark-800 border border-dark-600 flex items-center justify-center hover:bg-dark-700 transition-colors"
            >
              <X className="w-4 h-4 text-dark-300" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6">Na Kontaktoni</h3>
            <div className="space-y-4">
              <a
                href="tel:080010000"
                className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/60 border border-dark-700/30 hover:border-brand-purple-500/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-purple-500/10 border border-brand-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-5 h-5 text-brand-purple-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-xs uppercase tracking-wider mb-0.5">Telefoni</p>
                  <p className="text-white font-semibold">0800 10 000</p>
                </div>
              </a>
              <a
                href="mailto:info@kosovotelecom.com"
                className="flex items-center gap-4 p-4 rounded-xl bg-dark-800/60 border border-dark-700/30 hover:border-brand-purple-500/30 transition-colors group"
              >
                <div className="w-10 h-10 rounded-xl bg-brand-purple-500/10 border border-brand-purple-500/20 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-5 h-5 text-brand-purple-400" />
                </div>
                <div>
                  <p className="text-dark-400 text-xs uppercase tracking-wider mb-0.5">Email</p>
                  <p className="text-white font-semibold">info@kosovotelecom.com</p>
                </div>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FeatureCard({ icon, title, description }) {
  return (
    <div className="glass-card p-6 hover:border-brand-purple-500/30 transition-all duration-300 group">
      <div className="w-12 h-12 rounded-xl bg-gradient-brand flex items-center justify-center mb-4 shadow-lg shadow-brand-purple-500/20 group-hover:shadow-brand-pink-500/25 transition-shadow">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({ number, title, description }) {
  return (
    <div className="flex items-start gap-6 glass-card p-6 hover:border-brand-purple-500/30 transition-all duration-300">
      <div className="flex-shrink-0 w-12 h-12 rounded-full bg-gradient-brand flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-brand-purple-500/20">
        {number}
      </div>
      <div>
        <h3 className="text-lg font-semibold text-white mb-1">{title}</h3>
        <p className="text-dark-400 text-sm leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
