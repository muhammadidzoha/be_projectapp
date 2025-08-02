-- AlterTable
ALTER TABLE `quesioners` ADD COLUMN `for` VARCHAR(191) NOT NULL DEFAULT '';

-- AddForeignKey
ALTER TABLE `nutritions` ADD CONSTRAINT `nutritions_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `family_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
