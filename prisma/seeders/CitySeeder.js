import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedCity = async () => {
  try {
    await prisma.city.createMany({
      data: [
        { name: "Kepulauan Seribu", province_id: 1 },
        { name: "Jakarta Barat", province_id: 1 },
        { name: "Jakarta Pusat", province_id: 1 },
        { name: "Jakarta Selatan", province_id: 1 },
        { name: "Jakarta Timur", province_id: 1 },
        { name: "Jakarta Utara", province_id: 1 },
      ],
      skipDuplicates: true,
    });
    console.log("City seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
