/*
  Warnings:

  - A unique constraint covering the columns `[recommendationId]` on the table `interventions` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE `interventions` DROP FOREIGN KEY `interventions_user_id_fkey`;

-- DropIndex
DROP INDEX `interventions_user_id_fkey` ON `interventions`;

-- AlterTable
ALTER TABLE `interventions` ALTER COLUMN `user_id` DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX `interventions_recommendationId_key` ON `interventions`(`recommendationId`);

-- AddForeignKey
ALTER TABLE `interventions` ADD CONSTRAINT `interventions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
