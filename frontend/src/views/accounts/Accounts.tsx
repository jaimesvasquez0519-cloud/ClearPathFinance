import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Wallet, Pencil } from 'lucide-react';
import NuevaCuentaModal from '../../components/modals/NuevaCuentaModal';
import EditarCuentaModal from '../../components/modals/EditarCuentaModal';

const typeLabels: Record<string, string> = {
  checking: 'Corriente',
  savings: 'Ahorros',
  investment: 'Inversión',
  cash: 'Efectivo',
};

const Accounts = () => {
  const [showNewModal, setShowNewModal] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data;
    }
  });

  if (isLoading) return <div>Cargando cuentas...</div>;

  return (
    <div className="space-y-6">
      {showNewModal && <NuevaCuentaModal onClose={() => setShowNewModal(false)} />}
      {editingAccount && <EditarCuentaModal account={editingAccount} onClose={() => setEditingAccount(null)} />}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Cuentas Bancarias</h2>
        <button
          onClick={() => setShowNewModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Agregar Cuenta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {accounts?.map((acc: any) => (
          <div
            key={acc.id}
            className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-slate-200/60 flex flex-col justify-between h-44 hover:shadow-md transition-shadow group relative"
          >
            {/* Edit button */}
            <button
              onClick={() => setEditingAccount(acc)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-300 hover:text-primary hover:bg-slate-100 transition-colors opacity-0 group-hover:opacity-100"
              title="Editar cuenta"
            >
              <Pencil size={14} />
            </button>

            <div>
              <div className="flex justify-between items-start pr-8">
                <h3 className="font-bold text-slate-800 group-hover:text-primary transition-colors">{acc.bankName}</h3>
                <span className="text-[10px] uppercase tracking-wider font-bold px-2.5 py-1 bg-slate-100/80 text-slate-500 rounded-md border border-slate-200/50">
                  {typeLabels[acc.accountType] || acc.accountType}
                </span>
              </div>
              {acc.accountNumber && (
                <p className="text-sm font-medium text-slate-400 mt-1.5 tracking-wide">•••• {acc.accountNumber.slice(-4)}</p>
              )}
            </div>
            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Saldo</p>
              <p className="text-2xl font-extrabold text-slate-900 tracking-tight">
                ${Number(acc.currentBalance).toLocaleString('es-CO', { minimumFractionDigits: 0 })}
                <span className="text-sm font-semibold text-slate-400 ml-1">{acc.currency}</span>
              </p>
            </div>
          </div>
        ))}
        {accounts?.length === 0 && (
          <div className="col-span-1 md:col-span-2 lg:col-span-3 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400">
            <Wallet size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-slate-600">No tienes cuentas bancarias registradas</p>
            <p className="text-sm mt-1">Haz clic en "Agregar Cuenta" para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Accounts;
