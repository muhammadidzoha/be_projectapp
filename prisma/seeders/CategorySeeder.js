import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedCategories = async () => {
  try {
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
      skipDuplicates: true,
    });
    console.log("Categories seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
