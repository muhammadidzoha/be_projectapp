import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedJobTypes = async () => {
  try {
    const existingJobTypes = await prisma.jobType.findMany({
      where: {
        OR: [
          { name: "Tidak Bekerja" },
          { name: "Buruh" },
          { name: "Karyawan Swasta" },
          { name: "ASN / BUMN" },
          { name: "Wiraswasta" },
        ],
      },
    });

    if (existingJobTypes.length > 0) {
      console.log("Job types already exist");
      return;
    }

    await prisma.jobType.createMany({
      data: [
        { name: "Tidak Bekerja", type: "TIDAK_BEKERJA" },
        { name: "Buruh", type: "BURUH" },
        { name: "Karyawan Swasta", type: "KARYAWAN_SWASTA" },
        { name: "ASN / BUMN", type: "ASN_BUMN" },
        { name: "Wiraswasta", type: "WIRASWASTA" },
      ],
    });
    console.log("Job types seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
