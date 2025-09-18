/*
  Warnings:

  - Added the required column `healthcare_id` to the `recommendations` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `recommendations` ADD COLUMN `healthcare_id` INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_healthcare_id_fkey` FOREIGN KEY (`healthcare_id`) REFERENCES `institutions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
