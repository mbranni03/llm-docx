import Agent from "solo-ai-sdk";
import { chunkText } from "./chunker";

export interface CriticismResult {
  quote: string;
  criticism: string;
}

const SYSTEM_PROMPT = `
You are an expert document reviewer and editor. 
Your task is to review the provided document chunk and provide concise criticisms, suggestions for improvement, or point out confusing phrasing.
You should return your findings as a JSON array of objects. Each object must have:
- "quote": The exact substring from the text that you are criticizing. It must be an exact match.
- "criticism": Your concise feedback.

Return ONLY the JSON array. If there is nothing to criticize, return an empty array "[]".
`;

export async function criticizeDocument(
  text: string,
): Promise<CriticismResult[]> {
  // Use a sliding window to chunk the document
  const chunks = await chunkText(text, { maxChunkSize: 1500, overlap: 200 });
  const agent = new Agent("gemini"); // Assuming gemini provider by default

  const allCriticisms: CriticismResult[] = [];

  for (const chunk of chunks) {
    try {
      const response = await agent.generate(
        SYSTEM_PROMPT,
        [{ role: "user", content: chunk.text }],
        { model: "gemini-2.5-flash" },
      );

      const content = response.content as string;
      const jsonStr = content
        .replace(/^```json/, "")
        .replace(/```$/, "")
        .trim();
      if (jsonStr) {
        const criticisms: CriticismResult[] = JSON.parse(jsonStr);
        allCriticisms.push(...criticisms);
      }
    } catch (e) {
      console.error("Error criticizing chunk:", e);
    }
  }

  return allCriticisms;
}
