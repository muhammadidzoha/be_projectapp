import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedJobTypes = async () => {
  try {
    const existingJobTypes = await prisma.jobType.findMany({
      where: {
        OR: [
          { name: "Pekerja Tetap" },
          { name: "Pekerja Tidak Tetap" },
          { name: "Pekerja Paruh Waktu" },
          { name: "Pekerja Freelance" },
          { name: "Pekerja Musiman" },
          { name: "Pekerja Kontrak" },
          { name: "Pekerja Negeri Sipil" },
          { name: "Pekerja BUMN" },
          { name: "Pekerja Swasta" },
        ],
      },
    });

    if (existingJobTypes.length > 0) {
      console.log("Job types already exist");
      return;
    }

    await prisma.jobType.createMany({
      data: [
        { name: "Pekerja Tetap", type: "PEKERJA_TETAP" },
        { name: "Pekerja Tidak Tetap", type: "PEKERJA_TIDAK_TETAP" },
        { name: "Pekerja Paruh Waktu", type: "PEKERJA_PARUH_WAKTU" },
        { name: "Pekerja Freelance", type: "PEKERJA_FREELANCE" },
        { name: "Pekerja Musiman", type: "PEKERJA_MUSIMAN" },
        { name: "Pekerja Kontrak", type: "PEKERJA_KONTRAK" },
        { name: "Pekerja Negeri Sipil", type: "PEGAWAI_NEGERI_SIPIL" },
        { name: "Pekerja BUMN", type: "PEGAWAI_BUMN" },
        { name: "Pekerja Swasta", type: "PEGAWAI_SWASTA" },
      ],
    });
    console.log("Job types seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
