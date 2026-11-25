import { beforeAll, test, expect } from "bun:test";
import { Hono } from "hono";
import { db, initPostgresTables } from "../db";
import { users, tenants } from "../db/schema";
import upload from "./upload";
import files from "./files";
import { createSession } from "../services/sessions";
if(process.env.PREMIUM_TEST_DATABASE!=="isolated" || !new URL(process.env.DATABASE_URL!).pathname.endsWith("/cleanique_test"))throw new Error("Dedicated test DB required");
const app=new Hono().route("/api/upload",upload).route("/uploads",files);
let cookie:string,csrf:string;
const png=Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=","base64");
function form(bytes:Uint8Array=png,category="payments") {const data=new FormData();data.set("file",new File([bytes],"proof.png",{type:"image/png"}));data.set("category",category);return data;}
beforeAll(async()=>{
 await initPostgresTables();const id=crypto.randomUUID(),branch=crypto.randomUUID();
 await db.insert(users).values({id,name:"Upload test",email:id+"@test.invalid",role:"tenant_owner",passwordHash:"not-a-login",tier:"premium",subscriptionUntil:"2030-01-01",tenantId:branch});
 await db.insert(tenants).values({id:branch,userId:id,outletName:"Upload test",address:"Test",phone:"08123456789",tier:"premium",subscriptionUntil:"2030-01-01"});
 const session=await createSession(id);cookie=`cleanique_session=${session.token}`;csrf=session.csrfToken;
});
test("upload requires a live session and CSRF",async()=>{
 expect((await app.request("/api/upload",{method:"POST",body:form()})).status).toBe(401);
 expect((await app.request("/api/upload",{method:"POST",headers:{Cookie:cookie},body:form()})).status).toBe(403);
});
test("upload rejects forged image content and unknown categories",async()=>{
 for(const body of [form(new TextEncoder().encode("fake image")),form(png,"../payments")])expect((await app.request("/api/upload",{method:"POST",headers:{Cookie:cookie,"X-CSRF-Token":csrf},body})).status).toBe(400);
});
test("valid private file is served only to authenticated owner",async()=>{
 const response=await app.request("/api/upload",{method:"POST",headers:{Cookie:cookie,"X-CSRF-Token":csrf},body:form()});expect(response.status).toBe(201);
 const {data}=await response.json();expect((await app.request(data.url)).status).toBe(401);
 const own=await app.request(data.url,{headers:{Cookie:cookie}});expect(own.status).toBe(200);expect(own.headers.get("cache-control")).toContain("no-store");
});
