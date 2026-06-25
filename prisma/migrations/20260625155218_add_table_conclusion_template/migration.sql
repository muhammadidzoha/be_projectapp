-- CreateTable
CREATE TABLE `conclusion_templates` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `target` ENUM('school', 'parent') NOT NULL,
    `content` TEXT NOT NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),
    `updatedAt` TIMESTAMP(2) NOT NULL DEFAULT CURRENT_TIMESTAMP(2),
    `conclusionRuleId` INTEGER NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `conclusion_templates` ADD CONSTRAINT `conclusion_templates_conclusionRuleId_fkey` FOREIGN KEY (`conclusionRuleId`) REFERENCES `conclusion_rules`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
