import { GoogleGenAI } from "@google/genai";
import type { ChatMessage } from "./types";
export async function callGoogleGemini(apiKey: string, systemInstruction: string, userMessage: string, _history: ChatMessage[] = []) {
  const ai = new GoogleGenAI({ apiKey, httpOptions: { timeout: 12000, retryOptions: { attempts: 1 } } });
  const response = await ai.models.generateContent({ model: "gemini-2.5-flash-lite", contents: userMessage,
    config: { systemInstruction, maxOutputTokens: 1024, temperature: 0.4 } });
  if (!response.text?.trim()) throw new Error("Respons Google kosong");
  return { text: response.text.trim(), modelName: "google/gemini-2.5-flash-lite" };
}
