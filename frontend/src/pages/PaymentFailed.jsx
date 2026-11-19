import { Link } from 'react-router-dom';
import { XCircle, ArrowRight } from 'lucide-react';

export default function PaymentFailed() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md text-center">
        {/* Red glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-red-500/10 rounded-full blur-[150px]" />

        <div className="relative glass-card p-10 glow-border">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-500/10 border-2 border-red-500/30 mb-6">
            <XCircle className="w-10 h-10 text-red-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">Pagesa Dështoi</h1>
          <p className="text-dark-300 mb-8 leading-relaxed">
            Pagesa juaj nuk u përfundua. Kjo mund të jetë për shkak të fondeve të pamjaftueshme, 
            një transaksioni të anuluar, ose një problemi të përkohshëm bankar. Asnjë tarifë nuk u debitua.
          </p>

          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold btn-gradient"
          >
            Vazhdo tek Faqja Kryesore
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
