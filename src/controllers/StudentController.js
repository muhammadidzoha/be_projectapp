import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";
import { like } from "../utils/dbHelpers.js";

const SOCIO_ECONOMIC_POINTS = {
  residence: { MILIK_SENDIRI: 3, MENYEWA: 2, BERSAMA_ORANG_TUA: 1 },
  children: { SATU: 3, DUA_SAMPAI_TIGA: 2, EMPAT_ATAU_LEBIH: 1 },
  underFive: { TIDAK_ADA: 4, SATU: 3, DUA_SAMPAI_TIGA: 2, EMPAT_ATAU_LEBIH: 1 },
  income: {
    KURANG_DARI_LIMA_JUTA: 1,
    LIMA_JUTA_SAMPAI_SEPULUH_JUTA: 2,
    LEBIH_DARI_SEPULUH_JUTA: 3,
  },
};

const SOCIO_ECONOMIC_THRESHOLD = 8;
const QUESTIONNAIRE_PARENT_THRESHOLDS = {
  "Kebiasaan Sehari-hari Anak": 34,
  "Tingkat Pengetahuan Gizi Seimbang": 13,
};

const SCHOOL_HEALTH_THRESHOLD = 17;

const categorizeEducation = (edu) => {
  if (!edu) return "Dasar";
  return ["TIDAK_SEKOLAH", "SD", "SMP"].includes(edu)
    ? "Dasar"
    : "Menengah-Tinggi";
};

const computeSocioEconomicInterpretation = (se) => {
  if (!se) return null;
  const totalScore =
    (SOCIO_ECONOMIC_POINTS.residence[se.residenceStatus] ?? 0) +
    (SOCIO_ECONOMIC_POINTS.children[se.childrenCount] ?? 0) +
    (SOCIO_ECONOMIC_POINTS.underFive[se.underFiveCount] ?? 0) +
    (SOCIO_ECONOMIC_POINTS.income[se.familyIncomeLevel] ?? 0);
  return totalScore >= SOCIO_ECONOMIC_THRESHOLD ? "Menengah-Tinggi" : "Dasar";
};

const computeConclusion = (
  nutritionStatus,
  parentData,
  schoolHealthInterpretation,
) => {
  if (!nutritionStatus) return null;

  if (nutritionStatus === "OVERWEIGHT-OBESITAS") return "Gizi Lebih";
  if (nutritionStatus === "GIZI BURUK-KURANG")
    return "Tidak Berisiko Gizi Lebih";

  if (nutritionStatus === "GIZI BAIK") {
    const kebiasaanBaik =
      (parentData?.kebiasaanScore ?? 0) >=
      QUESTIONNAIRE_PARENT_THRESHOLDS["Kebiasaan Sehari-hari Anak"];
    const pengetahuanBaik =
      (parentData?.pengetahuanScore ?? 0) >=
      QUESTIONNAIRE_PARENT_THRESHOLDS["Tingkat Pengetahuan Gizi Seimbang"];
    const sosialEkonomiBaik =
      parentData?.socioEconomicInterpretation === "Menengah-Tinggi";
    const pendidikanBaik = parentData?.parentEducation === "Menengah-Tinggi";
    const pelkesBaik = schoolHealthInterpretation === "Tinggi";

    const all5Good =
      kebiasaanBaik &&
      pengetahuanBaik &&
      sosialEkonomiBaik &&
      pendidikanBaik &&
      pelkesBaik;

    if (all5Good) return "Tidak Berisiko Gizi Lebih";

    const triggerBad = !kebiasaanBaik || !pengetahuanBaik || !sosialEkonomiBaik;
    if (triggerBad) return "Berisiko Gizi Lebih";

    return "Tidak Berisiko Gizi Lebih";
  }

  return null;
};

const mapStudentRow = (row) => ({
  id: row.id,
  fullName: row.fullName,
  familyId: row.familyId,
  nutrition: row.n_id
    ? {
        id: row.n_id,
        height: row.n_height,
        weight: row.n_weight,
        bmi: row.n_bmi,
        nutritionStatus: row.ns_id
          ? {
              id: row.ns_id,
              information: row.ns_information,
              displayName: row.ns_displayName,
            }
          : null,
        measurementDate: row.n_measurementDate,
        monitoringPeriod: row.mp_label ? { label: row.mp_label } : null,
      }
    : null,
  student: row.student_id
    ? {
        id: row.student_id,
        nis: row.nis,
        schoolYear: row.schoolYear,
        semester: row.semester,
        institution: row.st_inst_id
          ? {
              id: row.st_inst_id,
              name: row.st_inst_name,
              address: row.st_inst_address,
              phone: row.st_inst_phone,
              email: row.st_inst_email,
              province: row.prov_id
                ? { id: row.prov_id, name: row.prov_name }
                : null,
              city: row.city_id
                ? { id: row.city_id, name: row.city_name }
                : null,
            }
          : null,
        class: row.class_id
          ? {
              id: row.class_id,
              name: row.class_name,
              teacher: row.teacher_id
                ? {
                    id: row.teacher_id,
                    fullName: row.teacher_fullName,
                    address: row.teacher_address,
                    phone: row.teacher_phone,
                  }
                : null,
            }
          : null,
      }
    : null,
});

const studentSelectBase = `
      fm.id, fm.fullName, fm.familyId,
      n.id AS n_id, n.height AS n_height, n.weight AS n_weight, n.bmi AS n_bmi,
      n.measurementDate AS n_measurementDate,
      ns.id AS ns_id, ns.information AS ns_information, ns.displayName AS ns_displayName,
      mp.label AS mp_label,
      st.id AS student_id, st.nis, st.schoolYear, st.semester,
      si.id AS st_inst_id, si.name AS st_inst_name, si.address AS st_inst_address,
      si.phone AS st_inst_phone, si.email AS st_inst_email,
      p.id AS prov_id, p.name AS prov_name,
      ci.id AS city_id, ci.name AS city_name,
      cl.id AS class_id, cl.name AS class_name,
      t.id AS teacher_id, t.fullName AS teacher_fullName, t.address AS teacher_address, t.phone AS teacher_phone
    `;

const studentJoinBase = `
      FROM family_members fm
      LEFT JOIN students st ON st.familyMemberId = fm.id
      LEFT JOIN institutions si ON si.id = st.schoolId
      LEFT JOIN provinces p ON p.id = si.province_id
      LEFT JOIN cities ci ON ci.id = si.city_id
      LEFT JOIN classes cl ON cl.id = st.classId
      LEFT JOIN teachers t ON t.id = cl.teacher_id
      LEFT JOIN nutritions n ON n.id = (
        SELECT n2.id FROM nutritions n2 WHERE n2.familyMemberId = fm.id ORDER BY n2.id DESC LIMIT 1
      )
      LEFT JOIN nutrition_status ns ON ns.id = n.nutritionStatusId
      LEFT JOIN monitoring_periods mp ON mp.id = n.monitoringPeriodId
    `;

export const getStudents = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const searchLike = like(search);

  try {
    const [[countRow]] = await pool.query(
      "SELECT COUNT(*) AS total FROM family_members WHERE relation = 'ANAK' AND education = 'SD' AND fullName LIKE ?",
      [searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      `SELECT ${studentSelectBase}
       ${studentJoinBase}
       WHERE fm.relation = 'ANAK' AND fm.education = 'SD' AND fm.fullName LIKE ?
       ORDER BY fm.id ASC LIMIT ? OFFSET ?`,
      [searchLike, limit, offset],
    );

    const students = rows.map(mapStudentRow);

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, students },
      "Students retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve students");
  }
};

export const getStudentByUser = async (req, res) => {
  const page = parseInt(req.query.page) || 0;
  const limit = parseInt(req.query.limit) || 10;
  const search = req.query.search || "";
  const offset = limit * page;
  const filteredClass = req.query.class || "";
  const searchLike = like(search);

  try {
    const user = req.user;
    if (!user || !["school", "teacher"].includes(user.role)) {
      return errorResponse(
        res,
        404,
        "User not found or not associated with an institution",
      );
    }

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) {
      return errorResponse(res, 404, "Institution not found for this user");
    }

    const classFilterSql = filteredClass ? " AND cl.name = ?" : "";

    const [[countRow]] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM family_members fm
       JOIN students st ON st.familyMemberId = fm.id
       LEFT JOIN classes cl ON cl.id = st.classId
       WHERE st.schoolId = ? AND fm.fullName LIKE ?${classFilterSql}`,
      filteredClass
        ? [institution.id, searchLike, filteredClass]
        : [institution.id, searchLike],
    );
    const totalRows = countRow.total;
    const totalPage = Math.ceil(totalRows / limit);

    const [rows] = await pool.query(
      `SELECT ${studentSelectBase}
       ${studentJoinBase}
       WHERE st.schoolId = ? AND fm.fullName LIKE ?${classFilterSql}
       ORDER BY fm.id ASC LIMIT ? OFFSET ?`,
      classFilterSql
        ? [institution.id, searchLike, filteredClass, limit, offset]
        : [institution.id, searchLike, limit, offset],
    );

    const students = rows.map(mapStudentRow);

    const studentIds = students.map((s) => s.student?.id).filter(Boolean);

    let activeRecStudentIds = new Set();
    let completedRecMap = {};
    if (studentIds.length > 0) {
      const ph = studentIds.map(() => "?").join(",");
      const [recs] = await pool.query(
        `SELECT id, studentId, status FROM recommendations WHERE studentId IN (${ph})`,
        studentIds,
      );
      activeRecStudentIds = new Set(
        recs
          .filter((r) => r.status === "PENDING" || r.status === "PROCESSED")
          .map((r) => r.studentId),
      );
      for (const r of recs) {
        if (r.status === "COMPLETED") {
          completedRecMap[r.studentId] = { id: r.id, status: r.status };
        }
      }
    }

    const studentsWithFlag = students.map((s) => ({
      ...s,
      isRecommending: s.student ? activeRecStudentIds.has(s.student.id) : false,
      completedRecommendation: s.student
        ? completedRecMap[s.student.id] || null
        : null,
    }));

    const familyIds = [
      ...new Set(studentsWithFlag.map((s) => s.familyId).filter(Boolean)),
    ];

    const familyConclusionMap = {};
    if (familyIds.length > 0) {
      const fph = familyIds.map(() => "?").join(",");
      const [parents] = await pool.query(
        `SELECT fm.familyId, fm.education AS fm_education,
                se.residenceStatus, se.childrenCount, se.underFiveCount, se.familyIncomeLevel,
                r.totalScore AS r_totalScore, q.title AS q_title
         FROM family_members fm
         LEFT JOIN socio_economic se ON se.id = fm.socioEconomicId
         LEFT JOIN responses r ON r.familyMemberId = fm.id
         LEFT JOIN quesioners q ON q.id = r.quisionerId
         WHERE fm.familyId IN (${fph}) AND (fm.relation = 'AYAH' OR fm.relation = 'IBU')`,
        familyIds,
      );

      const perFamily = {};
      parents.forEach((p) => {
        if (!perFamily[p.familyId]) {
          perFamily[p.familyId] = {
            education: p.fm_education,
            SocioEconomic: p.residenceStatus
              ? {
                  residenceStatus: p.residenceStatus,
                  childrenCount: p.childrenCount,
                  underFiveCount: p.underFiveCount,
                  familyIncomeLevel: p.familyIncomeLevel,
                }
              : null,
            responses: [],
          };
        }
        if (p.r_totalScore != null) {
          perFamily[p.familyId].responses.push({
            quesioner: { title: p.q_title },
            totalScore: p.r_totalScore,
          });
        }
      });

      for (const famId of familyIds) {
        const parent = perFamily[famId];
        if (!parent) {
          familyConclusionMap[famId] = null;
          continue;
        }
        const qMap = {};
        for (const r of parent.responses || []) {
          qMap[r.quesioner?.title] = r.totalScore;
        }
        familyConclusionMap[famId] = {
          socioEconomicInterpretation: computeSocioEconomicInterpretation(
            parent.SocioEconomic,
          ),
          parentEducation: categorizeEducation(parent.education),
          kebiasaanScore: qMap["Kebiasaan Sehari-hari Anak"],
          pengetahuanScore: qMap["Tingkat Pengetahuan Gizi Seimbang"],
        };
      }
    }

    let schoolHealthInterpretation = "Rendah";
    const [healthQ] = await pool.query(
      "SELECT * FROM quesioners WHERE title = 'Pelayanan Kesehatan Sekolah' LIMIT 1",
    );
    const healthQuesioner = healthQ[0];
    if (healthQuesioner) {
      const [hRows] = await pool.query(
        "SELECT * FROM responses WHERE institutionId = ? AND quisionerId = ? ORDER BY created_at DESC LIMIT 1",
        [institution.id, healthQuesioner.id],
      );
      const healthResponse = hRows[0];
      if (
        healthResponse &&
        (healthResponse.totalScore ?? 0) >= SCHOOL_HEALTH_THRESHOLD
      ) {
        schoolHealthInterpretation = "Tinggi";
      }
    }

    const studentsWithConclusion = studentsWithFlag.map((s) => {
      const nutritionStatus = s.nutrition?.nutritionStatus?.displayName;
      const conclusion = computeConclusion(
        nutritionStatus,
        familyConclusionMap[s.familyId],
        schoolHealthInterpretation,
      );
      const { familyId, ...rest } = s;
      return { ...rest, conclusion };
    });

    return successResponse(
      res,
      { totalRows, totalPage, page, limit, students: studentsWithConclusion },
      "Students retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to retrieve students");
  }
};
