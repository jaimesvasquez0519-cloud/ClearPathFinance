import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
  LineChart, Line
} from 'recharts';
import { TrendingUp, TrendingDown, Wallet, CreditCard as CardIcon, ShieldCheck, ChevronRight } from 'lucide-react';

const formatCOPFull = (v: number) => {
  try {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(v);
  } catch {
    return String(Math.round(v));
  }
};

const KpiCard = ({ title, value, sub, icon: Icon, gradient }: any) => (
  <div className={`p-6 rounded-3xl shadow-lg flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-white ${gradient}`}>
    <div className="flex justify-between items-center mb-4">
      <p className="text-xs font-bold uppercase tracking-widest text-white/70">{title}</p>
      <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm"><Icon size={20} className="text-white" /></div>
    </div>
    <p className="text-2xl font-black tracking-tight text-white">{value}</p>
    {sub && <p className="text-xs mt-2 font-semibold text-white/60">{sub}</p>}
  </div>
);

const ProgressKpiCard = ({ title, current, target, icon: Icon, gradient }: any) => {
  const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
  return (
    <div className={`p-6 rounded-3xl shadow-lg flex flex-col justify-between hover:shadow-2xl hover:-translate-y-1.5 transition-all duration-300 text-white ${gradient}`}>
      <div className="flex justify-between items-center mb-4">
        <p className="text-xs font-bold uppercase tracking-widest text-white/70">{title}</p>
        <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm"><Icon size={20} className="text-white" /></div>
      </div>
      <div>
        <p className="text-xl font-black tracking-tight text-white mb-2 truncate">
          {current} <span className="text-[10px] font-medium text-white/60">/ {target}</span>
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
  const [currency, setCurrency] = useState<'COP' | 'USD'>('COP');
  
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboardSummary'], queryFn: async () => (await api.get('/dashboard')).data });

  if (isLoading) return <div className="flex justify-center items-center h-48"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  if (error) return <div className="text-red-500 text-sm p-4">Error al cargar los datos del panel</div>;

  const formatVal = (v: number | string | undefined | null) => {
    const num = Number(v || 0);
    if (currency === 'USD' && data?.currentUsdPrice > 0) {
      const usdVal = num / data.currentUsdPrice;
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(usdVal);
    }
    return `$${formatCOPFull(num)}`;
  };
  
  const formatCOP = (v: number) => {
     if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
     if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
     return String(Math.round(v));
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-slate-800">Resumen financiero</h2>
           <p className="text-xs text-slate-400 font-medium">{new Date().toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })}</p>
        </div>
        <div className="flex items-center gap-4">
           {data?.currentUsdPrice > 0 && (
             <div className="flex items-center bg-white border border-slate-200 rounded-xl p-2 shadow-sm">
                <div className="mr-3">
                   <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">TRM HOY</p>
                   <p className="text-sm font-black text-slate-700 leading-tight">${formatCOPFull(data.currentUsdPrice)}</p>
                </div>
                {data?.usdHistory && data.usdHistory.length > 0 && (
                  <div className="w-32 h-8">
                     <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.usdHistory}>
                           <Line type="monotone" dataKey="valor" stroke="#10b981" strokeWidth={2} dot={false} isAnimationActive={false} />
                        </LineChart>
                     </ResponsiveContainer>
                  </div>
                )}
             </div>
           )}
           <div className="bg-slate-200/60 p-1 rounded-xl flex">
              <button 
                onClick={() => setCurrency('COP')} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === 'COP' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >COP</button>
              <button 
                onClick={() => setCurrency('USD')} 
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${currency === 'USD' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
              >USD</button>
           </div>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard title="Balance Total" value={formatVal(data?.totalBalance)} sub={currency} icon={Wallet} gradient="bg-gradient-to-br from-indigo-600 to-indigo-800" />
        <KpiCard title="Ingresos" value={formatVal(data?.currentMonthIncome)} icon={TrendingUp} gradient="bg-gradient-to-br from-emerald-500 to-teal-700" />
        <KpiCard title="Gastos" value={formatVal(data?.currentMonthExpense)} icon={TrendingDown} gradient="bg-gradient-to-br from-rose-500 to-red-700" />
        <KpiCard title="Ahorro Total" value={formatVal(data?.savingsTotal)} sub="Balance Global" icon={ShieldCheck} gradient="bg-gradient-to-br from-violet-500 to-purple-800" />
        <KpiCard title="Uso Tarjeta (Mes)" value={formatVal(data?.currentMonthCreditUsage)} sub="Deuda nueva mes" icon={CardIcon} gradient="bg-gradient-to-br from-orange-500 to-red-600" />
        {data?.emergencyFundTarget > 0 ? (
          <ProgressKpiCard title="Fondo Emergencia" current={formatVal(data?.emergencyFundTotal)} target={formatVal(data?.emergencyFundTarget)} icon={ShieldCheck} gradient="bg-gradient-to-br from-slate-700 to-slate-900" />
        ) : (
          <KpiCard title="Fondo Emergencia" value={formatVal(data?.emergencyFundTotal)} sub="Sin meta configurada" icon={ShieldCheck} gradient="bg-gradient-to-br from-slate-700 to-slate-900" />
        )}
      </div>

      {/* Financial Insights Widget — Módulo Inteligencia Exacta */}
      {(() => {
        const effortRate = data?.effortRate || 0;
        let tier: 'critical' | 'warning' | 'good' = 'good';
        
        if (effortRate > 80) tier = 'critical';
        else if (effortRate >= 40) tier = 'warning';

        const tierConfig = {
          critical: {
            bg: 'bg-gradient-to-r from-red-50 to-rose-50 border-red-100/60',
            ring: 'text-red-500', text: 'text-red-900', sub: 'text-red-700/80',
            gradStart: '#ef4444', gradEnd: '#b91c1c', emoji: '🚨',
            label: 'Peligro / Crítico', labelColor: 'bg-red-100 text-red-700',
          },
          warning: {
            bg: 'bg-gradient-to-r from-amber-50 to-orange-50 border-amber-100/60',
            ring: 'text-amber-500', text: 'text-amber-900', sub: 'text-amber-700/80',
            gradStart: '#f59e0b', gradEnd: '#d97706', emoji: '⚠️',
            label: 'Precaución', labelColor: 'bg-amber-100 text-amber-700',
          },
          good: {
            bg: 'bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-100/60',
            ring: 'text-emerald-500', text: 'text-emerald-900', sub: 'text-emerald-700/80',
            gradStart: '#10b981', gradEnd: '#0d9488', emoji: '✅',
            label: 'Saludable', labelColor: 'bg-emerald-100 text-emerald-700',
          },
        }[tier];

        const displayPercentage = Math.round(effortRate);
        const circlePct = Math.min(100, Math.max(0, effortRate));
        const circumference = 2 * Math.PI * 42;
        const offset = circumference * (1 - circlePct / 100);

        return (
          <div className={`rounded-3xl p-6 flex flex-col md:flex-row items-center gap-6 shadow-sm border ${tierConfig.bg}`}>
            <div className="flex-shrink-0 relative">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 96 96">
                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="opacity-20" style={{ color: tierConfig.gradStart }} />
                <circle cx="48" cy="48" r="42" stroke={`url(#grad-${tier})`} strokeWidth="8" fill="transparent"
                  strokeDasharray={circumference} strokeDashoffset={offset}
                  className="drop-shadow-sm transition-all duration-1000" strokeLinecap="round" />
                <defs><linearGradient id={`grad-${tier}`} x1="0%" y1="0%" x2="100%" y2="0%"><stop offset="0%" stopColor={tierConfig.gradStart} /><stop offset="100%" stopColor={tierConfig.gradEnd} /></linearGradient></defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className={`text-2xl font-black leading-none ${tierConfig.text}`}>{displayPercentage}%</span>
                <span className={`text-[9px] font-bold uppercase tracking-widest leading-tight mt-0.5 ${tierConfig.ring}`}>Deuda</span>
              </div>
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{tierConfig.emoji}</span>
                <h3 className={`text-base font-bold flex items-center gap-2 ${tierConfig.text}`}>Score y Capacidad</h3>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${tierConfig.labelColor}`}>{tierConfig.label}</span>
              </div>
              <p className={`text-sm font-medium leading-relaxed max-w-3xl ${tierConfig.sub}`}>{data?.financialInsight}</p>
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col">
          <h3 className="text-base font-bold text-slate-800 mb-5">Ingresos vs Gastos — Últimos 3 meses</h3>
          {data?.monthlyChart?.some((m: any) => m.ingresos > 0 || m.gastos > 0) ? (
            <ResponsiveContainer width="100%" height={220}><BarChart data={data.monthlyChart} barCategoryGap="30%"><CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#94a3b8' }} axisLine={false} tickLine={false} /><YAxis tickFormatter={formatCOP} tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} width={55} /><Tooltip content={<CustomTooltip />} /><Legend iconType="circle" iconSize={8} formatter={(v) => <span className="text-xs text-slate-600 font-medium capitalize">{v}</span>} /><Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} /><Bar dataKey="gastos" name="Gastos" fill="#f43f5e" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
          ) : (<div className="h-48 flex items-center justify-center text-slate-400 text-sm italic">Sin datos históricos aún</div>)}
        </div>

        {/* Tarjetas de Crédito Detalladas con Cuotas */}
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 p-6 flex flex-col h-full overflow-hidden">
          <div className="flex justify-between items-end mb-4">
             <h3 className="text-base font-bold text-slate-800 flex items-center gap-2"><CardIcon size={18} className="text-slate-500" /> Tarjetas</h3>
          </div>

          {data?.creditCards?.length > 0 ? (
            <div className="space-y-6 flex-1 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
              {data.creditCards.map((card: any) => {
                 let b1 = 'from-slate-700 to-slate-900', t1 = 'text-white';
                 let netLogo = '';
                 if (card.cardNetwork === 'visa') { b1 = 'from-blue-700 to-blue-900'; netLogo = 'VISA'; }
                 if (card.cardNetwork === 'mastercard') { b1 = 'from-orange-500 to-red-600'; netLogo = 'mc'; }
                 if (card.cardNetwork === 'amex') { b1 = 'from-sky-700 to-indigo-900'; netLogo = 'AMEX'; }
                 
                 const cap = Number(card.pendingCapital || 0);
                 const int = Number(card.pendingInterest || 0);
                 
                 return (
                   <div key={card.id} className="relative">
                     {/* Tarjeta Física */}
                     <div className={`p-5 rounded-t-2xl rounded-b-lg shadow-md bg-gradient-to-br ${b1} ${t1} relative overflow-hidden group z-10`}>
                       <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/10 blur-xl"></div>
                       <div className="absolute -left-6 -bottom-6 w-20 h-20 rounded-full bg-black/10 blur-xl"></div>
                       <div className="relative z-10 flex justify-between items-start mb-6">
                          <div>
                             <p className="text-[10px] font-bold uppercase tracking-widest text-white/70 mb-0.5">{card.bankName}</p>
                             <p className="font-semibold text-sm">{card.cardName} •••• {card.lastFourDigits}</p>
                          </div>
                          {netLogo === 'mc' ? (
                            <div className="flex items-center -space-x-2"><div className="w-5 h-5 rounded-full bg-red-500/80 mix-blend-multiply"></div><div className="w-5 h-5 rounded-full bg-amber-400/80 mix-blend-multiply"></div></div>
                          ) : (<span className="text-xs font-black tracking-widest italic opacity-80">{netLogo}</span>)}
                       </div>
                       
                       <div className="relative z-10 space-y-1 mb-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Deuda Actual</p>
                          <p className="text-xl font-black">{formatVal(card.currentBalance)}</p>
                       </div>
                       <div className="relative z-10 grid grid-cols-2 gap-2 text-xs bg-black/20 p-3 rounded-xl border border-white/10 backdrop-blur-sm">
                          <div>
                             <p className="text-white/60 font-medium text-[10px] uppercase">Capital Pend.</p>
                             <p className="font-bold">{formatVal(cap)}</p>
                          </div>
                          <div>
                             <p className="text-white/60 font-medium text-[10px] uppercase">Int. Pend.</p>
                             <p className="font-bold text-rose-300">{formatVal(int)}</p>
                          </div>
                       </div>
                     </div>
                     
                     {/* Compras a Cuotas Activas */}
                     <div className="bg-slate-50 border border-slate-200 border-t-0 rounded-b-2xl pt-4 pb-4 px-3 shadow-sm relative -mt-2 z-0">
                        {card.activeInstallments && card.activeInstallments.length > 0 ? (
                           <div className="space-y-2 mt-1">
                             <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 pl-1"><ChevronRight size={12}/> Cuotas en curso</h4>
                             {card.activeInstallments.map((inst: any) => (
                               <div key={inst.id} className="bg-white p-2.5 rounded-xl border border-slate-100 shadow-sm">
                                  <div className="flex justify-between items-start mb-1">
                                    <p className="text-xs font-bold text-slate-700 capitalize line-clamp-1 flex-1">{inst.description}</p>
                                    <span className="bg-slate-100 text-[9px] text-slate-500 font-bold px-1.5 py-0.5 rounded shadow-sm">{inst.installmentCurrent}/{inst.installmentsTotal}</span>
                                  </div>
                                  <p className="text-[10px] text-slate-500 font-medium">Cuota: <strong className="text-slate-700">{formatVal(inst.payment)}</strong></p>
                                  <div className="flex gap-2 text-[9px] mt-1.5 pt-1.5 border-t border-slate-50 text-slate-500">
                                      <span>Cap: {formatVal(inst.capital)}</span>
                                      <span className="text-rose-400 font-semibold border-l border-slate-100 pl-2">Int: {formatVal(inst.interest)}</span>
                                  </div>
                               </div>
                             ))}
                           </div>
                        ) : (
                           <p className="text-xs text-center text-slate-400 font-medium italic mt-2 py-4">Sin cuotas pendientes de pago</p>
                        )}
                        
                        {/* Consejos Rápido (Payoff Advice) */}
                        {card.payoffAdvice && (
                           <div className="mt-3 p-3 rounded-xl bg-indigo-50 border border-indigo-100/50 flex items-start gap-2">
                              <ShieldCheck size={16} className="text-indigo-500 mt-0.5 shrink-0" />
                              <div>
                                 <h4 className="text-[10px] font-black uppercase tracking-wider text-indigo-900 mb-0.5">Consejo Rápido</h4>
                                 <p className="text-[10px] font-medium text-indigo-700/90 leading-snug">{card.payoffAdvice}</p>
                              </div>
                           </div>
                        )}
                     </div>
                   </div>
                 );
              })}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-slate-400 opacity-60">
               <CardIcon size={40} className="mb-3" />
               <p className="text-sm font-medium">Sin tarjetas</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default Dashboard;
