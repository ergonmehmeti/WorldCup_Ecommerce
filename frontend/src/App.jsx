import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentFailed from './pages/PaymentFailed';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import AdminDashboard from './pages/AdminDashboard';

function AppRoutes() {
  const { isAuthenticated, isVerified, user } = useAuth();

  const homeRedirect = isAuthenticated
    ? (user?.role === 'admin' || user?.role === 'admin_operator' ? '/admin' : '/dashboard')
    : null;

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/"
        element={homeRedirect ? <Navigate to={homeRedirect} /> : <Landing />}
      />
      <Route
        path="/login"
        element={homeRedirect ? <Navigate to={homeRedirect} /> : <Login />}
      />
      <Route
        path="/signup"
        element={homeRedirect ? <Navigate to={homeRedirect} /> : <SignUp />}
      />

      {/* Auth Required */}
      <Route
        path="/verify-email"
        element={
          <ProtectedRoute>
            <VerifyEmail />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireVerified>
            <Dashboard />
          </ProtectedRoute>
        }
      />

      {/* Payment Pages */}
      {/* Password Reset */}
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      {/* Admin */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute requireAdmin>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />

      {/* Payment Pages */}
      <Route
        path="/payment-success"
        element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        }
      />
      <Route
        path="/payment-failed"
        element={
          <ProtectedRoute>
            <PaymentFailed />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Layout>
          <AppRoutes />
        </Layout>

        {/* Toast Notifications */}
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#1e293b',
              color: '#f8fafc',
              border: '1px solid rgba(124, 58, 237, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              fontSize: '14px',
            },
            success: {
              iconTheme: { primary: '#a855f7', secondary: '#fff' },
            },
            error: {
              iconTheme: { primary: '#ec4899', secondary: '#fff' },
            },
          }}
        />
      </AuthProvider>
    </Router>
  );
}
