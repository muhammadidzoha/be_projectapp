-- DropForeignKey
ALTER TABLE `institutions` DROP FOREIGN KEY `institutions_user_id_fkey`;

-- DropForeignKey
ALTER TABLE `students` DROP FOREIGN KEY `students_schoolId_fkey`;

-- DropForeignKey
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_school_id_fkey`;

-- DropIndex
DROP INDEX `students_schoolId_fkey` ON `students`;

-- DropIndex
DROP INDEX `teachers_school_id_fkey` ON `teachers`;

-- AddForeignKey
ALTER TABLE `institutions` ADD CONSTRAINT `institutions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_school_id_fkey` FOREIGN KEY (`school_id`) REFERENCES `institutions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `institutions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
