import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MONTH_NAMES = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

export const getOrCreateCurrentPeriod = async (familyId) => {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const label = `${MONTH_NAMES[month]} ${year}`;

  const startDate = new Date(year, month, 1);
  const endDate = new Date(year, month + 1, 0);

  let period = await prisma.monitoringPeriod.findUnique({
    where: { familyId_label: { familyId, label } },
  });

  if (!period) {
    period = await prisma.monitoringPeriod.create({
      data: { familyId, label, startDate, endDate },
    });
  }

  return period;
};

export const getPeriodLabelFromDate = (date) => {
  const d = new Date(date);
  const m = d.getMonth();
  const y = d.getFullYear();
  return `${MONTH_NAMES[m]} ${y}`;
};

export const getPeriodLabelShort = (date) => {
  const d = new Date(date);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${d.getFullYear()}-${m}`;
};
