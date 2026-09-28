import { GoogleGenAI } from "@google/genai";
import type { Interactions } from "@google/genai";
import { ChatMessage } from "./types";

/**
 * Provider Google Gemini Resmi menggunakan @google/genai
 * Mendukung Interactions API dengan tools google_search & fallback
 */
export async function callGoogleGemini(
  apiKey: string,
  systemInstruction: string,
  userMessage: string,
  history: ChatMessage[] = []
): Promise<{ text: string; modelName: string }> {
  const ai = new GoogleGenAI({
    apiKey: apiKey,
  });

  let lastErr: Error | null = null;

  // 1. Prioritaskan gemini-3.8-flash via generateContent (Cepat, stabil, tanpa 429 search quota)
  try {
    const contents = [
      ...history.slice(-6).map((m) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      {
        role: "user",
        parts: [{ text: userMessage }],
      },
    ];

    const resp = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents,
      config: {
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
        temperature: 0.7,
      },
    });

    if (resp.text && resp.text.trim()) {
      return {
        text: resp.text.trim(),
        modelName: "google/gemini-3.8-flash",
      };
    }
  } catch (genErr: any) {
    lastErr = genErr;
    console.warn("[Google Provider] generateContent gemini-3.8-flash gagal:", genErr.message);
  }

  // 2. Fallback ke Interactions API dengan gemini-3-flash-preview (tanpa tool google_search agar tidak 429)
  try {
    const conversationContext = history.length > 0
      ? "\n\nRiwayat Percakapan Sebelumnya:\n" +
        history.slice(-6).map((m) => `${m.role === "assistant" || m.role === "model" ? "AI" : "User"}: ${m.content}`).join("\n")
      : "";

    const fullInput = `${systemInstruction}${conversationContext}\n\nUser: ${userMessage}`;

    const interaction = await ai.interactions.create({
      model: "gemini-3-flash-preview",
      input: fullInput,
      generation_config: {
        temperature: 0.8,
        max_output_tokens: 4096,
        top_p: 0.95,
      },
    });

    let outputText = interaction.output_text;
    if (!outputText && interaction.steps && interaction.steps.length > 0) {
      const lastStep = interaction.steps.at(-1) as any;
      outputText =
        lastStep?.output_text ||
        lastStep?.content ||
        lastStep?.parts?.[0]?.text ||
        null;
    }

    if (outputText && outputText.trim()) {
      return {
        text: outputText.trim(),
        modelName: "google/gemini-3-flash-preview",
      };
    }
  } catch (err: any) {
    lastErr = err;
    console.warn("[Google Provider] interactions.create gagal:", err.message);
  }

  throw lastErr || new Error("Gagal mendapatkan respon dari Google Gemini");
}
