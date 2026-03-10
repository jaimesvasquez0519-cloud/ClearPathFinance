/*
  Warnings:

  - Added the required column `role` to the `users` table with a default value of 'user'.
  - Added the required column `status` to the `users` table with a default value of 'pending'.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user',
                    ADD COLUMN "status" TEXT NOT NULL DEFAULT 'pending';
