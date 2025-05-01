import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedInstitutionTypes = async () => {
  try {
    await prisma.institutionType.createMany({
      data: [{ name: "School" }, { name: "HealthCare" }],
      skipDuplicates: true,
    });
    console.log("Institution types seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
