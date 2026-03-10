import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Trash2, Pause, Play } from 'lucide-react';
import NuevaTransaccionModal from '../../components/modals/NuevaTransaccionModal';

const Transactions = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'recurring'>('history');

  const { data: transactions, isLoading: isLoadingTx } = useQuery({
    queryKey: ['transactions'],
    queryFn: async () => {
      const res = await api.get('/transactions');
      return res.data;
    }
  });

  const { data: recurring, isLoading: isLoadingRec } = useQuery({
    queryKey: ['recurringTransactions'],
    queryFn: async () => {
      const res = await api.get('/recurring');
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

  const deleteRecurringMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/recurring/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
    },
    onError: () => {
      alert('Error al eliminar la suscripción');
    }
  });

  const toggleRecurringMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => api.put(`/recurring/${id}`, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recurringTransactions'] });
    },
    onError: () => {
      alert('Error al actualizar la suscripción');
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta transacción? Esta acción revertirá el saldo correspondiente y no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleDeleteRecurring = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas cancelar esta suscripción? No se generarán más cobros automáticos.')) {
      deleteRecurringMutation.mutate(id);
    }
  };

  const handleToggleRecurring = (id: string, currentStatus: boolean) => {
      toggleRecurringMutation.mutate({ id, isActive: !currentStatus });
  };

  if (isLoadingTx || isLoadingRec) return <div>Cargando...</div>;

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

      <div className="flex gap-4 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('history')}
          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'history'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Historial
        </button>
        <button
          onClick={() => setActiveTab('recurring')}
          className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
            activeTab === 'recurring'
              ? 'border-primary text-primary'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          Suscripciones / Recurrentes
        </button>
      </div>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          {activeTab === 'history' ? (
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
          ) : (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200/60">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Descripción</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Categoría</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Cuenta / Tarjeta</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Frecuencia</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Día</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Próximo Cobro</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs text-right">Monto</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs text-center">Estado</th>
                  <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/80">
                {[...(recurring || [])].map((r: any) => (
                  <tr key={r.id} className={`transition-colors group ${r.isActive ? 'hover:bg-slate-50/50' : 'bg-slate-50/50 opacity-75'}`}>
                    <td className="px-6 py-4 font-semibold text-slate-800">
                      {r.description || '-'}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                        {r.category?.name || 'Sin categoría'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium whitespace-break-spaces">
                      {r.account ? r.account.bankName : r.creditCard ? `${r.creditCard.bankName} (••••${r.creditCard.lastFourDigits || r.creditCard.id.slice(0,4)})` : 'Desconocida'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium capitalize">
                      {r.frequency === 'monthly' ? 'Mensual' : r.frequency === 'weekly' ? 'Semanal' : 'Anual'}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {r.dayOfMonth}
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                       {r.isActive ? new Date(r.nextProcessing).toLocaleDateString('es-CO') : '-'}
                    </td>
                    <td className={`px-6 py-4 text-right font-bold tracking-tight ${r.type === 'income' ? 'text-slate-900' : 'text-slate-500'}`}>
                      {r.type === 'income' ? '+' : '-'}${Number(r.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${r.isActive ? 'bg-green-100 text-green-700' : 'bg-slate-200 text-slate-600'}`}>
                        {r.isActive ? 'Activo' : 'Pausado'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center flex justify-center gap-2">
                      <button 
                        onClick={() => handleToggleRecurring(r.id, r.isActive)}
                        className={`p-1.5 rounded-lg transition-colors ${r.isActive ? 'text-amber-500 hover:bg-amber-50' : 'text-green-500 hover:bg-green-50'}`}
                        title={r.isActive ? 'Pausar' : 'Reanudar'}
                      >
                        {r.isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <button 
                        onClick={() => handleDeleteRecurring(r.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Eliminar Suscripción"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
                {recurring?.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400 italic">
                      No hay suscripciones o cobros recurrentes registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default Transactions;
