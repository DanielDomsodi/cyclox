/*
  Warnings:

  - You are about to drop the `AppConnection` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "AppConnection" DROP CONSTRAINT "AppConnection_userId_fkey";

-- DropTable
DROP TABLE "AppConnection";

-- CreateTable
CREATE TABLE "ServiceConnection" (
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "scope" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "ServiceConnection_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- AddForeignKey
ALTER TABLE "ServiceConnection" ADD CONSTRAINT "ServiceConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
