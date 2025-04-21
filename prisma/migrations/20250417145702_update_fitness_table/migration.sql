/*
  Warnings:

  - A unique constraint covering the columns `[userId,date]` on the table `Fitness` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Fitness_date_key";

-- AlterTable
ALTER TABLE "Fitness" ALTER COLUMN "date" SET DATA TYPE DATE;

-- CreateIndex
CREATE UNIQUE INDEX "Fitness_userId_date_key" ON "Fitness"("userId", "date");
