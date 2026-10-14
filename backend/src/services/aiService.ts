/**
 * AI Service Entrypoint
 * Terbagi menjadi modul modular di ./ai/
 * - types.ts : Tipe data dan antarmuka
 * - contextService.ts : Pengambilan data konteks operasional
 * - localKnowledgeEngine.ts : Mesin pengetahuan lokal offline
 * - aiveneProvider.ts : Integrasi Provider Utama Aivene AI Gateway (DeepSeek & GLM)
 * - localKnowledgeEngine.ts : Mesin pengetahuan lokal offline
 * - googleProvider.ts : Integrasi Google Gemini alternatif
 * - index.ts : Orchestrator & Controller utama
 */

export * from "./ai/index";
export * from "./ai/types";
