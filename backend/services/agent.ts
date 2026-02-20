import Agent from "solo-ai-sdk";
import { chunkText } from "./chunker";

export interface ChatResult {
  action: "reply" | "criticize" | "suggest" | "edit" | "summarize";
  replyText?: string;
  criticisms?: Array<{ quote: string; criticism: string }>;
  suggestions?: Array<{ quote: string; suggestion: string; reason: string }>;
  edits?: Array<{ quote: string; suggestion: string; reason: string }>;
}

const SYSTEM_PROMPT = `
You are an expert AI document assistant embedded within a rich text editor.
The user is providing you with a chunk of their document, their current "mode", and a specific query or command.

Modes:
- "Chat": The user is asking a general question about the document or looking for a conversation.
- "Comment": The user wants you to review the text and add margin criticisms/comments.
- "Suggest": The user wants you to suggest textual changes (Track Changes).
- "Edit": The user wants you to directly edit and rewrite portions of their text.

Your task is to interpret the user's query IN THE CONTEXT OF THEIR CHOSEN MODE, and return a STRICT JSON object representing your decision.

The JSON object MUST conform to this structure:
{
  "action": "reply" | "criticize" | "suggest" | "edit" | "summarize",
  "replyText": "A conversational response to the user (used for 'reply' or 'summarize' actions, or as a general status message)",
  "criticisms": [ { "quote": "exact matching text from document", "criticism": "your comment" } ],
  "suggestions": [ { "quote": "exact matching text", "suggestion": "new text", "reason": "why" } ],
  "edits": [ { "quote": "exact matching text", "suggestion": "new text", "reason": "why" } ]
}

Rules for Actions:
- IF the user asks to summarize the document, use the "summarize" action and put the summary in "replyText".
- IF the user asks a general question, use the "reply" action and put the answer in "replyText".
- IF the user wants comments/review (usually "Comment" mode), use the "criticize" action and populate the "criticisms" array. Be sure the "quote" is an EXACT substring of the provided document text.
- IF the user wants suggested changes (usually "Suggest" mode), use the "suggest" action and populate the "suggestions" array. The "quote" must be an EXACT substring.
- IF the user wants direct rewrites/fixes (usually "Edit" mode), use the "edit" action and populate the "edits" array. The "quote" must be an EXACT substring.

Even if the mode is "Chat", if the user explicitly asks "Fix the grammar in the second paragraph", you should be smart enough to return the "edit" or "suggest" action instead of just replying. The Mode is a strong hint, but the Query takes precedence.

Return ONLY the JSON string. Do not wrap it in markdown code blocks.
`;

export async function chatWithDocument(
  text: string,
  query: string,
  mode: string,
): Promise<ChatResult> {
  const agent = new Agent("gemini");

  // For very large documents, we might need a more sophisticated chunking or map-reduce approach.
  // For now, we'll try to process the whole text if it fits, or just the first large chunk.
  // In a production system, you'd likely use the query to retrieve relevant vector chunks first.
  const rawChunks = await chunkText(text, { maxChunkSize: 15000, overlap: 0 });
  let relevantText = text;
  if (rawChunks && rawChunks.length > 0) {
    const firstChunk = rawChunks[0];
    if (firstChunk && firstChunk.text) {
      relevantText = firstChunk.text;
    }
  }

  const prompt = `
DOCUMENT TEXT:
---
${relevantText}
---

USER MODE: ${mode}
USER QUERY: ${query}
`;

  try {
    const response = await agent.generate(
      SYSTEM_PROMPT,
      [{ role: "user", content: prompt }],
      { model: "gemini-2.5-flash" },
    );

    const content = response.content as string | undefined;
    if (!content) {
      return {
        action: "reply",
        replyText: "Received empty response from the AI.",
      };
    }

    const jsonStr = content
      .replace(/^```json/, "")
      .replace(/```$/, "")
      .trim();

    if (jsonStr) {
      return JSON.parse(jsonStr) as ChatResult;
    }
  } catch (e) {
    console.error("Error in chatWithDocument:", e);
  }

  // Fallback
  return {
    action: "reply",
    replyText: "I'm sorry, I couldn't process that request right now.",
  };
}
