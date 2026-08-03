import { createServer } from "node:http";

export interface MockServer {
  /** Base URL including the /v1 suffix, e.g. http://127.0.0.1:PORT/v1 */
  url: string;
  /** Parsed request bodies received, in order (for assertions). */
  requests: Array<Record<string, unknown>>;
  close: () => Promise<void>;
}

/**
 * Minimal OpenAI-compatible endpoint for offline tests. Implements
 * /chat/completions for non-streaming (validation ping) and streaming (SSE)
 * requests, /embeddings (returns a deterministic vector per input, sized to
 * the requested `dimensions`), and /responses (the newer OpenAI Responses API
 * shape some AI SDK packages — e.g. @ai-sdk/huggingface — use instead of
 * classic chat-completions; non-streaming only, which is all the 1-token
 * validation ping needs). Returns 401 for a wrong API key and records request
 * bodies. Pass no `apiKey` (or `undefined`) to skip the auth check entirely —
 * models a real Ollama instance, which ignores whatever bearer value (if
 * any) it's sent; matching its exact "no credential" request shape isn't the
 * point, just that nothing here rejects it.
 */
export async function startMockOpenAIServer(opts: { apiKey?: string } = {}): Promise<MockServer> {
  const requests: Array<Record<string, unknown>> = [];

  const server = createServer((req, res) => {
    const isResponses = req.url?.endsWith("/responses");
    if (!req.url?.endsWith("/chat/completions") && !req.url?.endsWith("/embeddings") && !isResponses) {
      res.writeHead(404);
      res.end("not found");
      return;
    }

    if (opts.apiKey !== undefined && req.headers["authorization"] !== `Bearer ${opts.apiKey}`) {
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
      requests.push(json);
      const model = json.model ?? "mock-model";

      if (req.url?.endsWith("/embeddings")) {
        const dimensions = json.dimensions ?? 8;
        const inputs: string[] = Array.isArray(json.input) ? json.input : [json.input];
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            object: "list",
            model,
            data: inputs.map((text, index) => {
              // Simple content hash so distinct inputs (even same-length ones)
              // produce distinct vectors — deterministic, not random.
              let hash = 0;
              for (let i = 0; i < text.length; i++) hash = (hash * 31 + text.charCodeAt(i)) | 0;
              return {
                object: "embedding",
                index,
                embedding: Array.from({ length: dimensions }, (_, i) => ((hash + i) % 7) / 7),
              };
            }),
            usage: { prompt_tokens: 1, total_tokens: 1 },
          }),
        );
        return;
      }

      if (isResponses && !json.stream) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(
          JSON.stringify({
            id: "resp-mock",
            object: "response",
            created_at: 0,
            status: "completed",
            model,
            tools: [],
            temperature: 1,
            top_p: 1,
            output: [
              {
                type: "message",
                id: "msg-mock",
                role: "assistant",
                status: "completed",
                content: [{ type: "output_text", text: "OK", annotations: [] }],
              },
            ],
            usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 },
          }),
        );
        return;
      }

      if (json.stream) {
        res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
        if (isResponses) {
          // Minimal Responses-API SSE shape — just enough for a streamText()
          // consumer to see "Hello world" arrive, not a byte-exact replica.
          const event = (type: string, data: object) =>
            `event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`;
          res.write(event("response.output_text.delta", { delta: "Hello" }));
          res.write(event("response.output_text.delta", { delta: " world" }));
          res.write(
            event("response.completed", {
              response: { id: "resp-mock", status: "completed", output: [] },
            }),
          );
          res.end();
          return;
        }
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
    requests,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
