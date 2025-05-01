import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedProvince = async () => {
  try {
    await prisma.province.create({
      data: {
        name: "DKI Jakarta",
      },
    });
    console.log("Province seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
