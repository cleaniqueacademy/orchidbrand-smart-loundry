import { reserveAiRequest, buildCloudInput } from "./privacy";
import { ChatOptions, AIResponse } from "./types";
import { getOperationalContext } from "./contextService";
import { generateLocalFallbackReply } from "./localKnowledgeEngine";
import { callGoogleGemini } from "./googleProvider";
import { callAiveneWithFallback } from "./aiveneProvider";
import { checkRoleAccessViolation, sanitizeResponseForRole } from "./rbacGuard";

export * from "./types";
export { getOperationalContext } from "./contextService";
export { generateLocalFallbackReply } from "./localKnowledgeEngine";
export { callGoogleGemini } from "./googleProvider";
export { callAiveneAPI, callAiveneWithFallback } from "./aiveneProvider";
export { checkRoleAccessViolation, sanitizeResponseForRole } from "./rbacGuard";

/**
 * Main Controller: Asisten Operasional & Panduan Dashboard In-Web
 * Provider Utama: Aivene AI Gateway (DeepSeek v4.1 Flash, GLM-5.3 Flash, dsb.)
 * Fallback: Local Knowledge Engine (offline & andal)
 */
export async function askLaundryAssistant(options: ChatOptions): Promise<AIResponse> {
  const { message, tenantId, user, history = [] } = options;

  const userRole = user.role || "staff";
  const context = await getOperationalContext(tenantId, userRole);

  // =========================================================================
  // STEP 0: STRICT DETERMINISTIC RBAC PRE-GUARD
  // TOLAK LANGSUNG JIKA BUKAN DI RANAH ROLE APLIKASI PENGGUNA!
  // Khususnya: Kasir dilarang menanyakan fitur/wewenang Admin, Owner, Settings, Finansial.
  // =========================================================================
  const rbacViolation = checkRoleAccessViolation(message, userRole, context);
  if (rbacViolation) {
    return {
      reply: rbacViolation.reply,
      model: "cleanique-rbac-policy-guard",
      contextSummary: {
        outletName: context.outletName,
        ordersToday: context.ordersTodayCount,
        revenueToday: context.revenueToday,
        pendingOrders: context.processCount,
        readyOrders: context.readyCount,
      },
    };
  }

  const geminiApiKey = process.env.GEMINI_API_KEY?.trim();
  const aiveneApiKey = process.env.AIVENE_API_KEY?.trim();

  // Mode pengujian otomatis (unit & integration tests)
  if (process.env.NODE_ENV === "test") {
    const localReply = generateLocalFallbackReply(message, context, userRole);
    return {
      reply: localReply,
      model: "test-local-engine",
      contextSummary: {
        outletName: context.outletName,
        ordersToday: context.ordersTodayCount,
        revenueToday: context.revenueToday,
        pendingOrders: context.processCount,
        readyOrders: context.readyCount,
      },
    };
  }

  // Jika kedua API Key belum disetel, gunakan mesin pengetahuan lokal
  if (!geminiApiKey && !aiveneApiKey) {
    const localReply = generateLocalFallbackReply(message, context, userRole);
    return {
      reply: localReply,
      model: "cleanique-dashboard-copilot (Local Knowledge Engine)",
      contextSummary: {
        outletName: context.outletName,
        ordersToday: context.ordersTodayCount,
        revenueToday: context.revenueToday,
        pendingOrders: context.processCount,
        readyOrders: context.readyCount,
      },
    };
  }

  // Arbitrary message/history and named records stay local. Cloud receives only a fixed intent and numeric aggregates.
  await reserveAiRequest(user.userId, tenantId);
  const cloud = buildCloudInput(message, context, userRole);
  const systemPrompt = cloud.systemPrompt;
  let lastError: Error | null = null;

  // 1. Provider Utama: Aivene AI Gateway (Hosted DeepSeek v4.1 Flash & GLM 5.3 Flash chain)
  if (aiveneApiKey) {
    try {
      const { text, modelName } = await callAiveneWithFallback(
        aiveneApiKey,
        systemPrompt,
        cloud.message,
        []
      );
      const sanitizedReply = sanitizeResponseForRole(text, userRole);
      return {
        reply: sanitizedReply,
        model: modelName,
        contextSummary: {
          outletName: context.outletName,
          ordersToday: context.ordersTodayCount,
          revenueToday: context.revenueToday,
          pendingOrders: context.processCount,
          readyOrders: context.readyCount,
        },
      };
    } catch (aiveneErr: any) {
      lastError = aiveneErr;
      console.warn(`[AI Assistant] Aivene Gateway gagal, mengalihkan ke fallback Gemini:`, aiveneErr.message);
    }
  }

  // 2. Fallback 1: Google Gemini Resmi (@google/genai Interactions API & generateContent)
  if (geminiApiKey) {
    try {
      const { text, modelName } = await callGoogleGemini(
        geminiApiKey,
        systemPrompt,
        cloud.message,
        []
      );
      const sanitizedReply = sanitizeResponseForRole(text, userRole);
      return {
        reply: sanitizedReply,
        model: modelName,
        contextSummary: {
          outletName: context.outletName,
          ordersToday: context.ordersTodayCount,
          revenueToday: context.revenueToday,
          pendingOrders: context.processCount,
          readyOrders: context.readyCount,
        },
      };
    } catch (geminiErr: any) {
      lastError = geminiErr;
      console.warn(`[AI Assistant] Google Gemini gagal:`, geminiErr.message);
    }
  }

  // 3. Fallback terakhir: Mesin pengetahuan lokal offline
  console.error("[AI Assistant] Seluruh provider AI cloud gagal:", lastError?.message);
  const localReply = generateLocalFallbackReply(message, context, userRole);
  return {
    reply: `${localReply}\n\n*(Catatan: Menggunakan mode pengetahuan lokal karena koneksi AI cloud sedang sibuk)*`,
    model: "cleanique-dashboard-copilot (Local Knowledge Engine)",
    contextSummary: {
      outletName: context.outletName,
      ordersToday: context.ordersTodayCount,
      revenueToday: context.revenueToday,
      pendingOrders: context.processCount,
      readyOrders: context.readyCount,
    },
  };
}
