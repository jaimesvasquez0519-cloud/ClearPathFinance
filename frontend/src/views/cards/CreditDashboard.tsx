import { useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { CreditCard, TrendingDown, Calendar, ShieldAlert } from 'lucide-react';

const fmt = (n: number) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

// Amortization calculator: returns monthly payment for a loan
const calcMonthlyPayment = (principal: number, monthlyRate: number, months: number): number => {
  if (monthlyRate === 0) return principal / months;
  const r = monthlyRate / 100;
  return (principal * r * Math.pow(1 + r, months)) / (Math.pow(1 + r, months) - 1);
};

const CreditDashboard = ({ cards }: { cards: any[] }) => {
  // Fetch all transactions to find installment purchases
  const { data: transactions = [] } = useQuery<any[]>({
    queryKey: ['transactions'],
    queryFn: () => api.get('/transactions').then(r => r.data),
  });

  // Filter transactions that are installment purchases with interest
  const installmentTx = transactions.filter(
    t => t.cardId && (t.installmentsTotal > 1 || t.installmentInterestRate)
  );

  // Compute amortization metadata per transaction
  const withAmort = installmentTx.map(t => {
    const principal = Number(t.amount);
    const months = t.installmentsTotal || 1;
    const rate = t.installmentInterestRate || 0;
    const monthly = calcMonthlyPayment(principal, rate, months);
    const totalCost = monthly * months;
    const totalInterest = totalCost - principal;
    const paid = t.installmentCurrent - 1;
    const remaining = months - paid;
    const accumulatedInterest = paid > 0 ? (monthly * paid) - (principal / months * paid) : 0;

    return {
      ...t,
      monthly,
      totalInterest,
      remaining,
      paid,
      accumulatedInterest,
    };
  });

  if (cards.length === 0 && installmentTx.length === 0) return null;

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-slate-800">Dashboard de Crédito</h3>

      {/* Credit Health per Card */}
      {cards.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((card: any) => {
            const used = Number(card.currentBalance || 0);
            const limit = Number(card.creditLimit || 1);
            const usagePct = Math.min(100, (used / limit) * 100);
            const healthColor =
              usagePct < 30 ? '#10b981' :
              usagePct < 70 ? '#f59e0b' : '#ef4444';

            return (
              <div key={card.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-slate-900 rounded-xl">
                    <CreditCard size={18} className="text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800 text-sm">{card.bankName}</p>
                    <p className="text-xs text-slate-400">{card.cardName || 'Tarjeta de crédito'}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>Utilizado</span>
                    <span className="font-semibold" style={{ color: healthColor }}>{usagePct.toFixed(1)}%</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${usagePct}%`, backgroundColor: healthColor }}
                    />
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500">{fmt(used)}</span>
                    <span className="text-slate-400">Límite: {fmt(limit)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-400">Disponible:</span>
                    <span className="font-semibold text-emerald-600">{fmt(Math.max(0, limit - used))}</span>
                  </div>
                </div>

                {/* Health indicator */}
                <div className="mt-3 flex items-center gap-1.5 text-xs font-medium" style={{ color: healthColor }}>
                  <ShieldAlert size={13} />
                  {usagePct < 30 ? 'Salud excelente' : usagePct < 70 ? 'Uso moderado' : 'Uso elevado — cuidado'}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Installment Tracker */}
      {withAmort.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h4 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-indigo-500" /> Compras a Cuotas
          </h4>
          <div className="space-y-4">
            {withAmort.map(t => (
              <div key={t.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50 rounded-xl">
                <div className="flex-1">
                  <p className="font-semibold text-slate-800 text-sm">{t.description || 'Compra a cuotas'}</p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(t.transactionDate).toLocaleDateString('es-CO')} · {t.creditCard?.bankName}
                  </p>
                  <div className="mt-2 h-1.5 bg-slate-200 rounded-full overflow-hidden w-full max-w-[200px]">
                    <div
                      className="h-full bg-indigo-500 rounded-full transition-all duration-700"
                      style={{ width: `${(t.paid / t.installmentsTotal) * 100}%` }}
                    />
                  </div>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="text-center">
                    <p className="text-slate-400">Cuota mensual</p>
                    <p className="font-bold text-slate-700">{fmt(t.monthly)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Pagadas / Total</p>
                    <p className="font-bold text-slate-700">{t.paid} / {t.installmentsTotal}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-slate-400">Interés total</p>
                    <p className="font-bold text-amber-600">{fmt(t.totalInterest)}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="mt-4 bg-indigo-50 rounded-xl p-4 flex justify-between text-sm">
            <div className="flex items-center gap-2 text-indigo-700">
              <TrendingDown size={16} />
              <span className="font-semibold">Interés acumulado pagado:</span>
            </div>
            <span className="font-black text-indigo-700">
              {fmt(withAmort.reduce((s, t) => s + t.accumulatedInterest, 0))}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreditDashboard;
