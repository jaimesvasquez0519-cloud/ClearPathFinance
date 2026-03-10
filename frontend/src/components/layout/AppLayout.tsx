import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, CreditCard, Wallet, List, LogOut, Target, Users } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useEffect } from 'react';
import api from '../../utils/api';

const AppLayout = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Auto-seed categories silently on first load
  useEffect(() => {
    api.post('/categories/seed').catch(() => {
      // Silently ignore - categories may already exist
    });
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Resumen', path: '/', icon: LayoutDashboard },
    { name: 'Cuentas', path: '/accounts', icon: Wallet },
    { name: 'Tarjetas', path: '/cards', icon: CreditCard },
    { name: 'Transacciones', path: '/transactions', icon: List },
    { name: 'Presupuestos', path: '/budgets', icon: Target },
  ];

  if (user?.role === 'admin') {
    navItems.push({ name: 'Usuarios', path: '/admin/users', icon: Users });
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col">
        <div className="p-6">
          <h1 className="text-2xl font-bold text-primary">Control de Finanzas</h1>
        </div>
        
        <nav className="flex-1 px-4 space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-primary/10 text-primary font-medium' 
                    : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                <Icon size={20} />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="mb-4 px-4 text-sm">
            <p className="font-medium text-slate-800">{user?.fullName}</p>
            <p className="text-slate-500 truncate">{user?.email}</p>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut size={20} />
            Cerrar sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="bg-white border-b border-slate-200 p-4 md:hidden flex justify-between items-center">
           <h1 className="text-xl font-bold text-primary">Control de Finanzas</h1>
           <button onClick={handleLogout} className="p-2 text-slate-600">
             <LogOut size={20} />
           </button>
        </header>

        <div className="flex-1 overflow-auto p-4 md:p-8">
          <Outlet />
        </div>

        {/* Mobile Bottom Nav */}
        <nav className="bg-white border-t border-slate-200 flex justify-around p-3 md:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex flex-col items-center p-2 rounded-lg ${
                  isActive ? 'text-primary' : 'text-slate-500'
                }`}
              >
                <Icon size={24} />
                <span className="text-[10px] mt-1 font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </main>
    </div>
  );
};

export default AppLayout;
