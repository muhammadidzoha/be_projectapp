import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedNutritionStatus = async () => {
  try {
    const existingNutritionStatus = await prisma.nutritionStatus.findMany({
      where: {
        OR: [
          { status: "KURUS", information: "Kekurangan bb tingkat berat" },
          { status: "KURUS", information: "Kekurangan bb tingkat ringan" },
          { status: "NORMAL", information: "Gizi normal" },
          { status: "GEMUK", information: "Kelebihan bb tingkat ringan" },
          { status: "GEMUK", information: "Kelebihan bb tingkat berat" },
        ],
      },
    });

    if (existingNutritionStatus.length > 0) {
      console.log("Nutrition status already exist");
      return;
    }

    await prisma.nutritionStatus.createMany({
      data: [
        { status: "KURUS", information: "Kekurangan bb tingkat berat" },
        { status: "KURUS", information: "Kekurangan bb tingkat ringan" },
        { status: "NORMAL", information: "Gizi normal" },
        { status: "GEMUK", information: "Kelebihan bb tingkat ringan" },
        { status: "GEMUK", information: "Kelebihan bb tingkat berat" },
      ],
    });
    console.log("Nutrition status seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
