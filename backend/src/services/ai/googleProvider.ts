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

  const tools: Interactions.Tool[] = [
    {
      type: "google_search",
    },
  ];

  const generationConfig = {
    temperature: 1,
    max_output_tokens: 65536,
    top_p: 0.95,
  };

  // Format percakapan lengkap
  const conversationContext = history.length > 0
    ? "\n\nRiwayat Percakapan Sebelumnya:\n" +
      history.slice(-6).map((m) => `${m.role === "assistant" || m.role === "model" ? "AI" : "User"}: ${m.content}`).join("\n")
    : "";

  const fullInput = `${systemInstruction}${conversationContext}\n\nUser: ${userMessage}`;

  const primaryModel = "models/gemini-3-flash-preview";
  let lastErr: Error | null = null;

  // 1. Coba Interactions API dengan tools google_search
  try {
    const interaction = await ai.interactions.create({
      model: primaryModel,
      input: fullInput,
      tools: tools,
      generation_config: generationConfig,
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
        modelName: `google/${primaryModel}`,
      };
    }
  } catch (err: any) {
    lastErr = err;
    console.warn(`[Google Provider] interactions.create dengan tools gagal:`, err.message);

    // Coba tanpa tool jika tools google_search menyebabkan kendala kuota/argumen
    try {
      const interactionNoTool = await ai.interactions.create({
        model: primaryModel,
        input: fullInput,
        generation_config: generationConfig,
      });

      let outputText = interactionNoTool.output_text;
      if (!outputText && interactionNoTool.steps && interactionNoTool.steps.length > 0) {
        const lastStep = interactionNoTool.steps.at(-1) as any;
        outputText =
          lastStep?.output_text ||
          lastStep?.content ||
          lastStep?.parts?.[0]?.text ||
          null;
      }

      if (outputText && outputText.trim()) {
        return {
          text: outputText.trim(),
          modelName: `google/${primaryModel}`,
        };
      }
    } catch (noToolErr: any) {
      lastErr = noToolErr;
    }
  }

  // 2. Coba model alternatif gemini-3.8-flash dengan generateContent cepat
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

  throw lastErr || new Error("Gagal mendapatkan respon dari Google Gemini");
}
