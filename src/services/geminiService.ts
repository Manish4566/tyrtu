import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function chatWithCodex(message: string, history: { role: string; parts: { text: string }[] }[] = []) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is missing");
  }

  const model = "gemini-3-flash-preview";
  
  try {
    const chat = ai.chats.create({
      model: model,
      history: history,
    });

    const result = await chat.sendMessage({
      message: message,
    });
    
    return result.text;
  } catch (error) {
    console.error("Gemini Error:", error);
    throw error;
  }
}
