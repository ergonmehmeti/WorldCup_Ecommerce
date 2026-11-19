import { useState, useRef, useEffect } from 'react';
import { X, ScrollText, CheckCircle } from 'lucide-react';

const AGREEMENT_TEXT = `Kushtet e Përdorimit për ValaBoterori

Duke klikuar "Pajtohem", ju konfirmoni se keni lexuar dhe kuptuar këto Kushte të Përdorimit dhe pranoni të jeni ligjërisht të detyruar nga to. Këto kushte përbëjnë një marrëveshje të vlefshme dhe të detyrueshme ndërmjet jush dhe Telekomit të Kosovës Sh. A., e cila rregullon qasjen dhe përdorimin e shërbimit të transmetimit online të FIFA World Cup 2026:

• Ky shërbim është i disponueshëm vetëm brenda territorit të Republikës së Kosovës. Çdo tentativë për të anashkaluar teknologjinë tonë të geo-blocking (përmes VPN ose mjeteve të tjera) përbën shkelje të rëndë të kontratës;

• Përmbajtja audiovizuale ofrohet ekskluzivisht në gjuhën shqipe. Konsumatorit i ndalohet rreptësisht çdo lloj ri-përpunimi, editimi apo modifikimi i sinjalit, duke përfshirë përkthimin apo dublimin në gjuhë të tjera, shtimin e titrave të paautorizuar ose përdorimin e inteligjencës artificiale për të ndryshuar zërin apo imazhin;

• Produkti "ValaBoterori" përmes platformës TV Vala – mund të përdoret për qëllime personale dhe/ose biznesore, në varësi të pakos së përzgjedhur nga përdoruesi:

   I. Pako "ValaBoterori" është e dedikuar ekskluzivisht për përdorim personal dhe familjar, dhe nuk lejohet shfaqja e përmbajtjes në ambiente publike dhe/apo për qëllime komerciale;

   II. Pako "ValaBoterori_Biz" lejon përdorimin e shërbimit edhe për shfaqje në ambiente publike, si p.sh. në restorante, bare, sport bare dhe hapësira të tjera biznesore, në përputhje me të drejtat e transmetimit të siguruara nga Telekomi i Kosovës.

• Çdo përdorim i shërbimit jashtë kushteve të përcaktuara sipas pakos përkatëse, përfshirë shfaqjen publike pa posedimin e pakos përkatëse biznesore, është i ndaluar dhe përbën shkelje të të drejtave të transmetimit ("Public Viewing Rights"), të cilat janë subjekt i rregullave dhe licencimit nga FIFA.

• Konsumatori nuk ka të drejtë të ri-transmetojë, shpërndajë apo të vërë në dispozicion të palëve të treta asnjë pjesë të transmetimit. Çdo formë e piraterisë digjitale do të rezultojë në ndërprerje të menjëhershme të qasjes;

• Nëse përdorni funksionin e regjistrimit, përmbajtja nuk mund të kopjohet në pajisje të jashtme. Të gjitha regjistrimet do të fshihen automatikisht pas tridhjetë (30) ditësh nga transmetimi i parë ose pas përfundimit të periudhës së të drejtave;

• Të gjitha të drejtat e pronësisë intelektuale (logot, markat dhe sinjali "Basic Feed") i takojnë ekskluzivisht FIFA-s. Konsumatori nuk fiton asnjë të drejtë mbi këto marka;

• Telekomi i Kosovës Sh. A., rezervon të drejtën të ndërpresë qasjen tuaj në shërbim menjëherë dhe pa njoftim paraprak në rastet vijuese:
   a) Nëse konsumatori shkel ndonjë nga këto kushte (veçanërisht geo-blocking ose përdorimin publik në kundërshtim me pakon e përzgjedhur);
   b) Nëse FIFA ose Licensuesi pezullon ose ndërpret të drejtat e transmetimit për Telekomin e Kosovës Sh. A..

• Telekomi i Kosovës Sh. A., nuk mban përgjegjësi për dështimin ose ndërprerjen e shërbimit që rezulton nga rrethana jashtë kontrollit të tij, duke përfshirë por pa u kufizuar në:
   a) Dështime të lidhjeve satelitore, dështime teknike të sinjalit nga burimi, ose mungesë të energjisë elektrike;
   b) Veprime të FIFA-s për të pezulluar, anuluar apo ndryshuar orarin e ndeshjeve apo të gjithë turneut;
   c) Zjarre, vërshime, tërmete, epidemi, pandemi, trazira civile, akte terroriste ose gjendje lufte apo çfarëdo rrethane tjetër me ndikim global dhe jashtë ndikimit/kontrollit të njeriut;
   d) Në këto raste, konsumatori pranon se Telekomi i Kosovës Sh. A., nuk ka asnjë detyrim për kompensim për humbjet e mundshme.

• Telekomi i Kosovës Sh. A., në cilësinë e kontrolluesit, përpunon të dhënat tuaja personale në përputhje me Ligjin Nr. 06/L-082 për Mbrojtjen e të Dhënave Personale. Ne mbledhim dhe përpunojmë vetëm të dhënat e nevojshme për identifikimin tuaj si konsumator, me qëllim të ofrimit të qasjes në shërbim dhe përmbushjes së detyrimeve tona kontraktuale;

• Telekomi i Kosovës Sh. A., nuk mbledh, nuk ka qasje dhe nuk ruan asnjë të dhënë të llogarisë suaj bankare apo të kartelave të kreditit/debitit. Të gjitha këto të dhëna plotësohen drejtpërdrejt nga ju në platformën e bankës, e cila mban përgjegjësinë ekskluzive për sigurinë dhe përpunimin e këtyre të dhënave financiare;

• Telekomi i Kosovës Sh. A., rezervon të drejtën të ndryshojë këto Kushte të Përdorimit në çdo kohë. Versioni i përditësuar do të publikohet në platformë dhe do të hyjë në fuqi nga momenti i publikimit;

• Shkelja e këtyre kushteve të përdorimit mund të jetë subjekt i procedurave civile/penale sipas legjislacionit të aplikueshëm të Republikës së Kosovës.`;

const HIGHLIGHT_SECTION = `• Produkti "ValaBoterori" përmes platformës TV Vala – mund të përdoret për qëllime personale dhe/ose biznesore, në varësi të pakos së përzgjedhur nga përdoruesi:

   I. Pako "ValaBoterori" është e dedikuar ekskluzivisht për përdorim personal dhe familjar, dhe nuk lejohet shfaqja e përmbajtjes në ambiente publike dhe/apo për qëllime komerciale;

   II. Pako "ValaBoterori_Biz" lejon përdorimin e shërbimit edhe për shfaqje në ambiente publike, si p.sh. në restorante, bare, sport bare dhe hapësira të tjera biznesore, në përputhje me të drejtat e transmetimit të siguruara nga Telekomi i Kosovës.`;

export default function AgreementModal({ onAccept, onClose }) {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const scrollRef = useRef(null);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 10;
    if (atBottom) setHasScrolledToBottom(true);
  };

  // Also allow checking on mount in case text is short enough
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollHeight <= el.clientHeight) {
      setHasScrolledToBottom(true);
    }
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-dark-900 border border-dark-700/60 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-700/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-purple-600/20 border border-brand-purple-500/30 flex items-center justify-center">
              <ScrollText className="w-5 h-5 text-brand-purple-400" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base">Kushtet e Përdorimit</h2>
              <p className="text-dark-400 text-xs">Lexoni deri në fund për të vazhduar</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-dark-700/50 text-dark-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable content */}
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-5 text-dark-300 text-sm leading-relaxed whitespace-pre-wrap"
          style={{ overscrollBehavior: 'contain' }}
        >
          {AGREEMENT_TEXT.split(HIGHLIGHT_SECTION).map((part, i) => (
            i === 0 ? (
              <span key={i}>{part}</span>
            ) : (
              <span key={i}>
                <span className="block my-3 p-4 rounded-xl bg-brand-purple-600/10 border border-brand-purple-500/30 text-white font-medium">
                  {HIGHLIGHT_SECTION}
                </span>
                {part}
              </span>
            )
          ))}
        </div>

        {/* Scroll hint */}
        {!hasScrolledToBottom && (
          <div className="px-6 py-2 text-center shrink-0">
            <p className="text-dark-500 text-xs animate-pulse">↓ Lëvizni poshtë për të vazhduar</p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-5 border-t border-dark-700/50 shrink-0">
          {hasScrolledToBottom && (
            <div className="flex items-center gap-2 mb-4 text-green-400 text-sm">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>Keni lexuar Kushtet e Përdorimit</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-xl text-sm font-semibold bg-dark-700 hover:bg-dark-600 text-dark-300 hover:text-white transition-colors"
            >
              Anulo
            </button>
            <button
              onClick={onAccept}
              disabled={!hasScrolledToBottom}
              className="flex-1 py-3 rounded-xl text-sm font-semibold btn-gradient disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Pajtohem — Vazhdo me Pagesën
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
