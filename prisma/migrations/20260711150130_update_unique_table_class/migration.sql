/*
  Warnings:

  - A unique constraint covering the columns `[name,school_id]` on the table `classes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `classes_name_key` ON `classes`;

-- CreateIndex
CREATE UNIQUE INDEX `classes_name_school_id_key` ON `classes`(`name`, `school_id`);
