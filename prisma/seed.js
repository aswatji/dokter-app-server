const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  console.log("Starting database seeding...");

  // Hash password untuk semua user
  const hashedPassword = await bcrypt.hash("password123", 12);

  // Create Admin User
  const admin = await prisma.user.upsert({
    where: { email: "admin@dokterapp.com" },
    update: {},
    create: {
      email: "admin@dokterapp.com",
      password: hashedPassword,
      fullname: "Administrator",
      phone: "+6281234567890",
      role: "ADMIN",
    },
  });

  console.log("✅ Admin user created:", admin.email);

  // Create Doctor Users
  const doctor1 = await prisma.user.upsert({
    where: { email: "dr.ahmad@dokterapp.com" },
    update: {},
    create: {
      email: "dr.ahmad@dokterapp.com",
      password: hashedPassword,
      fullname: "Dr. Ahmad Suryadi",
      phone: "+6281234567891",
      role: "DOCTOR",
    },
  });

  const doctor2 = await prisma.user.upsert({
    where: { email: "dr.sari@dokterapp.com" },
    update: {},
    create: {
      email: "dr.sari@dokterapp.com",
      password: hashedPassword,
      fullname: "Dr. Sari Indah",
      phone: "+6281234567892",
      role: "DOCTOR",
    },
  });

  console.log("✅ Doctor users created");

  // Create Doctor Profiles
  await prisma.doctorProfile.upsert({
    where: { userId: doctor1.id },
    update: {},
    create: {
      userId: doctor1.id,
      specialization: "Dokter Umum",
      licenseNumber: "STR-001-2024",
      experience: 5,
      education: "S1 Kedokteran Universitas Indonesia",
      consultationFee: 75000,
      bio: "Dokter umum berpengalaman 5 tahun dengan spesialisasi pelayanan kesehatan keluarga.",
    },
  });

  await prisma.doctorProfile.upsert({
    where: { userId: doctor2.id },
    update: {},
    create: {
      userId: doctor2.id,
      specialization: "Dokter Kandungan",
      licenseNumber: "STR-002-2024",
      experience: 8,
      education: "S1 Kedokteran Universitas Gadjah Mada, Sp.OG",
      consultationFee: 150000,
      bio: "Spesialis kandungan dan ginekologi dengan pengalaman 8 tahun.",
    },
  });

  console.log("✅ Doctor profiles created");

  // Create Patient Users
  const patient1 = await prisma.user.upsert({
    where: { email: "pasien1@email.com" },
    update: {},
    create: {
      email: "pasien1@email.com",
      password: hashedPassword,
      fullname: "Budi Santoso",
      phone: "+6281234567893",
      role: "PATIENT",
    },
  });

  const patient2 = await prisma.user.upsert({
    where: { email: "pasien2@email.com" },
    update: {},
    create: {
      email: "pasien2@email.com",
      password: hashedPassword,
      fullname: "Siti Nurhaliza",
      phone: "+6281234567894",
      role: "PATIENT",
    },
  });

  console.log("✅ Patient users created");

  // Create Sample Consultation
  const consultation = await prisma.consultation.create({
    data: {
      patientId: patient1.id,
      doctorId: doctor1.id,
      title: "Konsultasi Demam dan Batuk",
      description:
        "Sudah 3 hari mengalami demam tinggi disertai batuk berdahak.",
      status: "PENDING",
    },
  });

  console.log("✅ Sample consultation created");

  // Create Sample Payment
  const payment = await prisma.payment.create({
    data: {
      consultationId: consultation.id,
      userId: patient1.id,
      amount: 75000,
      status: "PAID",
      paymentMethod: "bank_transfer",
      paidAt: new Date(),
    },
  });

  console.log("✅ Sample payment created");

  console.log("\n🎉 Database seeding completed successfully!");
  console.log("\n📋 Created accounts:");
  console.log("👨‍💼 Admin: admin@dokterapp.com / password123");
  console.log("👨‍⚕️ Doctor 1: dr.ahmad@dokterapp.com / password123");
  console.log("👩‍⚕️ Doctor 2: dr.sari@dokterapp.com / password123");
  console.log("🙋‍♂️ Patient 1: pasien1@email.com / password123");
  console.log("🙋‍♀️ Patient 2: pasien2@email.com / password123");
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
