ALTER TABLE `nutritions` DROP FOREIGN KEY `nutritions_familyMemberId_fkey`;

DROP INDEX `nutritions_familyMemberId_key` ON `nutritions`;

ALTER TABLE `nutritions` ADD COLUMN `measurementDate` DATETIME(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2);

ALTER TABLE `nutritions` ADD CONSTRAINT `nutritions_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `family_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
