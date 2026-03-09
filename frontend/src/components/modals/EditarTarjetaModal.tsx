import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { X } from 'lucide-react';

const schema = z.object({
  bankName: z.string().min(1, 'El nombre del banco es requerido'),
  lastFourDigits: z.string().length(4, 'Deben ser exactamente 4 dígitos').regex(/^\d+$/, 'Solo números'),
  creditLimit: z.string().transform((v) => parseFloat(v)),
  currentBalance: z.string().transform((v) => parseFloat(v || '0')),
  cutDay: z.string().transform((v) => parseInt(v)),
  paymentDueDay: z.string().transform((v) => parseInt(v)),
  cardNetwork: z.enum(['visa', 'mastercard', 'amex', 'other']),
});

type FormInput = { bankName: string; lastFourDigits: string; creditLimit: string; currentBalance: string; cutDay: string; paymentDueDay: string; cardNetwork: 'visa' | 'mastercard' | 'amex' | 'other'; };
type FormData = z.output<typeof schema>;

interface Props {
  card: any;
  onClose: () => void;
}

const EditarTarjetaModal = ({ card, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors }, reset } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      bankName: card?.bankName || '',
      lastFourDigits: card?.lastFourDigits || '',
      creditLimit: card?.creditLimit?.toString() || '0',
      currentBalance: card?.currentBalance?.toString() || '0',
      cutDay: card?.cutDay?.toString() || '25',
      paymentDueDay: card?.paymentDueDay?.toString() || '5',
      cardNetwork: card?.cardNetwork || 'visa',
    },
  });

  useEffect(() => {
    if (card) {
      reset({
        bankName: card.bankName || '',
        lastFourDigits: card.lastFourDigits || '',
        creditLimit: card.creditLimit?.toString() || '0',
        currentBalance: card.currentBalance?.toString() || '0',
        cutDay: card.cutDay?.toString() || '25',
        paymentDueDay: card.paymentDueDay?.toString() || '5',
        cardNetwork: card.cardNetwork || 'visa',
      });
    }
  }, [card, reset]);

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.put(`/cards/${card.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      onClose();
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.error || 'Error al actualizar la tarjeta');
    },
  });

  const onSubmit: SubmitHandler<FormInput> = (data) => {
    setServerError('');
    mutation.mutate(data as unknown as FormData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Editar Tarjeta de Crédito</h2>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          {serverError && <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{serverError}</p>}

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Banco / Entidad</label>
            <input
              {...register('bankName')}
              type="text"
              placeholder="Ej: Bancolombia, Davivienda..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Últimos 4 dígitos</label>
              <input
                {...register('lastFourDigits')}
                type="text"
                maxLength={4}
                placeholder="1234"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.lastFourDigits && <p className="mt-1 text-xs text-red-600">{errors.lastFourDigits.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Red</label>
              <select
                {...register('cardNetwork')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="visa">Visa</option>
                <option value="mastercard">Mastercard</option>
                <option value="amex">American Express</option>
                <option value="other">Otra</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Cupo máximo</label>
              <input
                {...register('creditLimit')}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
              {errors.creditLimit && <p className="mt-1 text-xs text-red-600">{errors.creditLimit.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Total utilizado</label>
              <input
                {...register('currentBalance')}
                type="number"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Día de corte</label>
              <input
                {...register('cutDay')}
                type="number"
                min={1}
                max={31}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Día de pago</label>
              <input
                {...register('paymentDueDay')}
                type="number"
                min={1}
                max={31}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>
          </div>

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
              disabled={mutation.isPending}
              className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {mutation.isPending ? 'Actualizando...' : 'Actualizar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditarTarjetaModal;
