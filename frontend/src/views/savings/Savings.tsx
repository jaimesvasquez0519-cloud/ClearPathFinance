import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Pencil, Trash2, PiggyBank, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import api from '../../utils/api';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Goal {
  id: string;
  name: string;
  type: 'pocket' | 'emergency';
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
  color?: string;
  icon?: string;
  status: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

const pct = (curr: number, target: number) =>
  target > 0 ? Math.min(100, (curr / target) * 100) : 0;

const PALETTE = ['#6366f1','#10b981','#f59e0b','#3b82f6','#ec4899','#8b5cf6','#14b8a6','#f97316'];

// ─── Empty Modal State ───────────────────────────────────────────────────────
const emptyForm = {
  name: '',
  type: 'pocket' as 'pocket' | 'emergency',
  targetAmount: '',
  currentAmount: '',
  deadline: '',
  color: PALETTE[0],
  icon: '🐷',
};

// ─── Component ───────────────────────────────────────────────────────────────
const Savings = () => {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editGoal, setEditGoal] = useState<Goal | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [depositGoal, setDepositGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState('');

  // Fetch goals
  const { data: goals = [], isLoading } = useQuery<Goal[]>({
    queryKey: ['goals'],
    queryFn: () => api.get('/goals').then(r => r.data),
  });

  // Fetch dashboard for globalSavingsGoal
  const { data: dashboard } = useQuery<any>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard').then(r => r.data),
    staleTime: 60_000,
  });

  const globalSavingsBalance = dashboard?.globalSavingsBalance || 0;
  const pocketsTotalAllocated = dashboard?.pocketsTotalAllocated || 0;
  const emergencyTotal = dashboard?.emergencyFundTotal || 0;
  const emergencyTarget = dashboard?.emergencyFundTarget || 0;

  // Pockets vs emergency split
  const pockets = goals.filter(g => g.type !== 'emergency');
  const emergencies = goals.filter(g => g.type === 'emergency');

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: any) => api.post('/goals', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeModal(); },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...data }: any) => api.put(`/goals/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); closeModal(); },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['goals'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); },
  });

  // Handlers
  const openNew = () => { setEditGoal(null); setForm({ ...emptyForm }); setShowModal(true); };
  const openEdit = (g: Goal) => {
    setEditGoal(g);
    setForm({
      name: g.name,
      type: g.type || 'pocket',
      targetAmount: String(g.targetAmount),
      currentAmount: String(g.currentAmount),
      deadline: g.deadline ? g.deadline.slice(0, 10) : '',
      color: g.color || PALETTE[0],
      icon: g.icon || '🐷',
    });
    setShowModal(true);
  };
  const closeModal = () => { setShowModal(false); setEditGoal(null); };

  const handleSubmit = () => {
    const payload = {
      name: form.name,
      type: form.type,
      targetAmount: Number(form.targetAmount),
      currentAmount: Number(form.currentAmount),
      deadline: form.deadline || undefined,
      color: form.color,
      icon: form.icon,
    };
    if (editGoal) {
      updateMutation.mutate({ id: editGoal.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDeposit = () => {
     if(depositGoal && Number(depositAmount) > 0) {
        updateMutation.mutate({ 
          id: depositGoal.id, 
          currentAmount: Number(depositGoal.currentAmount) + Number(depositAmount) 
        });
        setDepositGoal(null);
        setDepositAmount('');
     }
  };

  const unallocatedSavings = Math.max(0, globalSavingsBalance - pocketsTotalAllocated);
  const allocationPct = globalSavingsBalance > 0 ? Math.min(100, (pocketsTotalAllocated / globalSavingsBalance) * 100) : 0;

  return (
    <div className="space-y-8">
      {/* ── Page Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Ahorros &amp; Bolsillos</h2>
          <p className="text-slate-500 text-sm mt-1">Organiza tu dinero en metas de ahorro individuales</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold shadow hover:bg-primary-dark transition-colors"
        >
          <PlusCircle size={16} /> Nuevo Bolsillo
        </button>
      </div>

      {/* ── Global Savings Goal Banner ── */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-7 text-white shadow-xl shadow-indigo-200">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-indigo-200 text-sm font-semibold uppercase tracking-wider mb-1">Balance Global de Ahorros</p>
            <p className="text-4xl font-black mt-1 tracking-tight">{fmt(globalSavingsBalance)}</p>
            <p className="text-indigo-200 font-medium text-sm mt-2">
              <span className="text-white font-bold">{fmt(pocketsTotalAllocated)}</span> asignado a bolsillos ({allocationPct.toFixed(1)}%)
            </p>
          </div>
          <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
             <ShieldCheck size={28} className="text-indigo-100" />
          </div>
        </div>

        {globalSavingsBalance > 0 && (
          <div className="mt-5">
             <div className="flex justify-between text-xs font-bold uppercase tracking-wider mb-2 text-indigo-100/80">
                <span>Asignado</span>
                <span>Sin asignar: {fmt(unallocatedSavings)}</span>
             </div>
             <div className="h-2.5 bg-black/20 rounded-full overflow-hidden shadow-inner">
               <div
                 className="h-full bg-emerald-400 rounded-full transition-all duration-1000 shadow-[inset_0_2px_4px_rgba(255,255,255,0.3)]"
                 style={{ width: `${allocationPct}%` }}
               />
             </div>
          </div>
        )}
      </div>

      {/* ── Emergency Fund Section ── Always visible so users can create one */}
      <section>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500" /> Fondo de Emergencia
        </h3>

        {emergencies.length === 0 ? (
          <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl p-6 flex flex-col items-center shadow-sm">
            <AlertCircle size={36} className="text-amber-300 mb-3" />
            <p className="text-amber-700 font-bold text-sm text-center">No tienes un fondo de emergencia configurado.</p>
            <p className="text-amber-500 font-medium text-xs mt-1 text-center">Ingresa la meta para empezar a ahorrar.</p>
            
            <div className="mt-4 flex gap-2 w-full max-w-sm">
              <input 
                type="number" 
                placeholder="Meta ($)" 
                value={form.targetAmount}
                onChange={e => setForm({...emptyForm, type: 'emergency', icon: '🛡️', targetAmount: e.target.value, name: 'Fondo de Emergencia'})}
                className="flex-1 rounded-xl border border-amber-200 px-4 py-2 text-sm text-amber-900 font-semibold focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
              />
              <button 
                onClick={handleSubmit} 
                disabled={!form.targetAmount}
                className="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2 px-5 rounded-xl text-sm transition-colors disabled:opacity-50 shadow-sm"
              >
                Crear
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {emergencies.map(g => <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} />)}
            </div>
            {/* Summary bar */}
            <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-bold">Total acumulado:</span>
                <span className="font-black text-amber-700">{fmt(emergencyTotal)}</span>
              </div>
              {emergencyTarget > 0 && (
                <>
                  <div className="h-2.5 bg-amber-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-700"
                      style={{ width: `${pct(emergencyTotal, emergencyTarget)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Meta: {fmt(emergencyTarget)}</span>
                    <span className="font-semibold">{pct(emergencyTotal, emergencyTarget).toFixed(1)}% alcanzado</span>
                  </div>
                  <div className="text-xs text-amber-600 font-medium">
                    Falta: {fmt(Math.max(0, emergencyTarget - emergencyTotal))}
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </section>

      {/* ── Pockets Grid ── */}
      <section>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <PiggyBank size={18} className="text-indigo-500" /> Mis Bolsillos
        </h3>
        {isLoading ? (
          <p className="text-slate-400 text-sm">Cargando...</p>
        ) : pockets.length === 0 ? (
          <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
            <PiggyBank size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">Aún no tienes bolsillos de ahorro</p>
            <p className="text-slate-400 text-sm mt-1">Crea tu primer bolsillo para empezar a ahorrar</p>
            <button onClick={openNew} className="mt-4 text-primary font-semibold text-sm hover:underline">+ Crear bolsillo</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {pockets.map(g => <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} onDeposit={setDepositGoal} />)}
          </div>
        )}
      </section>

      {/* ── CRUD Modal ── */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-4">
            <h3 className="text-xl font-bold text-slate-800">{editGoal ? 'Editar Bolsillo' : 'Nuevo Bolsillo'}</h3>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <div className="flex gap-2">
                {['pocket', 'emergency'].map(t => (
                  <button
                    key={t}
                    onClick={() => setForm(f => ({ ...f, type: t as 'pocket' | 'emergency' }))}
                    className={`flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors ${form.type === t ? 'bg-primary text-white border-primary' : 'border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                  >
                    {t === 'pocket' ? '🐷 Bolsillo' : '🛡️ Emergencia'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Nombre</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ej: Vacaciones, iPad..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Meta ($)</label>
                <input
                  type="number"
                  value={form.targetAmount}
                  onChange={e => setForm(f => ({ ...f, targetAmount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ahorrado ($)</label>
                <input
                  type="number"
                  value={form.currentAmount}
                  onChange={e => setForm(f => ({ ...f, currentAmount: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-primary focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Icono</label>
                <input
                  type="text"
                  value={form.icon}
                  onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                  placeholder="🐷"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Fecha límite</label>
                <input
                  type="date"
                  value={form.deadline}
                  onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                  className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-1">Color</label>
                <div className="flex gap-2 flex-wrap">
                  {PALETTE.map(c => (
                    <button
                      key={c}
                      onClick={() => setForm(f => ({ ...f, color: c }))}
                      className="w-7 h-7 rounded-full border-2 transition-transform hover:scale-110"
                      style={{ backgroundColor: c, borderColor: form.color === c ? '#1e293b' : 'transparent' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button onClick={closeModal} className="flex-1 py-2 border border-slate-200 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Cancelar</button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.targetAmount}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm font-bold hover:bg-primary-dark transition-colors disabled:opacity-50"
              >
                {editGoal ? 'Guardar cambios' : 'Crear bolsillo'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Deposit Modal ── */}
      {depositGoal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-5">
             <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                <div className="text-3xl bg-indigo-50 p-2 rounded-xl">{depositGoal.icon || '💰'}</div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 leading-tight">Mover fondos a</h3>
                  <p className="text-sm font-semibold text-indigo-600 leading-tight">{depositGoal.name}</p>
                </div>
             </div>
             
             <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Monto a depositar (COP)</label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={e => setDepositAmount(e.target.value)}
                  placeholder="Ej: 50000"
                  className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-base font-semibold text-slate-800 focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  autoFocus
                />
                <p className="text-xs font-medium text-slate-500 mt-2">
                  Saldo sin asignar: <span className="text-slate-700 font-bold">{fmt(unallocatedSavings)}</span>
                </p>
             </div>

             <div className="flex gap-3 pt-2">
               <button onClick={() => { setDepositGoal(null); setDepositAmount(''); }} className="flex-1 py-2.5 border-2 border-slate-200 rounded-xl text-slate-600 text-sm font-bold hover:bg-slate-50 transition-colors">Cancelar</button>
               <button
                 onClick={handleDeposit}
                 disabled={!depositAmount || Number(depositAmount) <= 0 || updateMutation.isPending}
                 className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black tracking-wide hover:bg-indigo-700 transition-colors shadow-md disabled:opacity-50 disabled:shadow-none"
               >
                 {updateMutation.isPending ? 'Depositando...' : 'Depositar'}
               </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── GoalCard Sub-component ───────────────────────────────────────────────────
const GoalCard = ({ goal, onEdit, onDelete, onDeposit }: { goal: Goal; onEdit: (g: Goal) => void; onDelete: (id: string) => void; onDeposit?: (g: Goal) => void }) => {
  const p = pct(goal.currentAmount, goal.targetAmount);
  const done = p >= 100;
  const color = goal.color || '#6366f1';

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3">
          <div className="text-2xl">{goal.icon || '🐷'}</div>
          <div>
            <p className="font-semibold text-slate-800">{goal.name}</p>
            {goal.deadline && (
              <p className="text-xs text-slate-400 mt-0.5">
                Límite: {new Date(goal.deadline).toLocaleDateString('es-CO')}
              </p>
            )}
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={() => onEdit(goal)} className="p-1.5 text-slate-400 hover:text-primary rounded-lg transition-colors"><Pencil size={15} /></button>
          <button onClick={() => { if (confirm('¿Eliminar este bolsillo?')) onDelete(goal.id); }} className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg transition-colors"><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="font-bold text-slate-800" style={{ color }}>{new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(goal.currentAmount)}</span>
          <span className="text-slate-400">de {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(goal.targetAmount)}</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{ width: `${p}%`, backgroundColor: color }}
          />
        </div>
        <div className="flex justify-between items-center text-xs">
          <span className="text-slate-400">{p.toFixed(1)}% completado</span>
          {done ? (
            <span className="flex items-center gap-1 text-emerald-600 font-semibold"><CheckCircle2 size={13} /> ¡Meta alcanzada!</span>
          ) : (
            <span className="text-slate-400">Falta: {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Math.max(0, goal.targetAmount - goal.currentAmount))}</span>
          )}
        </div>
      </div>

      {onDeposit && !done && (
        <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end flex-wrap gap-2">
           <button 
             onClick={() => onDeposit(goal)}
             className="text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-3 py-2 rounded-lg transition-colors flex items-center gap-1.5"
           >
             <PlusCircle size={14} /> Depositar fondos
           </button>
        </div>
      )}
    </div>
  );
};

export default Savings;
