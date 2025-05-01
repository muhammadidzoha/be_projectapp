import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedRoles = async () => {
  try {
    const existingRoles = await prisma.role.findMany({
      where: {
        OR: [
          { name: "admin" },
          { name: "parent" },
          { name: "school" },
          { name: "teacher" },
          { name: "healthcare" },
        ],
      },
    });

    if (existingRoles.length > 0) {
      console.log("Roles already exist");
      return;
    }

    await prisma.role.createMany({
      data: [
        { name: "admin" },
        { name: "parent" },
        { name: "school" },
        { name: "teacher" },
        { name: "healthcare" },
      ],
      skipDuplicates: false,
    });
    console.log("Roles seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
