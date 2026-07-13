import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getOrCreateCurrentPeriod } from "../helpers/MonitoringHelper.js";

const prisma = new PrismaClient();

export const getFamily = async (req, res) => {
  try {
    const family = await prisma.family.findMany({
      select: {
        id: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            role: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });
    return successResponse(res, family, "Family retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family");
  }
};

export const getFamilyMemberByUser = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const user = req.user;

    const family = await prisma.family.findMany({
      where: {
        userId: user.id,
      },
    });

    if (!family) {
      return errorResponse(res, null, "Family not found");
    }

    const totalRows = await prisma.familyMember.count({
      where: {
        familyId: {
          in: family.map((family) => family.id),
        },
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
        ],
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        familyId: {
          in: family.map((family) => family.id),
        },
        OR: [
          {
            fullName: {
              contains: search,
            },
          },
        ],
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        age: true,
        education: true,
        gender: true,
        relation: true,
        phone: true,
        job: {
          select: {
            id: true,
            jobType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        SocioEconomic: {
          select: {
            id: true,
            residenceStatus: true,
            address: true,
            childrenCount: true,
            underFiveCount: true,
            familyIncomeLevel: true,
          },
        },
        nutrition: {
          select: {
            id: true,
            height: true,
            weight: true,
            bmi: true,
            measurementDate: true,
            nutritionStatus: {
              select: {
                id: true,
                information: true,
                displayName: true,
              },
            },
            monitoringPeriod: {
              select: { label: true },
            },
          },
        },
        student: {
          select: {
            id: true,
            nis: true,
            schoolYear: true,
            semester: true,
            class: {
              select: {
                id: true,
                name: true,
              },
            },
            institution: {
              select: {
                id: true,
                name: true,
                email: true,
                address: true,
                institution_type: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                phone: true,
                province: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                city: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        isCompleted: true,
      },
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, familyMembers },
      "Family Member retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family member");
  }
};

export const getFamilyMember = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;

  try {
    const totalRows = await prisma.familyMember.count({
      where: {
        fullName: {
          contains: search,
        },
      },
    });

    const totalPage = Math.ceil(totalRows / limit);
    const familyMembers = await prisma.familyMember.findMany({
      where: {
        fullName: {
          contains: search,
        },
      },
      skip: offset,
      take: limit,
      orderBy: {
        id: "asc",
      },
    });
    return successResponse(
      res,
      { totalRows, totalPage, page, limit, familyMembers },
      "Family Member retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family member");
  }
};

export const getParentsByFamilyMemberId = async (req, res) => {
  try {
    const { id } = req.params;

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
      select: { familyId: true },
    });

    if (!familyMember)
      return errorResponse(res, null, "Family member not found");

    const parents = await prisma.familyMember.findMany({
      where: {
        familyId: familyMember.familyId,
        OR: [{ relation: "AYAH" }, { relation: "IBU" }],
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        age: true,
        education: true,
        phone: true,
        job: {
          select: {
            id: true,
            jobType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        SocioEconomic: {
          select: {
            id: true,
            residenceStatus: true,
            address: true,
            childrenCount: true,
            underFiveCount: true,
            familyIncomeLevel: true,
          },
        },
      },
    });

    return successResponse(res, parents, "Parents retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve parents");
  }
};

export const createFamilyMember = async (req, res) => {
  try {
    const user = req.user;
    let members = req.body;

    if (!Array.isArray(members)) {
      members = [members];
    }

    const familyByUser = await prisma.family.findUnique({
      where: {
        userId: user.id,
      },
    });

    if (!familyByUser) {
      return errorResponse(res, null, "Family not found");
    }

    const results = [];

    for (const member of members) {
      const {
        type,
        fullName,
        age,
        birthDate,
        education,
        jobTypeId,
        height,
        weight,
        gender,
        relation,
        phone,
        residenceStatus,
        address,
        childrenCount,
        underFiveCount,
        familyIncomeLevel,
        nis,
        schoolYear,
        semester,
        schoolId,
        classId,
        sameSocioEconomic,
      } = member;

      let job, socioEconomic, familyMember, nutrition, student, parent;

      const existingFamilyMember = await prisma.familyMember.findFirst({
        where: {
          familyId: familyByUser.id,
          relation,
        },
        include: {
          job: true,
        },
      });

      if (type === "ibu") {
        socioEconomic = await prisma.socioEconomic.create({
          data: {
            residenceStatus,
            address,
            childrenCount,
            underFiveCount,
            familyIncomeLevel,
          },
        });

        if (existingFamilyMember && existingFamilyMember.job) {
          job = await prisma.job.update({
            where: { id: existingFamilyMember.job.id },
            data: { jobTypeId },
          });
        } else {
          job = await prisma.job.create({
            data: { jobTypeId },
          });
        }

        if (!job || !job.id) {
          results.push({ error: "Job gagal dibuat", member });
          continue;
        }

        if (existingFamilyMember) {
          familyMember = await prisma.familyMember.update({
            where: { id: existingFamilyMember.id },
            data: {
              fullName,
              age: age ? parseInt(age) : null,
              education,
              relation,
              familyId: familyByUser.id,
              phone,
              jobId: job.id,
              socioEconomicId: socioEconomic.id,
              isCompleted: true,
            },
          });
        } else {
          familyMember = await prisma.familyMember.create({
            data: {
              fullName,
              age: age ? parseInt(age) : null,
              education,
              relation,
              familyId: familyByUser.id,
              phone,
              jobId: job.id,
              socioEconomicId: socioEconomic.id,
              isCompleted: true,
            },
          });
        }
      } else if (type === "ayah") {
        let socioEconomicId;

        if (sameSocioEconomic) {
          const ibu = await prisma.familyMember.findFirst({
            where: {
              familyId: familyByUser.id,
              relation: "IBU",
            },
            select: { socioEconomicId: true },
          });

          if (!ibu || !ibu.socioEconomicId) {
            results.push({
              error: "Data ibu tidak ditemukan, isi data ibu terlebih dahulu",
              member,
            });
            continue;
          }

          socioEconomicId = ibu.socioEconomicId;
        } else {
          socioEconomic = await prisma.socioEconomic.create({
            data: {
              residenceStatus,
              address,
              childrenCount,
              underFiveCount,
              familyIncomeLevel,
            },
          });
          socioEconomicId = socioEconomic.id;
        }

        if (existingFamilyMember && existingFamilyMember.job) {
          job = await prisma.job.update({
            where: { id: existingFamilyMember.job.id },
            data: { jobTypeId },
          });
        } else {
          job = await prisma.job.create({
            data: { jobTypeId },
          });
        }

        if (!job || !job.id) {
          results.push({ error: "Job gagal dibuat", member });
          continue;
        }

        if (existingFamilyMember) {
          familyMember = await prisma.familyMember.update({
            where: { id: existingFamilyMember.id },
            data: {
              fullName,
              age: age ? parseInt(age) : null,
              education,
              relation,
              familyId: familyByUser.id,
              phone,
              jobId: job.id,
              socioEconomicId,
              isCompleted: true,
            },
          });
        } else {
          familyMember = await prisma.familyMember.create({
            data: {
              fullName,
              age: age ? parseInt(age) : null,
              education,
              relation,
              familyId: familyByUser.id,
              phone,
              jobId: job.id,
              socioEconomicId,
              isCompleted: true,
            },
          });
        }
      } else if (type === "anak") {
        const childBirthDate = new Date(birthDate);
        const today = new Date();
        let ageMonths =
          (today.getFullYear() - childBirthDate.getFullYear()) * 12 +
          (today.getMonth() - childBirthDate.getMonth());
        if (today.getDate() < childBirthDate.getDate()) {
          ageMonths--;
        }
        const ageYear = Math.floor(ageMonths / 12);
        const ageMonthRemainder = ageMonths % 12;

        const heightInMeters = Number(height) / 100;
        const calculateBMI = Number(weight) / (heightInMeters * heightInMeters);

        const bmiRef = await prisma.bmiReference.findFirst({
          where: {
            gender: gender,
            ageYear: ageYear,
            ageMonthFrom: { lte: ageMonthRemainder },
            ageMonthTo: { gte: ageMonthRemainder },
          },
        });

        if (!bmiRef) {
          results.push({
            error: "Referensi BMI tidak ditemukan untuk usia anak ini",
            member,
          });
          continue;
        }

        let nutritionStatusEnum;
        if (calculateBMI < bmiRef.sdMinus2Min) {
          nutritionStatusEnum = "GIZI_BURUK_KURANG";
        } else if (calculateBMI > bmiRef.sdPlus1Max) {
          nutritionStatusEnum = "OVERWEIGHT_OBESITAS";
        } else {
          nutritionStatusEnum = "GIZI_BAIK";
        }

        const nutritionStatusRecord = await prisma.nutritionStatus.findFirst({
          where: { status: nutritionStatusEnum },
        });

        if (!nutritionStatusRecord) {
          results.push({
            error: "Nutrition status not found",
            member,
          });
          continue;
        }

        parent = await prisma.familyMember.findFirst({
          where: {
            familyId: familyByUser.id,
            OR: [{ relation: "IBU" }, { relation: "AYAH" }],
          },
          select: {
            socioEconomicId: true,
          },
        });

        if (!parent || !parent.socioEconomicId) {
          results.push({
            error: "Data orang tua tidak ditemukan",
            member,
          });
          continue;
        }

        if (existingFamilyMember) {
          familyMember = await prisma.familyMember.update({
            where: { id: existingFamilyMember.id },
            data: {
              fullName,
              birthDate: childBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              phone,
              socioEconomicId: parent.socioEconomicId,
              isCompleted: true,
            },
          });
        } else {
          familyMember = await prisma.familyMember.create({
            data: {
              fullName,
              birthDate: childBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              phone,
              socioEconomicId: parent.socioEconomicId,
              isCompleted: true,
            },
          });
        }

        if (!nis || !schoolId) {
          results.push({ error: "NIS dan sekolah harus diisi", member });
          continue;
        }

        const existingStudent = await prisma.student.findUnique({
          where: { nis },
        });

        if (existingStudent) {
          student = await prisma.student.update({
            where: { nis },
            data: {
              schoolYear,
              semester,
              schoolId,
              classId,
              familyMemberId: familyMember.id,
            },
          });
        } else {
          student = await prisma.student.create({
            data: {
              nis,
              schoolYear,
              semester,
              schoolId,
              classId,
              familyMemberId: familyMember.id,
            },
          });
        }

        const period = await getOrCreateCurrentPeriod(familyByUser.id);

        nutrition = await prisma.nutrition.create({
          data: {
            height: Number(height),
            weight: Number(weight),
            bmi: calculateBMI,
            nutritionStatusId: nutritionStatusRecord.id,
            familyMemberId: familyMember.id,
            createdBy: user.id,
            measurementDate: new Date(),
            monitoringPeriodId: period.id,
          },
        });
      } else {
        results.push({ error: "Invalid type", member });
        continue;
      }

      results.push({ job, socioEconomic, familyMember, nutrition, student });
    }

    const errors = results.filter((r) => r.error);
    if (errors.length > 0) {
      return errorResponse(res, { results, errors }, errors[0].error);
    }

    return successResponse(
      res,
      results,
      "Berhasil menambahkan anggota keluarga",
    );
  } catch (error) {
    return errorResponse(res, error, "Gagal menambahkan anggota keluarga");
  }
};

export const updateFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      type,
      height,
      weight,
      nis,
      schoolYear,
      semester,
      schoolId,
      classId,
      ...fields
    } = req.body;

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
      include: {
        nutrition: true,
        student: true,
      },
    });

    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    if (Object.keys(fields).length > 0) {
      if (fields.birthDate) fields.birthDate = new Date(fields.birthDate);
      await prisma.familyMember.update({
        where: { id },
        data: fields,
      });
    }

    if (height !== undefined || weight !== undefined) {
      const period = await getOrCreateCurrentPeriod(familyMember.familyId);

      let bmi, nutritionStatusId;
      if (height !== undefined && weight !== undefined) {
        const heightInMeters = Number(height) / 100;
        bmi = Number(weight) / (heightInMeters * heightInMeters);

        const childBirthDate = familyMember.birthDate;
        if (childBirthDate) {
          const today = new Date();
          let ageMonths =
            (today.getFullYear() - childBirthDate.getFullYear()) * 12 +
            (today.getMonth() - childBirthDate.getMonth());
          if (today.getDate() < childBirthDate.getDate()) {
            ageMonths--;
          }
          const ageYear = Math.floor(ageMonths / 12);
          const ageMonthRemainder = ageMonths % 12;

          const bmiRef = await prisma.bmiReference.findFirst({
            where: {
              gender: familyMember.gender,
              ageYear: ageYear,
              ageMonthFrom: { lte: ageMonthRemainder },
              ageMonthTo: { gte: ageMonthRemainder },
            },
          });

          if (bmiRef) {
            let nutritionStatusEnum;
            if (bmi < bmiRef.sdMinus2Min) {
              nutritionStatusEnum = "GIZI_BURUK_KURANG";
            } else if (bmi > bmiRef.sdPlus1Max) {
              nutritionStatusEnum = "OVERWEIGHT_OBESITAS";
            } else {
              nutritionStatusEnum = "GIZI_BAIK";
            }

            const nutritionStatusRecord =
              await prisma.nutritionStatus.findFirst({
                where: { status: nutritionStatusEnum },
              });
            nutritionStatusId = nutritionStatusRecord?.id;
          }
        }
      }

      await prisma.nutrition.create({
        data: {
          ...(height !== undefined && { height: Number(height) }),
          ...(weight !== undefined && { weight: Number(weight) }),
          ...(bmi !== undefined && { bmi }),
          ...(nutritionStatusId && { nutritionStatusId }),
          familyMemberId: familyMember.id,
          createdBy: req.user.id,
          measurementDate: new Date(),
          monitoringPeriodId: period.id,
        },
      });
    }

    if (type === "anak") {
      const studentUpdateData = {
        ...(nis !== undefined && { nis }),
        ...(schoolYear !== undefined && { schoolYear }),
        ...(semester !== undefined && { semester }),
        ...(schoolId !== undefined && { schoolId }),
        ...(classId !== undefined && { classId }),
      };

      if (Object.keys(studentUpdateData).length > 0 && familyMember.student) {
        await prisma.student.update({
          where: { id: familyMember.student.id },
          data: studentUpdateData,
        });
      } else if (
        Object.keys(studentUpdateData).length > 0 &&
        !familyMember.student
      ) {
        await prisma.student.create({
          data: {
            ...studentUpdateData,
            familyMemberId: familyMember.id,
          },
        });
      }
    }

    await prisma.familyMember.update({
      where: { id },
      data: { isCompleted: true },
    });

    return successResponse(res, null, "Berhasil mengupdate anggota keluarga");
  } catch (error) {
    return errorResponse(res, error, "Gagal mengupdate anggota keluarga");
  }
};

export const addMeasurement = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;
    const { height, weight, measurementDate } = req.body;

    if (height === undefined || weight === undefined) {
      return errorResponse(res, null, "Height and weight are required");
    }

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
      include: { family: true },
    });

    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    if (familyMember.family.userId !== user.id && user.role !== "healthcare") {
      return errorResponse(res, 403, "Unauthorized");
    }

    const period = await getOrCreateCurrentPeriod(familyMember.familyId);

    const heightInMeters = Number(height) / 100;
    const calculateBMI = Number(weight) / (heightInMeters * heightInMeters);

    let nutritionStatusId = null;
    if (familyMember.birthDate && familyMember.gender) {
      const childBirthDate = new Date(familyMember.birthDate);
      const today = new Date();
      let ageMonths =
        (today.getFullYear() - childBirthDate.getFullYear()) * 12 +
        (today.getMonth() - childBirthDate.getMonth());
      if (today.getDate() < childBirthDate.getDate()) ageMonths--;
      const ageYear = Math.floor(ageMonths / 12);
      const ageMonthRemainder = ageMonths % 12;

      const bmiRef = await prisma.bmiReference.findFirst({
        where: {
          gender: familyMember.gender,
          ageYear: ageYear,
          ageMonthFrom: { lte: ageMonthRemainder },
          ageMonthTo: { gte: ageMonthRemainder },
        },
      });

      if (bmiRef) {
        let nutritionStatusEnum;
        if (calculateBMI < bmiRef.sdMinus2Min) {
          nutritionStatusEnum = "GIZI_BURUK_KURANG";
        } else if (calculateBMI > bmiRef.sdPlus1Max) {
          nutritionStatusEnum = "OVERWEIGHT_OBESITAS";
        } else {
          nutritionStatusEnum = "GIZI_BAIK";
        }

        const statusRecord = await prisma.nutritionStatus.findFirst({
          where: { status: nutritionStatusEnum },
        });
        nutritionStatusId = statusRecord?.id;
      }
    }

    const nutrition = await prisma.nutrition.create({
      data: {
        height: Number(height),
        weight: Number(weight),
        bmi: calculateBMI,
        nutritionStatusId,
        familyMemberId: familyMember.id,
        createdBy: user.id,
        measurementDate: measurementDate
          ? new Date(measurementDate)
          : new Date(),
        monitoringPeriodId: period.id,
      },
      include: {
        nutritionStatus: { select: { displayName: true, information: true } },
      },
    });

    return successResponse(res, nutrition, "Measurement added successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to add measurement");
  }
};

export const getNutritionHistory = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
      include: { family: true },
    });

    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    const allowed =
      familyMember.family.userId === user.id ||
      user.role === "healthcare" ||
      user.role === "school";
    if (!allowed) {
      return errorResponse(res, 403, "Unauthorized");
    }

    const history = await prisma.nutrition.findMany({
      where: { familyMemberId: id },
      orderBy: { measurementDate: "asc" },
      include: {
        nutritionStatus: { select: { displayName: true, information: true } },
        monitoringPeriod: { select: { label: true } },
      },
    });

    return successResponse(
      res,
      {
        childId: id,
        childName: familyMember.fullName,
        history: history.map((n) => ({
          id: n.id,
          measurementDate: n.measurementDate,
          height: n.height,
          weight: n.weight,
          bmi: n.bmi,
          nutritionStatus: n.nutritionStatus?.displayName ?? null,
          period: n.monitoringPeriod?.label ?? null,
        })),
      },
      "Nutrition history retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get nutrition history");
  }
};

export const deleteFamilyMember = async (req, res) => {
  try {
    const { id } = req.params;

    const familyMember = await prisma.familyMember.findUnique({
      where: { id },
    });

    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    if (familyMember.jobId) {
      await prisma.job.delete({
        where: { id: familyMember.jobId },
      });
    }

    await prisma.familyMember.delete({
      where: { id },
    });

    return successResponse(res, null, "Berhasil menghapus anggota keluarga");
  } catch (error) {
    return errorResponse(res, error, "Gagal menghapus anggota keluarga");
  }
};
