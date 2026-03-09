import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  // === GASTOS ===
  { name: 'Alimentación', type: 'expense', icon: '🍽️', color: '#f97316', isSystem: true },
  { name: 'Supermercado', type: 'expense', icon: '🛒', color: '#fb923c', isSystem: true },
  { name: 'Restaurantes', type: 'expense', icon: '🍔', color: '#fdba74', isSystem: true },
  { name: 'Transporte', type: 'expense', icon: '🚌', color: '#3b82f6', isSystem: true },
  { name: 'Gasolina', type: 'expense', icon: '⛽', color: '#60a5fa', isSystem: true },
  { name: 'Taxi / Uber', type: 'expense', icon: '🚕', color: '#93c5fd', isSystem: true },
  { name: 'Vivienda', type: 'expense', icon: '🏠', color: '#8b5cf6', isSystem: true },
  { name: 'Arriendo', type: 'expense', icon: '🏢', color: '#a78bfa', isSystem: true },
  { name: 'Servicios públicos', type: 'expense', icon: '💡', color: '#c4b5fd', isSystem: true },
  { name: 'Salud', type: 'expense', icon: '🏥', color: '#ef4444', isSystem: true },
  { name: 'Medicamentos', type: 'expense', icon: '💊', color: '#f87171', isSystem: true },
  { name: 'Educación', type: 'expense', icon: '📚', color: '#14b8a6', isSystem: true },
  { name: 'Ropa y accesorios', type: 'expense', icon: '👗', color: '#ec4899', isSystem: true },
  { name: 'Entretenimiento', type: 'expense', icon: '🎬', color: '#f59e0b', isSystem: true },
  { name: 'Suscripciones', type: 'expense', icon: '📱', color: '#fbbf24', isSystem: true },
  { name: 'Tecnología', type: 'expense', icon: '💻', color: '#6366f1', isSystem: true },
  { name: 'Mascotas', type: 'expense', icon: '🐾', color: '#84cc16', isSystem: true },
  { name: 'Deudas / Créditos', type: 'expense', icon: '💳', color: '#ef4444', isSystem: true },
  { name: 'Otros gastos', type: 'expense', icon: '📦', color: '#94a3b8', isSystem: true },

  // === INGRESOS ===
  { name: 'Salario', type: 'income', icon: '💼', color: '#22c55e', isSystem: true },
  { name: 'Nómina', type: 'income', icon: '🧾', color: '#4ade80', isSystem: true },
  { name: 'Freelance', type: 'income', icon: '💻', color: '#86efac', isSystem: true },
  { name: 'Negocio propio', type: 'income', icon: '🏪', color: '#16a34a', isSystem: true },
  { name: 'Inversiones', type: 'income', icon: '📈', color: '#15803d', isSystem: true },
  { name: 'Arriendos recibidos', type: 'income', icon: '🏠', color: '#166534', isSystem: true },
  { name: 'Bonificaciones', type: 'income', icon: '🎁', color: '#bbf7d0', isSystem: true },
  { name: 'Otros ingresos', type: 'income', icon: '💰', color: '#6b7280', isSystem: true },

  // === TRANSFERENCIAS ===
  { name: 'Transferencia', type: 'transfer', icon: '↔️', color: '#0ea5e9', isSystem: true },
  { name: 'Ahorro', type: 'transfer', icon: '🏦', color: '#0284c7', isSystem: true },
];

async function main() {
  console.log('🌱 Seeding categories...');

  for (const cat of categories) {
    await prisma.category.upsert({
      where: {
        // We don't have a unique constraint on name, so check if it already exists
        // Use a workaround: try to find it first
        id: `system_${cat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`
      },
      update: {},
      create: {
        id: `system_${cat.name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`,
        name: cat.name,
        type: cat.type,
        icon: cat.icon,
        color: cat.color,
        isSystem: cat.isSystem,
        userId: null,
      },
    });
  }

  const count = await prisma.category.count({ where: { isSystem: true } });
  console.log(`✅ Done! ${count} system categories ready.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
