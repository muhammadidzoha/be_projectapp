import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedCategories = async () => {
  try {
    const existingCategories = await prisma.category.findMany({
      where: {
        OR: [
          { name: "Tingkat Pengetahuan Gizi Seimbang" },
          { name: "Pelaksanaan Pendidikan Kesehatan" },
          { name: "Kebiasaan Sehari-hari Anak" },
          { name: "Pelaksanaan Pelayanan Kesehatan" },
          { name: "Pembinaan Lingkungan Sehat" },
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
          name: "Pelaksanaan Pendidikan Kesehatan",
          path: "/pelaksanaan-pendidikan-kesehatan",
        },
        {
          name: "Kebiasaan Sehari-hari Anak",
          path: "/kebiasaan-sehari-hari-anak",
        },
        {
          name: "Pelaksanaan Pelayanan Kesehatan",
          path: "/pelaksanaan-pelayanan-kesehatan",
        },
        {
          name: "Pembinaan Lingkungan Sehat",
          path: "/pembinaan-lingkungan-sehat",
        },
      ],
    });
    console.log("Categories seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
