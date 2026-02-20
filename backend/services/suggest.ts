import Agent from "solo-ai-sdk";
import { chunkText } from "./chunker";

export interface SuggestionResult {
  quote: string;
  suggestion: string;
  reason: string;
}

const SYSTEM_PROMPT = `
You are an expert document reviewer, copy editor, and writing assistant. 
Your task is to review the provided document chunk and suggest concrete, textual changes to improve grammar, flow, clarity, and phrasing, while maintaining the original writing style.
You must return your findings as a JSON array of objects. Each object must have exactly these fields:
- "quote": The exact substring from the original text that you are targeting. It MUST be an exact textual match to a portion of the input chunk.
- "suggestion": The new text that should replace the "quote". This should be the improved version.
- "reason": A brief reason for the change (e.g., "Grammar", "Clarity", "Better phrasing").

Return ONLY the JSON array. If there are no improvements needed, return an empty array "[]".
Be careful that your "quote" exactly matches the characters in the text, so it can be automatically replaced.
`;

export async function suggestChangesDocument(
  text: string,
): Promise<SuggestionResult[]> {
  // Use a sliding window to chunk the document
  const chunks = await chunkText(text, { maxChunkSize: 1500, overlap: 200 });
  const agent = new Agent("gemini"); // Assuming gemini provider by default

  const allSuggestions: SuggestionResult[] = [];

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
        const suggestions: SuggestionResult[] = JSON.parse(jsonStr);
        allSuggestions.push(...suggestions);
      }
    } catch (e) {
      console.error("Error suggesting changes for chunk:", e);
    }
  }

  return allSuggestions;
}
