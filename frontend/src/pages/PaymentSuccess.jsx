import { useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function PaymentSuccess() {
  useEffect(() => {
    // Full page reload ensures fresh JS bundle + fresh auth state from server.
    // Add ?fromPayment=1 so Dashboard knows to poll for credentials.
    const timer = setTimeout(() => {
      window.location.href = '/dashboard?fromPayment=1';
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-md text-center">
        {/* Success glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-green-500/10 rounded-full blur-[150px]" />

        <div className="relative glass-card p-10 glow-border">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/30 mb-6">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>

          <h1 className="text-3xl font-bold text-white mb-3">Pagesa u krye me sukses! 🎉</h1>
          <p className="text-dark-300 mb-8 leading-relaxed">
            Kredencialet për aktivizimin e ValaTV do ju dërgohen me Email, 
            si dhe do të shfaqen tek të dhënat e llogarisë (posa llogaria të aktivizohet).
          </p>

          <p className="text-dark-500 text-sm">Duke u ridrejtuar te faqja kryesore...</p>
        </div>
      </div>
    </div>
  );
}
