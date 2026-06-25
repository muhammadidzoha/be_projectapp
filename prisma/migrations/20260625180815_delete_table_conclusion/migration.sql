/*
  Warnings:

  - You are about to drop the `conclusion_rules` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `conclusion_templates` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE `conclusion_templates` DROP FOREIGN KEY `conclusion_templates_conclusionRuleId_fkey`;

-- DropTable
DROP TABLE `conclusion_rules`;

-- DropTable
DROP TABLE `conclusion_templates`;
