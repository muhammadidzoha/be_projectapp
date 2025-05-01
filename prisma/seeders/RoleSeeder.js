import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedRoles = async () => {
  try {
    await prisma.role.createMany({
      data: [
        { name: "admin" },
        { name: "parent" },
        { name: "school" },
        { name: "teacher" },
        { name: "healthcare" },
      ],
      skipDuplicates: true,
    });
    console.log("Roles seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
