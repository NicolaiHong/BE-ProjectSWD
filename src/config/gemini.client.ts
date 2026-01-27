import { GoogleGenAI } from "@google/genai";
import { config } from "./constants";

//Gemini
const apiKey = process.env.GEMINI_API_KEY;
const model = process.env.GEMINI_MODEL || "gemini-1.5-pro";

if (!apiKey)
  throw new Error("GEMINI_API_KEY is required in environment variables");
const ai = new GoogleGenAI({ apiKey });

export async function gemniTextForPrompt(promptText: string): Promise<string> {
  const res = await ai.models.generateContent({
    model,
    contents: promptText,
  });
  const text = res.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

  return text.trim();
  return (res.text ?? "").trim();
}
