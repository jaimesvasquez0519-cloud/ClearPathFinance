import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Import routes directly
const routes = require('./routes').default || require('./routes');
app.use('/api', routes);

app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

import { prisma } from './db';
import { seedCategories } from '../prisma/seed';

const PORT = process.env.PORT || 5000;

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  try {
    const count = await seedCategories(prisma);
    console.log(`🌱 Categories auto-seeded: ${count} ready.`);
  } catch (err) {
    console.error('❌ Error during auto-seed:', err);
  }
});
