-- CreateTable
CREATE TABLE "Waitlist" (
    "id" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "reservationDate" TIMESTAMP(3) NOT NULL,
    "status" TEXT,

    CONSTRAINT "Waitlist_pkey" PRIMARY KEY ("id")
);
