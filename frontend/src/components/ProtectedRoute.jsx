import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, requireVerified = false, requireAdmin = false }) {
  const { isAuthenticated, isVerified, loading, user } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-brand-purple-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-dark-400 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requireVerified && !isVerified) {
    return <Navigate to="/verify-email" replace />;
  }

  if (requireAdmin && user?.role !== 'admin' && user?.role !== 'admin_operator') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
