/*
  Warnings:

  - A unique constraint covering the columns `[name]` on the table `Routine` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Routine_name_key" ON "Routine"("name");
