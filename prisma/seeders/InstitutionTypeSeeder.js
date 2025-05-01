import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedInstitutionTypes = async () => {
  try {

    const existingInstitutionTypes = await prisma.institutionType.findMany({
      where: {
        OR: [
          { name: "School" },
          { name: "HealthCare" },
        ],
      },
    })

    if (existingInstitutionTypes.length > 0) {
      console.log("Institution types already exist");
      return;
    }

    await prisma.institutionType.createMany({
      data: [{ name: "School" }, { name: "HealthCare" }],
    });
    console.log("Institution types seeded successfully");
  } catch (error) {
    console.error(error);
  }
};
