import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, ShieldCheck } from 'lucide-react';
import tvValaLogo from '../Logos/tv-vala-logo.png';
import fifaWideLogo from '../Logos/New Logos/fwversioniiperditsuariapplikacionitvalaboterori/fifa-wide-height-20.png';

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-dark-700/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={isAuthenticated ? '/dashboard' : '/'} className="flex items-center gap-2 group">
            <img src={tvValaLogo} alt="ValaTV" className="h-9 w-auto" />
            <img src={fifaWideLogo} alt="FIFA World Cup 2026" className="h-5 w-auto hidden sm:block" />
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark-800/50 border border-dark-700/30 hover:border-brand-purple-500/40 hover:bg-dark-800/80 transition-all duration-200"
                >
                  <User className="w-4 h-4 text-brand-purple-400" />
                  <span className="text-sm text-dark-200">
                    {user?.firstName} {user?.lastName}
                  </span>
                </Link>
                {(user?.role === 'admin' || user?.role === 'admin_operator') && (
                  <Link
                    to="/admin"
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-purple-400 hover:text-purple-300 hover:bg-dark-800/80 transition-all duration-200"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-sm hidden sm:block">Admin</span>
                  </Link>
                )}
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg text-dark-400 hover:text-white hover:bg-dark-800/80 transition-all duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm hidden sm:block">Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="px-4 py-2 rounded-lg text-sm font-medium text-dark-200 hover:text-white hover:bg-dark-800/80 transition-all duration-200"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  className="px-4 py-2 rounded-xl text-sm font-semibold btn-gradient"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
