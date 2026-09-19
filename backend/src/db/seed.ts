import { db } from "./index";
import { users, tenants, customers, orders, expenses, services, shifts, waLogs } from "./schema";

export async function seedInitialData(force = true) {
  try {
    if (!force) {
      const existingUsers = await db.select().from(users);
      if (existingUsers.length > 0) {
        console.log("ℹ️ Basis data sudah memiliki data (Users count: " + existingUsers.length + "). Seeding dilewati.");
        return;
      }
    }

    console.log("🌱 Menjalankan Seeding data awal lengkap Orchid Brand Smart Laundry (PostgreSQL)...");

    // Bersihkan data lama dengan urutan foreign key
    try {
      await db.delete(waLogs);
      await db.delete(shifts);
      await db.delete(expenses);
      await db.delete(orders);
      await db.delete(services);
      await db.delete(customers);
      await db.delete(tenants);
      await db.delete(users);
      console.log("🧹 Pembersihan tabel PostgreSQL selesai.");
    } catch (cleanErr: any) {
      console.warn("Notice saat pembersihan tabel:", cleanErr.message);
    }

    const now = new Date();
    const today = now.toISOString();

    // 1. Users
    const adminPasswordHash = await Bun.password.hash("admin123", { algorithm: "bcrypt", cost: 10 });
    const budiPasswordHash = await Bun.password.hash("budi123", { algorithm: "bcrypt", cost: 10 });
    const rinaPasswordHash = await Bun.password.hash("kasir123", { algorithm: "bcrypt", cost: 10 });
    const dewiPasswordHash = await Bun.password.hash("dewi123", { algorithm: "bcrypt", cost: 10 });
    const bambangPasswordHash = await Bun.password.hash("kasir123", { algorithm: "bcrypt", cost: 10 });

    const adminId = "user-admin-01";
    const ownerId1 = "user-owner-01";
    const staffId1 = "user-staff-01";
    const ownerId2 = "user-owner-02";
    const staffId2 = "user-staff-02";

    const tenantId1 = "tenant-01";
    const tenantId2 = "tenant-02";

    await db.insert(users).values([
      {
        id: adminId,
        name: "Admin Pusat Orchid",
        email: "admin@orchidbrand.com",
        passwordHash: adminPasswordHash,
        role: "superadmin",
        status: "active",
        subscriptionUntil: "2027-12-31",
        createdAt: today,
      },
      {
        id: ownerId1,
        name: "Budi Santoso Perkasa",
        email: "budi@laundrymelati.com",
        passwordHash: budiPasswordHash,
        role: "tenant_owner",
        status: "active",
        subscriptionUntil: "2027-01-15",
        createdAt: today,
      },
      {
        id: staffId1,
        tenantId: tenantId1,
        name: "Rina Kasir Melati",
        email: "kasir@laundrymelati.com",
        passwordHash: rinaPasswordHash,
        role: "staff",
        status: "active",
        createdAt: today,
      },
      {
        id: ownerId2,
        name: "Dewi Lestari Mawar",
        email: "dewi@laundrymawar.com",
        passwordHash: dewiPasswordHash,
        role: "tenant_owner",
        status: "active",
        subscriptionUntil: "2026-11-20",
        createdAt: today,
      },
      {
        id: staffId2,
        tenantId: tenantId2,
        name: "Bambang Operator Surabaya",
        email: "staff.surabaya@laundrymawar.com",
        passwordHash: bambangPasswordHash,
        role: "staff",
        status: "active",
        createdAt: today,
      },
    ]);

    // 2. Tenants
    await db.insert(tenants).values([
      {
        id: tenantId1,
        userId: ownerId1,
        outletName: "Orchid Laundry - Cabang Melati",
        phone: "081234567890",
        address: "Jl. Melati Raya No. 45, Jakarta Selatan",
        status: "active",
        subscriptionUntil: "2027-01-15",
        waMode: "baileys",
        createdAt: today,
      },
      {
        id: tenantId2,
        userId: ownerId2,
        outletName: "Orchid Laundry - Cabang Mawar",
        phone: "081399887766",
        address: "Jl. Mawar Indah No. 12, Surabaya",
        status: "active",
        subscriptionUntil: "2026-11-20",
        waMode: "baileys",
        createdAt: today,
      },
    ]);

    // 3. Services
    await db.insert(services).values([
      {
        id: "srv-01",
        tenantId: tenantId1,
        name: "Cuci Komplit (Kg)",
        unit: "kg",
        pricePerUnit: 8000,
        minOrder: 1,
        durationHours: 48,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-02",
        tenantId: tenantId1,
        name: "Cuci Kering + Setrika Express",
        unit: "kg",
        pricePerUnit: 14000,
        minOrder: 1,
        durationHours: 24,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-03",
        tenantId: tenantId1,
        name: "Bedcover King (Pcs)",
        unit: "pcs",
        pricePerUnit: 35000,
        minOrder: 1,
        durationHours: 72,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-04",
        tenantId: tenantId1,
        name: "Cuci Sepatu Sneakers",
        unit: "pasang",
        pricePerUnit: 25000,
        minOrder: 1,
        durationHours: 48,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-05",
        tenantId: tenantId1,
        name: "Setrika Saja (Kg)",
        unit: "kg",
        pricePerUnit: 5000,
        minOrder: 1,
        durationHours: 24,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-06",
        tenantId: tenantId2,
        name: "Cuci Komplit (Kg)",
        unit: "kg",
        pricePerUnit: 7500,
        minOrder: 1,
        durationHours: 48,
        status: "active",
        createdAt: today,
      },
      {
        id: "srv-07",
        tenantId: tenantId2,
        name: "Cuci Express 1 Hari",
        unit: "kg",
        pricePerUnit: 12000,
        minOrder: 1,
        durationHours: 24,
        status: "active",
        createdAt: today,
      },
    ]);

    // 4. Customers
    const custId1 = "cust-01";
    const custId2 = "cust-02";
    const custId3 = "cust-03";
    const custId4 = "cust-04";
    const custId5 = "cust-05";

    await db.insert(customers).values([
      {
        id: custId1,
        tenantId: tenantId1,
        name: "Siti Rahma",
        phone: "081987654321",
        address: "Komplek Permai Indah B-12",
        notes: "Pelanggan setia, deterjen hypoallergenic jika ada",
        createdAt: today,
      },
      {
        id: custId2,
        tenantId: tenantId1,
        name: "Ahmad Fauzi",
        phone: "085678901234",
        address: "Kost Melati Asri Kamar 08",
        notes: "Cucian pakaian kantor, setrika rapi lipat",
        createdAt: today,
      },
      {
        id: custId3,
        tenantId: tenantId1,
        name: "Dewi Lestari",
        phone: "087711223344",
        address: "Apartemen Grand Boulevard T2-15",
        notes: "Bedcover & selimut tebal",
        createdAt: today,
      },
      {
        id: custId4,
        tenantId: tenantId1,
        name: "Hendra Pratama",
        phone: "081299887766",
        address: "Jl. Tebet Barat No. 22",
        notes: "Sepatu sneakers putih",
        createdAt: today,
      },
      {
        id: custId5,
        tenantId: tenantId2,
        name: "Bambang Wijaya",
        phone: "081344556677",
        address: "Jl. Gubeng Kertajaya No. 15, Surabaya",
        notes: "Laundry rutin mingguan",
        createdAt: today,
      },
    ]);

    // 5. Orders
    await db.insert(orders).values([
      {
        id: "ord-001",
        tenantId: tenantId1,
        customerId: custId1,
        invoiceNo: "INV-202609-001",
        serviceType: "Cuci Komplit (Kg)",
        weightOrQty: 4.5,
        unit: "kg",
        pricePerUnit: 8000,
        totalAmount: 36000,
        status: "ready", // Siap diambil!
        paymentStatus: "paid",
        paymentMethod: "qris",
        notes: "Pewangi Sakura",
        createdAt: today,
        estimatedCompletionAt: new Date(now.getTime() + 86400000).toISOString(),
      },
      {
        id: "ord-002",
        tenantId: tenantId1,
        customerId: custId2,
        invoiceNo: "INV-202609-002",
        serviceType: "Cuci Kering + Setrika Express",
        weightOrQty: 3.0,
        unit: "kg",
        pricePerUnit: 14000,
        totalAmount: 42000,
        status: "ready", // Siap diambil!
        paymentStatus: "paid",
        paymentMethod: "cash",
        notes: "Express 1 hari selesai",
        createdAt: today,
        estimatedCompletionAt: new Date(now.getTime() + 43200000).toISOString(),
      },
      {
        id: "ord-003",
        tenantId: tenantId1,
        customerId: custId3,
        invoiceNo: "INV-202609-003",
        serviceType: "Bedcover King (Pcs)",
        weightOrQty: 1,
        unit: "pcs",
        pricePerUnit: 35000,
        totalAmount: 35000,
        status: "process", // Sedang dicuci
        paymentStatus: "unpaid",
        paymentMethod: "cash",
        notes: "Warna putih polos, hati-hati noda",
        createdAt: today,
        estimatedCompletionAt: new Date(now.getTime() + 86400000 * 2).toISOString(),
      },
      {
        id: "ord-004",
        tenantId: tenantId1,
        customerId: custId4,
        invoiceNo: "INV-202609-004",
        serviceType: "Cuci Sepatu Sneakers",
        weightOrQty: 2,
        unit: "pasang",
        pricePerUnit: 25000,
        totalAmount: 50000,
        status: "drying_ironing", // Pengeringan
        paymentStatus: "paid",
        paymentMethod: "transfer",
        notes: "Sneakers canvas putih dan suede",
        createdAt: today,
        estimatedCompletionAt: new Date(now.getTime() + 86400000).toISOString(),
      },
      {
        id: "ord-000",
        tenantId: tenantId1,
        customerId: custId1,
        invoiceNo: "INV-202609-000",
        serviceType: "Cuci Komplit (Kg)",
        weightOrQty: 5.0,
        unit: "kg",
        pricePerUnit: 8000,
        totalAmount: 40000,
        status: "completed",
        paymentStatus: "paid",
        paymentMethod: "transfer",
        notes: "Sudah diambil kemarin",
        createdAt: new Date(now.getTime() - 86400000 * 2).toISOString(),
        completedAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: "ord-101",
        tenantId: tenantId2,
        customerId: custId5,
        invoiceNo: "INV-202609-101",
        serviceType: "Cuci Komplit (Kg)",
        weightOrQty: 6.0,
        unit: "kg",
        pricePerUnit: 7500,
        totalAmount: 45000,
        status: "ready",
        paymentStatus: "paid",
        paymentMethod: "qris",
        createdAt: today,
      },
    ]);

    // 6. Expenses
    await db.insert(expenses).values([
      {
        id: "exp-001",
        tenantId: tenantId1,
        category: "Deterjen & Pewangi",
        amount: 65000,
        notes: "Beli Deterjen Cair Orchid 5 Liter",
        expenseDate: today.slice(0, 10),
        createdAt: today,
      },
      {
        id: "exp-002",
        tenantId: tenantId1,
        category: "Listrik & Air",
        amount: 100000,
        notes: "Token listrik PLN 100rb",
        expenseDate: today.slice(0, 10),
        createdAt: today,
      },
      {
        id: "exp-003",
        tenantId: tenantId1,
        category: "Plastik & Kemasan",
        amount: 25000,
        notes: "Plastik jinjing laundry 1 pak isi 100",
        expenseDate: today.slice(0, 10),
        createdAt: today,
      },
    ]);

    // 7. Shifts (Shift aktif kasir Rina di Cabang Melati)
    await db.insert(shifts).values([
      {
        id: "shift-01",
        tenantId: tenantId1,
        userId: staffId1,
        openedAt: new Date(now.getTime() - 3600000 * 4).toISOString(),
        startingCash: 100000,
        systemCashTotal: 42000,
        status: "open",
        notes: "Shift Pagi Kasir Rina Melati",
        createdAt: today,
      },
    ]);

    // 8. WhatsApp Logs
    await db.insert(waLogs).values([
      {
        id: "walog-01",
        tenantId: tenantId1,
        orderId: "ord-001",
        recipientPhone: "081987654321",
        recipientName: "Siti Rahma",
        messagePreview: "Halo Kak Siti Rahma, cucian Anda INV-202609-001 di Orchid Laundry sudah SIAP DIAMBIL (Rak: A-01).",
        status: "sent",
        mode: "baileys",
        createdAt: today,
      },
      {
        id: "walog-02",
        tenantId: tenantId1,
        orderId: "ord-002",
        recipientPhone: "085678901234",
        recipientName: "Ahmad Fauzi",
        messagePreview: "Halo Kak Ahmad Fauzi, cucian Anda INV-202609-002 sudah SIAP DIAMBIL (Rak: B-03).",
        status: "sent",
        mode: "manual",
        createdAt: today,
      },
      {
        id: "walog-03",
        tenantId: tenantId1,
        recipientPhone: "089999999999",
        recipientName: "Nomor Uji Gagal",
        messagePreview: "Pengingat pengambilan cucian.",
        status: "failed",
        mode: "baileys",
        errorMessage: "Nomor WhatsApp tujuan tidak terdaftar di server WhatsApp.",
        createdAt: today,
      },
    ]);

    console.log("✅ Seeding PostgreSQL Orchid Brand berhasil 100%!");
    console.log("=================================================");
    console.log("🔑 AKUN DEMO SIAP DIGUNAKAN:");
    console.log("1. Super Admin  : admin@orchidbrand.com  / admin123");
    console.log("2. Tenant Owner : budi@laundrymelati.com / budi123");
    console.log("3. Staff Kasir  : kasir@laundrymelati.com / kasir123");
    console.log("=================================================");
  } catch (err: any) {
    console.error("❌ Seed error:", err.message);
  }
}

if (import.meta.main) {
  seedInitialData(true)
    .then(() => {
      console.log("🎉 Seeding selesai.");
      process.exit(0);
    })
    .catch((err) => {
      console.error("❌ Seeding gagal:", err);
      process.exit(1);
    });
}
