import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { Target, AlertCircle, Plus, Edit2, Trash2 } from 'lucide-react';

const Presupuestos = () => {
  const queryClient = useQueryClient();
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showModal, setShowModal] = useState(false);
  const [newBudget, setNewBudget] = useState({ categoryId: '', amountLimit: '' });
  const [editingBudget, setEditingBudget] = useState<any>(null);

  const { data: budgets, isLoading: budgetsLoading } = useQuery({
    queryKey: ['budgets', selectedMonth, selectedYear],
    queryFn: async () => {
      const res = await api.get(`/budgets?month=${selectedMonth}&year=${selectedYear}`);
      return res.data;
    }
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/categories');
      return res.data.filter((c: any) => c.type === 'expense');
    }
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/budgets', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setShowModal(false);
      setNewBudget({ categoryId: '', amountLimit: '' });
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/budgets/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: string, amountLimit: number }) => api.put(`/budgets/${data.id}`, { amountLimit: data.amountLimit }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setEditingBudget(null);
    }
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBudget.categoryId || !newBudget.amountLimit) return;
    createMutation.mutate({ ...newBudget, period: 'monthly' });
  };

  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  if (budgetsLoading) return <div>Cargando presupuestos...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Presupuestos Mínimos (Gastos)</h2>
        
        <div className="flex gap-4 items-center">
          <select 
            value={selectedMonth} 
            onChange={(e) => setSelectedMonth(Number(e.target.value))}
            className="border-slate-300 rounded-lg text-sm bg-white"
          >
            {months.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="border-slate-300 rounded-lg text-sm bg-white"
          >
            {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <Plus size={16} /> Agregar Presupuesto
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {budgets?.map((budget: any) => {
          const rawPct = (budget.spentAmount / budget.amountLimit) * 100;
          const pct = Math.min(rawPct, 100);
          const isDanger = rawPct >= 90;
          const isWarning = rawPct >= 70 && rawPct < 90;
          
          return (
            <div key={budget.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 relative group transition-all hover:shadow-md">
              <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => setEditingBudget(budget)}
                  className="text-slate-400 hover:text-blue-500 bg-slate-50 hover:bg-blue-50 p-1.5 rounded-lg transition-colors"
                  title="Editar Presupuesto"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => {
                    if(window.confirm('¿Seguro que deseas eliminar este presupuesto?')) deleteMutation.mutate(budget.id)
                  }}
                  className="text-slate-400 hover:text-red-500 bg-slate-50 hover:bg-red-50 p-1.5 rounded-lg transition-colors"
                  title="Eliminar Presupuesto"
                >
                  <Trash2 size={16} />
                </button>
              </div>
              <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-sm border border-slate-200">
                    {budget.category?.icon || '📦'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">{budget.category?.name || 'Categoría Desconocida'}</h3>
                    <p className="text-xs text-slate-500 font-medium">Límite Mensual</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-slate-900">${Number(budget.amountLimit).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span className={isDanger ? 'text-red-600 font-bold' : isWarning ? 'text-amber-500 font-bold' : 'text-slate-600'}>
                  Gastado: ${Number(budget.spentAmount).toLocaleString()}
                </span>
                <span className="text-slate-500">
                  Restante: ${Math.max(budget.amountLimit - budget.spentAmount, 0).toLocaleString()}
                </span>
              </div>
              
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-500 ${isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-500'}`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {(isWarning || isDanger) && (
                <div className={`mt-3 flex items-center gap-1.5 text-xs font-semibold ${isDanger ? 'text-red-600' : 'text-amber-600'}`}>
                  <AlertCircle size={14} />
                  {isDanger ? '¡Has superado el presupuesto!' : 'Estás cerca del límite del presupuesto'}
                </div>
              )}
            </div>
          );
        })}

        {budgets?.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-400 bg-white/50 backdrop-blur-md border border-dashed border-slate-300 rounded-2xl">
            <Target className="mx-auto mb-3 opacity-50" size={32} />
            <p className="font-medium text-slate-600">No tienes presupuestos configurados para este mes.</p>
            <p className="text-sm">Agrega uno para empezar a controlar tus gastos en áreas clave.</p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Configurar Presupuesto</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Categoría</label>
                <select 
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                  value={newBudget.categoryId}
                  onChange={(e) => setNewBudget({ ...newBudget, categoryId: e.target.value })}
                  required
                >
                  <option value="">— Selecciona una categoría —</option>
                  {categories?.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Límite Máximo (COP)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={newBudget.amountLimit}
                  onChange={(e) => setNewBudget({ ...newBudget, amountLimit: e.target.value })}
                  placeholder="Ej. 500000"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50">
                  Cancelar
                </button>
                <button type="submit" className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingBudget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-slate-900 mb-4">Mofidicar Presupuesto</h2>
            <div className="mb-4 p-3 bg-slate-50 rounded-lg flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center text-xl shadow-sm border border-slate-200">
                {editingBudget.category?.icon || '📦'}
              </div>
              <div>
                <h3 className="font-bold text-slate-900 leading-tight">{editingBudget.category?.name || 'Categoría'}</h3>
                <p className="text-xs text-slate-500">Editando límite mensual</p>
              </div>
            </div>

            <form onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({ id: editingBudget.id, amountLimit: Number(editingBudget.amountLimit) });
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nuevo límite máximo (COP)</label>
                <input 
                  type="number" 
                  step="0.01"
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                  value={editingBudget.amountLimit}
                  onChange={(e) => setEditingBudget({ ...editingBudget, amountLimit: e.target.value })}
                  placeholder="Ej. 500000"
                  required
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setEditingBudget(null)} className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={updateMutation.isPending} className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors">
                  {updateMutation.isPending ? 'Actualizando...' : 'Actualizar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Presupuestos;
