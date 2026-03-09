import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  // === GASTOS ===
  { name: 'Alquiler / Hipoteca', type: 'expense', icon: '🏠', color: '#8b5cf6', isSystem: true },
  { name: 'Mantenimiento del hogar', type: 'expense', icon: '🛠️', color: '#a78bfa', isSystem: true },
  { name: 'Seguro de vivienda', type: 'expense', icon: '🛡️', color: '#c4b5fd', isSystem: true },
  { name: 'Servicios Públicos', type: 'expense', icon: '💡', color: '#f59e0b', isSystem: true },
  { name: 'Servicio de Internet', type: 'expense', icon: '🌐', color: '#fbbf24', isSystem: true },
  { name: 'Plan de celular', type: 'expense', icon: '📱', color: '#fcd34d', isSystem: true },
  { name: 'Supermercado', type: 'expense', icon: '🛒', color: '#f97316', isSystem: true },
  { name: 'Restaurantes / Comer fuera', type: 'expense', icon: '🍔', color: '#fb923c', isSystem: true },
  { name: 'Cafés / Snacks', type: 'expense', icon: '☕', color: '#fdba74', isSystem: true },
  { name: 'Combustible / Gasolina', type: 'expense', icon: '⛽', color: '#3b82f6', isSystem: true },
  { name: 'Transporte público', type: 'expense', icon: '🚌', color: '#60a5fa', isSystem: true },
  { name: 'Uber / Taxi', type: 'expense', icon: '🚕', color: '#93c5fd', isSystem: true },
  { name: 'Seguro de auto', type: 'expense', icon: '🛡️', color: '#2563eb', isSystem: true },
  { name: 'Mantenimiento de auto', type: 'expense', icon: '🔧', color: '#1d4ed8', isSystem: true },
  { name: 'Peajes / Estacionamiento', type: 'expense', icon: '🅿️', color: '#1e40af', isSystem: true },
  { name: 'Seguro médico', type: 'expense', icon: '🏥', color: '#ef4444', isSystem: true },
  { name: 'Consultas médicas', type: 'expense', icon: '👨‍⚕️', color: '#f87171', isSystem: true },
  { name: 'Farmacia / Medicamentos', type: 'expense', icon: '💊', color: '#fca5a5', isSystem: true },
  { name: 'Gimnasio / Deportes', type: 'expense', icon: '🏋️', color: '#10b981', isSystem: true },
  { name: 'Cuidado personal / Peluquería', type: 'expense', icon: '💇', color: '#34d399', isSystem: true },
  { name: 'Ropa y Calzado', type: 'expense', icon: '👕', color: '#ec4899', isSystem: true },
  { name: 'Matrícula / Mensualidad escolar', type: 'expense', icon: '🎓', color: '#14b8a6', isSystem: true },
  { name: 'Cursos / Certificaciones', type: 'expense', icon: '📜', color: '#2dd4bf', isSystem: true },
  { name: 'Libros y Materiales', type: 'expense', icon: '📚', color: '#5eead4', isSystem: true },
  { name: 'Suscripciones', type: 'expense', icon: '📺', color: '#6366f1', isSystem: true },
  { name: 'Cine / Salidas / Ocio', type: 'expense', icon: '🍿', color: '#818cf8', isSystem: true },
  { name: 'Hobbies', type: 'expense', icon: '🎮', color: '#a5b4fc', isSystem: true },
  { name: 'Vacaciones / Viajes', type: 'expense', icon: '✈️', color: '#0ea5e9', isSystem: true },
  { name: 'Mascotas', type: 'expense', icon: '🐾', color: '#84cc16', isSystem: true },
  { name: 'Impuestos', type: 'expense', icon: '🏛️', color: '#64748b', isSystem: true },
  { name: 'Fondo de emergencia', type: 'expense', icon: '🛡️', color: '#dc2626', isSystem: true },
  { name: 'Inversiones / Jubilación', type: 'expense', icon: '📈', color: '#059669', isSystem: true },
  { name: 'Regalos / Celebraciones', type: 'expense', icon: '🎁', color: '#f472b6', isSystem: true },
  { name: 'Imprevistos', type: 'expense', icon: '⚠️', color: '#fb923c', isSystem: true },
  { name: 'Otros gastos', type: 'expense', icon: '📦', color: '#94a3b8', isSystem: true },

  // === INGRESOS ===
  { name: 'Salario principal', type: 'income', icon: '💼', color: '#16a34a', isSystem: true },
  { name: 'Salario secundario', type: 'income', icon: '👔', color: '#22c55e', isSystem: true },
  { name: 'Bonos / Aguinaldos', type: 'income', icon: '💰', color: '#4ade80', isSystem: true },
  { name: 'Horas extras', type: 'income', icon: '⏰', color: '#86efac', isSystem: true },
  { name: 'Negocio / Emprendimiento', type: 'income', icon: '🏪', color: '#15803d', isSystem: true },
  { name: 'Freelance / Consultorías', type: 'income', icon: '💻', color: '#166534', isSystem: true },
  { name: 'Rendimientos de inversiones', type: 'income', icon: '📊', color: '#047857', isSystem: true },
  { name: 'Alquileres / Rentas', type: 'income', icon: '🏠', color: '#065f46', isSystem: true },
  { name: 'Dividendos', type: 'income', icon: '🎟️', color: '#064e3b', isSystem: true },
  { name: 'Reembolsos', type: 'income', icon: '🔄', color: '#10b981', isSystem: true },
  { name: 'Regalos / Donaciones', type: 'income', icon: '💝', color: '#a7f3d0', isSystem: true },
  { name: 'Venta de artículos usados', type: 'income', icon: '🏷️', color: '#d1fae5', isSystem: true },
  { name: 'Otros ingresos', type: 'income', icon: '💵', color: '#6b7280', isSystem: true },

  // === TRANSFERENCIAS ===
  { name: 'Transferencia', type: 'transfer', icon: '↔️', color: '#0ea5e9', isSystem: true },
  { name: 'Ahorro', type: 'transfer', icon: '🏦', color: '#0284c7', isSystem: true },
];

export async function seedCategories(prismaInstance: any) {
  console.log('🌱 Ensuring categories exist...');
  let count = 0;
  for (const cat of categories) {
    const id = `system_${cat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`;
    await prismaInstance.category.upsert({
      where: { id },
      update: {
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        type: cat.type as any,
      },
      create: {
        id,
        name: cat.name,
        type: cat.type as any,
        icon: cat.icon,
        color: cat.color,
        isSystem: true,
      },
    });
    count++;
  }
  return count;
}

async function main() {
  const result = await seedCategories(prisma);
  console.log(`✅ Done! ${result} system categories ready.`);
}

if (require.main === module) {
  main()
    .catch((e) => {
      console.error(e);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

