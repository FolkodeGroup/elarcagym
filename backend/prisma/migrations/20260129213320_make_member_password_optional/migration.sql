-- DropForeignKey
ALTER TABLE "BiometricLog" DROP CONSTRAINT "BiometricLog_memberId_fkey";

-- DropForeignKey
ALTER TABLE "Diet" DROP CONSTRAINT "Diet_memberId_fkey";

-- DropForeignKey
ALTER TABLE "ExerciseDetail" DROP CONSTRAINT "ExerciseDetail_routineDayId_fkey";

-- DropForeignKey
ALTER TABLE "HabitualSchedule" DROP CONSTRAINT "HabitualSchedule_memberId_fkey";

-- DropForeignKey
ALTER TABLE "PaymentLog" DROP CONSTRAINT "PaymentLog_memberId_fkey";

-- DropForeignKey
ALTER TABLE "Reservation" DROP CONSTRAINT "Reservation_slotId_fkey";

-- DropForeignKey
ALTER TABLE "Routine" DROP CONSTRAINT "Routine_memberId_fkey";

-- DropForeignKey
ALTER TABLE "RoutineDay" DROP CONSTRAINT "RoutineDay_routineId_fkey";

-- DropForeignKey
ALTER TABLE "SaleItem" DROP CONSTRAINT "SaleItem_saleId_fkey";

-- AlterTable
ALTER TABLE "BiometricLog" ADD COLUMN     "abdomen" DOUBLE PRECISION,
ADD COLUMN     "glutes" DOUBLE PRECISION,
ADD COLUMN     "leftArm" DOUBLE PRECISION,
ADD COLUMN     "leftCalf" DOUBLE PRECISION,
ADD COLUMN     "leftThigh" DOUBLE PRECISION,
ADD COLUMN     "neck" DOUBLE PRECISION,
ADD COLUMN     "rightArm" DOUBLE PRECISION,
ADD COLUMN     "rightCalf" DOUBLE PRECISION,
ADD COLUMN     "rightThigh" DOUBLE PRECISION,
ALTER COLUMN "height" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Member" ADD COLUMN     "bioObjective" TEXT,
ADD COLUMN     "lastAttendance" TIMESTAMP(3),
ADD COLUMN     "nutritionPlan" JSONB,
ALTER COLUMN "phase" DROP NOT NULL,
ALTER COLUMN "password" DROP NOT NULL;

-- AlterTable
ALTER TABLE "SaleItem" ADD COLUMN     "productName" TEXT;

-- AlterTable
ALTER TABLE "Slot" ADD COLUMN     "color" TEXT,
ADD COLUMN     "target" TEXT;

-- AddForeignKey
ALTER TABLE "HabitualSchedule" ADD CONSTRAINT "HabitualSchedule_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BiometricLog" ADD CONSTRAINT "BiometricLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineDay" ADD CONSTRAINT "RoutineDay_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExerciseDetail" ADD CONSTRAINT "ExerciseDetail_routineDayId_fkey" FOREIGN KEY ("routineDayId") REFERENCES "RoutineDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Diet" ADD CONSTRAINT "Diet_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentLog" ADD CONSTRAINT "PaymentLog_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "Member"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleItem" ADD CONSTRAINT "SaleItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reservation" ADD CONSTRAINT "Reservation_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "Slot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
