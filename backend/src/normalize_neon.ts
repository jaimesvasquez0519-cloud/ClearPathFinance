import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: "postgresql://neondb_owner:npg_uXy3Oje4Gmxa@ep-old-sea-adw4mi7b-pooler.c-2.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    },
  },
});

async function normalizeEmailsRaw() {
  console.log('--- Connecting to Neon Database ---');
  try {
    const result = await prisma.$executeRawUnsafe(`UPDATE users SET email = LOWER(email);`);
    console.log(`Raw normalization complete on Neon. Updated records: ${result}`);
    
    // Check if the user exists
    const users = await prisma.user.findMany({ select: { email: true, status: true } });
    console.log("Users in Neon:", users);

  } catch (error) {
    console.error('Error normalizing emails in Neon:', error);
  } finally {
    await prisma.$disconnect();
  }
}

normalizeEmailsRaw();
