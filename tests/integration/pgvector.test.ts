import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import {
  clearProbes,
  createProbe,
  findNearestProbes,
} from "@/server/db/repositories/embedding-probe.repository";

/**
 * Integration test for the Prisma + pgvector foundation.
 * Requires a live Postgres with the vector extension (see docker/docker-compose.yml).
 * Proves: repository write + read, and cosine-distance (<=>) ordering.
 */
describe("pgvector foundation", () => {
  beforeEach(async () => {
    await clearProbes();
  });

  afterAll(async () => {
    await clearProbes();
    await prisma.$disconnect();
  });

  it("stores and retrieves a row", async () => {
    const id = await createProbe("hello", [1, 0, 0]);
    expect(id).toBeTruthy();

    const nearest = await findNearestProbes([1, 0, 0], 1);
    expect(nearest).toHaveLength(1);
    expect(nearest[0]?.id).toBe(id);
    expect(nearest[0]?.content).toBe("hello");
  });

  it("orders results by cosine distance (<=>)", async () => {
    await createProbe("apple", [1, 0, 0]);
    await createProbe("almost-apple", [0.9, 0.1, 0]);
    await createProbe("banana", [0, 1, 0]);

    const results = await findNearestProbes([1, 0, 0], 3);

    expect(results.map((r) => r.content)).toEqual(["apple", "almost-apple", "banana"]);
    // Distances are monotonically non-decreasing.
    expect(results[0]!.distance).toBeLessThanOrEqual(results[1]!.distance);
    expect(results[1]!.distance).toBeLessThanOrEqual(results[2]!.distance);
    // Identical vector → ~0 distance.
    expect(results[0]!.distance).toBeCloseTo(0, 5);
  });

  it("respects the limit", async () => {
    await createProbe("a", [1, 0, 0]);
    await createProbe("b", [0, 1, 0]);
    await createProbe("c", [0, 0, 1]);

    const results = await findNearestProbes([1, 0, 0], 2);
    expect(results).toHaveLength(2);
  });
});
