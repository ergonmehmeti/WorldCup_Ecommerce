import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { User, Mail, Lock, Phone, Trophy, ArrowRight, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';

export default function SignUp() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '+383',
    password: '',
    confirmPassword: '',
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      // Always keep "+" prefix, allow only digits after it
      const digits = value.replace(/[^\d]/g, '');
      setFormData({ ...formData, phone: '+' + digits });
      return;
    }
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Name validation — only letters (including Albanian ë, ç), spaces, hyphens, apostrophes
    const nameRegex = /^[\p{L}\p{M}'\-\. ]{2,50}$/u;
    if (!nameRegex.test(formData.firstName.trim())) {
      toast.error('Emri duhet të përmbajë vetëm shkronja (2–50 karaktere).');
      return;
    }
    if (!nameRegex.test(formData.lastName.trim())) {
      toast.error('Mbiemri duhet të përmbajë vetëm shkronja (2–50 karaktere).');
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error('Fjalëkalimet nuk përputhen.');
      return;
    }

    if (formData.password.length < 8) {
      toast.error('Fjalëkalimi duhet të ketë të paktën 8 karaktere.');
      return;
    }

    setLoading(true);
    try {
      await signup({
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      toast.success('Llogaria u krijua! Kontrolloni emailin tuaj për kodin e verifikimit.');
      navigate('/verify-email');
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center px-4 py-12">
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-brand-pink-600/8 rounded-full blur-[180px]" />

      <div className="relative w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-brand shadow-lg shadow-brand-purple-500/30 mb-4">
            <Trophy className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Krijo Llogarinë</h1>
          <p className="text-dark-400">Bashkohu me TV Vala dhe mos humbit asnjë ndeshje të Kupës së Botës</p>
        </div>

        {/* Form Card */}
        <div className="glass-card p-8 glow-border">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name Row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Emri</label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="Emri"
                    required
                    className="input-field pl-11 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">Mbiemri</label>
                <input
                  type="text"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleChange}
                  placeholder="Mbiemri"
                  required
                  className="input-field text-sm"
                />
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Emaili</label>
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

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Numri i Telefonit</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+383"
                  required
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Fjalëkalimi</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Min. 8 karaktere"
                  required
                  minLength={6}
                  className="input-field pl-11 pr-11"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">Konfirmo Fjalëkalimin</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-dark-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Përsërit fjalëkalimin"
                  required
                  minLength={6}
                  className="input-field pl-11"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-base font-semibold btn-gradient disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Krijo Llogarinë
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-dark-400 text-sm mt-6">
          Keni tashmë një llogari?{' '}
          <Link to="/login" className="text-brand-purple-400 hover:text-brand-purple-300 font-medium transition-colors">
            Kyçu
          </Link>
        </p>
      </div>
    </div>
  );
}
