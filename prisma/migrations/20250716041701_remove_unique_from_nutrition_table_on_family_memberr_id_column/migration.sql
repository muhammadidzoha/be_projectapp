-- DropForeignKey
ALTER TABLE `nutritions` DROP FOREIGN KEY `nutritions_familyMemberId_fkey`;

-- DropIndex
DROP INDEX `nutritions_familyMemberId_key` ON `nutritions`;

