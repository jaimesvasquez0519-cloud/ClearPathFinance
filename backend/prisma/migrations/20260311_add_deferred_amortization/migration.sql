-- Add isDeferred column to transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "is_deferred" BOOLEAN NOT NULL DEFAULT false;

-- Add amortizationSchedule column to transactions
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "amortization_schedule" JSONB;

-- Add installment tracking columns
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "installments_total" INTEGER;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "installments_current" INTEGER;
ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "installment_interest_rate" DOUBLE PRECISION;
