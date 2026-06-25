/*
  Warnings:

  - You are about to drop the column `text_value` on the `answers` table. All the data in the column will be lost.
  - You are about to drop the column `residenceId` on the `family_members` table. All the data in the column will be lost.
  - The values [MULTIPLE_CHOICE,TEXT] on the enum `questions_type` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the `residences` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `socioEconomicId` to the `family_members` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `family_members` DROP FOREIGN KEY `family_members_residenceId_fkey`;

-- DropIndex
DROP INDEX `family_members_residenceId_fkey` ON `family_members`;

-- AlterTable
ALTER TABLE `answers` DROP COLUMN `text_value`;

-- AlterTable
ALTER TABLE `family_members` DROP COLUMN `residenceId`,
    ADD COLUMN `socioEconomicId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `questions` MODIFY `type` ENUM('BOOLEAN', 'SCALE') NOT NULL;

-- DropTable
DROP TABLE `residences`;

-- CreateTable
CREATE TABLE `socio_economic` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `residenceStatus` ENUM('MILIK_SENDIRI', 'MENYEWA', 'BERSAMA_ORANG_TUA', 'LAINNYA') NOT NULL,
    `address` VARCHAR(255) NULL,
    `childrenCount` ENUM('SATU', 'DUA_SAMPAI_TIGA', 'EMPAT_ATAU_LEBIH') NOT NULL,
    `underFiveCount` ENUM('TIDAK_ADA', 'SATU', 'DUA_SAMPAI_TIGA', 'EMPAT_ATAU_LEBIH') NOT NULL,
    `familyIncomeLevel` ENUM('KURANG_DARI_5_JUTA', 'LEBIH_DARI_5_JUTA') NOT NULL,
    `createdAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),
    `updatedAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_socioEconomicId_fkey` FOREIGN KEY (`socioEconomicId`) REFERENCES `socio_economic`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
