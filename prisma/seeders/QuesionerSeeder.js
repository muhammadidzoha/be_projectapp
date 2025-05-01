import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedQuesioners = async () => {
  try {
    const existingQuesioners = await prisma.quesioner.findMany({
      where: {
        OR: [
          { title: "Tingkat Pengetahuan Gizi Seimbang" },
          { title: "Pelaksanaan Pendidikan Kesehatan" },
          { title: "Kebiasaan Sehari-hari Anak" },
          { title: "Pelaksanaan Pelayanan Kesehatan" },
          { title: "Pembinaan Lingkungan Sehat" },
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
          title: "Pelaksanaan Pendidikan Kesehatan",
          description: "Quisioner pelaksanaan pendidikan kesehatan di sekolah",
        },
        {
          title: "Kebiasaan Sehari-hari Anak",
          description: "Quisioner untuk mengetahui kebiasaaan sehari-hari anak",
        },
        {
          title: "Pelaksanaan Pelayanan Kesehatan",
          description: "Quisioner Pelaksanaan pelayanan kesehatan",
        },
        {
          title: "Pembinaan Lingkungan Sehat",
          description: "Quisioner Tentang Pembinaan Lingkungan Sehat",
        },
      ],
    });
    console.log("Quesioner seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
