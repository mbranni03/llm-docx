import Agent from "solo-ai-sdk";
import { Router } from "./router";
import { registerDocsRoutes } from "./router/docs";

const router = new Router();

registerDocsRoutes(router);

const server = Bun.serve({
  port: 3000,
  fetch: (req) => router.handle(req),
});

// const agent = new Agent("gemini");

// const response = await agent.generate("You are a helpful assistant.", [
//   { role: "user", content: "What is the capital of France?" },
// ]);

// console.log(response);
// console.log("\n---------------\n");
// console.log(response.content);

console.log(`🚀 Server running at http://localhost:${server.port}`);
