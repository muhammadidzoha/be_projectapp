/*
  Warnings:

  - You are about to drop the `BmiReference` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `BmiReference`;

-- CreateTable
CREATE TABLE `bmi_references` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `ageYear` INTEGER NOT NULL,
    `ageMonthFrom` INTEGER NOT NULL,
    `ageMonthTo` INTEGER NOT NULL,
    `gender` ENUM('L', 'P') NOT NULL,
    `sdMinus3Min` DOUBLE NOT NULL,
    `sdMinus3Max` DOUBLE NOT NULL,
    `sdMinus2Min` DOUBLE NOT NULL,
    `sdMinus2Max` DOUBLE NOT NULL,
    `sdMinus1Min` DOUBLE NOT NULL,
    `sdMinus1Max` DOUBLE NOT NULL,
    `medianMin` DOUBLE NOT NULL,
    `medianMax` DOUBLE NOT NULL,
    `sdPlus1Min` DOUBLE NOT NULL,
    `sdPlus1Max` DOUBLE NOT NULL,
    `sdPlus2Min` DOUBLE NOT NULL,
    `sdPlus2Max` DOUBLE NOT NULL,
    `sdPlus3Min` DOUBLE NOT NULL,
    `sdPlus3Max` DOUBLE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `bmi_references_ageYear_ageMonthFrom_ageMonthTo_gender_key`(`ageYear`, `ageMonthFrom`, `ageMonthTo`, `gender`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
