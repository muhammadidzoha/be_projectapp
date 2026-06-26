-- DropForeignKey
ALTER TABLE `recommendations` DROP FOREIGN KEY `recommendations_studentId_fkey`;

-- DropIndex
DROP INDEX `recommendations_studentId_fkey` ON `recommendations`;

-- AddForeignKey
ALTER TABLE `recommendations` ADD CONSTRAINT `recommendations_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `students`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
