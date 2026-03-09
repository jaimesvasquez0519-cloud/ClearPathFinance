-- AlterTable
ALTER TABLE "accounts" ADD COLUMN "account_number" TEXT;

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_credit_cards" (
    "card_id" TEXT NOT NULL PRIMARY KEY,
    "user_id" TEXT NOT NULL,
    "bank_name" TEXT NOT NULL,
    "card_name" TEXT NOT NULL,
    "last_four_digits" TEXT,
    "card_network" TEXT NOT NULL,
    "credit_limit" REAL NOT NULL,
    "current_balance" REAL NOT NULL DEFAULT 0,
    "cut_day" INTEGER NOT NULL,
    "payment_due_day" INTEGER NOT NULL,
    "interest_rate_monthly" REAL,
    "minimum_payment_pct" REAL,
    "color" TEXT,
    CONSTRAINT "credit_cards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users" ("user_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_credit_cards" ("bank_name", "card_id", "card_name", "card_network", "color", "credit_limit", "cut_day", "interest_rate_monthly", "minimum_payment_pct", "payment_due_day", "user_id") SELECT "bank_name", "card_id", "card_name", "card_network", "color", "credit_limit", "cut_day", "interest_rate_monthly", "minimum_payment_pct", "payment_due_day", "user_id" FROM "credit_cards";
DROP TABLE "credit_cards";
ALTER TABLE "new_credit_cards" RENAME TO "credit_cards";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
