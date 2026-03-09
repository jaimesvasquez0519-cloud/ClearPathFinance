import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { X, ArrowRight, CreditCard, Wallet } from 'lucide-react';

const payCardSchema = z.object({
  accountId: z.string().min(1, 'La cuenta de origen es obligatoria'),
  amount: z.number().min(0.01, 'El monto a pagar debe ser mayor a 0')
});

type PayCardForm = z.infer<typeof payCardSchema>;

interface PagarTarjetaModalProps {
  onClose: () => void;
  card: any;
}

const PagarTarjetaModal = ({ onClose, card }: PagarTarjetaModalProps) => {
  const queryClient = useQueryClient();

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const res = await api.get('/accounts');
      return res.data;
    }
  });

  const { register, handleSubmit, formState: { errors } } = useForm<PayCardForm>({
    resolver: zodResolver(payCardSchema),
    defaultValues: {
      amount: card.currentBalance > 0 ? card.currentBalance : 0
    }
  });

  const payMutation = useMutation({
    mutationFn: (data: PayCardForm) => api.post('/transactions/pay-card', {
      ...data,
      cardId: card.id,
      description: `Abono/Pago a ${card.cardName || card.bankName}`
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      onClose();
    },
    onError: () => {
      alert('Error procesando el pago. Verifica el saldo disponible o que los datos sean correctos.');
    }
  });

  const onSubmit = (data: PayCardForm) => {
    payMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <h2 className="text-xl font-bold text-slate-800">Pagar Tarjeta de Crédito</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 mb-6">
             <div className="flex-1">
                <p className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-1 flex items-center gap-1.5 opacity-80"><CreditCard size={14}/> Tarjeta Destino</p>
                <p className="font-bold text-slate-900">{card.cardName || card.bankName}</p>
                <p className="text-sm font-medium text-slate-500 mt-1 flex gap-2">Deuda Pendiente: <span className="font-bold text-red-600">${Number(card.currentBalance).toLocaleString()}</span></p>
             </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="flex items-center gap-1.5 text-sm font-bold tracking-wide uppercase text-slate-700 mb-2 opacity-80"><Wallet size={16}/> Cuenta de Origen</label>
              <select
                {...register('accountId')}
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary shadow-sm bg-white"
              >
                <option value="">— Seleccionar la cuenta que pagará —</option>
                {accounts?.map((acc: any) => {
                  const rawName = acc.accountName.toLowerCase().replace('checking', '').trim();
                  const rawBank = acc.bankName.toLowerCase().trim();
                  const displayName = rawName === rawBank ? acc.bankName : `${acc.accountName.replace(/checking/i, '').trim()} - ${acc.bankName}`;
                  
                  return (
                    <option key={acc.id} value={acc.id}>
                      {displayName} (Disponible: ${Number(acc.currentBalance).toLocaleString()})
                    </option>
                  );
                })}
              </select>
              {errors.accountId && <p className="text-red-500 text-xs mt-1.5">{errors.accountId.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-bold tracking-wide uppercase text-slate-700 mb-2 mt-4 opacity-80">Monto a pagar</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-slate-500">$</span>
                <input
                  {...register('amount', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  className="w-full border border-slate-300 rounded-xl pl-8 pr-4 py-3 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-primary shadow-sm"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 italic">* Se reducirá este valor tanto del saldo de la cuenta como de la deuda de la tarjeta simultáneamente.</p>
              {errors.amount && <p className="text-red-500 text-xs mt-1.5">{errors.amount.message}</p>}
            </div>

            <div className="pt-6 flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={payMutation.isPending || Number(card.currentBalance) <= 0}
                className="flex-1 px-4 py-3 rounded-xl bg-slate-900 text-white font-semibold flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors shadow-md disabled:bg-slate-300 disabled:cursor-not-allowed"
              >
                {payMutation.isPending ? 'Procesando...' : 'Confirmar Pago'}
                {!payMutation.isPending && <ArrowRight size={18} />}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PagarTarjetaModal;
