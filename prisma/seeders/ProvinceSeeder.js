import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedProvince = async () => {
  try {
    const existingProvince = await prisma.province.findFirst({
      where: {
        name: "DKI Jakarta",
      },
    });

    if (existingProvince) {
      console.log("Province already exists");
      return;
    }

    await prisma.province.create({
      data: {
        name: "DKI Jakarta",
      },
    });
    console.log("Province seeded successfully");
  } catch (error) {
    console.error(error.message);
  }
};
