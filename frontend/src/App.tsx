import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';

// ── Error Boundary ──────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false, message: '' };
  }
  static getDerivedStateFromError(error: any) {
    return { hasError: true, message: error?.message || 'Error desconocido' };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen text-center p-8 bg-slate-50">
          <p className="text-4xl mb-4">⚠️</p>
          <h2 className="text-lg font-bold text-slate-800 mb-2">Ocurrió un error en la aplicación</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-sm">{this.state.message}</p>
          <button
            onClick={() => { this.setState({ hasError: false, message: '' }); window.location.href = '/'; }}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Volver al inicio
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
// ────────────────────────────────────────────────────────────────────────────


// Lazy load views
const Login = React.lazy(() => import('./views/auth/Login'));
const Register = React.lazy(() => import('./views/auth/Register'));
const Dashboard = React.lazy(() => import('./views/dashboard/Dashboard'));
const Accounts = React.lazy(() => import('./views/accounts/Accounts'));
const Cards = React.lazy(() => import('./views/cards/Cards'));
const Transactions = React.lazy(() => import('./views/transactions/Transactions'));
const Presupuestos = React.lazy(() => import('./views/budgets/Presupuestos'));
const UserApprovals = React.lazy(() => import('./views/admin/UserApprovals'));
const AppLayout = React.lazy(() => import('./components/layout/AppLayout'));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <React.Suspense fallback={<div className="flex h-screen w-screen items-center justify-center"><div className="w-6 h-6 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" /></div>}>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }>
              <Route index element={<ErrorBoundary><Dashboard /></ErrorBoundary>} />
              <Route path="accounts" element={<ErrorBoundary><Accounts /></ErrorBoundary>} />
              <Route path="cards" element={<ErrorBoundary><Cards /></ErrorBoundary>} />
              <Route path="transactions" element={<ErrorBoundary><Transactions /></ErrorBoundary>} />
              <Route path="budgets" element={<ErrorBoundary><Presupuestos /></ErrorBoundary>} />
              <Route path="admin/users" element={<ErrorBoundary><UserApprovals /></ErrorBoundary>} />
            </Route>

            {/* Fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </React.Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
}


export default App;
