-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT,
    "emailVerified" TIMESTAMPTZ(6),
    "image" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "city" TEXT,
    "country" TEXT,
    "sex" VARCHAR(10),
    "weight" DOUBLE PRECISION,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6),

    CONSTRAINT "Account_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "Activity" (
    "id" SERIAL NOT NULL,
    "sourceId" VARCHAR(30) NOT NULL,
    "source" VARCHAR(100) NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" TIMESTAMPTZ(6) NOT NULL,
    "elapsedTime" INTEGER NOT NULL,
    "movingTime" INTEGER NOT NULL,
    "distance" DOUBLE PRECISION,
    "elevationGain" DOUBLE PRECISION,
    "calories" SMALLINT,
    "averageWatts" SMALLINT,
    "maxWatts" SMALLINT,
    "normalizedPower" SMALLINT,
    "trainingLoad" SMALLINT,
    "averageHR" SMALLINT,
    "maxHR" SMALLINT,
    "hrLoad" SMALLINT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "averageSpeed" DOUBLE PRECISION,
    "maxSpeed" DOUBLE PRECISION,
    "kilojoules" DOUBLE PRECISION,
    "averageCadence" DOUBLE PRECISION,
    "userId" TEXT,

    CONSTRAINT "Activity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AppConnection" (
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "access_token" TEXT NOT NULL,
    "refresh_token" TEXT,
    "scope" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "AppConnection_pkey" PRIMARY KEY ("provider","providerAccountId")
);

-- CreateTable
CREATE TABLE "FtpHistory" (
    "id" SERIAL NOT NULL,
    "ftp" SMALLINT NOT NULL,
    "effectiveFrom" TIMESTAMPTZ(6) NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "FtpHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fitness" (
    "id" SERIAL NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TIMESTAMPTZ(6) NOT NULL,
    "fitness" DOUBLE PRECISION,
    "fatigue" DOUBLE PRECISION,
    "form" DOUBLE PRECISION,
    "acwr" DOUBLE PRECISION,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "Fitness_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_sourceId_key" ON "Activity"("sourceId");

-- CreateIndex
CREATE UNIQUE INDEX "FtpHistory_userId_effectiveFrom_key" ON "FtpHistory"("userId", "effectiveFrom");

-- CreateIndex
CREATE UNIQUE INDEX "Fitness_date_key" ON "Fitness"("date");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AppConnection" ADD CONSTRAINT "AppConnection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FtpHistory" ADD CONSTRAINT "FtpHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fitness" ADD CONSTRAINT "Fitness_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
