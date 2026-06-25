-- CreateTable
CREATE TABLE `partnerships` (
    `id` VARCHAR(191) NOT NULL,
    `schoolId` INTEGER NOT NULL,
    `healthcareId` INTEGER NOT NULL,
    `createdAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),

    UNIQUE INDEX `partnerships_schoolId_healthcareId_key`(`schoolId`, `healthcareId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `partnerships` ADD CONSTRAINT `partnerships_schoolId_fkey` FOREIGN KEY (`schoolId`) REFERENCES `institutions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `partnerships` ADD CONSTRAINT `partnerships_healthcareId_fkey` FOREIGN KEY (`healthcareId`) REFERENCES `institutions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
