import { randomUUID } from "node:crypto";
import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { createNotification } from "./NotificationController.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";

export const getRecomendations = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const offset = limit * page;

  try {
    let whereSql = "1=1";
    let params = [];

    if (req.user?.role === "healthcare") {
      const institution = await getInstitutionByUser(
        req.user.id,
        req.user.role,
      );
      if (institution) {
        whereSql = "r.healthcareInstitutionId = ?";
        params.push(institution.id);
      }
    } else if (["school", "teacher"].includes(req.user?.role)) {
      const institution = await getInstitutionByUser(
        req.user.id,
        req.user.role,
      );
      if (institution) {
        whereSql =
          "EXISTS (SELECT 1 FROM users su JOIN institutions si ON si.user_id = su.id WHERE su.id = r.submittedById AND si.id = ?)";
        params.push(institution.id);
      }
    }

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total FROM recommendations r WHERE ${whereSql}`,
      params,
    );
    const totalRows = countRow.total;

    const [rows] = await pool.query(
      `SELECT r.id, r.status, r.createdAt,
              sb.id AS sub_id,
              si.id AS sub_inst_id, si.name AS sub_inst_name, si.address AS sub_inst_address,
              si.phone AS sub_inst_phone, si.email AS sub_inst_email,
              sc2.id AS sub_city_id, sc2.name AS sub_city_name,
              sp2.id AS sub_prov_id, sp2.name AS sub_prov_name,
              st.id AS student_id, st.nis, st.schoolYear, st.semester,
              si2.id AS st_inst_id, si2.name AS st_inst_name, si2.address AS st_inst_address,
              si2.phone AS st_inst_phone, si2.email AS st_inst_email,
              c.id AS st_city_id, c.name AS st_city_name,
              p.id AS st_prov_id, p.name AS st_prov_name,
              cl.id AS class_id, cl.name AS class_name,
              fm.id AS fm_id, fm.fullName AS fm_fullName, fm.birthDate AS fm_birthDate,
              fm.gender AS fm_gender, fm.familyId AS fm_familyId,
              se.address AS fm_socio_address,
              n.id AS n_id, ns.id AS ns_id, ns.information AS ns_information
       FROM recommendations r
       JOIN users sb ON sb.id = r.submittedById
       LEFT JOIN institutions si ON si.user_id = sb.id
       LEFT JOIN cities sc2 ON sc2.id = si.city_id
       LEFT JOIN provinces sp2 ON sp2.id = si.province_id
       JOIN students st ON st.id = r.studentId
       LEFT JOIN institutions si2 ON si2.id = st.schoolId
       LEFT JOIN cities c ON c.id = si2.city_id
       LEFT JOIN provinces p ON p.id = si2.province_id
       LEFT JOIN classes cl ON cl.id = st.classId
       LEFT JOIN family_members fm ON fm.id = st.familyMemberId
       LEFT JOIN socio_economic se ON se.id = fm.socioEconomicId
       LEFT JOIN nutritions n ON n.familyMemberId = fm.id
       LEFT JOIN nutrition_status ns ON ns.id = n.nutritionStatusId
       WHERE ${whereSql}
       ORDER BY r.createdAt ASC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    );

    const recomend = rows.map((r) => ({
      id: r.id,
      status: r.status,
      createdAt: r.createdAt,
      submittedBy: {
        id: r.sub_id,
        institution: r.sub_inst_id
          ? {
              id: r.sub_inst_id,
              name: r.sub_inst_name,
              address: r.sub_inst_address,
              phone: r.sub_inst_phone,
              email: r.sub_inst_email,
              city: r.sub_city_id ? { id: r.sub_city_id, name: r.sub_city_name } : null,
              province: r.sub_prov_id ? { id: r.sub_prov_id, name: r.sub_prov_name } : null,
            }
          : null,
      },
      student: {
        id: r.student_id,
        nis: r.nis,
        schoolYear: r.schoolYear,
        semester: r.semester,
        institution: r.st_inst_id
          ? {
              id: r.st_inst_id,
              name: r.st_inst_name,
              address: r.st_inst_address,
              phone: r.st_inst_phone,
              email: r.st_inst_email,
              city: r.st_city_id ? { id: r.st_city_id, name: r.st_city_name } : null,
              province: r.st_prov_id ? { id: r.st_prov_id, name: r.st_prov_name } : null,
            }
          : null,
        class: r.class_id ? { id: r.class_id, name: r.class_name } : null,
        familyMember: r.fm_id
          ? {
              id: r.fm_id,
              fullName: r.fm_fullName,
              birthDate: r.fm_birthDate,
              gender: r.fm_gender,
              familyId: r.fm_familyId,
              SocioEconomic: r.fm_socio_address
                ? { address: r.fm_socio_address }
                : null,
              nutrition: r.n_id
                ? {
                    id: r.n_id,
                    nutritionStatus: r.ns_id
                      ? { id: r.ns_id, information: r.ns_information }
                      : null,
                  }
                : null,
            }
          : null,
      },
    }));

    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, recomend },
      "List of recommendations retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const createRecommendation = async (req, res) => {
  try {
    const user = req.user;

    if (user.role !== "school") {
      return errorResponse(
        res,
        403,
        "User is not associated with an institution",
      );
    }

    const { familyMemberId, studentId, healthCareId } = req.body;
    if (!familyMemberId) {
      return errorResponse(res, 400, "familyMemberId is required");
    }

    const [studentRows] = await pool.query(
      `SELECT st.*, fm.fullName AS fm_fullName
       FROM students st
       LEFT JOIN family_members fm ON fm.id = st.familyMemberId
       WHERE st.id = ? AND st.familyMemberId = ?
       LIMIT 1`,
      [studentId, familyMemberId],
    );
    const student = studentRows[0];
    if (!student) {
      return errorResponse(res, 404, "Student (anak) not found");
    }

    const [existingRows] = await pool.query(
      "SELECT * FROM recommendations WHERE studentId = ? AND status IN ('PENDING', 'PROCESSED') LIMIT 1",
      [student.id],
    );
    if (existingRows[0]) {
      return errorResponse(
        res,
        400,
        "Murid ini sudah direkomendasikan sebelumnya",
      );
    }

    const recommendationId = randomUUID();
    await pool.query(
      "INSERT INTO recommendations (id, studentId, submittedById, healthcareInstitutionId, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, 'PENDING', NOW(), NOW())",
      [
        recommendationId,
        student.id,
        user.id,
        healthCareId ? Number(healthCareId) : null,
      ],
    );
    const recommendation = {
      id: recommendationId,
      studentId: student.id,
      submittedById: user.id,
      healthcareInstitutionId: healthCareId ? Number(healthCareId) : null,
      status: "PENDING",
    };

    let healthcareInstitution = null;
    if (healthCareId) {
      const [hcRows] = await pool.query(
        `SELECT i.*, u.id AS user_id FROM institutions i LEFT JOIN users u ON u.id = i.user_id WHERE i.id = ? LIMIT 1`,
        [Number(healthCareId)],
      );
      healthcareInstitution = hcRows[0];
    }

    if (healthcareInstitution?.user_id) {
      const [schoolRows] = await pool.query(
        "SELECT * FROM institutions WHERE user_id = ? LIMIT 1",
        [user.id],
      );
      const schoolInstitution = schoolRows[0];

      await createNotification(
        healthcareInstitution.user_id,
        "Rekomendasi Baru",
        `Siswa ${student.fm_fullName || "tersebut"} dari ${
          schoolInstitution?.name || "sekolah"
        } telah direkomendasikan untuk penanganan gizi. Silakan ditindaklanjuti.`,
        "recommendation_received",
        recommendationId,
      );
    }

    const [fmRows] = await pool.query(
      `SELECT fm.*, f.userId AS family_userId
       FROM family_members fm JOIN families f ON f.id = fm.familyId
       WHERE fm.id = ? LIMIT 1`,
      [student.familyMemberId],
    );
    const familyMember = fmRows[0];

    if (familyMember?.family_userId) {
      await createNotification(
        familyMember.family_userId,
        "Rekomendasi Dikirim",
        `Ananda ${familyMember.fullName} telah direkomendasikan ke Puskesmas ${
          healthcareInstitution?.name || "puskesmas"
        } untuk pemeriksaan lanjutan. Silakan pantau perkembangannya.`,
        "recommendation_sent",
        recommendationId,
      );
    }

    return successResponse(
      res,
      recommendation,
      "Recommendation created successfully",
    );
  } catch (error) {
    console.error(error);
    return errorResponse(res, error, "Failed to create recommendation");
  }
};

export const changeStatusToProcessed = async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query(
      "UPDATE recommendations SET status = 'PROCESSED', updatedAt = NOW() WHERE id = ?",
      [id],
    );
    const [rows] = await pool.query(
      "SELECT * FROM recommendations WHERE id = ? LIMIT 1",
      [id],
    );
    return successResponse(
      res,
      rows[0],
      "Berhasil dimasukan ke dalam antrian proses",
    );
  } catch (error) {
    return errorResponse(res, error, "Gagal memasukan ke dalam antrian proses");
  }
};

const selectQuestionsWithOptions = async (quesionerId, search = "") => {
  const [rows] = await pool.query(
    `SELECT id, quesioner_id, title, type FROM questions
     WHERE quesioner_id = ? AND title LIKE ?
     ORDER BY id ASC`,
    [quesionerId, `%${search}%`],
  );
  if (!rows.length) return [];
  const ids = rows.map((q) => q.id);
  const ph = ids.map(() => "?").join(",");
  const [opts] = await pool.query(
    `SELECT id, question_id, title, score FROM options WHERE question_id IN (${ph}) ORDER BY id ASC`,
    ids,
  );
  const byQ = {};
  for (const o of opts) {
    if (!byQ[o.question_id]) byQ[o.question_id] = [];
    byQ[o.question_id].push({ id: o.id, title: o.title, score: o.score });
  }
  return rows.map((q) => ({
    id: q.id,
    quesioner_id: q.quesioner_id,
    title: q.title,
    type: q.type,
    options: byQ[q.id] || [],
  }));
};

export const getResponseParent = async (req, res) => {
  try {
    const { userId } = req.body;

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const [familyRows] = await pool.query(
      "SELECT * FROM families WHERE userId = ? LIMIT 1",
      [userId],
    );
    const family = familyRows[0];
    if (!family) {
      return errorResponse(res, 404, "Family not found");
    }

    const [fmRows] = await pool.query(
      `SELECT * FROM family_members WHERE familyId = ? AND (relation = 'IBU' OR relation = 'AYAH') LIMIT 1`,
      [family.id],
    );
    const familyMember = fmRows[0];
    if (!familyMember) {
      return errorResponse(res, 404, "Family member not found");
    }

    const [responses] = await pool.query(
      "SELECT * FROM responses WHERE familyMemberId = ?",
      [familyMember.id],
    );
    for (const r of responses) {
      const [answers] = await pool.query(
        "SELECT * FROM answers WHERE responseId = ? ORDER BY id ASC",
        [r.id],
      );
      r.answers = answers;
    }
    const response = responses[0] || null;

    const id = Number(req.params.id || 0);
    const questions = await selectQuestionsWithOptions(id, search);
    const questionIds = questions.map((q) => q.id);

    let totalRows = 0;
    let answers = [];
    if (response && questionIds.length) {
      const ph = questionIds.map(() => "?").join(",");
      const [[cRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM answers WHERE responseId = ? AND questionId IN (${ph})`,
        [response.id, ...questionIds],
      );
      totalRows = cRow.total;
      const [aRows] = await pool.query(
        `SELECT * FROM answers WHERE responseId = ? AND questionId IN (${ph}) ORDER BY id ASC LIMIT ? OFFSET ?`,
        [response.id, ...questionIds, limit, offset],
      );
      answers = aRows;
    }
    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions, answers },
      "Berhasil mendapatkan data",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

export const getResponseInstitution = async (req, res) => {
  try {
    const { userId } = req.body;
    const quesionerId = Number(req.params.id);

    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.search || "";
    const offset = limit * page;

    const [instRows] = await pool.query(
      "SELECT * FROM institutions WHERE user_id = ? LIMIT 1",
      [userId],
    );
    const institution = instRows[0];
    if (!institution) {
      return errorResponse(res, 404, "Institution not found");
    }

    const [respRows] = await pool.query(
      "SELECT * FROM responses WHERE institutionId = ? ORDER BY id DESC LIMIT 1",
      [institution.id],
    );
    const response = respRows[0];
    if (!response) {
      return errorResponse(res, 404, "Response not found");
    }

    const questions = await selectQuestionsWithOptions(quesionerId, search);
    const questionIds = questions.map((q) => q.id);

    let totalRows = 0;
    let answers = [];
    if (questionIds.length) {
      const ph = questionIds.map(() => "?").join(",");
      const [[cRow]] = await pool.query(
        `SELECT COUNT(*) AS total FROM answers WHERE responseId = ? AND questionId IN (${ph})`,
        [response.id, ...questionIds],
      );
      totalRows = cRow.total;
      const [aRows] = await pool.query(
        `SELECT * FROM answers WHERE responseId = ? AND questionId IN (${ph}) ORDER BY id ASC LIMIT ? OFFSET ?`,
        [response.id, ...questionIds, limit, offset],
      );
      answers = aRows;
    }
    const totalPage = Math.ceil(totalRows / limit);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, questions, answers },
      "Berhasil mendapatkan data",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get response");
  }
};

export const createIntervention = async (req, res) => {
  try {
    const user = req.user;
    if (!["healthcare", "staff"].includes(user.role)) {
      throw new Error("User not have access to this resource");
    }
    const { id } = req.params;
    if (!id) {
      throw new Error("RecommendationId is required in params");
    }
    const { content, forType, notes } = req.body;

    const optionsJson = JSON.stringify(content);
    const conn = await pool.getConnection();
    let intervention;
    try {
      await conn.beginTransaction();
      const i1 = randomUUID();
      await conn.query(
        "INSERT INTO interventions (id, recommendationId, forType, options, notes, user_id, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [i1, id, forType, optionsJson, notes, user.id],
      );
      const i2 = randomUUID();
      await conn.query(
        "INSERT INTO interventions (id, recommendationId, forType, options, notes, user_id, createdAt) VALUES (?, ?, ?, ?, ?, ?, NOW())",
        [i2, id, forType === "PARENT" ? "SCHOOL" : "PARENT", optionsJson, notes, user.id],
      );
      await conn.query(
        "UPDATE recommendations SET status = 'COMPLETED', updatedAt = NOW() WHERE id = ?",
        [id],
      );
      await conn.commit();
      intervention = { count: 2 };
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }

    const [recRows] = await pool.query(
      `SELECT fam.userId AS parent_user_id, fmm.fullName AS child_fullName
       FROM recommendations r
       JOIN students st ON st.id = r.studentId
       LEFT JOIN family_members fmm ON fmm.id = st.familyMemberId
       LEFT JOIN families fam ON fam.id = fmm.familyId
       WHERE r.id = ? LIMIT 1`,
      [id],
    );
    const recWithParent = recRows[0];
    const parentUserId = recWithParent?.parent_user_id;
    if (parentUserId) {
      const [pkRows] = await pool.query(
        "SELECT i.name FROM institutions i WHERE i.user_id = ? LIMIT 1",
        [user.id],
      );
      const rawName = pkRows[0]?.name || "";
      const puskesmasName = rawName
        ? rawName.toLowerCase().includes("puskesmas")
          ? rawName
          : `Puskesmas ${rawName}`
        : "Puskesmas";

      await createNotification(
        parentUserId,
        "Tindak Lanjut Rekomendasi",
        `${puskesmasName} telah mengirimkan surat tindak lanjut untuk ${recWithParent.child_fullName}. Silakan periksa halaman rekomendasi.`,
        "intervention_created",
        id,
      );
    }

    res.status(201).json({
      status: "Success",
      message: "Intervention created",
      data: intervention,
    });
  } catch (err) {
    console.log(err.message);
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getSingleRecommendation = async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.query(
      `SELECT r.*,
              si.name AS sub_inst_name,
              st.id AS student_id, st.nis, st.schoolYear, st.semester,
              cl.id AS class_id, cl.name AS class_name, cl.school_id AS class_school_id,
              cl.created_at AS class_created_at, cl.updated_at AS class_updated_at, cl.teacher_id AS class_teacher_id,
              fm.id AS fm_id, fm.fullName AS fm_fullName, fm.birthDate AS fm_birthDate,
              fm.education AS fm_education, fm.jobId AS fm_jobId, fm.gender AS fm_gender,
              fm.relation AS fm_relation, fm.familyId AS fm_familyId,
              fm.institutionId AS fm_institutionId, fm.phone AS fm_phone,
              fm.isCompleted AS fm_isCompleted, fm.socioEconomicId AS fm_socioEconomicId,
              fm.createdAt AS fm_createdAt, fm.updatedAt AS fm_updatedAt,
              se.address AS fm_socio_address,
              fam.userId AS parent_userId
       FROM recommendations r
       LEFT JOIN users sb ON sb.id = r.submittedById
       LEFT JOIN institutions si ON si.user_id = sb.id
       LEFT JOIN students st ON st.id = r.studentId
       LEFT JOIN classes cl ON cl.id = st.classId
       LEFT JOIN family_members fm ON fm.id = st.familyMemberId
       LEFT JOIN socio_economic se ON se.id = fm.socioEconomicId
       LEFT JOIN families fam ON fm.familyId = fam.id
       WHERE r.id = ? LIMIT 1`,
      [id],
    );
    const rec = rows[0];

    const [interventions] = await pool.query(
      `SELECT i.id, i.recommendationId, i.forType, i.options, i.notes, i.createdAt,
              u.username AS i_username,
              u.id AS i_user_id,
              stf.fullName AS staff_fullName,
              sii.id AS inst_id, sii.name AS inst_name, sii.address AS inst_address,
              sii.phone AS inst_phone, sii.email AS inst_email,
              c2.name AS city_name
       FROM interventions i
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN staffs stf ON stf.user_id = u.id
       LEFT JOIN institutions sii ON sii.id = stf.healthcare_id
       LEFT JOIN cities c2 ON c2.id = sii.city_id
       WHERE i.recommendationId = ?`,
      [id],
    );

    let familyMembersList = [];
    const [parentUserRows] = await pool.query(
      "SELECT * FROM users WHERE id = ? LIMIT 1",
      [rec?.parent_userId],
    );
    if (parentUserRows[0]) {
      const [fmList] = await pool.query(
        "SELECT * FROM family_members WHERE familyId = ?",
        [rec?.fm_familyId],
      );
      familyMembersList = fmList;
    }

    const recommendation = {
      ...rec,
      submittedBy: {
        institution: rec?.sub_inst_name ? { name: rec.sub_inst_name } : null,
      },
      Intervention: interventions.map((i) => ({
        ...i,
        options: JSON.parse(i.options),
        user: {
          username: i.i_username,
          staff: i.staff_fullName
            ? {
                fullName: i.staff_fullName,
                institution: {
                  name: i.inst_name,
                  address: i.inst_address,
                  phone: i.inst_phone,
                  city: i.city_name ? { name: i.city_name } : null,
                },
              }
            : null,
          institution: i.inst_id
            ? {
                id: i.inst_id,
                name: i.inst_name,
                address: i.inst_address,
                phone: i.inst_phone,
                email: i.inst_email,
                city: i.city_name ? { name: i.city_name } : null,
              }
            : null,
        },
      })),
      student: {
        id: rec?.student_id,
        schoolId: rec?.class_school_id,
        familyMemberId: rec?.fm_id,
        nis: rec?.nis,
        schoolYear: rec?.schoolYear,
        semester: rec?.semester,
        classId: rec?.class_id,
        class: rec?.class_id
          ? {
              id: rec.class_id,
              name: rec.class_name,
              created_at: rec.class_created_at,
              updated_at: rec.class_updated_at,
              teacher_id: rec.class_teacher_id,
              school_id: rec.class_school_id,
            }
          : null,
        familyMember: rec?.fm_id
          ? {
              id: rec.fm_id,
              fullName: rec.fm_fullName,
              birthDate: rec.fm_birthDate,
              education: rec.fm_education,
              jobId: rec.fm_jobId,
              gender: rec.fm_gender,
              relation: rec.fm_relation,
              familyId: rec.fm_familyId,
              institutionId: rec.fm_institutionId,
              phone: rec.fm_phone,
              isCompleted: rec.fm_isCompleted,
              socioEconomicId: rec.fm_socioEconomicId,
              createdAt: rec.fm_createdAt,
              updatedAt: rec.fm_updatedAt,
              SocioEconomic: rec.fm_socio_address
                ? { address: rec.fm_socio_address }
                : null,
              family: {
                user: parentUserRows[0]
                  ? {
                      ...parentUserRows[0],
                      family: {
                        familyMember: familyMembersList.map((x) => ({
                          fullName: x.fullName,
                        })),
                      },
                    }
                  : null,
              },
            }
          : null,
      },
    };

    res.status(200).json({
      status: "Success",
      message: "Recommendation fetched",
      data: recommendation,
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err, "Failed to get response");
  }
};

const buildInterventionMapper = (val) => {
  return {
    ...val,
    options: JSON.parse(val.options),
    recommendation: val.rec_id
      ? {
          id: val.rec_id,
          status: val.rec_status,
          createdAt: val.rec_createdAt,
          submittedBy: val.rec_sub_inst_id
            ? {
                institution: {
                  id: val.rec_sub_inst_id,
                  name: val.rec_sub_inst_name,
                },
              }
            : null,
          student: val.student_id
            ? {
                id: val.student_id,
                nis: val.nis,
                class: val.class_id ? { name: val.class_name } : null,
                familyMember: val.fm_id
                  ? {
                      fullName: val.fm_fullName,
                      birthDate: val.fm_birthDate,
                      gender: val.fm_gender,
                      SocioEconomic: val.fm_socio_address
                        ? { address: val.fm_socio_address }
                        : null,
                      family: {
                        user: {
                          family: {
                            familyMember: val.family_member_names
                              ? val.family_member_names.split("||").map((nm) => ({ fullName: nm }))
                              : [],
                          },
                        },
                      },
                    }
                  : null,
              }
            : null,
        }
      : null,
    user: {
      username: val.i_username,
      institution: val.i_inst_id
        ? {
            name: val.i_inst_name,
            address: val.i_inst_address,
            phone: val.i_inst_phone,
            email: val.i_inst_email,
            city: val.i_city_name ? { name: val.i_city_name } : null,
          }
        : null,
      staff: val.staff_fullName
        ? {
            fullName: val.staff_fullName,
            institution: {
              name: val.staff_inst_name,
              address: val.staff_inst_address,
              phone: val.staff_inst_phone,
              city: val.staff_city_name ? { name: val.staff_city_name } : null,
            },
          }
        : null,
    },
  };
};

export const getInterventionsBelongToInstitution = async (req, res) => {
  try {
    const user = req.user;
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword ?? "";
    const skip = limit * page;
    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) {
      throw new Error("user not found");
    }

    let whereSql =
      "(EXISTS (SELECT 1 FROM users u WHERE u.id = i.user_id AND EXISTS (SELECT 1 FROM institutions x WHERE x.user_id = u.id AND x.id = ?)) OR EXISTS (SELECT 1 FROM staffs sts WHERE sts.user_id = i.user_id AND sts.healthcare_id = ?))";
    const baseParams = [institution.id, institution.id];
    if (keyword !== "") {
      whereSql +=
        " AND EXISTS (SELECT 1 FROM recommendations rr JOIN students ss ON ss.id = rr.studentId JOIN family_members ffm ON ffm.id = ss.familyMemberId WHERE rr.id = i.recommendationId AND ffm.fullName LIKE ?)";
      baseParams.push(`%${keyword}%`);
    }

    const [rows] = await pool.query(
      `SELECT i.id, i.forType, i.notes, i.options, i.createdAt, i.recommendationId,
              r.id AS rec_id, r.status AS rec_status, r.createdAt AS rec_createdAt,
              ss.id AS student_id, ss.nis,
              cl.id AS class_id, cl.name AS class_name,
              fmm.id AS fm_id, fmm.fullName AS fm_fullName, fmm.birthDate AS fm_birthDate,
              fmm.gender AS fm_gender,
              se.address AS fm_socio_address,
              fam.userId AS parent_user_id,
              (SELECT GROUP_CONCAT(fm2.fullName SEPARATOR '||') FROM family_members fm2 WHERE fm2.familyId = fmm.familyId) AS family_member_names,
              si.id AS rec_sub_inst_id, si.name AS rec_sub_inst_name,
              u.username AS i_username,
              sii.id AS i_inst_id, sii.name AS i_inst_name, sii.address AS i_inst_address,
              sii.phone AS i_inst_phone, sii.email AS i_inst_email,
              c2.name AS i_city_name,
              stf.fullName AS staff_fullName,
              si3.name AS staff_inst_name, si3.address AS staff_inst_address,
              si3.phone AS staff_inst_phone, c3.name AS staff_city_name
       FROM interventions i
       JOIN recommendations r ON r.id = i.recommendationId
       JOIN students ss ON ss.id = r.studentId
       LEFT JOIN classes cl ON cl.id = ss.classId
       LEFT JOIN family_members fmm ON fmm.id = ss.familyMemberId
       LEFT JOIN socio_economic se ON se.id = fmm.socioEconomicId
       LEFT JOIN families fam ON fam.id = fmm.familyId
       LEFT JOIN users subusr ON subusr.id = r.submittedById
       LEFT JOIN institutions si ON si.user_id = subusr.id
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN institutions sii ON sii.user_id = u.id
       LEFT JOIN cities c2 ON c2.id = sii.city_id
       LEFT JOIN staffs stf ON stf.user_id = u.id
       LEFT JOIN institutions si3 ON si3.id = stf.healthcare_id
       LEFT JOIN cities c3 ON c3.id = si3.city_id
       WHERE ${whereSql}
       GROUP BY i.recommendationId
       ORDER BY i.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...baseParams, limit, skip],
    );

    const interventions = rows.map(buildInterventionMapper);
    const totalPages = Math.ceil(interventions.length / limit);

    res.status(200).json({
      status: "Success",
      message: "Interventions Belongs to Institution fetched",
      data: { totalPages, skip, page, limit, interventions },
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getInterventionsBelongToFamily = async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error("user not found");
    }
    const page = parseInt(req.query.page) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const keyword = req.query.keyword ?? "";
    const skip = limit * page;

    let whereSql =
      "EXISTS (SELECT 1 FROM recommendations rr JOIN students ss ON ss.id = rr.studentId JOIN family_members ffm ON ffm.id = ss.familyMemberId JOIN families f2 ON f2.id = ffm.familyId WHERE rr.id = i.recommendationId AND f2.userId = ?) AND i.forType = 'PARENT'";
    const baseParams = [user.id];
    if (keyword !== "") {
      whereSql +=
        " AND EXISTS (SELECT 1 FROM recommendations rr2 JOIN students ss2 ON ss2.id = rr2.studentId JOIN family_members ffm2 ON ffm2.id = ss2.familyMemberId WHERE rr2.id = i.recommendationId AND ffm2.fullName LIKE ?)";
      baseParams.push(`%${keyword}%`);
    }

    const [rows] = await pool.query(
      `SELECT i.id, i.forType, i.notes, i.options, i.createdAt, i.recommendationId,
              r.id AS rec_id, r.status AS rec_status, r.createdAt AS rec_createdAt,
              ss.id AS student_id, ss.nis,
              cl.id AS class_id, cl.name AS class_name,
              fmm.id AS fm_id, fmm.fullName AS fm_fullName, fmm.birthDate AS fm_birthDate,
              fmm.gender AS fm_gender,
              se.address AS fm_socio_address,
              fam.userId AS parent_user_id,
              (SELECT GROUP_CONCAT(fm2.fullName SEPARATOR '||') FROM family_members fm2 WHERE fm2.familyId = fmm.familyId) AS family_member_names,
              si.id AS rec_sub_inst_id, si.name AS rec_sub_inst_name,
              u.username AS i_username,
              sii.id AS i_inst_id, sii.name AS i_inst_name, sii.address AS i_inst_address,
              sii.phone AS i_inst_phone, sii.email AS i_inst_email,
              c2.name AS i_city_name,
              stf.fullName AS staff_fullName,
              si3.name AS staff_inst_name, si3.address AS staff_inst_address,
              si3.phone AS staff_inst_phone, c3.name AS staff_city_name
       FROM interventions i
       JOIN recommendations r ON r.id = i.recommendationId
       JOIN students ss ON ss.id = r.studentId
       LEFT JOIN classes cl ON cl.id = ss.classId
       LEFT JOIN family_members fmm ON fmm.id = ss.familyMemberId
       LEFT JOIN socio_economic se ON se.id = fmm.socioEconomicId
       LEFT JOIN families fam ON fam.id = fmm.familyId
       LEFT JOIN users subusr ON subusr.id = r.submittedById
       LEFT JOIN institutions si ON si.user_id = subusr.id
       LEFT JOIN users u ON u.id = i.user_id
       LEFT JOIN institutions sii ON sii.user_id = u.id
       LEFT JOIN cities c2 ON c2.id = sii.city_id
       LEFT JOIN staffs stf ON stf.user_id = u.id
       LEFT JOIN institutions si3 ON si3.id = stf.healthcare_id
       LEFT JOIN cities c3 ON c3.id = si3.city_id
       WHERE ${whereSql}
       ORDER BY r.updatedAt DESC
       LIMIT ? OFFSET ?`,
      [...baseParams, limit, skip],
    );

    const interventions = rows.map(buildInterventionMapper);
    const totalPages = interventions.length;

    res.status(200).json({
      status: "Success",
      message: "Intervention belongs to family fetched",
      data: { totalPages, skip, page, limit, interventions },
    });
  } catch (err) {
    console.log({ err });
    return errorResponse(res, err, "Failed to get response");
  }
};

export const getInterventionById = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id is required");
    }
    const [rows] = await pool.query(
      "SELECT * FROM interventions WHERE id = ? LIMIT 1",
      [id],
    );
    const intervention = rows[0];
    if (!intervention) {
      throw new Error(`Intervention with id ${id} is not found`);
    }
    res.status(200).json({
      status: "Success",
      message: "Intervention retrieved",
      data: { ...intervention, options: JSON.parse(intervention.options) },
    });
  } catch (err) {
    return errorResponse(res, err, "Failed to get response");
  }
};

export const deleteIntervention = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      throw new Error("Id is required");
    }
    const [rows] = await pool.query(
      "SELECT * FROM interventions WHERE id = ? LIMIT 1",
      [id],
    );
    const intervention = rows[0];
    if (!intervention) {
      throw new Error(`Intervention with id ${id} is not found`);
    }
    await pool.query("DELETE FROM interventions WHERE id = ?", [id]);
    res.status(200).json({
      status: "Success",
      message: "Intervention deleted",
      data: intervention,
    });
  } catch (err) {
    return errorResponse(res, err, "Failed to get response");
  }
};
