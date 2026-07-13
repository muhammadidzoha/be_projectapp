-- AlterTable
ALTER TABLE `nutritions` ADD COLUMN `monitoringPeriodId` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `responses` ADD COLUMN `periodLabel` VARCHAR(7) NULL;

-- CreateTable
CREATE TABLE `monitoring_periods` (
    `id` VARCHAR(191) NOT NULL,
    `familyId` VARCHAR(255) NOT NULL,
    `label` VARCHAR(255) NOT NULL,
    `startDate` DATE NOT NULL,
    `endDate` DATE NOT NULL,
    `createdAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),
    `updatedAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),

    UNIQUE INDEX `monitoring_periods_familyId_label_key`(`familyId`, `label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `nutritions` ADD CONSTRAINT `nutritions_monitoringPeriodId_fkey` FOREIGN KEY (`monitoringPeriodId`) REFERENCES `monitoring_periods`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `monitoring_periods` ADD CONSTRAINT `monitoring_periods_familyId_fkey` FOREIGN KEY (`familyId`) REFERENCES `families`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
