import pool from "../config/db.js";
import { errorResponse, successResponse } from "../helpers/ResponseHelper.js";
import { getInstitutionByUser } from "../helpers/InstitutionHelper.js";

const POINTS_RESIDENCE = {
  MILIK_SENDIRI: 3,
  MENYEWA: 2,
  BERSAMA_ORANG_TUA: 1,
};

const POINTS_CHILDREN = {
  SATU: 3,
  DUA_SAMPAI_TIGA: 2,
  EMPAT_ATAU_LEBIH: 1,
};

const POINTS_UNDER_FIVE = {
  TIDAK_ADA: 4,
  SATU: 3,
  DUA_SAMPAI_TIGA: 2,
  EMPAT_ATAU_LEBIH: 1,
};

const POINTS_INCOME = {
  KURANG_DARI_LIMA_JUTA: 1,
  LIMA_JUTA_SAMPAI_SEPULUH_JUTA: 2,
  LEBIH_DARI_SEPULUH_JUTA: 3,
};

const categorizeEducation = (edu) => {
  if (!edu) return null;
  const dasar = ["TIDAK_SEKOLAH", "SD", "SMP"];
  return dasar.includes(edu) ? "Dasar" : "Menengah-Tinggi";
};

const SOCIO_ECONOMIC_THRESHOLD = 8;

const QUESTIONNAIRE_THRESHOLDS = {
  "Kebiasaan Sehari-hari Anak": { min: 34, good: "Baik", bad: "Kurang Baik" },
  "Tingkat Pengetahuan Gizi Seimbang": { min: 13, good: "Baik", bad: "Kurang" },
};

export const getAdminDashboardSummary = async (req, res) => {
  try {
    const [adminRows] = await pool.query(
      "SELECT id FROM roles WHERE name = 'admin' LIMIT 1",
    );
    const adminRoleId = adminRows[0]?.id ?? -1;

    const [[userCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM users WHERE role_id != ?",
      [adminRoleId],
    );
    const totalUsers = userCount.total;

    const [userByRoleRows] = await pool.query(
      `SELECT r.id, r.name, COUNT(u.id) AS total FROM roles r
       LEFT JOIN users u ON u.role_id = r.id
       GROUP BY r.id, r.name`,
    );
    const userByRole = userByRoleRows
      .filter((u) => u.id !== adminRoleId)
      .map((u) => ({ role: u.name, total: u.total }));

    const [[instCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM institutions",
    );
    const totalInstitutions = instCount.total;

    const [instByTypeRows] = await pool.query(
      `SELECT it.id, it.name, COUNT(i.id) AS total FROM institution_types it
       LEFT JOIN institutions i ON i.type = it.id
       GROUP BY it.id, it.name`,
    );
    const institutionByType = instByTypeRows.map((i) => ({
      type: i.name,
      total: i.total,
    }));

    const [nutritionRows] = await pool.query(
      `SELECT ns.displayName, COUNT(*) AS total FROM family_members fm
       JOIN (
         SELECT n.familyMemberId, n.nutritionStatusId,
                ROW_NUMBER() OVER (PARTITION BY n.familyMemberId ORDER BY n.updatedAt DESC) AS rn
         FROM nutritions n
       ) latest ON latest.familyMemberId = fm.id AND latest.rn = 1
       LEFT JOIN nutrition_status ns ON ns.id = latest.nutritionStatusId
       GROUP BY ns.displayName`,
    );
    const nutritionDistribution = nutritionRows.map((n) => ({
      displayName: n.displayName || "Tidak Terdata",
      total: n.total,
    }));

    const [[tCount]] = await pool.query("SELECT COUNT(*) AS total FROM teachers");
    const totalTeachers = tCount.total;
    const [[clCount]] = await pool.query("SELECT COUNT(*) AS total FROM classes");
    const totalClasses = clCount.total;
    const [[recCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM recommendations",
    );
    const totalRecommendations = recCount.total;

    const [recByStatusRows] = await pool.query(
      `SELECT status, COUNT(*) AS total FROM recommendations GROUP BY status`,
    );
    const statusLabelMap = {
      PENDING: "pending",
      PROCESSED: "proses",
      COMPLETED: "selesai",
    };
    const recommendationsByStatus = recByStatusRows.map((r) => ({
      status: statusLabelMap[r.status] || r.status.toLowerCase(),
      total: r.total,
    }));

    const [qRows] = await pool.query(
      "SELECT * FROM quesioners WHERE title = 'Pelayanan Kesehatan Sekolah' LIMIT 1",
    );
    const schoolQuesioner = qRows[0];

    const [schools] = await pool.query(
      `SELECT i.id, i.name FROM institutions i
       JOIN institution_types it ON it.id = i.type
       WHERE it.name = 'School'`,
    );

    const responseMap = {};
    if (schoolQuesioner) {
      const [schoolResponses] = await pool.query(
        `SELECT institutionId, COUNT(*) AS total FROM responses
         WHERE institutionId IS NOT NULL AND quisionerId = ?
         GROUP BY institutionId`,
        [schoolQuesioner.id],
      );
      schoolResponses.forEach((r) => {
        if (r.institutionId) responseMap[r.institutionId] = r.total;
      });
    }

    const institutionDetails = schools.map((s) => ({
      id: s.id,
      name: s.name,
      completedQuests: responseMap[s.id] || 0,
      totalQuests: schoolQuesioner ? 1 : 0,
    }));

    const completedInstitutions = institutionDetails.filter(
      (d) => d.completedQuests >= d.totalQuests,
    ).length;
    const totalSchoolInst = schools.length;
    const percentage =
      totalSchoolInst > 0
        ? Math.round((completedInstitutions / totalSchoolInst) * 100)
        : 0;

    const [recentRecs] = await pool.query(
      `SELECT r.id, r.status, r.createdAt,
              fmm.fullName AS student_name, i.name AS institution_name
       FROM recommendations r
       LEFT JOIN students st ON st.id = r.studentId
       LEFT JOIN family_members fmm ON fmm.id = st.familyMemberId
       LEFT JOIN institutions i ON i.id = st.schoolId
       ORDER BY r.createdAt DESC LIMIT 5`,
    );
    const recentRecommendations = recentRecs.map((r) => ({
      id: r.id,
      studentName: r.student_name,
      institutionName: r.institution_name,
      status: statusLabelMap[r.status] || r.status.toLowerCase(),
      createdAt: r.createdAt,
    }));

    return successResponse(
      res,
      {
        totalUsers,
        userByRole,
        totalInstitutions,
        institutionByType,
        nutritionDistribution,
        totalTeachers,
        totalClasses,
        totalRecommendations,
        recommendationsByStatus,
        questionnaireProgress: {
          totalInstitutions: totalSchoolInst,
          completedInstitutions,
          percentage,
          institutionDetails,
        },
        recentRecommendations,
      },
      "Admin dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get admin dashboard summary");
  }
};

export const getParentDashboardSummary = async (req, res) => {
  try {
    const user = req.user;

    const [familyRows] = await pool.query(
      "SELECT * FROM families WHERE userId = ? LIMIT 1",
      [user.id],
    );
    const family = familyRows[0];
    if (!family) {
      return errorResponse(res, null, "Family not found");
    }

    const [members] = await pool.query(
      `SELECT fm.*, se.residenceStatus, se.childrenCount, se.underFiveCount, se.familyIncomeLevel,
              st.id AS student_id, st.schoolId AS student_schoolId
       FROM family_members fm
       LEFT JOIN socio_economic se ON se.id = fm.socioEconomicId
       LEFT JOIN students st ON st.familyMemberId = fm.id
       WHERE fm.familyId = ?`,
      [family.id],
    );

    const totalFamilyMembers = members.length;
    const children = members.filter((m) => m.relation === "ANAK");
    const totalChildren = children.length;

    const parent =
      members.find((m) => m.relation === "IBU") ||
      members.find((m) => m.relation === "AYAH");

    const childrenIds = children.map((c) => c.id);
    let familyNutrition = [];
    if (childrenIds.length) {
      const cph = childrenIds.map(() => "?").join(",");
      const [nRows] = await pool.query(
        `SELECT n.*, ns.displayName AS ns_displayName, mp.label AS mp_label
         FROM nutritions n
         LEFT JOIN nutrition_status ns ON ns.id = n.nutritionStatusId
         LEFT JOIN monitoring_periods mp ON mp.id = n.monitoringPeriodId
         WHERE n.familyMemberId IN (${cph})
         ORDER BY n.measurementDate ASC`,
        childrenIds,
      );
      familyNutrition = nRows;
    }

    let totalQuestionnaires = 0;
    let answeredQuestionnaires = 0;
    let questionnaireProgress = 0;
    const questionnaireResults = [];

    const parentTitles = [
      "Tingkat Pengetahuan Gizi Seimbang",
      "Kebiasaan Sehari-hari Anak",
    ];

    if (parent) {
      const [[tqCount]] = await pool.query(
        "SELECT COUNT(*) AS total FROM quesioners WHERE title IN (?, ?)",
        parentTitles,
      );
      totalQuestionnaires = tqCount.total;

      const [parentResponses] = await pool.query(
        `SELECT r.*, q.title AS q_title FROM responses r
         JOIN quesioners q ON q.id = r.quisionerId
         WHERE r.familyMemberId = ? ORDER BY r.created_at DESC`,
        [parent.id],
      );
      const answeredQuesionerIds = [
        ...new Set(parentResponses.map((r) => r.quisionerId)),
      ];
      answeredQuestionnaires = answeredQuesionerIds.length;
      questionnaireProgress =
        totalQuestionnaires > 0
          ? Math.round((answeredQuestionnaires / totalQuestionnaires) * 100)
          : 0;

      const latestPerQuesioner = new Map();
      for (const r of parentResponses) {
        if (!latestPerQuesioner.has(r.quisionerId)) {
          latestPerQuesioner.set(r.quisionerId, r);
        }
      }
      for (const r of latestPerQuesioner.values()) {
        const threshold = QUESTIONNAIRE_THRESHOLDS[r.q_title];
        if (threshold) {
          questionnaireResults.push({
            quesionerId: r.quisionerId,
            title: r.q_title,
            totalScore: r.totalScore,
            interpretation:
              r.totalScore >= threshold.min ? threshold.good : threshold.bad,
          });
        }
      }
    }

    let socioEconomic = null;
    if (parent && parent.residenceStatus) {
      const residencePoints = POINTS_RESIDENCE[parent.residenceStatus] ?? 0;
      const childrenPoints = POINTS_CHILDREN[parent.childrenCount] ?? 0;
      const underFivePoints = POINTS_UNDER_FIVE[parent.underFiveCount] ?? 0;
      const incomePoints = POINTS_INCOME[parent.familyIncomeLevel] ?? 0;
      const totalScore =
        residencePoints + childrenPoints + underFivePoints + incomePoints;

      socioEconomic = {
        residenceStatus: parent.residenceStatus,
        residencePoints,
        childrenCount: parent.childrenCount,
        childrenPoints,
        underFiveCount: parent.underFiveCount,
        underFivePoints,
        familyIncomeLevel: parent.familyIncomeLevel,
        incomePoints,
        totalScore,
        interpretation:
          totalScore >= SOCIO_ECONOMIC_THRESHOLD ? "Menengah-Tinggi" : "Rendah",
      };
    }

    const parentEducation = {};
    const ibu = members.find((m) => m.relation === "IBU");
    const ayah = members.find((m) => m.relation === "AYAH");
    if (ibu)
      parentEducation.ibu = {
        education: ibu.education,
        category: categorizeEducation(ibu.education),
      };
    if (ayah)
      parentEducation.ayah = {
        education: ayah.education,
        category: categorizeEducation(ayah.education),
      };

    const childNutritions = {};
    familyNutrition.forEach((n) => {
      if (!childNutritions[n.familyMemberId])
        childNutritions[n.familyMemberId] = [];
      childNutritions[n.familyMemberId].push(n);
    });

    const latestNutrition = [...familyNutrition].sort(
      (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt),
    )[0];

    const nutritionDistribution = {};
    children.forEach((child) => {
      const list = childNutritions[child.id] || [];
      const status = list[0]?.ns_displayName;
      if (status) {
        nutritionDistribution[status] =
          (nutritionDistribution[status] || 0) + 1;
      }
    });
    const nutritionDistArray = Object.entries(nutritionDistribution).map(
      ([displayName, total]) => ({ displayName, total }),
    );

    let schoolHealthService = null;
    const childWithSchool = children.find((c) => c.student_schoolId);
    if (childWithSchool) {
      const schoolId = childWithSchool.student_schoolId;
      const [qRows] = await pool.query(
        "SELECT * FROM quesioners WHERE title = 'Pelayanan Kesehatan Sekolah' LIMIT 1",
      );
      const schoolQuesioner = qRows[0];
      if (schoolQuesioner) {
        const [respRows] = await pool.query(
          "SELECT * FROM responses WHERE institutionId = ? AND quisionerId = ? ORDER BY created_at DESC LIMIT 1",
          [schoolId, schoolQuesioner.id],
        );
        const schoolResponse = respRows[0];
        if (schoolResponse) {
          const threshold = 17;
          schoolHealthService = {
            title: schoolQuesioner.title,
            totalScore: schoolResponse.totalScore,
            interpretation:
              schoolResponse.totalScore >= threshold ? "Tinggi" : "Rendah",
          };
        }
      }
    }

    const childrenNutritionHistory = children.map((child) => ({
      childId: child.id,
      childName: child.fullName,
      measurements: (childNutritions[child.id] || []).map((n) => ({
        period: n.mp_label ?? "-",
        measurementDate: n.measurementDate,
        height: n.height,
        weight: n.weight,
        bmi: n.bmi,
        nutritionStatus: n.ns_displayName ?? null,
      })),
    }));

    const [mpRows] = await pool.query(
      "SELECT id, label, startDate, endDate FROM monitoring_periods WHERE familyId = ? ORDER BY startDate ASC",
      [family.id],
    );
    const monitoringPeriods = mpRows.map((mp) => ({
      id: mp.id,
      label: mp.label,
      startDate: mp.startDate,
      endDate: mp.endDate,
    }));

    return successResponse(
      res,
      {
        totalFamilyMembers,
        totalChildren,
        totalQuestionnaires,
        answeredQuestionnaires,
        questionnaireProgress,
        questionnaireResults,
        socioEconomic,
        parentEducation,
        latestNutritionStatus: latestNutrition?.ns_displayName ?? null,
        nutritionDistribution: nutritionDistArray,
        schoolHealthService,
        childrenNutritionHistory,
        monitoringPeriods,
      },
      "Dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Failed to get dashboard summary");
  }
};

export const getSchoolDashboardSummary = async (req, res) => {
  try {
    const user = req.user;

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) return errorResponse(res, null, "Institution not found");

    const institutionId = institution.id;

    const [[sCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM students WHERE schoolId = ?",
      [institutionId],
    );
    const totalStudents = sCount.total;
    const [[cCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM classes WHERE school_id = ?",
      [institutionId],
    );
    const totalClasses = cCount.total;
    const [[tCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM teachers WHERE school_id = ?",
      [institutionId],
    );
    const totalTeachers = tCount.total;
    const [[pCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM partnerships WHERE schoolId = ?",
      [institutionId],
    );
    const totalPartners = pCount.total;

    const [nutritionRows] = await pool.query(
      `SELECT ns.displayName, COUNT(*) AS total FROM family_members fm
       JOIN students st ON st.familyMemberId = fm.id AND st.schoolId = ?
       JOIN (
         SELECT n.familyMemberId, n.nutritionStatusId,
                ROW_NUMBER() OVER (PARTITION BY n.familyMemberId ORDER BY n.createdAt DESC) AS rn
         FROM nutritions n
       ) latest ON latest.familyMemberId = fm.id AND latest.rn = 1
       LEFT JOIN nutrition_status ns ON ns.id = latest.nutritionStatusId
       GROUP BY ns.displayName`,
      [institutionId],
    );
    const nutritionDistribution = nutritionRows.map((n) => ({
      displayName: n.displayName || "Tidak Terdata",
      total: n.total,
    }));

    const [schoolStudents] = await pool.query(
      `SELECT fm.id, fm.fullName, cl.id AS class_id, cl.name AS class_name
       FROM family_members fm
       JOIN students st ON st.familyMemberId = fm.id AND st.schoolId = ?
       LEFT JOIN classes cl ON cl.id = st.classId
       WHERE fm.relation = 'ANAK'`,
      [institutionId],
    );

    const studentIds = schoolStudents.map((s) => s.id);
    const measurementsByStudent = {};
    if (studentIds.length) {
      const ph = studentIds.map(() => "?").join(",");
      const [nRows] = await pool.query(
        `SELECT n.*, ns.displayName AS ns_displayName, mp.label AS mp_label
         FROM nutritions n
         LEFT JOIN nutrition_status ns ON ns.id = n.nutritionStatusId
         LEFT JOIN monitoring_periods mp ON mp.id = n.monitoringPeriodId
         WHERE n.familyMemberId IN (${ph})
         ORDER BY n.measurementDate ASC`,
        studentIds,
      );
      nRows.forEach((n) => {
        if (!measurementsByStudent[n.familyMemberId])
          measurementsByStudent[n.familyMemberId] = [];
        measurementsByStudent[n.familyMemberId].push(n);
      });
    }

    const childrenNutritionHistory = schoolStudents.map((s) => ({
      childId: s.id,
      childName: s.fullName,
      className: s.class_name ?? null,
      measurements: (measurementsByStudent[s.id] || []).map((n) => ({
        period: n.mp_label ?? "-",
        measurementDate: n.measurementDate,
        height: n.height,
        weight: n.weight,
        bmi: n.bmi,
        nutritionStatus: n.ns_displayName ?? null,
      })),
    }));

    const [classGroups] = await pool.query(
      `SELECT classId, COUNT(*) AS total FROM students WHERE schoolId = ? GROUP BY classId`,
      [institutionId],
    );
    const classIds = classGroups.map((g) => g.classId).filter((x) => x != null);
    const classMap = {};
    if (classIds.length) {
      const ph = classIds.map(() => "?").join(",");
      const [classes] = await pool.query(
        `SELECT id, name FROM classes WHERE id IN (${ph})`,
        classIds,
      );
      classes.forEach((c) => {
        classMap[c.id] = c.name;
      });
    }

    const [qRows] = await pool.query(
      "SELECT * FROM quesioners WHERE title = 'Pelayanan Kesehatan Sekolah' LIMIT 1",
    );
    const schoolQuesioner = qRows[0];

    let questionnaireProgress = 0;
    let questionnaireResult = null;
    let schoolConclusion = null;

    if (schoolQuesioner) {
      const [respRows] = await pool.query(
        "SELECT * FROM responses WHERE institutionId = ? AND quisionerId = ? ORDER BY created_at DESC LIMIT 1",
        [institutionId, schoolQuesioner.id],
      );
      const response = respRows[0];

      if (response) {
        questionnaireProgress = 100;
        const interpretation =
          response.totalScore >= 17 ? "Tinggi" : "Rendah";
        questionnaireResult = {
          title: schoolQuesioner.title,
          totalScore: response.totalScore,
          interpretation,
        };

        if (interpretation === "Tinggi") {
          schoolConclusion = {
            color: "from-emerald-500 to-teal-600",
            icon: "🏆",
            kategori: "Pelayanan Kesehatan Sekolah Baik",
            saran: ["Budayakan perilaku hidup sehat dalam lingkungan sekolah"],
          };
        } else {
          schoolConclusion = {
            color: "from-amber-500 to-orange-600",
            icon: "⚠️",
            kategori: "Pelayanan Kesehatan Sekolah Perlu Ditingkatkan",
            saran: [
              "Rekomendasi tindaklanjut Puskesmas",
              "Budayakan perilaku hidup sehat dalam lingkungan sekolah",
            ],
          };
        }
      }
    }

    return successResponse(
      res,
      {
        totalStudents,
        totalClasses,
        totalTeachers,
        totalPartners,
        nutritionDistribution,
        studentsPerClass: classGroups.map((g) => ({
          className: classMap[g.classId] || "Unknown",
          total: g.total,
        })),
        questionnaireProgress,
        questionnaireResult,
        schoolConclusion,
        childrenNutritionHistory,
      },
      "School dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(res, error, "Internal server error");
  }
};

export const getHealthcareDashboardSummary = async (req, res) => {
  try {
    const user = req.user;

    const institution = await getInstitutionByUser(user.id, user.role);
    if (!institution) return errorResponse(res, null, "Institution not found");

    const institutionId = institution.id;

    const countByStatus = (status) =>
      pool
        .query(
          "SELECT COUNT(*) AS total FROM recommendations WHERE healthcareInstitutionId = ? AND status = ?",
          [institutionId, status],
        )
        .then(([rows]) => rows[0].total);
    const [pending, processed, completed] = await Promise.all([
      countByStatus("PENDING"),
      countByStatus("PROCESSED"),
      countByStatus("COMPLETED"),
    ]);

    const [[partnerCount]] = await pool.query(
      "SELECT COUNT(*) AS total FROM partnerships WHERE healthcareId = ?",
      [institutionId],
    );
    const totalPartnerSchools = partnerCount.total;

    const [recentRecs] = await pool.query(
      `SELECT r.id, r.createdAt, st.nis,
              fmm.fullName AS fm_fullName, i.name AS inst_name, cl.name AS class_name
       FROM recommendations r
       LEFT JOIN students st ON st.id = r.studentId
       LEFT JOIN family_members fmm ON fmm.id = st.familyMemberId
       LEFT JOIN institutions i ON i.id = st.schoolId
       LEFT JOIN classes cl ON cl.id = st.classId
       WHERE r.healthcareInstitutionId = ? AND r.status = 'PENDING'
       ORDER BY r.createdAt DESC LIMIT 5`,
      [institutionId],
    );

    const recByStatus = [
      { status: "PENDING", total: pending },
      { status: "PROCESSED", total: processed },
      { status: "COMPLETED", total: completed },
    ];

    return successResponse(
      res,
      {
        totalPending: pending,
        totalProcessed: processed,
        totalCompleted: completed,
        totalPartnerSchools,
        recentRecommendations: recentRecs,
        recommendationsByStatus: recByStatus,
      },
      "Healthcare dashboard summary retrieved successfully",
    );
  } catch (error) {
    return errorResponse(
      res,
      error,
      "Failed to get healthcare dashboard summary",
    );
  }
};
