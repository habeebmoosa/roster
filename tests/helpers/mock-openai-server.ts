import { createServer } from "node:http";

export interface MockServer {
  /** Base URL including the /v1 suffix, e.g. http://127.0.0.1:PORT/v1 */
  url: string;
  close: () => Promise<void>;
}

/**
 * Minimal OpenAI-compatible endpoint for offline BYOK tests. Implements
 * /chat/completions for both non-streaming (validation ping) and streaming
 * (SSE) requests, and returns 401 for a wrong API key.
 */
export async function startMockOpenAIServer(opts: { apiKey: string }): Promise<MockServer> {
  const server = createServer((req, res) => {
    if (!req.url?.endsWith("/chat/completions")) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    if (req.headers["authorization"] !== `Bearer ${opts.apiKey}`) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(
        JSON.stringify({ error: { message: "invalid api key", type: "invalid_request_error" } }),
      );
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const json = body ? JSON.parse(body) : {};
      const model = json.model ?? "mock-model";

      if (json.stream) {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        const frame = (delta: object, finish: string | null = null) =>
          `data: ${JSON.stringify({
            id: "chatcmpl-mock",
            object: "chat.completion.chunk",
            created: 0,
            model,
            choices: [{ index: 0, delta, finish_reason: finish }],
          })}\n\n`;
        res.write(frame({ role: "assistant" }));
        res.write(frame({ content: "Hello" }));
        res.write(frame({ content: " world" }));
        res.write(frame({}, "stop"));
        res.write("data: [DONE]\n\n");
        res.end();
        return;
      }

      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-mock",
          object: "chat.completion",
          created: 0,
          model,
          choices: [
            { index: 0, message: { role: "assistant", content: "OK" }, finish_reason: "stop" },
          ],
          usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 },
        }),
      );
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}/v1`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
