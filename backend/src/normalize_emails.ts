import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function normalizeEmailsRaw() {
  console.log('--- Starting raw email normalization ---');
  try {
    const result = await prisma.$executeRawUnsafe(`UPDATE users SET email = LOWER(email);`);
    console.log(`Raw normalization complete. Updated records: ${result}`);
    
    const checkResult = await prisma.$queryRawUnsafe(`SELECT email FROM users WHERE email = 'jaimesvasquez0519@gmail.com';`);
    console.log(`Check target email:`, checkResult);

  } catch (error) {
    console.error('Error normalizing emails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeEmailsRaw();
