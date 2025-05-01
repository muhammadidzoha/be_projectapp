import { PrismaClient } from "@prisma/client";
import argon2 from "argon2";

const prisma = new PrismaClient();

export const seedUser = async () => {
  try {
    const hashPassword = await argon2.hash("admin");

    const existingUsers = await prisma.user.findUnique({
      where: {
        username: "admin",
      },
    });

    if (existingUsers) {
      console.log("User already exists");
      return;
    }

    await prisma.user.create({
      data: {
        username: "admin",
        email: "admin@example.com",
        password: hashPassword,
        role_id: 1,
      },
    });
    console.log("User seeded successfully");
  } catch (error) {
    console.error(error.message);
  }
};
