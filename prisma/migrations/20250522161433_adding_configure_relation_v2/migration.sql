-- DropForeignKey
ALTER TABLE `families` DROP FOREIGN KEY `families_userId_fkey`;

-- DropForeignKey
ALTER TABLE `family_members` DROP FOREIGN KEY `family_members_familyId_fkey`;

-- DropForeignKey
ALTER TABLE `family_members` DROP FOREIGN KEY `family_members_residenceId_fkey`;

-- DropForeignKey
ALTER TABLE `jobs` DROP FOREIGN KEY `jobs_jobTypeId_fkey`;

-- DropForeignKey
ALTER TABLE `nutritions` DROP FOREIGN KEY `nutritions_createdBy_fkey`;

-- DropForeignKey
ALTER TABLE `nutritions` DROP FOREIGN KEY `nutritions_familyMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `students` DROP FOREIGN KEY `students_classId_fkey`;

-- DropForeignKey
ALTER TABLE `students` DROP FOREIGN KEY `students_familyMemberId_fkey`;

-- DropForeignKey
ALTER TABLE `teachers` DROP FOREIGN KEY `teachers_user_id_fkey`;

-- DropIndex
DROP INDEX `family_members_familyId_fkey` ON `family_members`;

-- DropIndex
DROP INDEX `family_members_residenceId_fkey` ON `family_members`;

-- DropIndex
DROP INDEX `jobs_jobTypeId_fkey` ON `jobs`;

-- DropIndex
DROP INDEX `nutritions_createdBy_fkey` ON `nutritions`;

-- DropIndex
DROP INDEX `students_classId_fkey` ON `students`;

-- AddForeignKey
ALTER TABLE `teachers` ADD CONSTRAINT `teachers_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `families` ADD CONSTRAINT `families_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `family_members` ADD CONSTRAINT `family_members_residenceId_fkey` FOREIGN KEY (`residenceId`) REFERENCES `residences`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `jobs` ADD CONSTRAINT `jobs_jobTypeId_fkey` FOREIGN KEY (`jobTypeId`) REFERENCES `job_types`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutritions` ADD CONSTRAINT `nutritions_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutritions` ADD CONSTRAINT `nutritions_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `family_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `family_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `students` ADD CONSTRAINT `students_classId_fkey` FOREIGN KEY (`classId`) REFERENCES `classes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
