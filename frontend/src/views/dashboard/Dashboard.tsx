import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  PieChart, Pie, Cell,
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, AlertCircle, CreditCard as CardIcon, ShieldCheck, Filter } from 'lucide-react';

const PIE_COLORS = [
  '#f43f5e', // rose
  '#3b82f6', // blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // violet
  '#ec4899', // pink
  '#06b6d4', // cyan
];

const formatCOP = (v: number) => {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return String(Math.round(v));
};

const formatCOPFull = (v: number) => {
  try {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(v);
  } catch {
    return String(Math.round(v));
  }
};


const KpiCard = ({
  title, value, sub, icon: Icon, gradient,
}: { title: string; value: string; sub?: string; icon: any; gradient: string }) => (
  <div
    className={`p-6 rounded-3xl shadow-lg flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-white ${gradient}`}
  >
    <div className="flex justify-between items-center mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/70">
        {title}
      </p>
      <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
         <Icon size={20} className="text-white" />
      </div>
    </div>
    <p className="text-2xl font-black tracking-tight text-white">
      {value}
    </p>
    {sub && (
      <p className="text-xs mt-2 font-semibold text-white/60">{sub}</p>
    )}
  </div>
);

const ProgressKpiCard = ({ title, current, target, icon: Icon, gradient }: any) => {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className={`p-6 rounded-3xl shadow-lg flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-white ${gradient}`}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">{title}</p>
        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
           <Icon size={20} className="text-white" />
        </div>
      </div>
      <div>
        <p className="text-2xl font-black tracking-tight text-white mb-2 truncate">
          ${formatCOPFull(current)} <span className="text-xs font-medium text-white/60">/ {formatCOPFull(target)}</span>
        </p>
        <div className="w-full bg-black/20 rounded-full h-1.5 mb-1 overflow-hidden">
          <div className="bg-white h-1.5 rounded-full" style={{ width: `${pct}%` }}></div>
        </div>
        <p className="text-[10px] font-bold text-white/80 text-right">{pct.toFixed(1)}% completado</p>
      </div>
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-3 text-xs">
      <p className="font-bold text-slate-700 mb-1">{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color }} className="font-medium">
          {p.name}: ${formatCOPFull(p.value)}
        </p>
      ))}
    </div>
  );
};

const Dashboard = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: async () => (await api.get('/dashboard')).data,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-48">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return <div className="text-red-500 text-sm p-4">Error al cargar los datos del panel</div>;
  }

  // Credit Card Alerts Logic
  const getCardAlerts = () => {
    if (!data?.creditCards) return [];
    const today = new Date();
    const currentDay = today.getDate();
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();

    return data.creditCards.map((card: any) => {
      let daysUntilDue = card.paymentDueDay - currentDay;
      if (daysUntilDue < 0) {
        // Due date has passed for this month, calculate for next month
        daysUntilDue = (daysInMonth - currentDay) + card.paymentDueDay;
      }

      let status = 'normal';
      let message = `Vence en ${daysUntilDue} días`;

      if (daysUntilDue === 0) {
        status = 'danger';
        message = '¡Vence hoy!';
      } else if (daysUntilDue <= 3) {
        status = 'warning';
        message = `Vence muy pronto (${daysUntilDue} días)`;
      } else if (daysUntilDue <= 7) {
        status = 'info';
        message = `Vence la próxima semana (${daysUntilDue} días)`;
      }

      return { ...card, daysUntilDue, status, message };
    }).filter((c: any) => c.status !== 'normal').sort((a: any, b: any) => a.daysUntilDue - b.daysUntilDue);
  };

  const cardAlerts = getCardAlerts();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Resumen financiero</h2>
        <p className="text-xs text-slate-400 font-medium">
          {new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          title="Balance Total"
          value={`$${formatCOPFull(data?.totalBalance ?? 0)}`}
          sub="COP"
          icon={Wallet}
          gradient="bg-gradient-to-br from-indigo-600 to-indigo-800"
        />
        <KpiCard
          title="Ingresos del mes"
          value={`$${formatCOPFull(data?.currentMonthIncome ?? 0)}`}
          icon={TrendingUp}
          gradient="bg-gradient-to-br from-emerald-500 to-teal-700"
        />
        <KpiCard
          title="Gastos del mes"
          value={`$${formatCOPFull(data?.currentMonthExpense ?? 0)}`}
          icon={TrendingDown}
          gradient="bg-gradient-to-br from-rose-500 to-red-700"
        />
        <KpiCard
          title="Ahorro Total"
          value={`$${formatCOPFull(data?.savingsTotal ?? 0)}`}
          sub="Balance Global"
          icon={ShieldCheck}
          gradient="bg-gradient-to-br from-violet-500 to-purple-800"
        />
        <KpiCard
          title="Consumo Crédito Mes"
          value={`$${formatCOPFull(data?.currentMonthCreditUsage ?? 0)}`}
          sub="Diferidos en tarjeta"
          icon={CardIcon}
          gradient="bg-gradient-to-br from-orange-500 to-red-600"
        />
        {data?.emergencyFundTarget > 0 ? (
          <ProgressKpiCard
            title="Fondo Emergencia"
            current={data?.emergencyFundTotal ?? 0}
            target={data?.emergencyFundTarget ?? 0}
            icon={ShieldCheck}
            gradient="bg-gradient-to-br from-slate-700 to-slate-900"
          />
        ) : (
          <KpiCard
            title="Fondo Emergencia"
            value={`$${formatCOPFull(data?.emergencyFundTotal ?? 0)}`}
            sub="Sin meta configurada"
            icon={ShieldCheck}
            gradient="bg-gradient-to-br from-slate-700 to-slate-900"
          />
        )}
      </div>

      {/* Financial Insights Widget — Dynamic */}
      {(() => {
        const score = data?.finScore ?? 0;
        const utilRate = data?.creditUtilizationRate ?? 0;

        // Determine tier
        let tier: 'critical' | 'warning' | 'good' | 'excellent';
        if (score < 50) tier = 'critical';
        else if (score < 70) tier = 'warning';
        else if (score < 90) tier = 'good';
        else tier = 'excellent';

        const tierConfig = {
          critical: {
            bg: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100/60',
            ring: 'text-red-500',
            text: 'text-red-900',
            sub: 'text-red-700/80',
            gradStart: '#ef4444', gradEnd: '#b91c1c',
            emoji: '🚨',
            label: 'Atención requerida',
            labelColor: 'bg-red-100 text-red-700',
            cta: { label: 'Ver mis deudas →', path: '#cards' },
          },
          warning: {
            bg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100/60',
            ring: 'text-amber-500',
            text: 'text-amber-900',
            sub: 'text-amber-700/80',
            gradStart: '#f59e0b', gradEnd: '#d97706',
            emoji: '⚠️',
            label: 'Puede mejorar',
            labelColor: 'bg-amber-100 text-amber-700',
            cta: { label: 'Crear plan de ahorro →', path: '#savings' },
          },
          good: {
            bg: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100/60',
            ring: 'text-emerald-500',
            text: 'text-emerald-900',
            sub: 'text-emerald-700/80',
            gradStart: '#10b981', gradEnd: '#0d9488',
            emoji: '✅',
            label: 'Buen manejo',
            labelColor: 'bg-emerald-100 text-emerald-700',
            cta: { label: 'Aumentar mis ahorros →', path: '#savings' },
          },
          excellent: {
            bg: 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-100/60',
            ring: 'text-indigo-500',
            text: 'text-indigo-900',
            sub: 'text-indigo-700/80',
            gradStart: '#818cf8', gradEnd: '#4f46e5',
            emoji: '🏆',
            label: 'Excelente',
            labelColor: 'bg-indigo-100 text-indigo-700',
            cta: { label: 'Ver mis metas →', path: '#savings' },
          },
        }[tier];

        // Build contextual message
        let message = data?.financialInsight || '';
        if (utilRate > 70) message += ` Además, tu tarjeta de crédito está al ${utilRate}% de su cupo — considera hacer un pago pronto.`;
        else if (utilRate > 30 && utilRate <= 70) message += ` Tu uso de tarjeta es del ${utilRate}%, lo cual es moderado.`;
        else if (utilRate > 0 && utilRate <= 30) message += ` Tu uso de tarjeta es saludable (${utilRate}%).`;

        if (tier === 'good' && data?.currentMonthSavings > 0) {
          message = `¡Vas muy bien! Has ahorrado $${formatCOPFull(data?.currentMonthSavings)} este mes. ${message}`;
        }

        const circumference = 2 * Math.PI * 42;
        const offset = circumference * (1 - score / 100);

        return (
          <div className={`rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm border ${tierConfig.bg}`}>
            {/* Score Dial */}
            <div className="flex-shrink-0 relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-20" style={{ color: tierConfig.gradStart }} />
                <circle cx="48" cy="48" r="42" stroke={`url(#grad-${tier})`} strokeWidth="8" fill="transparent"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  className="drop-shadow-sm transition-all duration-1000" strokeLinecap="round" />
                <defs>
                  <linearGradient id={`grad-${tier}`} x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={tierConfig.gradStart} />
                    <stop offset="100%" stopColor={tierConfig.gradEnd} />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black leading-none ${tierConfig.text}`}>{score}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest leading-tight mt-0.5 ${tierConfig.ring}`}>Score</span>
              </div>
            </div>

            {/* Message Block */}
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{tierConfig.emoji}</span>
                <h3 className={`text-base font-bold flex items-center gap-2 ${tierConfig.text}`}>
                  Inteligencia Financiera
                </h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${tierConfig.labelColor}`}>{tierConfig.label}</span>
              </div>
              <p className={`text-sm font-medium leading-relaxed max-w-3xl ${tierConfig.sub}`}>{message}</p>
              {utilRate > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <span className={`text-xs font-bold ${tierConfig.sub}`}>Uso de tarjeta</span>
                  <div className="flex-1 bg-black/10 rounded-full h-1.5 overflow-hidden max-w-[160px]">
                    <div className="h-1.5 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, utilRate)}%`, background: utilRate > 70 ? '#ef4444' : utilRate > 30 ? '#f59e0b' : '#10b981' }} />
                  </div>
                  <span className={`text-xs font-black ${tierConfig.text}`}>{utilRate}%</span>
                </div>
              )}
            </div>

            {/* CTA */}
            <a href={tierConfig.cta.path}
              onClick={e => { e.preventDefault(); document.getElementById(tier === 'critical' ? 'nav-cards' : 'nav-savings')?.click(); }}
              className={`flex-shrink-0 px-5 py-2.5 rounded-xl text-sm font-bold transition-all shadow-sm border border-black/5 hover:shadow-md hover:-translate-y-0.5 ${tierConfig.labelColor}`}
            >
              {tierConfig.cta.label}
            </a>
          </div>
        );
      })()}


      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bar chart — last 3 months */}
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-base font-bold text-slate-800 mb-5">Ingresos vs Gastos — Últimos 3 meses</h3>
          {data?.monthlyChart?.some((m: any) => m.ingresos > 0 || m.gastos > 0) ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={data.monthlyChart} barCategoryGap="30%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                <YAxis tickFormatter={formatCOP} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span className="text-xs text-slate-600 font-medium capitalize">{v}</span>}
                />
                <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              Sin datos históricos aún
            </div>
          )}
        </div>

        {/* Pie chart */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-base font-bold text-slate-800 mb-5">Gastos por categoría</h3>
          {data?.expensesDistribution?.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={data.expensesDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {data.expensesDistribution.map((_: any, i: number) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: any) => [`$${formatCOPFull(v)}`, 'Gasto']}
                    contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-2">
                {data.expensesDistribution.slice(0, 5).map((cat: any, i: number) => (
                  <div key={cat.name} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs text-slate-600 truncate flex-1">{cat.name}</span>
                    <span className="text-xs font-semibold text-slate-700">${formatCOPFull(cat.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">
              Sin gastos este mes
            </div>
          )}
        </div>
      </div>

      {/* Recent transactions & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4">Últimas transacciones</h3>
          {data?.recentTransactions?.length > 0 ? (
            <div className="divide-y divide-slate-100/80">
              {data.recentTransactions.map((t: any) => (
                <div key={t.id} className="flex justify-between items-center py-3 hover:bg-slate-50/50 px-2 -mx-2 rounded-xl transition-colors">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-700 text-sm">{t.description || t.category?.name || '—'}</span>
                    <span className="text-xs text-slate-400 mt-0.5">
                      {new Date(t.transactionDate).toLocaleDateString('es-CO')}
                      {t.category?.name && ` · ${t.category.name}`}
                    </span>
                  </div>
                  <span className={`font-bold text-sm ${t.type === 'income' ? 'text-slate-900' : 'text-slate-400'}`}>
                    {t.type === 'income' ? '+' : '-'}${formatCOPFull(Number(t.amount))}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-slate-400 text-sm italic py-8">Sin actividad reciente</p>
          )}
        </div>

        {/* Credit Card Alerts */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-6">
          <h3 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
            <CardIcon size={18} className="text-slate-500" />
            Vencimientos Próximos
          </h3>
          {cardAlerts.length > 0 ? (
            <div className="space-y-3">
              {cardAlerts.map((alert: any) => (
                <div 
                  key={alert.id} 
                  className={`p-4 rounded-xl flex items-start gap-3 border ${
                    alert.status === 'danger' ? 'bg-red-50 border-red-100 text-red-900' :
                    alert.status === 'warning' ? 'bg-amber-50 border-amber-100 text-amber-900' :
                    'bg-blue-50 border-blue-100 text-blue-900'
                  }`}
                >
                  <AlertCircle size={20} className={`shrink-0 mt-0.5 ${
                    alert.status === 'danger' ? 'text-red-500' :
                    alert.status === 'warning' ? 'text-amber-500' :
                    'text-blue-500'
                  }`} />
                  <div>
                    <h4 className="font-bold text-sm flex items-center gap-2">
                       {(alert.cardName || alert.bankName).replace(new RegExp(alert.cardNetwork || '', 'ig'), '').trim()}
                       {alert.cardNetwork === 'visa' && <span className="text-[10px] font-black italic tracking-widest text-[#1434CB] bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">VISA</span>}
                       {alert.cardNetwork === 'mastercard' && (
                         <span className="flex items-center -space-x-1.5 bg-white px-1.5 py-0.5 rounded shadow-sm border border-slate-200">
                           <span className="w-2.5 h-2.5 rounded-full bg-[#EB001B] mix-blend-multiply"></span>
                           <span className="w-2.5 h-2.5 rounded-full bg-[#F79E1B] mix-blend-multiply"></span>
                         </span>
                       )}
                       {alert.cardNetwork === 'amex' && <span className="text-[9px] leading-none font-bold bg-[#002663] text-white px-1.5 py-1 rounded shadow-sm border border-[#002663] tracking-wider">AMEX</span>}
                    </h4>
                    <p className={`text-xs mt-0.5 font-medium ${
                      alert.status === 'danger' ? 'text-red-700' :
                      alert.status === 'warning' ? 'text-amber-700' :
                      'text-blue-700'
                    }`}>
                      {alert.message}
                    </p>
                    <p className="text-sm font-bold mt-1 tracking-tight">Deuda: ${formatCOPFull(Number(alert.currentBalance || 0))}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-60 py-8">
               <CardIcon size={40} className="mb-3" />
               <p className="text-sm font-medium">No hay fechas de pago cercanas</p>
            </div>
          )}
        </div>
      </div>

      {/* Category Expense Filter */}
      <div className="bg-white/80 backdrop-blur-md rounded-3xl shadow-md border border-slate-200/60 p-7">
        <h3 className="text-lg font-bold text-slate-800 mb-5 flex items-center gap-2">
          <Filter size={20} className="text-primary" />
          Consulta Histórica de Gastos por Categoría
        </h3>
        <div className="flex flex-col md:flex-row gap-6 items-center">
            <select
              className="w-full md:w-80 p-4 rounded-xl border-2 border-slate-200 bg-slate-50 focus:ring-4 focus:ring-primary/20 focus:border-primary outline-none text-slate-700 font-semibold transition-all"
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="">Selecciona una categoría...</option>
              {data?.allTimeExpensesList?.map((cat: any) => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
            
            {selectedCategory ? (
              <div className="flex-1 w-full bg-gradient-to-r from-slate-900 to-slate-800 text-white rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center shadow-lg border border-slate-700">
                 <span className="text-base font-semibold text-slate-300 mb-2 md:mb-0">
                   Total gastado en <span className="text-white font-bold">{selectedCategory}</span>
                 </span>
                 <span className="text-3xl font-black text-rose-400 tracking-tight">
                    ${formatCOPFull(data?.allTimeExpensesList?.find((c: any) => c.name === selectedCategory)?.value || 0)}
                 </span>
              </div>
            ) : (
              <div className="flex-1 w-full bg-slate-100/50 rounded-2xl p-6 flex justify-center items-center border border-dashed border-slate-300">
                 <span className="text-sm font-medium text-slate-400">Selecciona una categoría para ver su historial completo de gastos.</span>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
