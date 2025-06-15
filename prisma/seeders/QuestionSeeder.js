import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export const seedQuestions = async () => {
  try {
    const existingQuestions = await prisma.question.findMany({
      where: {
        OR: [
          { type: "MULTIPLE_CHOICE" },
          { type: "BOOLEAN" },
          { type: "SCALE" },
        ],
      },
    });

    if (existingQuestions.length > 0) {
      console.log("Questions already exist");
      return;
    }

    await prisma.question.createMany({
      data: [
        {
          quesioner_id: 1,
          title: "Anak Sekolah yang sehat adalah yang memiliki badan gemuk",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Kegemukan terjadi karena jumlah makanan yang dimakan melebihi kebutuhan tubuh",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Untuk memenuhi kebutuhan gizi, anak SD harus makan 3x sehari, yaitu: pagi, siang dan malam",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Sarapan pagi sangat baik untuk prestasi belajar anak SD di sekolah",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Sarapan dapat meningkatkan konsentrasi belajar, energi pada otak sehingga dapat berprestasi",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Makanan yang dianjurkan untuk anak SD mengacu pada ”Isi piringku”, yaitu: 1/3 untuk makanan pokok, 1/3 sayuran dan 1/3 lauk pauk dan buah-buahan",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title: "Kebiasaan jajan yang tidak sehat akan menyebabkan kegemukan",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Makanan yang sehat untuk anak SD adalah terhindar dari pengawet, pemanis buatan dan pewarna",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Anak yang kurang melakukan aktivitas fisik seperti: bermain, berolahraga, bersepeda, jalan kaki dapat berisiko kegemukan",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Menu seimbang untuk anak SD adalah yang terdiri dari nasi, ikan/daging, sayur dan buah-buahan",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Kebiasaan makan tidak tepat waktu akan berdampak buruk terhadap kesehatan",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Anak SD tidak berisiko mengalami masalah kesehatan, jika gemar minum minuman kemasan",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Anak SD usia 10-12 tahun membutuhkan air putih kurang lebih 7-8 gelas",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Minuman yang tinggi pemanis buatan dapat meningkatkan risiko kegemukan bagi anak",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 1,
          title:
            "Kegemukan dapat menyebabkan penyakit jantung, diabetes milititus/kencing manis, tekanan darah tinggi",
          type: "MULTIPLE_CHOICE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya sarapan pagi atau makan siang sebelum berangkat sekolah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Apabila tidak sempat sarapan atau makan siang, maka anak saya membawa bekal",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya makan nasi dan lauk pauk 2-3 kali sehari",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Menurut saya, anak saya menghabiskan makanan dengan porsi yang sesuai umurnya",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya makan fast food, seperti burger, fried chiken atau pizza 2-3 kali dalam seminggu",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya mengkonsumsi minuman bersoda di rumah, seperti: coca cola, sprite, fanta, dll 2-3 kali seminggu",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya membawa cukup uang untuk beli cemilan dan makan nasi di sekolah ",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya gemar makan cemilan yang gurih, tinggi penyedap di rumah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya gemar membeli gorengan sebagai jajanan",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya gemar minum minuman dingin dengan aneka rasa buah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya lebih suka jalan kaki atau naik sepeda ke sekolah daripada naik motor/mobil",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya berjalan kaki, berenang atau senam minimal 30 menit sehari",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya gemar menonton televisi, bermain games atau tidur apabila sedang berada di rumah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya menonton televisi, bermain game menggunakan komputer/laptop/hp lebih dari 3 jam/hari",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya lebih suka bermain dengan teman sebaya di luar rumah daripada diam di dalam rumah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya lebih suka bermain dengan teman sebaya di luar rumah daripada diam di dalam rumah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Di hari libur, anak saya tidur di bawah jam 21.00 wib",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya menonton televisi hingga melebihi jam 21.00 wib",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Di luar jam sekolah, anak saya lebih memilih tidur, nonton televisi, main game pada komputer/hp daripada beraktivitas di luar rumah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya tidur kurang dari 9 jam/hari",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya mencuci tangan dengan sabun sebelum dan sesudah makan maupun sebelum memegang jajanan",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya mencuci tangan dan kaki bila pulang dari bermain di luar rumah atau setelah memegang binatang dan bermain tanah",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title:
            "Anak saya mencuci tangan dengan sabun setelah menggunakan jamban",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya membuang sampah pada tempat yang telah disediakan",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya menyikat gigi 2 kali sehari",
          type: "SCALE",
        },
        {
          quesioner_id: 2,
          title: "Anak saya memiliki kuku yang pendek dan bersih",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memiliki rencana pembelajaran tentang pendidikan kesehatan, khususnya tentang gizi dan dilaksanakan secara kurikuler",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Rencana pembelajaran tentang pendidikan kesehatan, khususnya tentang gizi dilaksanakan secara kurikuler",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah melaksanakan sarapan/makan siang bersama dengan gizi seimbang",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memiliki ekstrakurikuler olahraga/bela diri atau kesenian/ kegiatan lainnya yang bersifat aktivitas fisik",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Seluruh siswa mengikuti kegiatan ekstrakurikuler minimal satu kegiatan",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memiliki jadwal kegiatan bersifat aktivitas fisik dan dilaksanakan rutin minimal 1 kali seminggu",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memfasilitasi puskesmas melaksanakan penjaringan kesehatan dan pemeriksaan kesehatan secara berkala ",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memfasilitasi puskesmas melakukan penilaian status gizi anak secara berkala",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memiliki program penyuluhan kesehatan khususnya tentang gizi untuk anak sekolah dan aktivitas fisik",
          type: "SCALE",
        },
        {
          quesioner_id: 3,
          title:
            "Sekolah memfasilitasi puskesmas untuk pelaksanaan penyuluhan kesehatan terkait gizi untuk anak sekolah dan aktivitas fisik",
          type: "SCALE",
        },
        {
          quesioner_id: 4,
          title:
            "Sekolah memiliki fasilitas kantin yang buka selama kegiatan pembelajaran",
          type: "SCALE",
        },
        {
          quesioner_id: 4,
          title:
            "Sekolah memiliki komitmen yang tinggi dalam pengelolaan kantin sekolah",
          type: "SCALE",
        },
        {
          quesioner_id: 4,
          title: "Sekolah melakukan monitoring dan evaluasi terhadap kantin",
          type: "SCALE",
        },
        {
          quesioner_id: 4,
          title:
            "Sekolah melakukan monitoring dan evaluasi terhadap jajanan di area sekolah",
          type: "SCALE",
        },
        {
          quesioner_id: 4,
          title:
            "Sekolah menyediakan sarana olahraga yang mendukung aktivitas fisik anak",
          type: "SCALE",
        },
        {
          quesioner_id: 4,
          title:
            "Sekolah memberikan waktu untuk siswa melakukan aktivitas fisik di antara jam pelajaran",
          type: "SCALE",
        },
      ],
    });
    console.log("Questions seeded successfully");
  } catch (error) {
    console.log(error);
  }
};
