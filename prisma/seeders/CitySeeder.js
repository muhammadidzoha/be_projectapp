import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedCity = async () => {
  try {
    const existingCity = await prisma.city.findMany({
      where: {
        OR: [
          { name: "Kepulauan Seribu" },
          { name: "Jakarta Barat" },
          { name: "Jakarta Pusat" },
          { name: "Jakarta Selatan" },
          { name: "Jakarta Timur" },
          { name: "Jakarta Utara" },
        ],
      },
    });

    if (existingCity.length > 0) {
      console.log("City already exists");
      return;
    }

    await prisma.city.createMany({
      data: [
        { name: "Kepulauan Seribu", province_id: 1 },
        { name: "Jakarta Barat", province_id: 1 },
        { name: "Jakarta Pusat", province_id: 1 },
        { name: "Jakarta Selatan", province_id: 1 },
        { name: "Jakarta Timur", province_id: 1 },
        { name: "Jakarta Utara", province_id: 1 },
      ],
    });
    console.log("City seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
