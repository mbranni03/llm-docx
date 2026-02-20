import Agent from "solo-ai-sdk";
import { chunkText } from "./chunker";

const MAP_PROMPT = `
You are an expert document summarizer. 
Please summarize the following document chunk concisely.
Extract the most important information, key points, and core arguments.
Return a structured but concise summary. Do not output anything else.
`;

const REDUCE_PROMPT = `
You are an expert document summarizer.
Your task is to synthesize the provided text into a single, cohesive, and comprehensive final summary of the entire document.

Please format your response EXACTLY following this structure:

### Executive Summary
[A brief 2-3 sentence overview describing what the document is about]

### Key Themes & Highlights
- **[Theme 1]**: [Brief explanation]
- **[Theme 2]**: [Brief explanation]
- **[Theme 3]**: [Brief explanation]
(Include up to 5 main themes/highlights as bullet points)

### Detailed Breakdown
[A few paragraphs synthesizing the specific details, flow, and narrative of the document]

Provide ONLY the final summary text following this format, nothing else.
`;

export async function summarizeDocument(text: string): Promise<string> {
  const chunks = await chunkText(text, { maxChunkSize: 10000, overlap: 400 });
  const agent = new Agent("gemini");

  if (chunks.length === 0) {
    return "";
  }

  if (chunks.length === 1) {
    try {
      const response = await agent.generate(
        REDUCE_PROMPT,
        [{ role: "user", content: chunks[0]!.text }],
        { model: "gemini-3-flash-preview" },
      );
      return (response.content as string).trim();
    } catch (e) {
      console.error("Error summarizing chunk:", e);
      throw new Error("Failed to summarize document");
    }
  }

  const chunkSummaries: string[] = [];

  for (const chunk of chunks) {
    try {
      const response = await agent.generate(
        MAP_PROMPT,
        [{ role: "user", content: chunk.text }],
        { model: "gemini-3-flash-preview" },
      );
      const summary = (response.content as string).trim();
      if (summary) {
        chunkSummaries.push(summary);
      }
    } catch (e) {
      console.error("Error summarizing chunk map phase:", e);
    }
  }

  if (chunkSummaries.length === 0) {
    throw new Error("Failed to generate any chunk summaries");
  }

  const combinedSummariesText = chunkSummaries
    .map((s, i) => `--- Chunk ${i + 1} Summary ---\n${s}`)
    .join("\n\n");

  try {
    const finalResponse = await agent.generate(
      REDUCE_PROMPT,
      [{ role: "user", content: combinedSummariesText }],
      { model: "gemini-3-flash-preview" },
    );
    return (finalResponse.content as string).trim();
  } catch (e) {
    console.error("Error generating final summary reduce phase:", e);
    throw new Error("Failed to generate final summary");
  }
}
