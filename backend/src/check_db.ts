import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Database Check ---');
  try {
    const userCount = await prisma.user.count();
    console.log(`Total users: ${userCount}`);

    const users = await prisma.user.findMany({
      select: {
          email: true,
          fullName: true,
          status: true
      }
    });
    console.log('Users in database:');
    users.forEach(u => console.log(`- ${u.email} (${u.fullName}) [${u.status}]`));

    const targetEmail = 'jaimesvasquez0519@gmail.com'.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: targetEmail } });
    if (user) {
      console.log(`User ${targetEmail} FOUND!`);
    } else {
      console.log(`User ${targetEmail} NOT FOUND.`);
    }
  } catch (error) {
    console.error('Error querying database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
