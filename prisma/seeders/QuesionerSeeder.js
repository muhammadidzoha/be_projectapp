import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedQuesioners = async () => {
  try {
    const existingQuesioners = await prisma.quesioner.findMany({
      where: {
        OR: [
          { title: "Tingkat Pengetahuan Gizi Seimbang" },
          { title: "Kebiasaan Sehari-hari Anak" },
          { title: "Pelayanan Kesehatan Sekolah" },
          { title: "Lingkungan Sekolah" },
        ],
      },
    });

    if (existingQuesioners.length > 0) {
      console.log("Quesioners already exist");
      return;
    }

    await prisma.quesioner.createMany({
      data: [
        {
          title: "Tingkat Pengetahuan Gizi Seimbang",
          description: "Quisioner tentang pengetahuan gizi seimbang orang tua",
        },
        {
          title: "Kebiasaan Sehari-hari Anak",
          description: "Quisioner untuk mengetahui kebiasaaan sehari-hari anak",
        },
        {
          title: "Pelayanan Kesehatan Sekolah",
          description: "Quisioner Pelayanan kesehatan di sekolah",
        },
        {
          title: "Lingkungan Sekolah",
          description: "Quisioner Tentang Lingkungan Sekolah",
        },
      ],
    });
    console.log("Quesioner seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
