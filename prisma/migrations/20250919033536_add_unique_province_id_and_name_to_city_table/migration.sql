/*
  Warnings:

  - A unique constraint covering the columns `[province_id,name]` on the table `cities` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `cities_name_key` ON `cities`;

-- CreateIndex
CREATE UNIQUE INDEX `cities_province_id_name_key` ON `cities`(`province_id`, `name`);
