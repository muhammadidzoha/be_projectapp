/*
  Warnings:

  - The values [KURUS,NORMAL,GEMUK] on the enum `nutrition_status_status` will be removed. If these variants are still used in the database, this will fail.
  - Added the required column `displayName` to the `nutrition_status` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `nutrition_status` ADD COLUMN `displayName` VARCHAR(255) NOT NULL,
    MODIFY `status` ENUM('GIZI_BURUK_KURANG', 'GIZI_BAIK', 'OVERWEIGHT_OBESITAS') NOT NULL;
