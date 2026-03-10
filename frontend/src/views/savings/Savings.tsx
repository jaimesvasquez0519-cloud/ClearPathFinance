import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PlusCircle, Pencil, Trash2, PiggyBank, CheckCircle2, AlertCircle } from 'lucide-react';
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
  const [globalGoalInput, setGlobalGoalInput] = useState('');
  const [showGlobalInput, setShowGlobalInput] = useState(false);

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

  const globalSavingsGoal = dashboard?.globalSavingsGoal || 0;
  const savingsTotal = dashboard?.savingsTotal || 0;
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

  const updateGlobalGoal = useMutation({
    mutationFn: (val: number) => api.put('/auth/settings', { globalSavingsGoal: val }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['dashboard'] }); setShowGlobalInput(false); },
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

  const globalPct = globalSavingsGoal > 0 ? Math.min(100, (savingsTotal / globalSavingsGoal) * 100) : 0;

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
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-indigo-200 text-sm font-medium">Meta Global de Ahorro</p>
            <p className="text-3xl font-black mt-1">{fmt(savingsTotal)}</p>
            {globalSavingsGoal > 0 && (
              <p className="text-indigo-200 text-sm mt-1">de {fmt(globalSavingsGoal)} ({globalPct.toFixed(1)}%)</p>
            )}
          </div>
          <button
            onClick={() => { setGlobalGoalInput(String(globalSavingsGoal || '')); setShowGlobalInput(v => !v); }}
            className="bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
          >
            {globalSavingsGoal > 0 ? 'Editar meta' : 'Definir meta'}
          </button>
        </div>

        {showGlobalInput && (
          <div className="flex gap-2 mt-2">
            <input
              type="number"
              value={globalGoalInput}
              onChange={e => setGlobalGoalInput(e.target.value)}
              placeholder="Meta global en COP"
              className="flex-1 rounded-lg px-3 py-2 text-slate-800 text-sm"
            />
            <button
              onClick={() => updateGlobalGoal.mutate(Number(globalGoalInput))}
              className="bg-white text-indigo-700 font-bold px-4 py-2 rounded-lg text-sm hover:bg-indigo-50 transition-colors"
            >
              Guardar
            </button>
          </div>
        )}

        {globalSavingsGoal > 0 && (
          <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
            <div
              className="h-full bg-white rounded-full transition-all duration-700"
              style={{ width: `${globalPct}%` }}
            />
          </div>
        )}
      </div>

      {/* ── Emergency Fund Section ── Always visible so users can create one */}
      <section>
        <h3 className="text-base font-bold text-slate-700 mb-3 flex items-center gap-2">
          <AlertCircle size={18} className="text-amber-500" /> Fondo de Emergencia
        </h3>

        {emergencies.length === 0 ? (
          <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-2xl p-6 text-center">
            <AlertCircle size={36} className="mx-auto text-amber-300 mb-3" />
            <p className="text-amber-700 font-medium text-sm">No tienes un fondo de emergencia configurado.</p>
            <p className="text-amber-500 text-xs mt-1">Crea uno haciendo clic en "Nuevo Bolsillo" y elige el tipo 🛡️ Emergencia.</p>
            <button
              onClick={() => { setForm({ ...emptyForm, type: 'emergency', icon: '🛡️' }); setEditGoal(null); setShowModal(true); }}
              className="mt-3 bg-amber-500 text-white px-4 py-2 rounded-xl text-sm font-bold hover:bg-amber-600 transition-colors"
            >
              + Crear Fondo de Emergencia
            </button>
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
            {pockets.map(g => <GoalCard key={g.id} goal={g} onEdit={openEdit} onDelete={id => deleteMutation.mutate(id)} />)}
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
    </div>
  );
};

// ─── GoalCard Sub-component ───────────────────────────────────────────────────
const GoalCard = ({ goal, onEdit, onDelete }: { goal: Goal; onEdit: (g: Goal) => void; onDelete: (id: string) => void }) => {
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
    </div>
  );
};

export default Savings;
