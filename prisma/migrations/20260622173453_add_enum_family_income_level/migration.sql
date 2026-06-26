/*
  Warnings:

  - The values [LAINNYA] on the enum `socio_economic_residenceStatus` will be removed. If these variants are still used in the database, this will fail.
  - The values [KURANG_DARI_5_JUTA,LEBIH_DARI_5_JUTA] on the enum `socio_economic_familyIncomeLevel` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterTable
ALTER TABLE `socio_economic` MODIFY `residenceStatus` ENUM('MILIK_SENDIRI', 'MENYEWA', 'BERSAMA_ORANG_TUA') NOT NULL,
    MODIFY `familyIncomeLevel` ENUM('KURANG_DARI_LIMA_JUTA', 'LIMA_JUTA_SAMPAI_SEPULUH_JUTA', 'LEBIH_DARI_SEPULUH_JUTA') NOT NULL;
