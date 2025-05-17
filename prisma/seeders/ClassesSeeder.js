import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedClasses = async () => {
  try {
    const existingClass = await prisma.class.findMany({
      where: {
        OR: [{ name: "1A" }, { name: "2A" }],
      },
    });

    if (existingClass.length > 0) {
      console.log("Class already exists");
      return;
    }

    await prisma.class.createMany({
      data: [{ name: "1A" }, { name: "2A" }],
    });
    console.log("Class seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
