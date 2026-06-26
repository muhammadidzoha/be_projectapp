/*
  Warnings:

  - The values [PEKERJA_TETAP,PEKERJA_TIDAK_TETAP,PEKERJA_PARUH_WAKTU,PEKERJA_FREELANCE,PEKERJA_MUSIMAN,PEKERJA_KONTRAK,PEGAWAI_NEGERI_SIPIL,PEGAWAI_BUMN,PEGAWAI_SWASTA] on the enum `job_types_type` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `income` on the `jobs` table. All the data in the column will be lost.
  - You are about to drop the column `birthWeight` on the `nutritions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `family_members` ADD COLUMN `age` INTEGER NULL,
    MODIFY `birthDate` DATE NULL,
    MODIFY `education` ENUM('TIDAK_SEKOLAH', 'SD', 'SMP', 'SMA', 'D1', 'D2', 'D3', 'S1', 'S2', 'S3') NOT NULL,
    MODIFY `gender` ENUM('L', 'P') NULL;

-- AlterTable
ALTER TABLE `job_types` MODIFY `type` ENUM('TIDAK_BEKERJA', 'BURUH', 'KARYAWAN_SWASTA', 'ASN_BUMN', 'WIRASWASTA') NOT NULL;

-- AlterTable
ALTER TABLE `jobs` DROP COLUMN `income`;

-- AlterTable
ALTER TABLE `nutritions` DROP COLUMN `birthWeight`,
    MODIFY `height` FLOAT NULL,
    MODIFY `weight` FLOAT NULL;

-- AlterTable
ALTER TABLE `questions` ADD COLUMN `is_negative` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `BmiReference` (
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

    UNIQUE INDEX `BmiReference_ageYear_ageMonthFrom_ageMonthTo_gender_key`(`ageYear`, `ageMonthFrom`, `ageMonthTo`, `gender`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
