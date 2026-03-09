-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_budgets" (
    "budget_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "category_id" TEXT,
    "period" TEXT NOT NULL,
    "amount_limit" REAL NOT NULL,
    "spent_amount" REAL NOT NULL DEFAULT 0,
    "alert_sent" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "budgets_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "budgets_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_budgets" ("alert_sent", "amount_limit", "budget_id", "category_id", "period", "spent_amount", "user_id") SELECT "alert_sent", "amount_limit", "budget_id", "category_id", "period", "spent_amount", "user_id" FROM "budgets";
DROP TABLE "budgets";
ALTER TABLE "new_budgets" RENAME TO "budgets";
CREATE TABLE "new_transactions" (
    "transaction_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "currency" TEXT NOT NULL,
    "category_id" TEXT,
    "account_id" TEXT,
    "card_id" TEXT,
    "description" TEXT,
    "transaction_date" DATETIME NOT NULL,
    "installments_total" INTEGER NOT NULL DEFAULT 1,
    "installment_current" INTEGER NOT NULL DEFAULT 1,
    "receipt_url" TEXT,
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "transactions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "transactions_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories" ("category_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "accounts" ("account_id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "transactions_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "credit_cards" ("card_id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_transactions" ("account_id", "amount", "card_id", "category_id", "created_at", "currency", "description", "installment_current", "installments_total", "is_recurring", "receipt_url", "transaction_date", "transaction_id", "type", "user_id") SELECT "account_id", "amount", "card_id", "category_id", "created_at", "currency", "description", "installment_current", "installments_total", "is_recurring", "receipt_url", "transaction_date", "transaction_id", "type", "user_id" FROM "transactions";
DROP TABLE "transactions";
ALTER TABLE "new_transactions" RENAME TO "transactions";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
