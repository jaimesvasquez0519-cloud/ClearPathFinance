import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import type { SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { X, Trash2 } from 'lucide-react';

const schema = z.object({
  bankName: z.string().min(1, 'El banco es requerido'),
  accountType: z.enum(['checking', 'savings', 'investment', 'cash']),
  currentBalance: z.number().refine((v) => !isNaN(v), 'Ingresa un monto válido'),
  currency: z.string().min(1),
  accountNumber: z.string().optional(),
});

type FormData = z.output<typeof schema>;

interface Account {
  id: string;
  bankName: string;
  accountType: string;
  currentBalance: number;
  currency: string;
  accountNumber?: string;
}

interface Props {
  account: Account;
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

const EditarCuentaModal = ({ account, onClose }: Props) => {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [balanceDisplay, setBalanceDisplay] = useState(
    Number(account.currentBalance).toLocaleString('es-CO', { maximumFractionDigits: 0 })
  );

  const { register, handleSubmit, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      bankName: account.bankName,
      accountType: account.accountType as any,
      currentBalance: Number(account.currentBalance),
      currency: account.currency,
      accountNumber: account.accountNumber || '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: FormData) => api.put(`/accounts/${account.id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      onClose();
    },
    onError: (err: any) => setServerError(err.response?.data?.error || 'Error al actualizar'),
  });

  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/accounts/${account.id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
      onClose();
    },
    onError: (err: any) => setServerError(err.response?.data?.error || 'Error al eliminar'),
  });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    setServerError('');
    updateMutation.mutate(data);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex justify-between items-center p-6 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Editar Cuenta</h2>
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
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
            {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Tipo</label>
              <select
                {...register('accountType')}
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
            <label className="block text-sm font-medium text-slate-700 mb-1">Saldo actual</label>
            <Controller
              name="currentBalance"
              control={control}
              render={({ field }) => (
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm font-medium">$</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={balanceDisplay}
                    onChange={(e) => {
                      const formatted = formatCOP(e.target.value);
                      setBalanceDisplay(formatted);
                      field.onChange(parseCOP(formatted));
                    }}
                    className="w-full border border-slate-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>
              )}
            />
            {errors.currentBalance && <p className="mt-1 text-xs text-red-600">{errors.currentBalance.message}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Número de cuenta (opcional)</label>
            <input
              {...register('accountNumber')}
              type="text"
              placeholder="Últimos dígitos"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="py-2 px-3 border border-red-200 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors flex items-center gap-1.5"
            >
              <Trash2 size={14} /> Eliminar
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="flex-1 py-2 px-4 bg-primary hover:bg-primary-dark text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-slate-900 mb-1">¿Eliminar cuenta?</h3>
            <p className="text-sm text-slate-500 mb-5">
              Esta acción desactivará la cuenta. Las transacciones asociadas se conservarán.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDelete(false)}
                className="flex-1 py-2 px-4 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Eliminando...' : 'Sí, eliminar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EditarCuentaModal;
