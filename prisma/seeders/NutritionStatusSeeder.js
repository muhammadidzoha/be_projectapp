import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedNutritionStatus = async () => {
  try {
    const existingNutritionStatus = await prisma.nutritionStatus.findMany({
      where: {
        OR: [
          {
            displayName: "GIZI BURUK-KURANG",
            status: "GIZI_BURUK_KURANG",
            information: "Kekurangan bb tingkat ringan sampai berat",
          },
          {
            displayName: "GIZI BAIK",
            status: "GIZI_BAIK",
            information: "Gizi normal",
          },
          {
            displayName: "OVERWEIGHT-OBESITAS",
            status: "OVERWEIGHT_OBESITAS",
            information: "Kelebihan bb tingkat ringan sampai berat",
          },
        ],
      },
    });

    if (existingNutritionStatus.length > 0) {
      console.log("Nutrition status already exist");
      return;
    }

    await prisma.nutritionStatus.createMany({
      data: [
        {
          displayName: "GIZI BURUK-KURANG",
          status: "GIZI_BURUK_KURANG",
          information: "Kekurangan bb tingkat ringan sampai berat",
        },
        {
          displayName: "GIZI BAIK",
          status: "GIZI_BAIK",
          information: "Gizi normal",
        },
        {
          displayName: "OVERWEIGHT-OBESITAS",
          status: "OVERWEIGHT_OBESITAS",
          information: "Kelebihan bb tingkat ringan sampai berat",
        },
      ],
    });
    console.log("Nutrition status seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
