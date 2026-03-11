import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { Trash2, Pause, Play, Zap, ChevronDown, ChevronUp, TableProperties } from 'lucide-react';
import NuevaTransaccionModal from '../../components/modals/NuevaTransaccionModal';

const fmtCOP = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const Transactions = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'history' | 'recurring'>('history');
  
  // Extra Payment State
  const [extraPaymentTx, setExtraPaymentTx] = useState<any>(null);
  const [extraAmount, setExtraAmount] = useState('');
  const [preference, setPreference] = useState<'reduce_installments' | 'reduce_payment'>('reduce_installments');
  const [expandedAmortizationId, setExpandedAmortizationId] = useState<string | null>(null);

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

  const extraPaymentMutation = useMutation({
    mutationFn: (data: any) => api.post('/transactions/extraordinary-payment', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      setExtraPaymentTx(null);
      setExtraAmount('');
      alert('Abono procesado exitosamente.');
    },
    onError: (err: any) => {
      alert(err.response?.data?.error || 'Error al procesar el abono');
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

  const handleExtraPayment = () => {
    if (extraPaymentTx && Number(extraAmount) > 0) {
      extraPaymentMutation.mutate({
        transactionId: extraPaymentTx.id,
        extraAmount: Number(extraAmount),
        preference
      });
    }
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
                .map((t: any) => {
                  const hasAmortization = t.isDeferred && t.installmentsTotal > 1 && Array.isArray(t.amortizationSchedule) && t.amortizationSchedule.length > 0;
                  const isExpanded = expandedAmortizationId === t.id;
                  return (
                    <>
                      <tr key={t.id} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-4 text-slate-500 font-medium">
                          {new Date(t.transactionDate).toLocaleDateString('es-CO')}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-800 group-hover:text-slate-900 transition-colors">
                          <div className="flex items-center gap-2">
                            {t.description || '-'}
                            {hasAmortization && (
                              <span className="text-[10px] font-bold tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-full uppercase">
                                {t.installmentsTotal} Cuotas
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200/60">
                            {t.category?.name || 'Sin categoría'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-slate-500 font-medium whitespace-break-spaces">
                          {t.account ? t.account.bankName : t.creditCard ? `${t.creditCard.bankName} (••••${t.creditCard.lastFourDigits || t.creditCard.id.slice(0,4)})` : 'Desconocida'}
                        </td>
                        <td className={`px-6 py-4 text-right font-bold tracking-tight ${t.type === 'income' ? 'text-emerald-600' : t.isDeferred ? 'text-indigo-600' : 'text-slate-500'}`}>
                          {t.type === 'income' ? '+' : '-'}${Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-center">
                          {hasAmortization && (
                            <>
                              <button
                                onClick={() => setExpandedAmortizationId(isExpanded ? null : t.id)}
                                className="p-1.5 text-violet-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors mr-1"
                                title="Ver proyección de cuotas"
                              >
                                <TableProperties size={16} />
                                {isExpanded ? <ChevronUp size={10} className="inline" /> : <ChevronDown size={10} className="inline" />}
                              </button>
                              <button 
                                onClick={() => setExtraPaymentTx(t)}
                                className="p-1.5 text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors mr-1"
                                title="Abono Extraordinario"
                              >
                                <Zap size={16} />
                              </button>
                            </>
                          )}
                          <button 
                            onClick={() => handleDelete(t.id)}
                            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar Transacción"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                      {/* AMORTIZATION TABLE EXPANDED ROW */}
                      {hasAmortization && isExpanded && (
                        <tr key={`amort-${t.id}`} className="bg-indigo-50/40">
                          <td colSpan={6} className="px-6 py-4">
                            <div className="text-xs font-bold text-indigo-700 mb-3 flex items-center gap-2">
                              <TableProperties size={14} />
                              Proyección de Cuotas — {t.description}
                              <span className="ml-auto font-medium text-indigo-500">Tasa: {t.installmentInterestRate || 0}% mensual</span>
                            </div>
                            <div className="overflow-x-auto rounded-xl border border-indigo-200/60">
                              <table className="w-full text-xs">
                                <thead className="bg-indigo-100/60">
                                  <tr>
                                    <th className="px-3 py-2 text-left font-bold text-indigo-700">#</th>
                                    <th className="px-3 py-2 text-right font-bold text-indigo-700">Cuota Total</th>
                                    <th className="px-3 py-2 text-right font-bold text-indigo-700">Abono Capital</th>
                                    <th className="px-3 py-2 text-right font-bold text-indigo-700">Intereses</th>
                                    <th className="px-3 py-2 text-right font-bold text-indigo-700">Saldo</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-indigo-100/60">
                                  {(t.amortizationSchedule as any[]).map((row: any, idx: number) => {
                                    const isPast = row.installment < (t.installmentCurrent || 1);
                                    return (
                                      <tr key={idx} className={`${isPast ? 'opacity-40 line-through' : ''} hover:bg-indigo-50 transition-colors`}>
                                        <td className="px-3 py-2 font-bold text-indigo-600">{row.installment}</td>
                                        <td className="px-3 py-2 text-right font-semibold text-slate-700">{fmtCOP(Number(row.payment))}</td>
                                        <td className="px-3 py-2 text-right text-slate-600">{fmtCOP(Number(row.capital))}</td>
                                        <td className="px-3 py-2 text-right text-rose-600 font-medium">{fmtCOP(Number(row.interest))}</td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-800">{fmtCOP(Number(row.balance))}</td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-indigo-100/40 border-t border-indigo-200/60">
                                  <tr>
                                    <td colSpan={2} className="px-3 py-2 font-bold text-indigo-800">Total a pagar</td>
                                    <td className="px-3 py-2 text-right font-bold text-slate-700">{fmtCOP((t.amortizationSchedule as any[]).reduce((s: number, r: any) => s + Number(r.capital), 0))}</td>
                                    <td className="px-3 py-2 text-right font-bold text-rose-600">{fmtCOP((t.amortizationSchedule as any[]).reduce((s: number, r: any) => s + Number(r.interest), 0))}</td>
                                    <td className="px-3 py-2 text-right font-bold text-indigo-900">{fmtCOP((t.amortizationSchedule as any[]).reduce((s: number, r: any) => s + Number(r.payment), 0))}</td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                            <div className="mt-3">
                              <button
                                onClick={() => setExtraPaymentTx(t)}
                                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 bg-indigo-100 hover:bg-indigo-200 px-3 py-1.5 rounded-lg transition-colors"
                              >
                                <Zap size={12} />
                                Realizar Abono Extraordinario y Recalcular
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  );
                })}
              {transactions?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 italic">
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

      {/* Extra Payment Modal */}
      {extraPaymentTx && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-7 space-y-6">
             {/* Header */}
             <div className="flex items-center gap-4 border-b border-slate-100 pb-5">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 leading-tight">Abono Extraordinario</h3>
                  <p className="text-sm font-semibold text-slate-500 leading-tight mt-1">{extraPaymentTx.description}</p>
                </div>
             </div>
             
             {/* Form */}
             <div className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Monto a abonar (COP)</label>
                  <input
                    type="number"
                    value={extraAmount}
                    onChange={e => setExtraAmount(e.target.value)}
                    placeholder="Ej: 500000"
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-semibold text-slate-800 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                    autoFocus
                  />
                  <p className="text-xs font-semibold text-slate-500 mt-2">
                    Deuda calculada act: <span className="text-indigo-600">{Number(extraPaymentTx.amount).toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}</span>
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Preferencia de ajuste</label>
                  <div className="flex bg-slate-100 p-1 rounded-xl">
                    <button
                      onClick={() => setPreference('reduce_installments')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${preference === 'reduce_installments' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                    >
                      Reducir plazo (meses)
                    </button>
                    <button
                      onClick={() => setPreference('reduce_payment')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${preference === 'reduce_payment' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500'}`}
                    >
                      Reducir cuota mensual
                    </button>
                  </div>
                </div>
             </div>

             {/* Actions */}
             <div className="flex gap-3 pt-2">
               <button onClick={() => { setExtraPaymentTx(null); setExtraAmount(''); }} className="flex-1 py-3 border-2 border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
               <button
                 onClick={handleExtraPayment}
                 disabled={!extraAmount || Number(extraAmount) <= 0 || extraPaymentMutation.isPending}
                 className="flex-1 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black tracking-wide hover:bg-indigo-700 transition-colors shadow-md shadow-indigo-200 disabled:opacity-50 disabled:shadow-none"
               >
                 {extraPaymentMutation.isPending ? 'Procesando...' : 'Aplicar Abono'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Transactions;
