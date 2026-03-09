import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Trash2 } from 'lucide-react';
import NuevaTransaccionModal from '../../components/modals/NuevaTransaccionModal';

const Transactions = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const { data: transactions, isLoading } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
    },
    onError: () => {
      alert('Error al eliminar la transacción');
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta transacción? Esta acción revertirá el saldo correspondiente y no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div>Cargando transacciones...</div>;

  return (
    <div className="space-y-6">
      {showModal && <NuevaTransaccionModal onClose={() => setShowModal(false)} />}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Transacciones</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Nueva Transacción
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Fecha</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Descripción</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Categoría</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Cuenta / Tarjeta</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs text-right">Monto</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {[...(transactions || [])]
                .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .map((t: any) => (
                <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {new Date(t.transactionDate).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                    {t.description || '-'}
                  </td>
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                      {t.category?.name || 'Sin categoría'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-slate-500 font-medium whitespace-break-spaces">
                    {t.account ? t.account.bankName : t.creditCard ? `${t.creditCard.bankName} (••••${t.creditCard.lastFourDigits || t.creditCard.id.slice(0,4)})` : 'Desconocida'}
                  </td>
                  <td className={`px-6 py-4 text-right font-bold tracking-tight ${t.type === 'income' ? 'text-slate-900' : 'text-slate-500'}`}>
                    {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Eliminar Transacción"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {transactions?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">
                    No hay transacciones registradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
