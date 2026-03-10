import cron from 'node-cron';
import { prisma } from '../db';
import { addMonths } from 'date-fns';

export const initRecurringTransactionsCron = () => {
  // Run everyday at 00:01
  cron.schedule('1 0 * * *', async () => {
    console.log('⏳ Running recurring transactions check...');
    try {
      const now = new Date();
      
      const dueRecurring = await prisma.recurringTransaction.findMany({
        where: {
          isActive: true,
          nextProcessing: {
            lte: now, // nextProcessing is less than or equal to now
          },
        },
      });

      console.log(`Found ${dueRecurring.length} recurring transactions to process.`);

      for (const recurring of dueRecurring) {
        try {
          // 1. Create the actual transaction
          await prisma.transaction.create({
            data: {
              userId: recurring.userId,
              type: recurring.type,
              amount: recurring.amount,
              currency: recurring.currency,
              categoryId: recurring.categoryId,
              accountId: recurring.accountId,
              cardId: recurring.cardId,
              description: recurring.description || 'Suscripción / Cobro Recurrente',
              transactionDate: now,
              isRecurring: true,
            },
          });

          // 2. Calculate next processing date (add 1 month, handling edge cases implicitly with date-fns)
          let nextDate = addMonths(recurring.nextProcessing, 1);
          
          // Ensure the day of month is correct if possible
          // If the day is 31 and next month has 30, date-fns adjusts. 
          // We can try to keep the original requested dayOfMonth 
          const targetDay = recurring.dayOfMonth;
          const maxDaysInNextMonth = new Date(nextDate.getFullYear(), nextDate.getMonth() + 1, 0).getDate();
          
          nextDate.setDate(Math.min(targetDay, maxDaysInNextMonth));

          // 3. Update the recurring transaction configuration
          await prisma.recurringTransaction.update({
            where: { id: recurring.id },
            data: {
              lastProcessed: now,
              nextProcessing: nextDate,
            },
          });

          console.log(`✅ Processed recurring transaction ${recurring.id} for user ${recurring.userId}`);
        } catch (innerError) {
          console.error(`❌ Error processing recurring tx ${recurring.id}:`, innerError);
        }
      }

      console.log('✅ Recurring transactions check completed.');
    } catch (error) {
      console.error('❌ Error executing recurring transactions cron job:', error);
    }
  });

  console.log('🕒 Recurring transactions cron job scheduled (00:01 daily)');
};
