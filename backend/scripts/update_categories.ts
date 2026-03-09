import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const newCategories = [
  { name: 'Alquiler / Hipoteca', type: 'expense', icon: '🏠' },
  { name: 'Mantenimiento del hogar', type: 'expense', icon: '🛠️' },
  { name: 'Seguro de vivienda', type: 'expense', icon: '🛡️' },
  { name: 'Servicios Públicos', type: 'expense', icon: '⚡' },
  { name: 'Servicio de Internet', type: 'expense', icon: '🌐' },
  { name: 'Plan de celular', type: 'expense', icon: '📱' },
  { name: 'Supermercado / Despensa', type: 'expense', icon: '🛒' },
  { name: 'Restaurantes / Comer fuera', type: 'expense', icon: '🍽️' },
  { name: 'Cafés / Snacks', type: 'expense', icon: '☕' },
  { name: 'Combustible / Gasolina', type: 'expense', icon: '⛽' },
  { name: 'Transporte público', type: 'expense', icon: '🚌' },
  { name: 'Uber / Taxi', type: 'expense', icon: '🚕' },
  { name: 'Seguro de auto', type: 'expense', icon: '🚗' },
  { name: 'Mantenimiento de auto', type: 'expense', icon: '🔧' },
  { name: 'Peajes / Estacionamiento', type: 'expense', icon: '🅿️' },
  { name: 'Seguro médico', type: 'expense', icon: '⚕️' },
  { name: 'Consultas médicas', type: 'expense', icon: '👨‍⚕️' },
  { name: 'Farmacia / Medicamentos', type: 'expense', icon: '💊' },
  { name: 'Gimnasio / Deportes', type: 'expense', icon: '🏋️' },
  { name: 'Cuidado personal / Peluquería', type: 'expense', icon: '✂️' },
  { name: 'Ropa y Calzado', type: 'expense', icon: '👕' },
  { name: 'Matrícula / Mensualidad escolar', type: 'expense', icon: '🏫' },
  { name: 'Cursos / Certificaciones', type: 'expense', icon: '🎓' },
  { name: 'Libros y Materiales', type: 'expense', icon: '📚' },
  { name: 'Suscripciones', type: 'expense', icon: '📺' },
  { name: 'Cine / Salidas / Ocio', type: 'expense', icon: '🎬' },
  { name: 'Hobbies', type: 'expense', icon: '🎨' },
  { name: 'Vacaciones / Viajes', type: 'expense', icon: '✈️' },
  { name: 'Mascotas', type: 'expense', icon: '🐾' },
  { name: 'Impuestos', type: 'expense', icon: '🏛️' },
  { name: 'Fondo de emergencia', type: 'expense', icon: '💰' },
  { name: 'Inversiones / Jubilación', type: 'expense', icon: '📈' },
  { name: 'Regalos / Celebraciones', type: 'expense', icon: '🎁' },
  { name: 'Imprevistos', type: 'expense', icon: '⚠️' },
  { name: 'Otros gastos', type: 'expense', icon: '📝' },
];

async function main() {
  console.log('Replacing system categories with the new specific list...');

  // 1. Unmark old system categories instead of deleting to avoid breaking foreign keys
  await prisma.category.updateMany({
    where: { isSystem: true, type: 'expense' },
    data: { isSystem: false }
  });

  // 2. Insert the new clean list
  for (const cat of newCategories) {
    // Check if it already exists to avoid duplicates
    const exists = await prisma.category.findFirst({
        where: { name: cat.name, isSystem: true }
    });

    if (!exists) {
        await prisma.category.create({
            data: {
                ...cat,
                isSystem: true,
                color: '#64748b' // Default color
            }
        });
        console.log(`Added: ${cat.name}`);
    }
  }

  console.log('Categories updated successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
