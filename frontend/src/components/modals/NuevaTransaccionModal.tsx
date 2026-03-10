import { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import api from '../../utils/api';
import { X } from 'lucide-react';

const schema = z.object({
  amount: z.number().positive('El monto debe ser mayor a 0'),
  type: z.enum(['income', 'expense', 'transfer']),
  description: z.string().optional(),
  accountId: z.string().optional(),
  cardId: z.string().optional(),
  categoryId: z.string().optional(),
  transactionDate: z.string().min(1, 'La fecha es requerida'),
  isRecurring: z.boolean().optional(),
  frequency: z.enum(['monthly', 'weekly', 'yearly']).optional(),
  dayOfMonth: z.number().min(1).max(31).optional(),
}).refine((data) => data.accountId || data.cardId, {
  message: 'Selecciona una cuenta o tarjeta',
  path: ['accountId'],
});

type FormData = z.output<typeof schema>;

interface Props {
  onClose: () => void;
}

const formatCOP = (val: string): string => {
  const raw = val.replace(/\D/g, '');
  if (!raw) return '';
  return Number(raw).toLocaleString('es-CO', { maximumFractionDigits: 0 });
};

const parseCOP = (val: string): number => {
  return parseFloat(val.replace(/\./g, '').replace(/\s/g, '')) || 0;
};

const accountTypeLabels: Record<string, string> = {
  checking: 'Corriente',
  savings: 'Ahorros',
  investment: 'Inversión',
  cash: 'Efectivo',
};

const NuevaTransaccionModal = ({ onClose }: Props) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [amountDisplay, setAmountDisplay] = useState('');
  const [sourceType, setSourceType] = useState<'account' | 'card'>('account');

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => (await api.get('/accounts')).data,
  });

  const { data: cards } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => (await api.get('/cards')).data,
  });

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => (await api.get('/categories')).data,
  });

  const { register, handleSubmit, control, formState: { errors, isSubmitting }, watch } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'expense',
      transactionDate: new Date().toISOString().split('T')[0],
      isRecurring: false,
      frequency: 'monthly',
      dayOfMonth: new Date().getDate(),
    },
  });

  // Watch the type field to filter categories reactively
  const selectedType = useWatch({ control, name: 'type', defaultValue: 'expense' });
  const isRecurring = watch('isRecurring');

  // Filter categories to match the selected transaction type
  const filteredCategories = categories?.filter((cat: any) => {
    if (selectedType === 'transfer') return cat.type === 'transfer';
    if (selectedType === 'income') return cat.type === 'income';
    return cat.type === 'expense'; // default
  }) ?? [];

  const mutation = useMutation({
    mutationFn: (data: FormData) => {
      if (data.isRecurring) {
        // Send a clean payload specifically for recurring endpoint
        const recurringPayload = {
          type: data.type,
          amount: data.amount,
          categoryId: data.categoryId && data.categoryId !== '' ? data.categoryId : null,
          accountId: data.accountId && data.accountId !== '' ? data.accountId : null,
          cardId: data.cardId && data.cardId !== '' ? data.cardId : null,
          description: data.description || '',
          frequency: data.frequency || 'monthly',
          dayOfMonth: data.dayOfMonth || new Date().getDate(),
        };
        return api.post('/recurring', recurringPayload);
      }
      return api.post('/transactions', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      onClose();
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.error || 'Error al crear la transacción');
    },
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    setServerError('');
    mutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Nueva Transacción</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{serverError}</p>}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Monto (COP)</label>
              <Controller
                name="amount"
                control={control}
                render={({ field }) => (
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                    <input
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={amountDisplay}
                      onChange={(e) => {
                        const formatted = formatCOP(e.target.value);
                        setAmountDisplay(formatted);
                        field.onChange(parseCOP(formatted));
                      }}
                      className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                )}
              />
              {errors.amount && <p className="mt-1 text-xs text-red-600">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                {...register('type')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="expense">Gasto</option>
                <option value="income">Ingreso</option>
                <option value="transfer">Transferencia</option>
              </select>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-sm font-medium text-slate-700">Origen de los fondos</label>
              <div className="flex bg-slate-100 p-0.5 rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('account');
                    // Reset cardId when switching to account
                    register('cardId').onChange({ target: { value: '' } });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    sourceType === 'account' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Cuenta
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSourceType('card');
                    // Reset accountId when switching to card
                    register('accountId').onChange({ target: { value: '' } });
                  }}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                    sourceType === 'card' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  Tarjeta
                </button>
              </div>
            </div>
            
            {sourceType === 'account' ? (
              <select
                {...register('accountId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">— Selecciona una cuenta —</option>
                {accounts?.map((acc: any) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.bankName} ({accountTypeLabels[acc.accountType] || acc.accountType})
                  </option>
                ))}
              </select>
            ) : (
              <select
                {...register('cardId')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="">— Selecciona una tarjeta —</option>
                {cards?.map((card: any) => (
                  <option key={card.id} value={card.id}>
                    {card.bankName} - {card.cardNetwork} (•••• {card.lastFourDigits || card.id.slice(0, 4)})
                  </option>
                ))}
              </select>
            )}
            {errors.accountId && <p className="mt-1 text-xs text-red-600">{errors.accountId.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Categoría
              <span className="ml-1 text-xs text-slate-400 font-normal">(opcional)</span>
            </label>
            <select
              {...register('categoryId')}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
            >
              <option value="">— Sin categoría —</option>
              {filteredCategories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.icon} {cat.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Descripción</label>
            <input
              {...register('description')}
              type="text"
              placeholder="Ej: Supermercado, Nómina..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Fecha</label>
            <input
              {...register('transactionDate')}
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {errors.transactionDate && <p className="mt-1 text-xs text-red-600">{errors.transactionDate.message}</p>}
          </div>

          {selectedType !== 'transfer' && (
            <div className="pt-2 border-t border-slate-100">
              <label className="flex items-center gap-2 cursor-pointer mb-3">
                <input
                  type="checkbox"
                  {...register('isRecurring')}
                  className="rounded border-slate-300 text-primary focus:ring-primary h-4 w-4"
                />
                <span className="text-sm font-medium text-slate-700">Hacer recurrente (Suscripción/Cobro automático)</span>
              </label>

              {isRecurring && (
                <div className="grid grid-cols-2 gap-4 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Frecuencia</label>
                    <select
                      {...register('frequency')}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                    >
                      <option value="monthly">Mensual</option>
                      <option value="weekly">Semanal</option>
                      <option value="yearly">Anual</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Día del mes</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      {...register('dayOfMonth', { valueAsNumber: true })}
                      className="w-full border border-slate-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || mutation.isPending}
              className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaTransaccionModal;
