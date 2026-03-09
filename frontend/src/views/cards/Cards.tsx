import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../utils/api';
import { CreditCard, Edit2, Trash2, ArrowUpRight } from 'lucide-react';
import NuevaTarjetaModal from '../../components/modals/NuevaTarjetaModal';
import EditarTarjetaModal from '../../components/modals/EditarTarjetaModal';
import PagarTarjetaModal from '../../components/modals/PagarTarjetaModal';

const Cards = () => {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingCard, setEditingCard] = useState<any>(null);
  const [payingCard, setPayingCard] = useState<any>(null);

  const { data: cards, isLoading } = useQuery({
    queryKey: ['cards'],
    queryFn: async () => {
      const res = await api.get('/cards');
      return res.data;
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/cards/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cards'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardSummary'] });
    },
    onError: () => {
      alert('Error al eliminar la tarjeta');
    }
  });

  const handleDelete = (id: string) => {
    if (window.confirm('¿Estás seguro de que deseas eliminar esta tarjeta? Esta acción no se puede deshacer.')) {
      deleteMutation.mutate(id);
    }
  };

  if (isLoading) return <div>Cargando tarjetas...</div>;

  return (
    <div className="space-y-6">
      {showModal && <NuevaTarjetaModal onClose={() => setShowModal(false)} />}
      {editingCard && (
        <EditarTarjetaModal 
          card={editingCard} 
          onClose={() => setEditingCard(null)} 
        />
      )}
      {payingCard && (
        <PagarTarjetaModal
          card={payingCard}
          onClose={() => setPayingCard(null)}
        />
      )}

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Tarjetas de Crédito</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
        >
          + Agregar Tarjeta
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {cards?.map((card: any) => (
          <div key={card.id} className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 rounded-2xl shadow-xl border border-slate-700/50 text-white flex flex-col justify-between h-56 relative overflow-hidden group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
            {/* Subtle glow effect */}
            <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary-dark opacity-0 group-hover:opacity-20 blur-xl transition-opacity duration-300"></div>
            
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity transform rotate-12 scale-150">
              <CreditCard size={120} />
            </div>

            {/* Actions (visible on hover) */}
            <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-20">
              <button 
                onClick={() => setEditingCard(card)}
                className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-full transition-colors"
                title="Editar Tarjeta"
              >
                <Edit2 size={16} className="text-white" />
              </button>
              <button 
                onClick={() => handleDelete(card.id)}
                className="p-2 bg-white/10 hover:bg-red-500/80 backdrop-blur-md rounded-full transition-colors"
                title="Eliminar Tarjeta"
              >
                <Trash2 size={16} className="text-white" />
              </button>
            </div>
            
            <div className="z-10 flex justify-between items-start pr-16 mb-2">
              <div>
                <button
                   disabled={Number(card.currentBalance) <= 0}
                   onClick={() => setPayingCard(card)}
                   className="mb-3 px-3 py-1.5 flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-[11px] font-bold uppercase tracking-widest rounded-lg shadow-md transition-all disabled:opacity-0"
                   title="Pagar Tarjeta"
                >
                   <ArrowUpRight size={14} strokeWidth={3}/> Pagar
                </button>
                <h3 className="font-bold text-xl tracking-tight text-slate-100">{card.bankName}</h3>
                <p className="text-xs tracking-widest uppercase opacity-70 mt-1.5 font-medium">
                  {(card.cardName && card.cardName.replace(new RegExp(card.cardNetwork || '', 'ig'), '').trim()) || 'Tarjeta de Crédito'}
                </p>
              </div>
              <span className="text-xs font-semibold px-3 py-1 bg-white/10 rounded-full border border-white/10 backdrop-blur-sm shadow-sm flex items-center gap-1.5">
                Cupo: ${Number(card.creditLimit).toLocaleString()}
              </span>
            </div>
            
            <div className="z-10 mt-auto flex justify-between items-end">
              <div>
                <p className="text-[10px] uppercase tracking-widest opacity-60 mb-1.5 font-bold">Total Utilizado</p>
                <p className="text-3xl font-black tracking-tighter drop-shadow-sm">${Number(card.currentBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                {card.cardNetwork === 'visa' && (
                  <div className="text-2xl font-black italic tracking-tighter opacity-90 drop-shadow-md pb-0.5">VISA</div>
                )}
                {card.cardNetwork === 'mastercard' && (
                  <div className="flex -space-x-3 opacity-90 pb-1">
                    <div className="w-8 h-8 rounded-full bg-red-500 mix-blend-screen shadow-md"></div>
                    <div className="w-8 h-8 rounded-full bg-amber-500 mix-blend-screen shadow-md"></div>
                  </div>
                )}
                {card.cardNetwork === 'amex' && (
                  <div className="text-sm font-bold tracking-widest bg-[#002663] text-white px-2 py-1 rounded shadow-md border border-white/20">AMEX</div>
                )}
                <p className="text-lg font-mono tracking-[0.2em] opacity-80 mix-blend-overlay drop-shadow-sm">•••• {card.lastFourDigits || card.id.slice(0, 4)}</p>
              </div>
            </div>
          </div>
        ))}
        {cards?.length === 0 && (
          <div className="col-span-1 md:col-span-2 bg-slate-50/50 rounded-2xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-slate-400">
            <CreditCard size={48} className="mb-4 opacity-20" />
            <p className="font-medium text-slate-600">No tienes tarjetas registradas</p>
            <p className="text-sm mt-1">Haz clic en "Agregar Tarjeta" para comenzar</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Cards;
