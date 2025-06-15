import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedCategories = async () => {
  try {
    const existingCategories = await prisma.category.findMany({
      where: {
        OR: [
          { name: "Tingkat Pengetahuan Gizi Seimbang" },
          { name: "Kebiasaan Sehari-hari Anak" },
          { name: "Pelayanan Kesehatan Sekolah" },
          { name: "Lingkungan Sekolah" },
        ],
      },
    });

    if (existingCategories.length > 0) {
      console.log("Categories already exist");
      return;
    }

    await prisma.category.createMany({
      data: [
        {
          name: "Tingkat Pengetahuan Gizi Seimbang",
          path: "/tingkat-pengetahuan-gizi-seimbang",
        },
        {
          name: "Kebiasaan Sehari-hari Anak",
          path: "/kebiasaan-sehari-hari-anak",
        },
        {
          name: "Pelayanan Kesehatan Sekolah",
          path: "/pelayanan-kesehatan-sekolah",
        },
        {
          name: "Lingkungan Sekolah",
          path: "/lingkungan-sekolah",
        },
      ],
    });
    console.log("Categories seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
