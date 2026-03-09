import { useState } from 'react';
import { useForm } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { X } from 'lucide-react';

const schema = z.object({
  bankName: z.string().min(1, 'El nombre del banco es requerido'),
  accountNumber: z.string().optional(),
  type: z.enum(['checking', 'savings', 'investment', 'cash']),
  currentBalance: z.string().transform((v) => parseFloat(v || '0')),
  currency: z.string().min(1, 'La moneda es requerida'),
});

type FormInput = {
  bankName: string;
  accountNumber?: string;
  type: 'checking' | 'savings' | 'investment' | 'cash';
  currentBalance: string;
  currency: string;
};
type FormData = z.output<typeof schema>;

interface Props {
  onClose: () => void;
}

const NuevaCuentaModal = ({ onClose }: Props) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm<FormInput>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      type: 'checking',
      currentBalance: '0',
      currency: 'COP',
    },
  });

  const mutation = useMutation({
    mutationFn: (data: FormData) => api.post('/accounts', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      onClose();
    },
    onError: (err: any) => {
      setServerError(err.response?.data?.error || 'Error al crear la cuenta');
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
          <h2 className="text-lg font-bold text-slate-900">Nueva Cuenta Bancaria</h2>
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
              placeholder="Ej: Bancolombia, Nequi, Daviplata..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo de cuenta</label>
              <select
                {...register('type')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="checking">Corriente</option>
                <option value="savings">Ahorros</option>
                <option value="investment">Inversión</option>
                <option value="cash">Efectivo</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Moneda</label>
              <select
                {...register('currency')}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
              >
                <option value="COP">COP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de cuenta (opcional)</label>
            <input
              {...register('accountNumber')}
              type="text"
              placeholder="Últimos dígitos o número completo"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo actual</label>
            <input
              {...register('currentBalance')}
              type="number"
              step="0.01"
              placeholder="0.00"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
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
              {mutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default NuevaCuentaModal;
