import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedOptions = async () => {
  try {
    const existingOptions = await prisma.option.findMany({
      where: {
        OR: [
          { title: "Benar" },
          { title: "Salah" },
          { title: "1" },
          { title: "2" },
          { title: "3" },
          { title: "4" },
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
    const parentTitles = ["1", "2", "3", "4"];
    const schoolTitles = ["0", "1", "2", "3"];

    const getScore = (qid, isNegative, idx) => {
      if (qid <= 15) return isNegative ? idx : 1 - idx;
      if (qid <= 35) return isNegative ? 4 - idx : idx + 1;
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
