-- CreateTable
CREATE TABLE `responses` (
    `id` VARCHAR(191) NOT NULL,
    `quisionerId` INTEGER NOT NULL,
    `created_at` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),
    `totalScore` INTEGER NULL DEFAULT 0,
    `familyMemberId` VARCHAR(255) NULL,
    `institutionId` INTEGER NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `answers` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `questionId` INTEGER NOT NULL,
    `responseId` VARCHAR(255) NOT NULL,
    `score` INTEGER NULL DEFAULT 0,
    `boolean_value` BOOLEAN NULL,
    `text_value` VARCHAR(191) NULL,
    `option_id` INTEGER NULL,
    `scaleValue` INTEGER NULL,

    UNIQUE INDEX `answers_questionId_key`(`questionId`),
    UNIQUE INDEX `answers_questionId_responseId_key`(`questionId`, `responseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `responses` ADD CONSTRAINT `responses_quisionerId_fkey` FOREIGN KEY (`quisionerId`) REFERENCES `quesioners`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `responses` ADD CONSTRAINT `responses_familyMemberId_fkey` FOREIGN KEY (`familyMemberId`) REFERENCES `family_members`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `responses` ADD CONSTRAINT `responses_institutionId_fkey` FOREIGN KEY (`institutionId`) REFERENCES `institutions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `answers` ADD CONSTRAINT `answers_responseId_fkey` FOREIGN KEY (`responseId`) REFERENCES `responses`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
