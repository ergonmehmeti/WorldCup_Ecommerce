import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, RefreshCw, ArrowRight, CheckCircle, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const { user, verifyEmail, resendCode, isVerified } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRefs = useRef([]);

  // If already verified, redirect to dashboard
  useEffect(() => {
    if (isVerified) {
      navigate('/dashboard');
    }
  }, [isVerified, navigate]);

  // Cooldown timer for resend
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleChange = (index, value) => {
    // Only allow digits
    if (value && !/^\d+$/.test(value)) return;

    const newCode = [...code];

    // Handle paste
    if (value.length > 1) {
      const digits = value.split('').filter((c) => /\d/.test(c)).slice(0, 6);
      digits.forEach((digit, i) => {
        if (i + index < 6) newCode[i + index] = digit;
      });
      setCode(newCode);
      const nextIndex = Math.min(index + digits.length, 5);
      inputRefs.current[nextIndex]?.focus();
      return;
    }

    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const fullCode = code.join('');
    if (fullCode.length !== 6) {
      toast.error('Ju lutem shkruani kodin e plotë 6-shifror.');
      return;
    }

    setLoading(true);
    try {
      await verifyEmail(fullCode);
      toast.success('Emaili u verifikua! Mirë se vini në Vala Botërori! 🏆');
      navigate('/dashboard');
    } catch (error) {
      toast.error(error.message);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setResending(true);
    try {
      await resendCode();
      toast.success('Kodi i ri u dërgua në emailin tuaj!');
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-purple-600/10 rounded-full blur-[180px]" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand shadow-lg shadow-brand-purple-500/30 mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Verifiko Emailin</h1>
          <p className="text-dark-400">
            Ju dërguam një kod 6-shifror në{' '}
            <span className="text-brand-purple-400 font-medium">{user?.email}</span>
          </p>
          <div className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0" />
            <p className="text-yellow-300 text-sm">
              Nëse nuk keni pranuar emailin, kontrolloni tek <span className="font-semibold">Spam</span> ose <span className="font-semibold">Junk</span>.
            </p>
          </div>
        </div>

        {/* Code Input Card */}
        <div className="glass-card p-8 glow-border">
          <form onSubmit={handleSubmit}>
            {/* 6 Code Inputs */}
            <div className="flex justify-center gap-3 mb-8">
              {code.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-14 rounded-xl bg-dark-800/80 border border-dark-600/50 text-center text-xl font-bold text-white 
                             focus:outline-none focus:ring-2 focus:ring-brand-purple-500/50 focus:border-brand-purple-500 
                             transition-all duration-200"
                />
              ))}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || code.join('').length !== 6}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Verifiko Emailin
                </>
              )}
            </button>
          </form>

          {/* Resend */}
          <div className="mt-6 text-center">
            <p className="text-dark-500 text-sm mb-2">Nuk ke pranuar kodin?</p>
            <button
              onClick={handleResend}
              disabled={resending || resendCooldown > 0}
              className="inline-flex items-center gap-2 text-brand-purple-400 hover:text-brand-purple-300 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <RefreshCw className={`w-4 h-4 ${resending ? 'animate-spin' : ''}`} />
              {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Ridergo Kodin'}
            </button>
          </div>
        </div>
        


      </div>
    </div>
  );
}
