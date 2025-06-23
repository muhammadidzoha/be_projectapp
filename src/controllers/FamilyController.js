import { PrismaClient } from "@prisma/client";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";

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
        education: true,
        gender: true,
        relation: true,
        phone: true,
        job: {
          select: {
            id: true,
            income: true,
            jobType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        residence: {
          select: {
            id: true,
            status: true,
            address: true,
          },
        },
        nutrition: {
          select: {
            id: true,
            height: true,
            weight: true,
            bmi: true,
            birthWeight: true,
            nutritionStatus: {
              select: {
                id: true,
                information: true,
              },
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
      "Family Member retrieved successfully"
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
      "Family Member retrieved successfully"
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family member");
  }
};

export const getParentsByFamilyMemberId = async (req, res) => {
  const { id } = req.params;

  try {
    const anak = await prisma.familyMember.findFirst({
      where: {
        id,
      },
    });

    if (!anak) {
      return errorResponse(res, null, "Anak tidak ditemukan");
    }

    const familyId = anak.familyId;

    const orangTua = await prisma.familyMember.findMany({
      where: {
        familyId: familyId,
        relation: { in: ["AYAH", "IBU"] },
      },
      select: {
        id: true,
        fullName: true,
        birthDate: true,
        gender: true,
        relation: true,
        phone: true,
        education: true,
        job: {
          select: {
            id: true,
            income: true,
            jobType: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        residence: {
          select: {
            id: true,
            status: true,
            address: true,
          },
        },
      },
    });

    return successResponse(res, orangTua, "Parent data successfully retrieved");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family member");
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
        birthDate,
        education,
        jobTypeId,
        income,
        height,
        weight,
        gender,
        relation,
        institutionId,
        phone,
        status,
        address,
        nis,
        schoolYear,
        semester,
        schoolId,
        birthWeight,
        classId,
        sameHome,
      } = member;

      const now = new Date();
      const validBirthDate = new Date(
        `${birthDate}T${now.getHours().toString().padStart(2, "0")}:${now
          .getMinutes()
          .toString()
          .padStart(2, "0")}:${now.getSeconds().toString().padStart(2, "0")}Z`
      );

      const heightInMeters = Number(height) / 100;
      const calculateBMI = Number(weight) / (heightInMeters * heightInMeters);

      let bmiCategory = "";
      if (calculateBMI < 17) {
        bmiCategory = "Kekurangan bb tingkat berat";
      } else if (calculateBMI >= 17 && calculateBMI < 18.5) {
        bmiCategory = "Kekurangan bb tingkat ringan";
      } else if (calculateBMI >= 18.5 && calculateBMI <= 24.9) {
        bmiCategory = "Gizi normal";
      } else if (calculateBMI > 24.9 && calculateBMI <= 27) {
        bmiCategory = "Kelebihan bb tingkat ringan";
      } else {
        bmiCategory = "Kelebihan bb tingkat berat";
      }

      const nutritionStatus = await prisma.nutritionStatus.findFirst({
        where: {
          information: bmiCategory,
        },
      });

      if (!nutritionStatus) {
        results.push({ error: "Nutrition status not found", member });
        continue;
      }

      let job, residence, familyMember, nutrition, student, parent;

      const existingFamilyMember = await prisma.familyMember.findFirst({
        where: {
          familyId: familyByUser.id,
          relation,
        },
        include: {
          job: true,
          residence: true,
        },
      });

      if (type === "ibu") {
        const ops = [];

        if (existingFamilyMember && existingFamilyMember.job) {
          ops.push(
            prisma.job.update({
              where: { id: existingFamilyMember.job.id },
              data: {
                income,
                jobTypeId,
              },
            })
          );
        } else {
          ops.push(
            prisma.job.create({
              data: {
                income,
                jobTypeId,
              },
            })
          );
        }

        if (existingFamilyMember && existingFamilyMember.residence) {
          ops.push(
            prisma.residence.update({
              where: { id: existingFamilyMember.residence.id },
              data: {
                status,
                address,
              },
            })
          );
        } else {
          ops.push(
            prisma.residence.create({
              data: {
                status,
                address,
              },
            })
          );
        }

        const [jobResult, residenceResult] = await prisma.$transaction(ops);
        job = jobResult;
        residence = residenceResult;

        if (!job || !job.id || !residence || !residence.id) {
          results.push({ error: "Job atau Residence gagal dibuat", member });
          continue;
        }

        if (existingFamilyMember) {
          familyMember = await prisma.familyMember.update({
            where: { id: existingFamilyMember.id },
            data: {
              fullName,
              birthDate: validBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              institutionId,
              phone,
              jobId: job.id,
              residenceId: residence.id,
            },
          });
        } else {
          familyMember = await prisma.familyMember.create({
            data: {
              fullName,
              birthDate: validBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              institutionId,
              phone,
              jobId: job.id,
              residenceId: residence.id,
            },
          });
        }

        const existingNutrition = await prisma.nutrition.findFirst({
          where: { familyMemberId: familyMember.id },
        });

        if (existingNutrition) {
          nutrition = await prisma.nutrition.update({
            where: { id: existingNutrition.id },
            data: {
              height: Number(height),
              weight: Number(weight),
              bmi: calculateBMI,
              nutritionStatusId: nutritionStatus.id,
            },
          });
        } else {
          nutrition = await prisma.nutrition.create({
            data: {
              height: Number(height),
              weight: Number(weight),
              bmi: calculateBMI,
              nutritionStatusId: nutritionStatus.id,
              familyMemberId: familyMember.id,
              createdBy: user.id,
            },
          });
        }
      } else if (type === "ayah") {
        if (existingFamilyMember && existingFamilyMember.job) {
          job = await prisma.job.update({
            where: { id: existingFamilyMember.job.id },
            data: { income, jobTypeId },
          });
        } else {
          job = await prisma.job.create({
            data: { income, jobTypeId },
          });
        }

        let ibuResidenceId = null;
        if (sameHome) {
          const ibu = await prisma.familyMember.findFirst({
            where: {
              familyId: familyByUser.id,
              relation: "IBU",
            },
            select: { residenceId: true },
          });

          if (!ibu || !ibu.residenceId) {
            results.push({
              error: "Data ibu atau residence ibu tidak ditemukan",
              member,
            });
            continue;
          }
          ibuResidenceId = ibu.residenceId;
          residence = await prisma.residence.findUnique({
            where: { id: ibuResidenceId },
          });
        } else {
          if (existingFamilyMember && existingFamilyMember.residence) {
            residence = await prisma.residence.update({
              where: { id: existingFamilyMember.residence.id },
              data: { status, address },
            });
          } else {
            residence = await prisma.residence.create({
              data: { status, address },
            });
          }
        }

        if (!job || !job.id) {
          results.push({ error: "Job gagal dibuat", member });
          continue;
        }

        if (sameHome && !ibuResidenceId) {
          results.push({ error: "ibuResidenceId tidak ditemukan", member });
          continue;
        }

        if (existingFamilyMember) {
          familyMember = await prisma.familyMember.update({
            where: { id: existingFamilyMember.id },
            data: {
              fullName,
              birthDate: validBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              institutionId,
              phone,
              jobId: job.id,
              residenceId: sameHome ? ibuResidenceId : residence?.id,
            },
          });
        } else {
          familyMember = await prisma.familyMember.create({
            data: {
              fullName,
              birthDate: validBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              institutionId,
              phone,
              jobId: job.id,
              residenceId: sameHome ? ibuResidenceId : residence?.id,
            },
          });
        }

        const existingNutrition = await prisma.nutrition.findFirst({
          where: { familyMemberId: familyMember.id },
        });

        if (existingNutrition) {
          nutrition = await prisma.nutrition.update({
            where: { id: existingNutrition.id },
            data: {
              height: Number(height),
              weight: Number(weight),
              bmi: calculateBMI,
              nutritionStatusId: nutritionStatus.id,
            },
          });
        } else {
          nutrition = await prisma.nutrition.create({
            data: {
              height: Number(height),
              weight: Number(weight),
              bmi: calculateBMI,
              nutritionStatusId: nutritionStatus.id,
              familyMemberId: familyMember.id,
              createdBy: user.id,
            },
          });
        }
      } else if (type === "anak") {
        parent = await prisma.familyMember.findFirst({
          where: {
            familyId: familyByUser.id,
            OR: [{ relation: "IBU" }, { relation: "AYAH" }],
          },
          select: {
            residenceId: true,
          },
        });

        if (!parent || !parent.residenceId) {
          results.push({ error: "Parent residence not found", member });
          continue;
        }

        if (existingFamilyMember) {
          familyMember = await prisma.familyMember.update({
            where: { id: existingFamilyMember.id },
            data: {
              fullName,
              birthDate: validBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              institutionId,
              phone,
              residenceId: parent.residenceId,
            },
          });
        } else {
          familyMember = await prisma.familyMember.create({
            data: {
              fullName,
              birthDate: validBirthDate,
              education,
              gender,
              relation,
              familyId: familyByUser.id,
              institutionId,
              phone,
              residenceId: parent.residenceId,
            },
          });
        }

        const existingStudent = await prisma.student.findUnique({
          where: {
            nis,
          },
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

        const existingNutrition = await prisma.nutrition.findFirst({
          where: { familyMemberId: familyMember.id },
        });

        if (existingNutrition) {
          nutrition = await prisma.nutrition.update({
            where: { id: existingNutrition.id },
            data: {
              height: Number(height),
              weight: Number(weight),
              birthWeight: Number(birthWeight),
              bmi: calculateBMI,
              nutritionStatusId: nutritionStatus.id,
            },
          });
        } else {
          nutrition = await prisma.nutrition.create({
            data: {
              height: Number(height),
              weight: Number(weight),
              birthWeight: Number(birthWeight),
              bmi: calculateBMI,
              nutritionStatusId: nutritionStatus.id,
              familyMemberId: familyMember.id,
              createdBy: user.id,
            },
          });
        }
      } else {
        results.push({ error: "Invalid type", member });
        continue;
      }

      results.push({ job, residence, familyMember, nutrition, student });
    }

    const ibu = await prisma.familyMember.findFirst({
      where: { familyId: familyByUser.id, relation: "IBU" },
    });
    const ayah = await prisma.familyMember.findFirst({
      where: { familyId: familyByUser.id, relation: "AYAH" },
    });
    const anak = await prisma.familyMember.findFirst({
      where: { familyId: familyByUser.id, relation: "ANAK" },
    });

    if (ibu && ayah && anak) {
      await prisma.familyMember.updateMany({
        where: {
          familyId: familyByUser.id,
          relation: { in: ["IBU", "AYAH", "ANAK"] },
        },
        data: { isCompleted: true },
      });
    }

    return successResponse(
      res,
      results,
      "Berhasil menambahkan anggota keluarga"
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
      birthWeight,
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

    // Update familyMember hanya jika ada field lain yang dikirim
    if (Object.keys(fields).length > 0) {
      if (fields.birthDate) fields.birthDate = new Date(fields.birthDate);
      await prisma.familyMember.update({
        where: { id },
        data: fields,
      });
    }

    // Update nutrition jika ada height/weight/birthWeight
    if (
      (height !== undefined ||
        weight !== undefined ||
        birthWeight !== undefined) &&
      familyMember.nutrition.length > 0
    ) {
      let bmi, nutritionStatusId;
      if (height !== undefined && weight !== undefined) {
        const heightInMeters = Number(height) / 100;
        bmi = Number(weight) / (heightInMeters * heightInMeters);

        let bmiCategory = "";
        if (bmi < 17) {
          bmiCategory = "Kekurangan bb tingkat berat";
        } else if (bmi >= 17 && bmi < 18.5) {
          bmiCategory = "Kekurangan bb tingkat ringan";
        } else if (bmi >= 18.5 && bmi <= 24.9) {
          bmiCategory = "Gizi normal";
        } else if (bmi > 24.9 && bmi <= 27) {
          bmiCategory = "Kelebihan bb tingkat ringan";
        } else {
          bmiCategory = "Kelebihan bb tingkat berat";
        }

        const nutritionStatus = await prisma.nutritionStatus.findFirst({
          where: { information: bmiCategory },
        });
        nutritionStatusId = nutritionStatus?.id;
      }

      const nutritionUpdateData = {
        ...(height !== undefined && { height: Number(height) }),
        ...(weight !== undefined && { weight: Number(weight) }),
        ...(bmi !== undefined && { bmi }),
        ...(birthWeight !== undefined && { birthWeight: Number(birthWeight) }),
        ...(nutritionStatusId && { nutritionStatusId }),
      };

      await prisma.nutrition.update({
        where: { id: familyMember.nutrition[0].id },
        data: nutritionUpdateData,
      });
    }

    // Jika type anak, update/create student
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

    return successResponse(res, null, "Berhasil mengupdate anggota keluarga");
  } catch (error) {
    return errorResponse(res, error, "Gagal mengupdate anggota keluarga");
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
