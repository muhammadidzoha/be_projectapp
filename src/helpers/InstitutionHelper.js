import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const getInstitutionByUser = async (userId, role) => {
  if (role === "teacher") {
    const teacher = await prisma.teacher.findFirst({
      where: { user_id: userId },
      include: { institution: true },
    });
    return teacher?.institution || null;
  }
  return prisma.institution.findFirst({
    where: { user_id: userId },
  });
};
