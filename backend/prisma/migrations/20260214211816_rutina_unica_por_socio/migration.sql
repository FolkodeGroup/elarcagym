/*
  Warnings:

  - A unique constraint covering the columns `[name,memberId]` on the table `Routine` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Routine_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Routine_name_memberId_key" ON "Routine"("name", "memberId");
