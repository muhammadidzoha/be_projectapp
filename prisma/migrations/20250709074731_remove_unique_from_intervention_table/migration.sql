-- DropForeignKey
ALTER TABLE `interventions` DROP FOREIGN KEY `interventions_recommendationId_fkey`;

-- DropIndex
DROP INDEX `interventions_recommendationId_key` ON `interventions`;

