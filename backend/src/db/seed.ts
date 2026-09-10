import { db } from "./index";
import { users, tenants, customers, orders, expenses } from "./schema";

export async function seedInitialData() {
  try {
    const existingUsers = await db.select().from(users);
    if (existingUsers.length > 0) {
      return; // Already seeded
    }

    console.log("Seeding initial data for Orchid Brand Smart Laundry (PostgreSQL)...");

    // 1. Super Admin User
    const adminId = "user-admin-01";
    await db.insert(users).values({
      id: adminId,
      name: "Admin Pusat Orchid",
      email: "admin@orchidbrand.com",
      passwordHash: "admin123",
      role: "superadmin",
    });

    // 2. Tenant Owner 1
    const ownerId1 = "user-owner-01";
    await db.insert(users).values({
      id: ownerId1,
      name: "Budi Santoso",
      email: "budi@laundrymelati.com",
      passwordHash: "budi123",
      role: "tenant_owner",
    });

    // 3. Tenant 1
    const tenantId1 = "tenant-01";
    await db.insert(tenants).values({
      id: tenantId1,
      userId: ownerId1,
      outletName: "Orchid Laundry - Cabang Melati",
      phone: "081234567890",
      address: "Jl. Melati Raya No. 45, Jakarta",
    });

    // 4. Customers for Tenant 1
    const custId1 = "cust-01";
    const custId2 = "cust-02";
    const custId3 = "cust-03";

    await db.insert(customers).values([
      {
        id: custId1,
        tenantId: tenantId1,
        name: "Siti Rahma",
        phone: "081987654321",
        address: "Komplek Permai Indah B-12",
        notes: "Pelanggan setia, deterjen hypoallergenic jika ada",
      },
      {
        id: custId2,
        tenantId: tenantId1,
        name: "Ahmad Fauzi",
        phone: "085678901234",
        address: "Kost Melati Asri Kamar 08",
        notes: "Cucian pakaian kantor, setrika rapi lipat",
      },
      {
        id: custId3,
        tenantId: tenantId1,
        name: "Dewi Lestari",
        phone: "087711223344",
        address: "Apartemen Grand Boulevard T2-15",
        notes: "Bedcover & selimut tebal",
      },
    ]);

    // 5. Orders for Tenant 1
    const today = new Date().toISOString();
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
      },
      {
        id: "ord-002",
        tenantId: tenantId1,
        customerId: custId2,
        invoiceNo: "INV-202609-002",
        serviceType: "Cuci Kering + Setrika Express",
        weightOrQty: 3.0,
        unit: "kg",
        pricePerUnit: 12000,
        totalAmount: 36000,
        status: "washing",
        paymentStatus: "paid",
        paymentMethod: "cash",
        notes: "Express 1 hari selesai",
        createdAt: today,
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
        status: "pending",
        paymentStatus: "unpaid",
        paymentMethod: "cash",
        notes: "Warna putih polos, hati-hati noda",
        createdAt: today,
      },
      {
        id: "ord-004",
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
        createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        completedAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ]);

    // 6. Expenses for Tenant 1
    await db.insert(expenses).values([
      {
        id: "exp-001",
        tenantId: tenantId1,
        category: "Deterjen & Pewangi",
        amount: 65000,
        notes: "Beli Deterjen Cair Orchid 5 Liter",
        expenseDate: today.slice(0, 10),
      },
      {
        id: "exp-002",
        tenantId: tenantId1,
        category: "Listrik & Air",
        amount: 100000,
        notes: "Token listrik PLN 100rb",
        expenseDate: today.slice(0, 10),
      },
      {
        id: "exp-003",
        tenantId: tenantId1,
        category: "Plastik & Kemasan",
        amount: 25000,
        notes: "Plastik jinjing laundry 1 pak isi 100",
        expenseDate: today.slice(0, 10),
      },
    ]);

    console.log("✅ Seeding PostgreSQL completed successfully!");
  } catch (err: any) {
    console.warn("Seed notice:", err.message);
  }
}
