import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { Check, X, ShieldAlert } from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { Navigate } from 'react-router-dom';

const UserApprovals = () => {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();

  if (user?.role !== 'admin') {
    return <Navigate to="/" replace />;
  }

  const { data: pendingUsers, isLoading } = useQuery({
    queryKey: ['pendingUsers'],
    queryFn: async () => {
      const res = await api.get('/admin/users/pending');
      return res.data;
    }
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => api.put(`/admin/users/${id}/approve`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
    onError: () => {
      alert('Error al aprobar el usuario');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}/reject`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingUsers'] });
    },
    onError: () => {
      alert('Error al rechazar el usuario');
    }
  });

  if (isLoading) return <div>Cargando solicitudes...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldAlert className="text-primary w-8 h-8" />
        <h2 className="text-2xl font-bold text-slate-800">Aprobación de Usuarios</h2>
      </div>
      <p className="text-slate-500 text-sm">
        Los siguientes usuarios se han registrado en tu aplicación pero están pendientes de aprobación. 
        No podrán acceder hasta que autorices sus cuentas.
      </p>

      <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-200/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50/50 text-slate-500 border-b border-slate-200/60">
              <tr>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Fecha de Registro</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Nombre Completo</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs">Correo Electrónico</th>
                <th className="px-6 py-4 font-semibold tracking-wider uppercase text-xs text-center">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100/80">
              {pendingUsers?.map((u: any) => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 text-slate-500 font-medium">
                    {new Date(u.createdAt).toLocaleDateString('es-CO')}
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-800">
                    {u.fullName}
                  </td>
                  <td className="px-6 py-4 text-slate-500">
                    {u.email}
                  </td>
                  <td className="px-6 py-4 text-center flex justify-center gap-3">
                    <button 
                      onClick={() => approveMutation.mutate(u.id)}
                      disabled={approveMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg text-xs font-semibold transition-colors"
                      title="Aprobar Usuario"
                    >
                      <Check size={16} /> Aprobar
                    </button>
                    <button 
                      onClick={() => {
                        if (window.confirm('¿Rechazar y eliminar a este usuario?')) {
                           rejectMutation.mutate(u.id);
                        }
                      }}
                      disabled={rejectMutation.isPending}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 hover:bg-red-200 rounded-lg text-xs font-semibold transition-colors"
                      title="Rechazar Usuario"
                    >
                      <X size={16} /> Rechazar
                    </button>
                  </td>
                </tr>
              ))}
              {!pendingUsers?.length && (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">
                    No hay solicitudes pendientes en este momento.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserApprovals;
