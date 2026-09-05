import { randomUUID } from "node:crypto";
import argon2 from "argon2";
import pool from "../config/db.js";

const HASH_OPTIONS = { parallelism: 1, memoryCost: 65536, timeCost: 3 };

const ROLE_NAMES = ["admin", "parent", "school", "teacher", "healthcare", "staff"];
const INSTITUTION_TYPES = ["School", "HealthCare"];
const CITIES = [
  "Kepulauan Seribu",
  "Jakarta Barat",
  "Jakarta Pusat",
  "Jakarta Selatan",
  "Jakarta Timur",
  "Jakarta Utara",
];
const CATEGORIES = [
  { name: "Tingkat Pengetahuan Gizi Seimbang", path: "/tingkat-pengetahuan-gizi-seimbang" },
  { name: "Kebiasaan Sehari-hari Anak", path: "/kebiasaan-sehari-hari-anak" },
  { name: "Pelayanan Kesehatan Sekolah", path: "/pelayanan-kesehatan-sekolah" },
];
const QUESIONERS = [
  { title: "Tingkat Pengetahuan Gizi Seimbang", description: "Quisioner tentang pengetahuan gizi seimbang orang tua" },
  { title: "Kebiasaan Sehari-hari Anak", description: "Quisioner untuk mengetahui kebiasaaan sehari-hari anak" },
  { title: "Pelayanan Kesehatan Sekolah", description: "Quisioner Pelayanan kesehatan di sekolah" },
];
const JOB_TYPES = [
  { name: "Tidak Bekerja", type: "TIDAK_BEKERJA" },
  { name: "Buruh", type: "BURUH" },
  { name: "Karyawan Swasta", type: "KARYAWAN_SWASTA" },
  { name: "ASN / BUMN", type: "ASN_BUMN" },
  { name: "Wiraswasta", type: "WIRASWASTA" },
];
const NUTRITION_STATUSES = [
  { displayName: "GIZI BURUK-KURANG", status: "GIZI_BURUK_KURANG", information: "Kekurangan bb tingkat ringan sampai berat" },
  { displayName: "GIZI BAIK", status: "GIZI_BAIK", information: "Gizi normal" },
  { displayName: "OVERWEIGHT-OBESITAS", status: "OVERWEIGHT_OBESITAS", information: "Kelebihan bb tingkat ringan sampai berat" },
];

const QUESTIONS = [
  { quesioner_id: 1, title: "Anak Sekolah yang sehat adalah yang memiliki badan gemuk", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Kegemukan terjadi karena jumlah makanan yang dimakan melebihi kebutuhan tubuh", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Untuk memenuhi kebutuhan gizi, anak SD harus makan 3x sehari, yaitu: pagi, siang dan malam", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Sarapan pagi sangat baik untuk prestasi belajar anak SD di sekolah", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Sarapan dapat meningkatkan konsentrasi belajar, energi pada otak sehingga dapat berprestasi", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Makanan yang dianjurkan untuk anak SD mengacu pada ”Isi piringku”, yaitu: 1/3 untuk makanan pokok, 1/3 sayuran dan 1/3 lauk pauk dan buah-buahan", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Kebiasaan jajan yang tidak sehat akan menyebabkan kegemukan", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Makanan yang sehat untuk anak SD adalah terhindar dari pengawet, pemanis buatan dan pewarna", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Anak yang kurang melakukan aktivitas fisik seperti: bermain, berolahraga, bersepeda, jalan kaki dapat berisiko kegemukan", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Menu seimbang untuk anak SD adalah yang terdiri dari nasi, ikan/daging, sayur dan buah-buahan", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Kebiasaan makan tidak tepat waktu akan berdampak buruk terhadap kesehatan", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Anak SD tidak berisiko mengalami masalah kesehatan, jika gemar minum minuman kemasan", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Anak SD usia 10-12 tahun membutuhkan air putih kurang lebih 7-8 gelas", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Minuman yang tinggi pemanis buatan dapat meningkatkan risiko kegemukan bagi anak", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 1, title: "Kegemukan dapat menyebabkan penyakit jantung, diabetes milititus/kencing manis, tekanan darah tinggi", type: "BOOLEAN", is_negative: false },
  { quesioner_id: 2, title: "Anak saya sarapan pagi atau makan siang sebelum berangkat sekolah", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Apabila tidak sempat sarapan atau makan siang, maka anak saya membawa bekal", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya makan nasi dan lauk pauk 2-3 kali sehari", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Menurut saya, anak saya menghabiskan makanan dengan porsi yang sesuai umurnya", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya makan fast food, seperti burger, fried chiken atau pizza 2-3 kali dalam seminggu", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Anak saya mengkonsumsi minuman bersoda di rumah, seperti: coca cola, sprite, fanta, dll 2-3 kali seminggu", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Anak saya membawa cukup uang untuk beli cemilan dan makan nasi di sekolah ", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Anak saya tidak gemar makan cemilan yang gurih, tinggi penyedap di rumah", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya tidak gemar membeli gorengan sebagai jajanan", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya tidak gemar minum minuman dingin dengan aneka rasa buah", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya lebih suka jalan kaki atau naik sepeda ke sekolah daripada naik motor/mobil", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya berjalan kaki, berenang atau senam minimal 30 menit sehari", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya gemar menonton televisi, bermain games atau tidur apabila sedang berada di rumah", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Anak saya menonton televisi, bermain game menggunakan komputer/laptop/hp lebih dari 3 jam/hari", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Anak saya lebih suka bermain dengan teman sebaya di luar rumah daripada diam di dalam rumah", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Di hari sekolah, anak saya tidur di bawah jam 21.00 wib", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Di hari libur, anak saya tidur di bawah jam 21.00 wib", type: "SCALE", is_negative: false },
  { quesioner_id: 2, title: "Anak saya menonton televisi hingga melebihi jam 21.00 wib", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Di luar jam sekolah, anak saya lebih memilih tidur, nonton televisi, main game pada komputer/hp daripada beraktivitas di luar rumah", type: "SCALE", is_negative: true },
  { quesioner_id: 2, title: "Anak saya memiliki waktu tidur yang cukup dan berkualitas", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah memfasilitasi puskesmas melaksanakan penjaringan kesehatan dan pemeriksaan status gizi anak secara berkala", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah membantu pelaksanaan imunisasi anak sekolah", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah memeriksa kebersihan diri anak sekolah", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah melaksanakan layanan konseling terkait masalah gizi anak", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah berkolaborasi dengan pihak puskesmas dalam mengatasi anak sekolah dengan kelebihan berat badan", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah melibatkan orang tua melalui komite dalam program pelayanan kesehatan di sekolah", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah berperan dalam mengatasi bulliying pada anak sekolah karena kelebihan berat badan", type: "SCALE", is_negative: false },
  { quesioner_id: 3, title: "Sekolah tidak memfasilitasi puskesmas dalam monitoring status gizi anak", type: "SCALE", is_negative: true },
];

const BMI_REFERENCES = [
  { ageYear: 7, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 11.8, sdMinus3Max: 11.9, sdMinus2Min: 12.7, sdMinus2Max: 12.9, sdMinus1Min: 13.9, sdMinus1Max: 14.1, medianMin: 15.4, medianMax: 15.7, sdPlus1Min: 17.3, sdPlus1Max: 17.7, sdPlus2Min: 19.8, sdPlus2Max: 20.5, sdPlus3Min: 23.3, sdPlus3Max: 24.6 },
  { ageYear: 8, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 11.9, sdMinus3Max: 12.1, sdMinus2Min: 12.9, sdMinus2Max: 13.1, sdMinus1Min: 14.1, sdMinus1Max: 14.4, medianMin: 15.7, medianMax: 16.0, sdPlus1Min: 17.7, sdPlus1Max: 18.2, sdPlus2Min: 20.6, sdPlus2Max: 21.3, sdPlus3Min: 24.8, sdPlus3Max: 26.2 },
  { ageYear: 9, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 12.1, sdMinus3Max: 12.3, sdMinus2Min: 13.1, sdMinus2Max: 13.4, sdMinus1Min: 14.4, sdMinus1Max: 14.8, medianMin: 16.1, medianMax: 16.6, sdPlus1Min: 18.3, sdPlus1Max: 19.0, sdPlus2Min: 21.5, sdPlus2Max: 22.5, sdPlus3Min: 26.5, sdPlus3Max: 28.2 },
  { ageYear: 10, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 12.4, sdMinus3Max: 12.7, sdMinus2Min: 13.5, sdMinus2Max: 13.8, sdMinus1Min: 14.8, sdMinus1Max: 15.3, medianMin: 16.6, medianMax: 17.2, sdPlus1Min: 19.0, sdPlus1Max: 19.8, sdPlus2Min: 22.6, sdPlus2Max: 23.6, sdPlus3Min: 28.4, sdPlus3Max: 30.0 },
  { ageYear: 11, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 12.7, sdMinus3Max: 13.1, sdMinus2Min: 13.9, sdMinus2Max: 14.3, sdMinus1Min: 15.3, sdMinus1Max: 15.9, medianMin: 17.2, medianMax: 17.9, sdPlus1Min: 19.9, sdPlus1Max: 20.7, sdPlus2Min: 23.7, sdPlus2Max: 24.9, sdPlus3Min: 30.2, sdPlus3Max: 31.8 },
  { ageYear: 12, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 13.2, sdMinus3Max: 13.6, sdMinus2Min: 14.4, sdMinus2Max: 14.9, sdMinus1Min: 16.0, sdMinus1Max: 16.6, medianMin: 18.0, medianMax: 18.7, sdPlus1Min: 20.8, sdPlus1Max: 21.7, sdPlus2Min: 25.0, sdPlus2Max: 26.1, sdPlus3Min: 31.9, sdPlus3Max: 33.3 },
  { ageYear: 13, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 13.6, sdMinus3Max: 14.0, sdMinus2Min: 14.9, sdMinus2Max: 15.4, sdMinus1Min: 16.6, sdMinus1Max: 17.2, medianMin: 18.8, medianMax: 19.5, sdPlus1Min: 21.8, sdPlus1Max: 22.7, sdPlus2Min: 26.2, sdPlus2Max: 27.2, sdPlus3Min: 33.4, sdPlus3Max: 34.6 },
  { ageYear: 14, ageMonthFrom: 0, ageMonthTo: 11, gender: "P", sdMinus3Min: 14.0, sdMinus3Max: 14.3, sdMinus2Min: 15.4, sdMinus2Max: 15.8, sdMinus1Min: 17.2, sdMinus1Max: 17.7, medianMin: 19.6, medianMax: 20.2, sdPlus1Min: 22.7, sdPlus1Max: 23.5, sdPlus2Min: 27.3, sdPlus2Max: 28.2, sdPlus3Min: 34.7, sdPlus3Max: 35.5 },
  { ageYear: 7, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 12.3, sdMinus3Max: 12.4, sdMinus2Min: 13.1, sdMinus2Max: 13.3, sdMinus1Min: 14.2, sdMinus1Max: 14.4, medianMin: 15.5, medianMax: 15.7, sdPlus1Min: 17.0, sdPlus1Max: 17.4, sdPlus2Min: 19.0, sdPlus2Max: 19.6, sdPlus3Min: 21.6, sdPlus3Max: 22.7 },
  { ageYear: 8, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 12.4, sdMinus3Max: 12.5, sdMinus2Min: 13.3, sdMinus2Max: 13.5, sdMinus1Min: 14.4, sdMinus1Max: 14.6, medianMin: 15.7, medianMax: 16.0, sdPlus1Min: 17.4, sdPlus1Max: 17.9, sdPlus2Min: 19.7, sdPlus2Max: 20.4, sdPlus3Min: 22.8, sdPlus3Max: 24.2 },
  { ageYear: 9, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 12.6, sdMinus3Max: 12.8, sdMinus2Min: 13.5, sdMinus2Max: 13.7, sdMinus1Min: 14.6, sdMinus1Max: 14.9, medianMin: 16.0, medianMax: 16.4, sdPlus1Min: 17.9, sdPlus1Max: 18.4, sdPlus2Min: 20.5, sdPlus2Max: 21.3, sdPlus3Min: 24.3, sdPlus3Max: 25.9 },
  { ageYear: 10, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 12.8, sdMinus3Max: 13.0, sdMinus2Min: 13.7, sdMinus2Max: 14.0, sdMinus1Min: 14.9, sdMinus1Max: 15.3, medianMin: 16.4, medianMax: 16.9, sdPlus1Min: 18.5, sdPlus1Max: 19.1, sdPlus2Min: 21.4, sdPlus2Max: 22.4, sdPlus3Min: 26.1, sdPlus3Max: 27.9 },
  { ageYear: 11, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 13.1, sdMinus3Max: 13.4, sdMinus2Min: 14.1, sdMinus2Max: 14.4, sdMinus1Min: 15.3, sdMinus1Max: 15.7, medianMin: 16.9, medianMax: 17.5, sdPlus1Min: 19.2, sdPlus1Max: 19.9, sdPlus2Min: 22.5, sdPlus2Max: 23.5, sdPlus3Min: 28.0, sdPlus3Max: 29.8 },
  { ageYear: 12, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 13.4, sdMinus3Max: 13.8, sdMinus2Min: 14.5, sdMinus2Max: 14.9, sdMinus1Min: 15.8, sdMinus1Max: 16.3, medianMin: 17.5, medianMax: 18.2, sdPlus1Min: 19.9, sdPlus1Max: 20.8, sdPlus2Min: 23.6, sdPlus2Max: 24.7, sdPlus3Min: 30.0, sdPlus3Max: 31.6 },
  { ageYear: 13, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 13.8, sdMinus3Max: 14.3, sdMinus2Min: 14.9, sdMinus2Max: 15.4, sdMinus1Min: 16.4, sdMinus1Max: 17.0, medianMin: 18.2, medianMax: 18.9, sdPlus1Min: 20.8, sdPlus1Max: 21.7, sdPlus2Min: 24.8, sdPlus2Max: 25.8, sdPlus3Min: 31.7, sdPlus3Max: 33.0 },
  { ageYear: 14, ageMonthFrom: 0, ageMonthTo: 11, gender: "L", sdMinus3Min: 14.3, sdMinus3Max: 14.7, sdMinus2Min: 15.5, sdMinus2Max: 16.0, sdMinus1Min: 17.0, sdMinus1Max: 17.6, medianMin: 19.0, medianMax: 19.7, sdPlus1Min: 21.8, sdPlus1Max: 22.6, sdPlus2Min: 25.9, sdPlus2Max: 26.9, sdPlus3Min: 33.1, sdPlus3Max: 34.0 },
];

const exists = async (table, column, value) => {
  const [rows] = await pool.query(
    `SELECT id FROM ${table} WHERE ${column} = ? LIMIT 1`,
    [value],
  );
  return rows[0]?.id ?? null;
};

const seedRoles = async () => {
  for (const name of ROLE_NAMES) {
    const id = await exists("roles", "name", name);
    if (!id) {
      await pool.query("INSERT INTO roles (name) VALUES (?)", [name]);
    }
  }
  console.log("Roles done");
};

const seedUser = async () => {
  const id = await exists("users", "username", "admin");
  if (id) {
    console.log("User already exists");
    return;
  }
  const hashPassword = await argon2.hash("admin", HASH_OPTIONS);
  const userId = randomUUID();
  await pool.query(
    "INSERT INTO users (id, username, email, password, role_id, created_at, updated_at) VALUES (?, 'admin', 'admin@example.com', ?, 1, NOW(), NOW())",
    [userId, hashPassword],
  );
  console.log("User seeded (password: admin)");
};

const seedInstitutionTypes = async () => {
  for (const name of INSTITUTION_TYPES) {
    const id = await exists("institution_types", "name", name);
    if (!id) {
      await pool.query("INSERT INTO institution_types (name) VALUES (?)", [name]);
    }
  }
  console.log("Institution types done");
};

const seedProvince = async () => {
  const id = await exists("provinces", "name", "DKI Jakarta");
  if (!id) {
    await pool.query("INSERT INTO provinces (name) VALUES ('DKI Jakarta')");
  }
  console.log("Province done");
};

const seedCity = async () => {
  const provinceId = await exists("provinces", "name", "DKI Jakarta");
  for (const name of CITIES) {
    const existing = await pool.query(
      "SELECT id FROM cities WHERE name = ? AND province_id = ? LIMIT 1",
      [name, provinceId],
    );
    if (!existing[0][0]) {
      await pool.query(
        "INSERT INTO cities (name, province_id) VALUES (?, ?)",
        [name, provinceId],
      );
    }
  }
  console.log("City done");
};

const seedCategories = async () => {
  for (const c of CATEGORIES) {
    const id = await exists("categories", "name", c.name);
    if (!id) {
      await pool.query(
        "INSERT INTO categories (name, path) VALUES (?, ?)",
        [c.name, c.path],
      );
    }
  }
  console.log("Categories done");
};

const seedQuesioners = async () => {
  for (const q of QUESIONERS) {
    const id = await exists("quesioners", "title", q.title);
    if (!id) {
      await pool.query(
        "INSERT INTO quesioners (title, description) VALUES (?, ?)",
        [q.title, q.description],
      );
    }
  }
  console.log("Quesioners done");
};

const seedQuestionsAndOptions = async () => {
  const existing = await pool.query("SELECT COUNT(*) AS total FROM questions");
  if (existing[0][0].total > 0) {
    console.log("Questions already exist");
    return;
  }

  const questionIdByTitle = {};
  for (const q of QUESTIONS) {
    const [res] = await pool.query(
      "INSERT INTO questions (quesioner_id, title, type, is_required, is_negative, created_at, updated_at) VALUES (?, ?, ?, 1, ?, NOW(), NOW())",
      [q.quesioner_id, q.title, q.type, q.is_negative ? 1 : 0],
    );
    questionIdByTitle[q.title] = res.insertId;
  }
  console.log("Questions done");

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

  let qidSeq = 0;
  for (const q of QUESTIONS) {
    qidSeq += 1;
    const qid = questionIdByTitle[q.title];
    let titles;
    if (qidSeq <= 15) titles = booleanTitles;
    else if (qidSeq <= 35) titles = parentTitles;
    else titles = schoolTitles;

    titles.forEach((title, i) => {
      let score;
      if (qidSeq <= 15) score = q.is_negative ? i : 1 - i;
      else score = q.is_negative ? 3 - i : i;
      pool.query(
        "INSERT INTO options (question_id, title, score, created_at, updated_at) VALUES (?, ?, ?, NOW(), NOW())",
        [qid, title, score],
      );
    });
  }
  console.log("Options done");
};

const seedJobTypes = async () => {
  for (const jt of JOB_TYPES) {
    const id = await exists("job_types", "name", jt.name);
    if (!id) {
      await pool.query("INSERT INTO job_types (name, type) VALUES (?, ?)", [
        jt.name,
        jt.type,
      ]);
    }
  }
  console.log("Job types done");
};

const seedNutritionStatus = async () => {
  for (const ns of NUTRITION_STATUSES) {
    const id = await exists("nutrition_status", "status", ns.status);
    if (!id) {
      await pool.query(
        "INSERT INTO nutrition_status (displayName, status, information) VALUES (?, ?, ?)",
        [ns.displayName, ns.status, ns.information],
      );
    }
  }
  console.log("Nutrition status done");
};

const seedIMT = async () => {
  const [count] = await pool.query("SELECT COUNT(*) AS total FROM bmi_references");
  if (count[0].total > 0) {
    console.log("BMI Reference already exists");
    return;
  }
  for (const r of BMI_REFERENCES) {
    await pool.query(
      `INSERT INTO bmi_references
       (ageYear, ageMonthFrom, ageMonthTo, gender,
        sdMinus3Min, sdMinus3Max, sdMinus2Min, sdMinus2Max,
        sdMinus1Min, sdMinus1Max, medianMin, medianMax,
        sdPlus1Min, sdPlus1Max, sdPlus2Min, sdPlus2Max,
        sdPlus3Min, sdPlus3Max)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.ageYear, r.ageMonthFrom, r.ageMonthTo, r.gender,
        r.sdMinus3Min, r.sdMinus3Max, r.sdMinus2Min, r.sdMinus2Max,
        r.sdMinus1Min, r.sdMinus1Max, r.medianMin, r.medianMax,
        r.sdPlus1Min, r.sdPlus1Max, r.sdPlus2Min, r.sdPlus2Max,
        r.sdPlus3Min, r.sdPlus3Max,
      ],
    );
  }
  console.log("BMI Reference done");
};

async function main() {
  console.log("Starting seeding process...");
  await seedRoles();
  await seedUser();
  await seedInstitutionTypes();
  await seedProvince();
  await seedCity();
  await seedCategories();
  await seedQuesioners();
  await seedQuestionsAndOptions();
  await seedJobTypes();
  await seedNutritionStatus();
  await seedIMT();
  console.log("Seeding process completed!");
}

main()
  .then(() => pool.end())
  .then(() => process.exit(0))
  .catch(async (error) => {
    console.error("Error during seeding:", error);
    await pool.end();
    process.exit(1);
  });
