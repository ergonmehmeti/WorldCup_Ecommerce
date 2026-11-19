import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, Trophy, ArrowRight, Eye, EyeOff, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginError, setLoginError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    setLoginError(null);
    try {
      const data = await login(formData.email, formData.password);

      toast.success(`Mirë se u kthyet, ${data.user.firstName}!`);

      // Redirect based on status
      if (!data.user.emailVerified) {
        navigate('/verify-email');
      } else {
        navigate('/dashboard');
      }
    } catch (error) {
      if (error.message.includes('No account found')) {
        setLoginError('no_account');
      } else {
        setLoginError(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      {/* Background accent */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-purple-600/10 rounded-full blur-[180px]" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand shadow-lg shadow-brand-purple-500/30 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Kyçu në Llogarinë Tënde</h1>
      
        </div>

        {/* Error Banner — no account */}
        {loginError === 'no_account' && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex flex-col gap-3">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">Ju nuk keni një Llogari të Krijuar</p>
            </div>
            <Link
              to="/signup"
              className="w-full text-center py-2.5 rounded-xl text-sm font-semibold bg-brand-purple-600 hover:bg-brand-purple-500 text-white transition-colors"
            >
              Krijo Llogarinë
            </Link>
          </div>
        )}

        {/* Error — wrong password or other */}
        {loginError && loginError !== 'no_account' && (
          <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300 text-sm">{loginError}</p>
          </div>
        )}

        {/* Form Card */}
        <div className="glass-card p-8 glow-border">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="email@shembull.com"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-dark-300">Password</label>
                <Link
                  to="/forgot-password"
                  className="text-xs text-brand-purple-400 hover:text-brand-purple-300 transition-colors"
                >
                  Keni harruar fjalëkalimin?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Kyçu
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-dark-400 text-sm mt-6">
          Nuk ke Llogari?{' '}
          <Link to="/signup" className="text-brand-purple-400 hover:text-brand-purple-300 font-medium transition-colors">
            Regjistrohu
          </Link>
        </p>
      </div>
    </div>
  );
}
