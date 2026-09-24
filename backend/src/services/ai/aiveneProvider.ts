import { ChatMessage } from "./types";

export const AIVENE_MODELS = [
  "gemini-3.8-flash",
  "gemini-3.7-flash",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
];

/**
 * Panggil Aivene AI Gateway (OpenAI-Compatible endpoint) sebagai fallback
 */
export async function callAiveneAPI(
  apiKey: string,
  modelName: string,
  systemInstruction: string,
  userMessage: string,
  history: ChatMessage[] = []
): Promise<string> {
  const url = "https://api.aivene.com/v1/chat/completions";

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-6).map((msg) => ({
      role: msg.role === "assistant" || msg.role === "model" ? "assistant" : "user",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  const payload = {
    model: modelName,
    messages,
    temperature: 0.7,
    max_tokens: 1500,
  };

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "User-Agent": "CleaniqueApp/1.0",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    throw new Error(`Aivene API error [HTTP ${res.status}]: ${errorBody}`);
  }

  const json: any = await res.json();
  const text =
    json?.choices?.[0]?.message?.content ||
    "Maaf, tidak ada respon dari model AI Aivene.";
  return text;
}

/**
 * Helper memanggil Aivene dengan rantai fallback model yang ditentukan pengguna
 */
export async function callAiveneWithFallback(
  apiKey: string,
  systemInstruction: string,
  userMessage: string,
  history: ChatMessage[] = []
): Promise<{ text: string; modelName: string }> {
  let lastErr: Error | null = null;

  for (const model of AIVENE_MODELS) {
    try {
      const text = await callAiveneAPI(
        apiKey,
        model,
        systemInstruction,
        userMessage,
        history
      );
      if (text && text.trim()) {
        return {
          text: text.trim(),
          modelName: `aivene/${model}`,
        };
      }
    } catch (err: any) {
      lastErr = err;
      console.warn(`[Aivene Provider] Model ${model} gagal:`, err.message);
    }
  }

  throw lastErr || new Error("Gagal mendapatkan respon dari Aivene Gateway");
}
