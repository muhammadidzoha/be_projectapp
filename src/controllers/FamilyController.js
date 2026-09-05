import pool from "../config/db.js";
import { randomUUID } from "node:crypto";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getOrCreateCurrentPeriod } from "../helpers/MonitoringHelper.js";
import { like } from "../utils/dbHelpers.js";

export const getFamily = async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT f.id,
              u.id AS user_id, u.username AS user_username, u.email AS user_email,
              r.id AS role_id, r.name AS role_name
       FROM families f
       JOIN users u ON u.id = f.userId
       JOIN roles r ON r.id = u.role_id`,
    );
    const family = rows.map((row) => ({
      id: row.id,
      user: {
        id: row.user_id,
        username: row.user_username,
        email: row.user_email,
        role: { id: row.role_id, name: row.role_name },
      },
    }));
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

    const [families] = await pool.query(
      "SELECT id FROM families WHERE userId = ?",
      [user.id],
    );
    if (!families.length) {
      return errorResponse(res, null, "Family not found");
    }
    const familyIds = families.map((f) => f.id);
    const idsPlaceholders = familyIds.map(() => "?").join(",");
    const searchLike = like(search);

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM family_members
       WHERE familyId IN (${idsPlaceholders}) AND fullName LIKE ?`,
      [...familyIds, searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      `SELECT fm.id, fm.fullName, fm.birthDate, fm.age, fm.education, fm.gender,
              fm.relation, fm.phone, fm.isCompleted, fm.socioEconomicId, fm.jobId,
              j.id AS job_id, jt.id AS jobType_id, jt.name AS jobType_name,
              se.id AS socio_id, se.residenceStatus, se.address, se.childrenCount,
              se.underFiveCount, se.familyIncomeLevel,
              n.id AS nutrition_id, n.height, n.weight, n.bmi, n.measurementDate,
              ns.id AS ns_id, ns.information, ns.displayName,
              mp.label AS period_label,
              s.id AS student_id, s.nis, s.schoolYear, s.semester,
              cl.id AS class_id, cl.name AS class_name,
              ins.id AS institution_id, ins.name AS institution_name, ins.email AS institution_email,
              ins.address AS institution_address, ins.phone AS institution_phone,
              it.id AS itype_id, it.name AS itype_name,
              prov.id AS province_id, prov.name AS province_name,
              city.id AS city_id, city.name AS city_name
       FROM family_members fm
       LEFT JOIN jobs j ON j.id = fm.jobId
       LEFT JOIN job_types jt ON jt.id = j.jobTypeId
       LEFT JOIN socio_economic se ON se.id = fm.socioEconomicId
       LEFT JOIN students s ON s.familyMemberId = fm.id
       LEFT JOIN classes cl ON cl.id = s.classId
       LEFT JOIN institutions ins ON ins.id = s.schoolId
       LEFT JOIN institution_types it ON it.id = ins.type
       LEFT JOIN provinces prov ON prov.id = ins.province_id
       LEFT JOIN cities city ON city.id = ins.city_id
       LEFT JOIN nutritions n ON n.id = (
         SELECT n2.id FROM nutritions n2 WHERE n2.familyMemberId = fm.id ORDER BY n2.measurementDate DESC, n2.id DESC LIMIT 1
       )
       LEFT JOIN nutrition_status ns ON ns.id = n.nutritionStatusId
       LEFT JOIN monitoring_periods mp ON mp.id = n.monitoringPeriodId
       WHERE fm.familyId IN (${idsPlaceholders}) AND fm.fullName LIKE ?
       ORDER BY fm.id ASC LIMIT ? OFFSET ?`,
      [...familyIds, searchLike, limit, offset],
    );

    const familyMembers = rows.map((fm) => ({
      id: fm.id,
      fullName: fm.fullName,
      birthDate: fm.birthDate,
      age: fm.age,
      education: fm.education,
      gender: fm.gender,
      relation: fm.relation,
      phone: fm.phone,
      job: fm.job_id
        ? {
            id: fm.job_id,
            jobType: fm.jobType_id ? { id: fm.jobType_id, name: fm.jobType_name } : null,
          }
        : null,
      SocioEconomic: fm.socio_id
        ? {
            id: fm.socio_id,
            residenceStatus: fm.residenceStatus,
            address: fm.address,
            childrenCount: fm.childrenCount,
            underFiveCount: fm.underFiveCount,
            familyIncomeLevel: fm.familyIncomeLevel,
          }
        : null,
      nutrition: fm.nutrition_id
        ? {
            id: fm.nutrition_id,
            height: fm.height,
            weight: fm.weight,
            bmi: fm.bmi,
            measurementDate: fm.measurementDate,
            nutritionStatus: fm.ns_id
              ? { id: fm.ns_id, information: fm.information, displayName: fm.displayName }
              : null,
            monitoringPeriod: fm.period_label ? { label: fm.period_label } : null,
          }
        : null,
      student: fm.student_id
        ? {
            id: fm.student_id,
            nis: fm.nis,
            schoolYear: fm.schoolYear,
            semester: fm.semester,
            class: fm.class_id ? { id: fm.class_id, name: fm.class_name } : null,
            institution: fm.institution_id
              ? {
                  id: fm.institution_id,
                  name: fm.institution_name,
                  email: fm.institution_email,
                  address: fm.institution_address,
                  institution_type: fm.itype_id
                    ? { id: fm.itype_id, name: fm.itype_name }
                    : null,
                  phone: fm.institution_phone,
                  province: fm.province_id
                    ? { id: fm.province_id, name: fm.province_name }
                    : null,
                  city: fm.city_id ? { id: fm.city_id, name: fm.city_name } : null,
                }
              : null,
          }
        : null,
      isCompleted: !!fm.isCompleted,
    }));

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
  const searchLike = like(search);

  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM family_members WHERE fullName LIKE ?",
      [searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      "SELECT * FROM family_members WHERE fullName LIKE ? ORDER BY id ASC LIMIT ? OFFSET ?",
      [searchLike, limit, offset],
    );

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, familyMembers: rows },
      "Family Member retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve family member");
  }
};

export const getParentsByFamilyMemberId = async (req, res) => {
  try {
    const { id } = req.params;

    const [fmRows] = await pool.query(
      "SELECT familyId FROM family_members WHERE id = ? LIMIT 1",
      [id],
    );
    const familyMember = fmRows[0];
    if (!familyMember)
      return errorResponse(res, null, "Family member not found");

    const [rows] = await pool.query(
      `SELECT fm.id, fm.fullName, fm.birthDate, fm.age, fm.education, fm.phone,
              j.id AS job_id, jt.id AS jobType_id, jt.name AS jobType_name,
              se.id AS socio_id, se.residenceStatus, se.address, se.childrenCount,
              se.underFiveCount, se.familyIncomeLevel
       FROM family_members fm
       LEFT JOIN jobs j ON j.id = fm.jobId
       LEFT JOIN job_types jt ON jt.id = j.jobTypeId
       LEFT JOIN socio_economic se ON se.id = fm.socioEconomicId
       WHERE fm.familyId = ? AND (fm.relation = 'AYAH' OR fm.relation = 'IBU')`,
      [familyMember.familyId],
    );

    const parents = rows.map((fm) => ({
      id: fm.id,
      fullName: fm.fullName,
      birthDate: fm.birthDate,
      age: fm.age,
      education: fm.education,
      phone: fm.phone,
      job: fm.job_id
        ? {
            id: fm.job_id,
            jobType: fm.jobType_id ? { id: fm.jobType_id, name: fm.jobType_name } : null,
          }
        : null,
      SocioEconomic: fm.socio_id
        ? {
            id: fm.socio_id,
            residenceStatus: fm.residenceStatus,
            address: fm.address,
            childrenCount: fm.childrenCount,
            underFiveCount: fm.underFiveCount,
            familyIncomeLevel: fm.familyIncomeLevel,
          }
        : null,
    }));

    return successResponse(res, parents, "Parents retrieved successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve parents");
  }
};

const calculateNutritionStatus = async (gender, birthDate, bmi) => {
  if (!birthDate || !gender) return null;
  const childBirthDate = new Date(birthDate);
  const today = new Date();
  let ageMonths =
    (today.getFullYear() - childBirthDate.getFullYear()) * 12 +
    (today.getMonth() - childBirthDate.getMonth());
  if (today.getDate() < childBirthDate.getDate()) ageMonths--;
  const ageYear = Math.floor(ageMonths / 12);
  const ageMonthRemainder = ageMonths % 12;

  const [bmiRefRows] = await pool.query(
    `SELECT * FROM bmi_references
     WHERE gender = ? AND ageYear = ? AND ageMonthFrom <= ? AND ageMonthTo >= ?
     LIMIT 1`,
    [gender, ageYear, ageMonthRemainder, ageMonthRemainder],
  );
  const bmiRef = bmiRefRows[0];
  if (!bmiRef) return null;

  let nutritionStatusEnum;
  if (bmi < bmiRef.sdMinus2Min) {
    nutritionStatusEnum = "GIZI_BURUK_KURANG";
  } else if (bmi > bmiRef.sdPlus1Max) {
    nutritionStatusEnum = "OVERWEIGHT_OBESITAS";
  } else {
    nutritionStatusEnum = "GIZI_BAIK";
  }

  const [nsRows] = await pool.query(
    "SELECT id FROM nutrition_status WHERE status = ? LIMIT 1",
    [nutritionStatusEnum],
  );
  return nsRows[0]?.id ?? null;
};

export const createFamilyMember = async (req, res) => {
  try {
    const user = req.user;
    let members = req.body;

    if (!Array.isArray(members)) {
      members = [members];
    }

    const [familyRows] = await pool.query(
      "SELECT * FROM families WHERE userId = ? LIMIT 1",
      [user.id],
    );
    const familyByUser = familyRows[0];
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

      const [existingRows] = await pool.query(
        "SELECT * FROM family_members WHERE familyId = ? AND relation = ? LIMIT 1",
        [familyByUser.id, relation],
      );
      const existingFamilyMember = existingRows[0];

      if (type === "ibu") {
        const [seResult] = await pool.query(
          "INSERT INTO socio_economic (residenceStatus, address, childrenCount, underFiveCount, familyIncomeLevel, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
          [residenceStatus, address, childrenCount, underFiveCount, familyIncomeLevel],
        );
        socioEconomic = { id: seResult.insertId };

        if (existingFamilyMember && existingFamilyMember.jobId) {
          await pool.query("UPDATE jobs SET jobTypeId = ? WHERE id = ?", [
            jobTypeId,
            existingFamilyMember.jobId,
          ]);
          job = { id: existingFamilyMember.jobId };
        } else {
          const [jobResult] = await pool.query(
            "INSERT INTO jobs (jobTypeId, createdAt, updatedAt) VALUES (?, NOW(), NOW())",
            [jobTypeId],
          );
          job = { id: jobResult.insertId };
        }

        if (!job || !job.id) {
          results.push({ error: "Job gagal dibuat", member });
          continue;
        }

        const data = {
          fullName,
          age: age ? parseInt(age) : null,
          education,
          relation,
          familyId: familyByUser.id,
          phone,
          jobId: job.id,
          socioEconomicId: socioEconomic.id,
          isCompleted: 1,
          updatedAt: new Date(),
        };

        if (existingFamilyMember) {
          await pool.query(
            "UPDATE family_members SET fullName = ?, age = ?, education = ?, relation = ?, familyId = ?, phone = ?, jobId = ?, socioEconomicId = ?, isCompleted = ?, updatedAt = NOW() WHERE id = ?",
            [data.fullName, data.age, data.education, data.relation, data.familyId, data.phone, data.jobId, data.socioEconomicId, 1, existingFamilyMember.id],
          );
          familyMember = { id: existingFamilyMember.id, ...data };
        } else {
          const id = randomUUID();
          await pool.query(
            "INSERT INTO family_members (id, fullName, age, education, relation, familyId, phone, jobId, socioEconomicId, isCompleted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())",
            [id, data.fullName, data.age, data.education, data.relation, data.familyId, data.phone, data.jobId, data.socioEconomicId],
          );
          familyMember = { id, ...data };
        }
      } else if (type === "ayah") {
        let socioEconomicId;

        if (sameSocioEconomic) {
          const [ibuRows] = await pool.query(
            "SELECT socioEconomicId FROM family_members WHERE familyId = ? AND relation = 'IBU' LIMIT 1",
            [familyByUser.id],
          );
          const ibu = ibuRows[0];
          if (!ibu || !ibu.socioEconomicId) {
            results.push({
              error: "Data ibu tidak ditemukan, isi data ibu terlebih dahulu",
              member,
            });
            continue;
          }
          socioEconomicId = ibu.socioEconomicId;
        } else {
          const [seResult] = await pool.query(
            "INSERT INTO socio_economic (residenceStatus, address, childrenCount, underFiveCount, familyIncomeLevel, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(), NOW())",
            [residenceStatus, address, childrenCount, underFiveCount, familyIncomeLevel],
          );
          socioEconomic = { id: seResult.insertId };
          socioEconomicId = socioEconomic.id;
        }

        if (existingFamilyMember && existingFamilyMember.jobId) {
          await pool.query("UPDATE jobs SET jobTypeId = ? WHERE id = ?", [
            jobTypeId,
            existingFamilyMember.jobId,
          ]);
          job = { id: existingFamilyMember.jobId };
        } else {
          const [jobResult] = await pool.query(
            "INSERT INTO jobs (jobTypeId, createdAt, updatedAt) VALUES (?, NOW(), NOW())",
            [jobTypeId],
          );
          job = { id: jobResult.insertId };
        }

        if (!job || !job.id) {
          results.push({ error: "Job gagal dibuat", member });
          continue;
        }

        if (existingFamilyMember) {
          await pool.query(
            "UPDATE family_members SET fullName = ?, age = ?, education = ?, relation = ?, familyId = ?, phone = ?, jobId = ?, socioEconomicId = ?, isCompleted = 1, updatedAt = NOW() WHERE id = ?",
            [fullName, age ? parseInt(age) : null, education, relation, familyByUser.id, phone, job.id, socioEconomicId, existingFamilyMember.id],
          );
          familyMember = { id: existingFamilyMember.id };
        } else {
          const id = randomUUID();
          await pool.query(
            "INSERT INTO family_members (id, fullName, age, education, relation, familyId, phone, jobId, socioEconomicId, isCompleted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())",
            [id, fullName, age ? parseInt(age) : null, education, relation, familyByUser.id, phone, job.id, socioEconomicId],
          );
          familyMember = { id };
        }
        socioEconomic = { id: socioEconomicId };
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

        const [bmiRefRows] = await pool.query(
          `SELECT * FROM bmi_references
           WHERE gender = ? AND ageYear = ? AND ageMonthFrom <= ? AND ageMonthTo >= ?
           LIMIT 1`,
          [gender, ageYear, ageMonthRemainder, ageMonthRemainder],
        );
        const bmiRef = bmiRefRows[0];
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

        const [nsRows] = await pool.query(
          "SELECT id FROM nutrition_status WHERE status = ? LIMIT 1",
          [nutritionStatusEnum],
        );
        const nutritionStatusRecord = nsRows[0];
        if (!nutritionStatusRecord) {
          results.push({ error: "Nutrition status not found", member });
          continue;
        }

        const [parentRows] = await pool.query(
          `SELECT socioEconomicId FROM family_members
           WHERE familyId = ? AND (relation = 'IBU' OR relation = 'AYAH')
           LIMIT 1`,
          [familyByUser.id],
        );
        parent = parentRows[0];
        if (!parent || !parent.socioEconomicId) {
          results.push({ error: "Data orang tua tidak ditemukan", member });
          continue;
        }

        if (existingFamilyMember) {
          await pool.query(
            "UPDATE family_members SET fullName = ?, birthDate = ?, education = ?, gender = ?, relation = ?, familyId = ?, phone = ?, socioEconomicId = ?, isCompleted = 1, updatedAt = NOW() WHERE id = ?",
            [fullName, childBirthDate, education, gender, relation, familyByUser.id, phone, parent.socioEconomicId, existingFamilyMember.id],
          );
          familyMember = { id: existingFamilyMember.id };
        } else {
          const id = randomUUID();
          await pool.query(
            "INSERT INTO family_members (id, fullName, birthDate, education, gender, relation, familyId, phone, socioEconomicId, isCompleted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, NOW(), NOW())",
            [id, fullName, childBirthDate, education, gender, relation, familyByUser.id, phone, parent.socioEconomicId],
          );
          familyMember = { id };
        }

        if (!nis || !schoolId) {
          results.push({ error: "NIS dan sekolah harus diisi", member });
          continue;
        }

        const [existingStudentRows] = await pool.query(
          "SELECT id FROM students WHERE nis = ? LIMIT 1",
          [nis],
        );
        const existingStudent = existingStudentRows[0];

        if (existingStudent) {
          await pool.query(
            "UPDATE students SET schoolYear = ?, semester = ?, schoolId = ?, classId = ?, familyMemberId = ? WHERE id = ?",
            [schoolYear, semester, schoolId, classId, familyMember.id, existingStudent.id],
          );
          student = { id: existingStudent.id, nis };
        } else {
          const id = randomUUID();
          await pool.query(
            "INSERT INTO students (id, schoolId, familyMemberId, nis, schoolYear, semester, classId) VALUES (?, ?, ?, ?, ?, ?, ?)",
            [id, schoolId, familyMember.id, nis, schoolYear, semester, classId],
          );
          student = { id, nis };
        }

        const period = await getOrCreateCurrentPeriod(familyByUser.id);

        const [nutritionResult] = await pool.query(
          "INSERT INTO nutritions (height, weight, bmi, nutritionStatusId, familyMemberId, createdBy, measurementDate, monitoringPeriodId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())",
          [Number(height), Number(weight), calculateBMI, nutritionStatusRecord.id, familyMember.id, user.id, period.id],
        );
        nutrition = { id: nutritionResult.insertId };
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

    const [fmRows] = await pool.query(
      `SELECT fm.*, s.id AS student_id
       FROM family_members fm
       LEFT JOIN students s ON s.familyMemberId = fm.id
       WHERE fm.id = ? LIMIT 1`,
      [id],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    if (Object.keys(fields).length > 0) {
      if (fields.birthDate) fields.birthDate = new Date(fields.birthDate);
      const sets = [];
      const params = [];
      for (const [key, value] of Object.entries(fields)) {
        sets.push(`${key} = ?`);
        params.push(value);
      }
      params.push(id);
      await pool.query(
        `UPDATE family_members SET ${sets.join(", ")} WHERE id = ?`,
        params,
      );
    }

    if (height !== undefined || weight !== undefined) {
      const period = await getOrCreateCurrentPeriod(familyMember.familyId);

      let bmi, nutritionStatusId;
      if (height !== undefined && weight !== undefined) {
        const heightInMeters = Number(height) / 100;
        bmi = Number(weight) / (heightInMeters * heightInMeters);
        const idVal = familyMember.birthDate
          ? await calculateNutritionStatus(familyMember.gender, familyMember.birthDate, bmi)
          : null;
        nutritionStatusId = idVal;
      }

      await pool.query(
        "INSERT INTO nutritions (height, weight, bmi, nutritionStatusId, familyMemberId, createdBy, measurementDate, monitoringPeriodId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(), ?, NOW(), NOW())",
        [
          height !== undefined ? Number(height) : null,
          weight !== undefined ? Number(weight) : null,
          bmi !== undefined ? bmi : null,
          nutritionStatusId || null,
          familyMember.id,
          req.user.id,
          period.id,
        ],
      );
    }

    if (type === "anak") {
      const studentUpdateData = {
        ...(nis !== undefined && { nis }),
        ...(schoolYear !== undefined && { schoolYear }),
        ...(semester !== undefined && { semester }),
        ...(schoolId !== undefined && { schoolId }),
        ...(classId !== undefined && { classId }),
      };

      if (Object.keys(studentUpdateData).length > 0 && familyMember.student_id) {
        const sets = [];
        const params = [];
        for (const [key, value] of Object.entries(studentUpdateData)) {
          sets.push(`${key} = ?`);
          params.push(value);
        }
        params.push(familyMember.student_id);
        await pool.query(
          `UPDATE students SET ${sets.join(", ")} WHERE id = ?`,
          params,
        );
      } else if (
        Object.keys(studentUpdateData).length > 0 &&
        !familyMember.student_id
      ) {
        const id = randomUUID();
        await pool.query(
          "INSERT INTO students (id, schoolId, familyMemberId, nis, schoolYear, semester, classId) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [
            id,
            studentUpdateData.schoolId,
            familyMember.id,
            studentUpdateData.nis,
            studentUpdateData.schoolYear,
            studentUpdateData.semester,
            studentUpdateData.classId,
          ],
        );
      }
    }

    await pool.query(
      "UPDATE family_members SET isCompleted = 1 WHERE id = ?",
      [id],
    );

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

    const [fmRows] = await pool.query(
      `SELECT fm.*, f.userId AS family_userId
       FROM family_members fm
       JOIN families f ON f.id = fm.familyId
       WHERE fm.id = ? LIMIT 1`,
      [id],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    if (familyMember.family_userId !== user.id && user.role !== "healthcare") {
      return errorResponse(res, 403, "Unauthorized");
    }

    const period = await getOrCreateCurrentPeriod(familyMember.familyId);

    const heightInMeters = Number(height) / 100;
    const calculateBMI = Number(weight) / (heightInMeters * heightInMeters);

    let nutritionStatusId = null;
    if (familyMember.birthDate && familyMember.gender) {
      const idVal = await calculateNutritionStatus(
        familyMember.gender,
        familyMember.birthDate,
        calculateBMI,
      );
      nutritionStatusId = idVal;
    }

    const [nutritionResult] = await pool.query(
      "INSERT INTO nutritions (height, weight, bmi, nutritionStatusId, familyMemberId, createdBy, measurementDate, monitoringPeriodId, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())",
      [
        Number(height),
        Number(weight),
        calculateBMI,
        nutritionStatusId,
        familyMember.id,
        user.id,
        measurementDate ? new Date(measurementDate) : new Date(),
        period.id,
      ],
    );

    const [nsRows] = await pool.query(
      "SELECT displayName, information FROM nutrition_status WHERE id = ?",
      [nutritionStatusId],
    );
    const nutrition = {
      id: nutritionResult.insertId,
      height: Number(height),
      weight: Number(weight),
      bmi: calculateBMI,
      nutritionStatus: nsRows[0]
        ? { displayName: nsRows[0].displayName, information: nsRows[0].information }
        : null,
    };

    return successResponse(res, nutrition, "Measurement added successfully");
  } catch (error) {
    return errorResponse(res, error, "Failed to add measurement");
  }
};

export const getNutritionHistory = async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const [fmRows] = await pool.query(
      `SELECT fm.fullName, f.userId AS family_userId
       FROM family_members fm
       JOIN families f ON f.id = fm.familyId
       WHERE fm.id = ? LIMIT 1`,
      [id],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    const allowed =
      familyMember.family_userId === user.id ||
      user.role === "healthcare" ||
      user.role === "school";
    if (!allowed) {
      return errorResponse(res, 403, "Unauthorized");
    }

    const [rows] = await pool.query(
      `SELECT n.id, n.measurementDate, n.height, n.weight, n.bmi,
              ns.displayName, mp.label AS period_label
       FROM nutritions n
       LEFT JOIN nutrition_status ns ON ns.id = n.nutritionStatusId
       LEFT JOIN monitoring_periods mp ON mp.id = n.monitoringPeriodId
       WHERE n.familyMemberId = ?
       ORDER BY n.measurementDate ASC`,
      [id],
    );

    const history = rows.map((n) => ({
      id: n.id,
      measurementDate: n.measurementDate,
      height: n.height,
      weight: n.weight,
      bmi: n.bmi,
      nutritionStatus: n.displayName ?? null,
      period: n.period_label ?? null,
    }));

    return successResponse(
      res,
      {
        childId: id,
        childName: familyMember.fullName,
        history,
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

    const [fmRows] = await pool.query(
      "SELECT * FROM family_members WHERE id = ? LIMIT 1",
      [id],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, null, "Family member not found");
    }

    if (familyMember.jobId) {
      await pool.query("DELETE FROM jobs WHERE id = ?", [familyMember.jobId]);
    }

    await pool.query("DELETE FROM family_members WHERE id = ?", [id]);

    return successResponse(res, null, "Berhasil menghapus anggota keluarga");
  } catch (error) {
    return errorResponse(res, error, "Gagal menghapus anggota keluarga");
  }
};
