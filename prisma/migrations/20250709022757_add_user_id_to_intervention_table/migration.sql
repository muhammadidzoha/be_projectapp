-- AlterTable
ALTER TABLE `interventions` ADD COLUMN `user_id` VARCHAR(191) NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE `interventions` ADD CONSTRAINT `interventions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
