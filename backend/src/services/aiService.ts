/**
 * AI Service Entrypoint
 * Terbagi menjadi modul modular di ./ai/
 * - types.ts : Tipe data dan antarmuka
 * - contextService.ts : Pengambilan data konteks operasional
 * - googleProvider.ts : Integrasi Google Gemini resmi via @google/genai (Primary Cloud)
 * - aiveneProvider.ts : Integrasi Fallback Aivene AI Gateway (DeepSeek & GLM)
 * - localKnowledgeEngine.ts : Mesin pengetahuan lokal offline (Offline Fallback)
 * - index.ts : Orchestrator & Controller utama
 */

export * from "./ai/index";
export * from "./ai/types";
