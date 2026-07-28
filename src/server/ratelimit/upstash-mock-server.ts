import { createServer } from "node:http";

export interface MockServer {
  url: string;
  close: () => Promise<void>;
}

interface Entry {
  count: number;
  expiresAt: number | null;
}

/**
 * Minimal Upstash Redis REST server for offline tests: implements the
 * subset of commands `UpstashRateLimiter` sends (INCR, PEXPIRE, PTTL) against
 * an in-memory store, matching the real REST pipeline protocol — the client
 * auto-pipelines every call, so the request body is always an array of
 * `[command, ...args]` arrays, and the response an array of `{ result }` in
 * the same order.
 */
export async function startMockUpstashServer(opts: { token: string }): Promise<MockServer> {
  const store = new Map<string, Entry>();

  function liveEntry(key: string): Entry | undefined {
    const entry = store.get(key);
    if (!entry) return undefined;
    if (entry.expiresAt !== null && entry.expiresAt <= Date.now()) {
      store.delete(key);
      return undefined;
    }
    return entry;
  }

  function runCommand([command, ...args]: [string, ...string[]]): unknown {
    switch (command) {
      case "incr": {
        const key = args[0]!;
        const entry = liveEntry(key) ?? { count: 0, expiresAt: null };
        entry.count += 1;
        store.set(key, entry);
        return entry.count;
      }
      case "pexpire": {
        const [key, ms] = args;
        const entry = liveEntry(key!);
        if (entry) entry.expiresAt = Date.now() + Number(ms);
        return entry ? 1 : 0;
      }
      case "pttl": {
        const entry = liveEntry(args[0]!);
        if (!entry) return -2;
        return entry.expiresAt === null ? -1 : Math.max(0, entry.expiresAt - Date.now());
      }
      default:
        throw new Error(`unsupported command: ${command}`);
    }
  }

  const server = createServer((req, res) => {
    if (req.headers["authorization"] !== `Bearer ${opts.token}`) {
      res.writeHead(401, { "content-type": "application/json" });
      res.end(JSON.stringify({ error: "invalid token" }));
      return;
    }

    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      const pipeline = JSON.parse(body) as Array<[string, ...string[]]>;
      try {
        const results = pipeline.map((command) => ({ result: runCommand(command) }));
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify(results));
      } catch (error) {
        res.writeHead(400, { "content-type": "application/json" });
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : 0;

  return {
    url: `http://127.0.0.1:${port}`,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}
