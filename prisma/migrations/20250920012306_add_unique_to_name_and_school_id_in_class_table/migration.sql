/*
  Warnings:

  - A unique constraint covering the columns `[school_id,name]` on the table `classes` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX `classes_name_key` ON `classes`;

-- CreateIndex
CREATE UNIQUE INDEX `classes_school_id_name_key` ON `classes`(`school_id`, `name`);
