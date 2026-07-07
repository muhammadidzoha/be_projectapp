import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedOptions = async () => {
  try {
    const existingOptions = await prisma.option.findMany({
      where: {
        OR: [
          { title: "Benar" },
          { title: "Salah" },
          { title: "Tidak pernah dilakukan anak" },
          { title: "Tidak pernah" },
          { title: "0" },
        ],
      },
    });

    if (existingOptions.length > 0) {
      console.log("Options already exist");
      return;
    }

    const questions = await prisma.question.findMany({
      select: { id: true, is_negative: true },
      orderBy: { id: "asc" },
    });

    const booleanTitles = ["Benar", "Salah"];
    const parentTitles = [
      "0. Tidak pernah dilakukan anak",
      "1. Dilakukan 1-2 kali dalam seminggu",
      "2. Dilakukan 3-4 kali dalam seminggu",
      "3. Dilakukan setiap hari",
    ];
    const schoolTitles = [
      "0. Tidak pernah",
      "1. Jarang (1-2x dalam tahun ajaran yang berlangsung)",
      "2. Sering (3-4x dalam tahun ajaran yang berlangsung)",
      "3. Selalu (> 4x dalam tahun ajaran yang berlangsung)",
    ];

    const getScore = (qid, isNegative, idx) => {
      if (qid <= 15) return isNegative ? idx : 1 - idx;
      if (qid <= 35) return isNegative ? 3 - idx : idx;
      return isNegative ? 3 - idx : idx;
    };

    const optionData = [];
    for (const q of questions) {
      let titles;
      if (q.id <= 15) titles = booleanTitles;
      else if (q.id <= 35) titles = parentTitles;
      else titles = schoolTitles;

      titles.forEach((title, i) => {
        optionData.push({
          question_id: q.id,
          title,
          score: getScore(q.id, q.is_negative, i),
        });
      });
    }

    await prisma.option.createMany({ data: optionData });
    console.log("Options seeded successfully");
  } catch (error) {
    console.log(error);
  }
};
