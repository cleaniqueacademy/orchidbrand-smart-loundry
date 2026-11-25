import { afterAll, beforeAll, test, expect } from "bun:test";
import { and, eq, sql } from "drizzle-orm";
import { client, db, initPostgresTables } from "../db";
import { users, tenants, plans, storedFiles, subscriptionInvoices, paymentAttempts, expenses, platformCashflow, referralCodes, marketingProfiles, marketingCommissions, paymentAdjustments, marketingWithdrawals, orders, customers } from "../db/schema";
import { app, initializeApplication } from "../index";
import { createSession } from "./sessions";
import { createSubscriptionInvoice, uploadPaymentProof, verifySubscriptionInvoice, rejectSubscriptionInvoice, retryInvoiceActivation, getApplicablePrice, reviewInvoiceActivation } from "./subscriptionService";
import { checkoutInvoice, applyGatewayEvent } from "./subscriptionPayments";
import { changeLifecycle } from "./accountLifecycle";
import { createOwnerBranch } from "./branches";
import { createBranchStaff } from "./staff";
import { setOwnerReferral } from "./ownerReferral";
import { recordPaymentAdjustment, requestWithdrawal, processWithdrawal } from "./financialReview";
import { buildCloudInput, reserveAiRequest } from "./ai/privacy";
import { processWaQueue } from "./waQueue";
import { runTrialReminderCheck } from "../jobs/trialReminder";
import { today, addDays, toDateOnly } from "../utils/date";
import { saveUploadedFile } from "./storageService";
import { seedInitialData } from "../db/seed";

if (process.env.PREMIUM_TEST_DATABASE !== "isolated" || !new URL(process.env.DATABASE_URL!).pathname.endsWith("/cleanique_test")) throw new Error("Mandatory production-v1 suite requires dedicated cleanique_test database");
const tag = crypto.randomUUID();
let adminId: string;
async function owner(tier="premium", until="2030-01-01") {
  const id=crypto.randomUUID(), branchId=crypto.randomUUID();
  await db.insert(users).values({id,name:"Private Owner",email:`${id}@test.invalid`,passwordHash:await Bun.password.hash("isolated-password-only",{algorithm:"bcrypt",cost:12}),role:"tenant_owner",tier,subscriptionUntil:until,tenantId:branchId});
  await db.insert(tenants).values({id:branchId,userId:id,outletName:"Private Outlet",phone:"08123456789",address:"Private address",tier,subscriptionUntil:until});
  return {id,branchId};
}
async function headers(id:string) { const s=await createSession(id); return {Cookie:`cleanique_session=${s.token}`,"X-CSRF-Token":s.csrfToken,Origin:"http://localhost:5000","Content-Type":"application/json"}; }
const gateway={create:async()=>({token:"test",redirect_url:"https://app.sandbox.midtrans.com/snap/test"}),status:async()=>null};
async function settle(bill:typeof subscriptionInvoices.$inferSelect) {
  const attempt=await checkoutInvoice(bill.id,bill.userId,gateway);
  await applyGatewayEvent({order_id:attempt.orderId,transaction_id:crypto.randomUUID(),transaction_status:"settlement",gross_amount:String(bill.finalAmount),status_code:"200",currency:"IDR"});
  return attempt;
}
async function manual(bill:typeof subscriptionInvoices.$inferSelect) {
  const path=`/uploads/payments/2026-11/${crypto.randomUUID()}.png`;
  await db.insert(storedFiles).values({path,ownerId:bill.userId,category:"payments"});
  await uploadPaymentProof(bill.id,path,bill.tenantId);
}
const prevComingSoon = process.env.PREMIUM_COMING_SOON;
afterAll(() => {
  if (prevComingSoon === undefined) delete process.env.PREMIUM_COMING_SOON;
  else process.env.PREMIUM_COMING_SOON = prevComingSoon;
});
beforeAll(async()=>{
  process.env.PREMIUM_COMING_SOON = "false";
  await initializeApplication(false);
  adminId=crypto.randomUUID();
  await db.insert(users).values({id:adminId,name:"Test Admin",email:`${adminId}@test.invalid`,passwordHash:"not-a-login-password",role:"superadmin"});
  await db.update(plans).set({maxStaff:25,aiTokenQuotaDaily:2,pricePerMonth:200000,promotionAmount:50000,promotionStartsAt:new Date(Date.now()-60000).toISOString(),promotionEndsAt:new Date(Date.now()+3600000).toISOString()}).where(eq(plans.code,"premium"));
});
test("server sessions enforce CSRF, logout, current role and password revocation",async()=>{
  const a=await owner(), h=await headers(a.id);
  expect((await app.request("/api/auth/me",{headers:h})).status).toBe(200);
  expect((await app.request("/api/auth/status?userId="+adminId,{headers:h})).status).toBe(403);
  expect((await app.request("/api/auth/logout",{method:"POST",headers:{Cookie:h.Cookie}})).status).toBe(403);
  expect((await app.request("/api/auth/logout",{method:"POST",headers:h})).status).toBe(200);
  expect((await app.request("/api/auth/me",{headers:h})).status).toBe(401);
  const revoked=await headers(a.id);
  await db.update(users).set({role:"marketing"}).where(eq(users.id,a.id));
  expect((await app.request("/api/auth/me",{headers:revoked})).status).toBe(401);
  const newer=await headers(a.id);
  await db.update(users).set({passwordHash:await Bun.password.hash("another-test-password")}).where(eq(users.id,a.id));
  expect((await app.request("/api/auth/me",{headers:newer})).status).toBe(401);
});
test("expired Owner can renew while staff and operational access remain blocked",async()=>{
  const a=await owner("premium",addDays(-1)),h=await headers(a.id);
  expect((await app.request("/api/subscription/summary",{headers:h})).status).toBe(200);
  expect((await app.request("/api/orders",{headers:h})).status).toBe(403);
  const staff=await createBranchStaff(a.branchId,a.id,false,{name:"Cashier",email:crypto.randomUUID()+"@test.invalid",password:"isolated-staff-password"});
  expect((await app.request("/api/orders",{headers:await headers(staff.id)})).status).toBe(403);
  const bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice;
  await settle(bill);
  expect((await app.request("/api/orders",{headers:h})).status).toBe(200);
});
test("uploads verify content and private proofs reject anonymous/foreign access",async()=>{
  const a=await owner(),b=await owner();
  await expect(saveUploadedFile(new File(["not-an-image"],"fake.png",{type:"image/png"}),"payments")).rejects.toThrow();
  const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=","base64");
  const saved=await saveUploadedFile(new File([png],"proof.png",{type:"image/png"}),"payments");
  await db.insert(storedFiles).values({path:saved.url,ownerId:a.id,category:"payments",mimeType:"image/png"});
  expect((await app.request(saved.url)).status).toBe(401);
  expect((await app.request(saved.url,{headers:await headers(b.id)})).status).toBe(404);
  const allowed=await app.request(saved.url,{headers:await headers(a.id)});
  expect(allowed.status).toBe(200);expect(allowed.headers.get("cache-control")).toContain("no-store");
  expect((await app.request(saved.url,{headers:await headers(adminId)})).status).toBe(200);
});
test("paid invoices cannot be rejected and manual verification replay cannot double extend",async()=>{
  const a=await owner(),bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice;
  await manual(bill);
  const results=await Promise.allSettled([verifySubscriptionInvoice(bill.id,adminId),rejectSubscriptionInvoice(bill.id,adminId,"invalid proof")]);
  expect(results.filter(r=>r.status==="fulfilled").length).toBe(1);
  const [current]=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id));
  if(current.status==="rejected") {await manual(current);await verifySubscriptionInvoice(bill.id,adminId);}
  const [paid]=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id));
  await verifySubscriptionInvoice(bill.id,adminId);
  await expect(rejectSubscriptionInvoice(bill.id,adminId,"stale")).rejects.toThrow();
  expect((await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id)))[0].periodEnd).toBe(paid.periodEnd);
  expect(await db.select().from(platformCashflow).where(eq(platformCashflow.id,`subpcf-${bill.id}`))).toHaveLength(1);
});
test("settlement survives suspend and ownership changes without granting access",async()=>{
  const a=await owner(),bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice;
  const attempt=await checkoutInvoice(bill.id,a.id,gateway);
  await changeLifecycle("user",a.id,"inactive",adminId);
  const event={order_id:attempt.orderId,transaction_id:crypto.randomUUID(),transaction_status:"settlement",gross_amount:String(bill.finalAmount),status_code:"200"};
  await applyGatewayEvent(event);
  let [current]=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id));
  expect(current.status).toBe("paid");expect(current.activationStatus).toBe("pending_review");
  expect((await db.select().from(users).where(eq(users.id,a.id)))[0].status).toBe("inactive");
  expect(await db.select().from(platformCashflow).where(eq(platformCashflow.id,`subpcf-${bill.id}`))).toHaveLength(1);
  await changeLifecycle("user",a.id,"active",adminId);await retryInvoiceActivation(bill.id);
  expect((await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id)))[0].activationStatus).toBe("active");
  const second=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice,other=await owner();
  const pending=await checkoutInvoice(second.id,a.id,gateway);
  await db.update(tenants).set({userId:other.id}).where(eq(tenants.id,a.branchId));
  await applyGatewayEvent({...event,order_id:pending.orderId,transaction_id:crypto.randomUUID()});
  const [moved]=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,second.id));
  expect(moved.userId).toBe(a.id);expect(moved.activationReason).toBe("ownership_changed");expect(moved.status).toBe("paid");
});
test("invoice expiry, supported durations, package changes and idempotency are enforced before checkout",async()=>{
  const a=await owner();
  for(const durationMonths of [2,0,120]) await expect(createSubscriptionInvoice({tenantId:a.branchId,userId:a.id,durationMonths})).rejects.toThrow();
  await expect(createSubscriptionInvoice({tenantId:a.branchId,userId:a.id,planId:"pro"})).rejects.toThrow();
  const key=crypto.randomUUID();
  const first=(await createSubscriptionInvoice({tenantId:a.branchId,userId:adminId,idempotencyKey:key})).invoice;
  expect((await createSubscriptionInvoice({tenantId:a.branchId,userId:adminId,idempotencyKey:key})).invoice.id).toBe(first.id);
  await expect(createSubscriptionInvoice({tenantId:a.branchId,userId:adminId,idempotencyKey:key,durationMonths:3})).rejects.toThrow();
  await db.update(subscriptionInvoices).set({expiresAt:new Date(Date.now()-1000).toISOString()}).where(eq(subscriptionInvoices.id,first.id));
  await expect(checkoutInvoice(first.id,a.id,gateway)).rejects.toThrow();
});
test("last referral slot is atomic and remains valid for its original Owner across branches",async()=>{
  const a=await owner(),b=await owner(),id=crypto.randomUUID(),code="LAST-"+id;
  await db.insert(referralCodes).values({id,code,name:"Last recipient",discountType:"percent",discountValue:10,maxUsage:1});
  const results=await Promise.allSettled([setOwnerReferral(a.branchId,a.id,false,code),setOwnerReferral(b.branchId,b.id,false,code)]);
  expect(results.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const winner=results[0].status==="fulfilled"?a:b;
  expect((await getApplicablePrice(winner.branchId,"premium")).finalPrice).toBe(135000);
  await setOwnerReferral(winner.branchId,winner.id,false,null);await setOwnerReferral(winner.branchId,winner.id,false,code);
  const branch=await createOwnerBranch(winner.id,{outletName:"Second",phone:"08123456789",address:"Test"});
  expect((await getApplicablePrice(branch.id,"premium")).finalPrice).toBe(135000);
  expect((await db.select().from(referralCodes).where(eq(referralCodes.id,id)))[0].currentUsage).toBe(1);
});
test("frozen commission terms, refund journals and payout replay preserve balances",async()=>{
  const a=await owner(),m=await owner(),profile=crypto.randomUUID(),ref=crypto.randomUUID(),code="COMM-"+ref;
  await db.insert(marketingProfiles).values({id:profile,userId:m.id,phone:"08123456789"});
  await db.insert(referralCodes).values({id:ref,code,name:"Commission",marketingProfileId:profile,discountType:"percent",discountValue:10,commissionType:"percent",commissionValue:10});
  const bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id,referralCode:code})).invoice;
  await db.update(referralCodes).set({commissionValue:90}).where(eq(referralCodes.id,ref));
  await settle(bill);
  const [commission]=await db.select().from(marketingCommissions).where(eq(marketingCommissions.subscriptionInvoiceId,bill.id));
  expect(commission.commissionAmount).toBe(13500);
  const adjustment={requestKey:crypto.randomUUID(),amount:10000,commissionAmount:1000,notes:"Refund test reference operator-001",type:"refund"};
  const results=await Promise.all([recordPaymentAdjustment(bill.id,adminId,adjustment),recordPaymentAdjustment(bill.id,adminId,adjustment)]);
  expect(results[0].id).toBe(results[1].id);
  await expect(recordPaymentAdjustment(bill.id,adminId,{...adjustment,requestKey:crypto.randomUUID(),amount:bill.finalAmount})).rejects.toThrow();
  const requests=await Promise.allSettled([requestWithdrawal(m.id,{amount:10000,bankName:"Test bank",bankAccountNumber:"123",bankAccountName:"Test"}),requestWithdrawal(m.id,{amount:10000,bankName:"Test bank",bankAccountNumber:"123",bankAccountName:"Test"})]);
  expect(requests.filter(r=>r.status==="fulfilled")).toHaveLength(1);
  const result=requests.find(r=>r.status==="fulfilled")!;
  if(result.status!=="fulfilled")throw new Error("Missing payout");
  await Promise.all([processWithdrawal(result.value.id,adminId,"paid"),processWithdrawal(result.value.id,adminId,"paid")]);
  expect((await db.select().from(marketingProfiles).where(eq(marketingProfiles.id,profile)))[0].totalWithdrawn).toBe(10000);
  expect(await db.select().from(platformCashflow).where(eq(platformCashflow.id,`withdrawal:${result.value.id}`))).toHaveLength(1);
});
test("archive retains invoice/attempt history and restoration cannot exceed active branch quota",async()=>{
  const a=await owner(),bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice;await settle(bill);
  await changeLifecycle("branch",a.branchId,"archive",adminId);
  for(let i=0;i<5;i++)await createOwnerBranch(a.id,{outletName:"Replacement "+i,phone:"08123456789",address:"Test"});
  await expect(changeLifecycle("branch",a.branchId,"active",adminId)).rejects.toThrow();
  expect(await db.select().from(paymentAttempts).where(eq(paymentAttempts.invoiceId,bill.id))).toHaveLength(1);
  expect(await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id))).toHaveLength(1);
});
test("cloud payload excludes text/history/PII and account quota is shared across branches",async()=>{
  const a=await owner();
  const context={outletName:"SECRET NAME",todayStr:today(),ordersTodayCount:1,revenueToday:200,processCount:2,readyCount:3,unpaidCount:0,superadminStats:{usersList:[{email:"secret@example.com",name:"SECRET NAME"}]}};
  const payload=JSON.stringify(buildCloudInput("omset SECRET NAME 08123456789 secret@example.com rekening 123456",context as any,"superadmin"));
  for(const secret of ["SECRET NAME","08123456789","secret@example.com","123456","usersList"])expect(payload).not.toContain(secret);
  await reserveAiRequest(a.id,a.branchId);await reserveAiRequest(a.id,a.branchId);
  await expect(reserveAiRequest(a.id,a.branchId)).rejects.toThrow();
});
test("WA cooldown is queued rather than sent, and final trial day remains operational",async()=>{
  const a=await owner(),id=crypto.randomUUID();
  await client`UPDATE wa_delivery_jobs SET available_at=now()+interval '1 day' WHERE status='queued'`;
  await client`INSERT INTO wa_delivery_jobs(id,tenant_id,phone,message,dedup_key) VALUES (${id},${a.branchId},'08123456789','Test',${id})`;
  await processWaQueue(async()=>({success:false,skipped:true}));
  const [job]=await client`SELECT status FROM wa_delivery_jobs WHERE id=${id}`;expect(job.status).toBe("queued");
  await db.update(tenants).set({isTrial:"true",subscriptionUntil:today()}).where(eq(tenants.id,a.branchId));
  await runTrialReminderCheck();
  expect((await db.select().from(tenants).where(eq(tenants.id,a.branchId)))[0].status).toBe("active");
  expect(toDateOnly(new Date("2026-11-12T17:01:00Z"))).toBe("2026-11-13");
});
test("migration replay preserves financial totals and production seeder is refused",async()=>{
  const totals=async()=>await client`SELECT (SELECT count(*) FROM users) users, (SELECT count(*) FROM subscription_invoices) invoices, (SELECT coalesce(sum(amount),0) FROM platform_cashflow) cash`;
  const before=await totals();await initPostgresTables();expect(await totals()).toEqual(before);
  await expect(seedInitialData(true)).rejects.toThrow();expect(await totals()).toEqual(before);
});
test("real login issues HttpOnly cookie and spoofed forwarding headers cannot bypass login throttle",async()=>{
  const a=await owner();
  const response=await app.request("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json",Origin:"http://localhost:5000"},body:JSON.stringify({email:`${a.id}@test.invalid`,password:"isolated-password-only"})});
  expect(response.status).toBe(200);expect(response.headers.get("set-cookie")).toContain("HttpOnly");expect(await response.json()).not.toHaveProperty("token");
  let last:Response=response;
  for(let i=0;i<11;i++)last=await app.request("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json","X-Forwarded-For":`192.0.2.${i}`,"X-Real-IP":`192.0.2.${i}`},body:JSON.stringify({email:"noone@test.invalid",password:"invalid"})});
  expect(last.status).toBe(429);
});

test("late or legacy settlement requires explicit audited review without repricing",async()=>{
  const a=await owner(),bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice;
  const attempt=await checkoutInvoice(bill.id,a.id,gateway);
  await db.update(subscriptionInvoices).set({expiresAt:null,entitlementTier:null}).where(eq(subscriptionInvoices.id,bill.id));
  await applyGatewayEvent({order_id:attempt.orderId,transaction_id:crypto.randomUUID(),transaction_status:"settlement",gross_amount:String(bill.finalAmount),status_code:"200"});
  expect((await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id)))[0].activationStatus).toBe("pending_review");
  await expect(reviewInvoiceActivation(bill.id,a.id,{tier:"premium",notes:"Verified historical contract reference"})).rejects.toThrow();
  const result=await reviewInvoiceActivation(bill.id,adminId,{tier:"premium",notes:"Verified historical contract reference"});
  expect(result.invoice.activationStatus).toBe("active");expect(result.invoice.finalAmount).toBe(bill.finalAmount);expect(result.invoice.activationReviewedBy).toBe(adminId);
});
test("database identity lookup failure returns 503 instead of accepting a cached identity",async()=>{
  const a=await owner(),h=await headers(a.id);
  await client`ALTER TABLE users RENAME TO test_unavailable_users`;
  try {expect((await app.request("/api/auth/me",{headers:h})).status).toBe(503);}
  finally {await client`ALTER TABLE test_unavailable_users RENAME TO users`;}
});
test("financial receipt commits even if entitlement persistence fails",async()=>{
  const a=await owner(),bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice;
  const attempt=await checkoutInvoice(bill.id,a.id,gateway);
  await client.unsafe(`CREATE FUNCTION test_activation_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.id = '${a.id}' AND NEW.subscription_until IS DISTINCT FROM OLD.subscription_until THEN RAISE EXCEPTION 'isolated failure'; END IF; RETURN NEW; END $$`);
  await client`CREATE TRIGGER test_activation_failure BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION test_activation_failure()`;
  try {
    await applyGatewayEvent({order_id:attempt.orderId,transaction_id:crypto.randomUUID(),transaction_status:"settlement",gross_amount:String(bill.finalAmount),status_code:"200"});
    const [paid]=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.id,bill.id));
    expect(paid.status).toBe("paid");expect(paid.activationStatus).toBe("pending");expect(paid.periodEnd).toBeNull();
    expect(await db.select().from(platformCashflow).where(eq(platformCashflow.id,`subpcf-${bill.id}`))).toHaveLength(1);
  } finally {await client`DROP TRIGGER test_activation_failure ON users`;await client`DROP FUNCTION test_activation_failure()`;}
  expect((await retryInvoiceActivation(bill.id)).invoice.activationStatus).toBe("active");
});

test("administrative HTTP confirmation is idempotent under concurrent retries",async()=>{
  const a=await owner(),h=await headers(adminId),key=crypto.randomUUID();
  const body=JSON.stringify({tenantId:a.branchId,planId:"premium",durationMonths:1,idempotencyKey:key,notes:"Isolated payment confirmation"});
  const responses=await Promise.all([app.request("/api/subscription/admin-extend",{method:"POST",headers:h,body}),app.request("/api/subscription/admin-extend",{method:"POST",headers:h,body})]);
  expect(responses.map(r=>r.status)).toEqual([200,200]);
  const rows=await db.select().from(subscriptionInvoices).where(eq(subscriptionInvoices.idempotencyKey,`admin:${adminId}:${key}`));expect(rows).toHaveLength(1);expect(rows[0].activationStatus).toBe("active");
  expect((await db.select().from(users).where(eq(users.id,a.id)))[0].subscriptionUntil).toBe(addDays(30,"2030-01-01"));
});
test("Owner cannot claim a private admin file by attaching its URL",async()=>{
  const a=await owner(),bill=(await createSubscriptionInvoice({tenantId:a.branchId,userId:a.id})).invoice,path=`/uploads/payments/2026-11/${crypto.randomUUID()}.png`;
  await db.insert(storedFiles).values({path,ownerId:adminId,category:"payments"});
  await expect(uploadPaymentProof(bill.id,path,a.branchId,a.id)).rejects.toThrow();
  await uploadPaymentProof(bill.id,path,a.branchId,adminId);
  expect((await db.select().from(storedFiles).where(eq(storedFiles.path,path)))[0].ownerId).toBe(a.id);
});

test("marketing sessions cannot access operational endpoints without a branch scope",async()=>{
  const m=await owner();await db.update(users).set({role:"marketing"}).where(eq(users.id,m.id));
  const h=await headers(m.id);
  for(const path of ["/api/orders","/api/customers","/api/expenses","/api/services"])expect((await app.request(path,{headers:h})).status).toBe(403);
});
test("order, new customer and WA outbox commit together with authoritative item totals",async()=>{
  const a=await owner(),h=await headers(a.id);
  await db.update(tenants).set({waMode:"baileys"}).where(eq(tenants.id,a.branchId));
  const body={newCustomer:{name:"Atomic test customer",phone:"080000000000"},items:[{serviceType:"Cuci",unit:"kg",weightOrQty:3,pricePerUnit:8000,subtotal:1}],paymentStatus:"paid",paymentMethod:"cash"};
  const response=await app.request("/api/orders",{method:"POST",headers:h,body:JSON.stringify(body)});expect(response.status).toBe(200);
  const result=await response.json();expect(result.data.totalAmount).toBe(24000);
  const job=await client`SELECT id FROM wa_delivery_jobs WHERE tenant_id=${a.branchId}`;expect(job).toHaveLength(1);
  const count=async()=>({orders:(await db.select().from(orders).where(eq(orders.tenantId,a.branchId))).length,customers:(await db.select().from(customers).where(eq(customers.tenantId,a.branchId))).length});
  const before=await count();
  const invalid=await app.request("/api/orders",{method:"POST",headers:h,body:JSON.stringify({...body,items:[{...body.items[0],pricePerUnit:-1}]})});expect(invalid.status).toBe(400);expect(await count()).toEqual(before);
  await client.unsafe(`CREATE FUNCTION test_outbox_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.tenant_id = '${a.branchId}' THEN RAISE EXCEPTION 'isolated outbox failure'; END IF; RETURN NEW; END $$`);
  await client`CREATE TRIGGER test_outbox_failure BEFORE INSERT ON wa_delivery_jobs FOR EACH ROW EXECUTE FUNCTION test_outbox_failure()`;
  try {
    expect((await app.request("/api/orders",{method:"POST",headers:h,body:JSON.stringify(body)})).status).toBe(500);expect(await count()).toEqual(before);
    expect((await app.request(`/api/orders/${result.data.id}/status`,{method:"PATCH",headers:h,body:JSON.stringify({status:"ready"})})).status).toBe(500);
    expect((await db.select().from(orders).where(eq(orders.id,result.data.id)))[0].status).toBe("process");
  } finally {await client`DROP TRIGGER test_outbox_failure ON wa_delivery_jobs`;await client`DROP FUNCTION test_outbox_failure()`;}
});

test("Owner falls back to an active owned branch when the primary branch is archived",async()=>{
  const a=await owner();
  const branch=await createOwnerBranch(a.id,{outletName:"Active replacement",phone:"080000000000",address:"Test"});
  await changeLifecycle("branch",a.branchId,"archive",adminId);
  const h=await headers(a.id),response=await app.request("/api/auth/me",{headers:h});expect(response.status).toBe(200);
  expect((await response.json()).user.tenantId).toBe(branch.id);
  expect((await app.request("/api/orders",{headers:h})).status).toBe(200);
});
