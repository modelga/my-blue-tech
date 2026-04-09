import { beforeAll, describe, expect, test } from "bun:test";
import { ApiClient } from "../helpers/client";
import { waitFor } from "../helpers/poll";

const api = new ApiClient();
const uid = Date.now();

// ── Helpers ────────────────────────────────────────────────────────────────────

async function waitForHistoryCount(documentId: string, count: number, timeout = 60_000): Promise<void> {
  await waitFor(
    async () => {
      const history = await api.getDocumentHistory(documentId);
      if (history.length < count) throw new Error(`history.length=${history.length}, want ${count}`);
    },
    { timeout, interval: 1_500 },
  );
}

async function waitForInitialized(documentId: string): Promise<void> {
  await waitFor(
    async () => {
      const doc = await api.getDocument(documentId);
      if (!doc.initialized) throw new Error("document not yet initialized");
    },
    { timeout: 30_000, interval: 1_000 },
  );
}

async function getCounter(documentId: string): Promise<number> {
  const doc = await api.getDocument(documentId);
  return (doc.state as Record<string, unknown> | null)?.counter as number;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe("Document initialization", () => {
  let documentId: string;

  beforeAll(async () => {
    const timeline = await api.createTimeline(`IT Init Timeline ${uid}`);
    ({ documentId } = await api.createDocument(`IT Init Counter ${uid}`, timeline.id));
  });

  test("document becomes initialized and records the init history entry", async () => {
    await waitForInitialized(documentId);

    const [doc, history] = await Promise.all([api.getDocument(documentId), api.getDocumentHistory(documentId)]);

    expect(doc.initialized).toBe(true);
    expect(doc.state).not.toBeNull();
    expect(history).toHaveLength(1);
    expect(history[0]?.event).toMatchObject({ type: "initialize" });
  });

  test("initial counter value is 0", async () => {
    await waitForInitialized(documentId);
    expect(await getCounter(documentId)).toBe(0);
  });
});

describe("Document increment via timeline entry", () => {
  let timelineId: string;
  let documentId: string;

  beforeAll(async () => {
    const timeline = await api.createTimeline(`IT Increment Timeline ${uid}`);
    timelineId = timeline.id;
    ({ documentId } = await api.createDocument(`IT Increment Counter ${uid}`, timelineId));
    await waitForInitialized(documentId);
  });

  test("pushing an increment entry increases the counter to 1", async () => {
    await api.pushIncrementEntry(timelineId, 1);
    await waitForHistoryCount(documentId, 2);

    expect(await getCounter(documentId)).toBe(1);
  });

  test("pushing a second increment entry increases the counter to 2", async () => {
    await api.pushIncrementEntry(timelineId, 1);
    await waitForHistoryCount(documentId, 3);

    expect(await getCounter(documentId)).toBe(2);
  });

  test("pushing an increment entry of 5 increases the counter by 5", async () => {
    await api.pushIncrementEntry(timelineId, 5);
    await waitForHistoryCount(documentId, 4);

    expect(await getCounter(documentId)).toBe(7);
  });
});

describe("Multi-document timeline synchronisation", () => {
  test(
    "two docs sync via timeline entries; a third doc created later catches up via replay",
    async () => {
      const timeline = await api.createTimeline(`IT Multi-Sync Timeline ${uid}`);
      const timelineId = timeline.id;

      // ── Step 1: Create two counter documents subscribed to the timeline ──
      const [{ documentId: doc1Id }, { documentId: doc2Id }] = await Promise.all([
        api.createDocument(`IT Alpha ${uid}`, timelineId),
        api.createDocument(`IT Beta ${uid}`, timelineId),
      ]);

      // ── Step 2: Wait for both to initialise (history count = 1) ──────────
      await Promise.all([waitForHistoryCount(doc1Id, 1), waitForHistoryCount(doc2Id, 1)]);

      // ── Step 3: Push first increment entry ───────────────────────────────
      const entry1 = await api.pushIncrementEntry(timelineId, 1);
      expect(entry1.seq).toBe(1);

      // ── Step 4: Wait for both docs to process the first entry ────────────
      // history count = 2: initialise + first entry
      await Promise.all([waitForHistoryCount(doc1Id, 2), waitForHistoryCount(doc2Id, 2)]);

      // Verify counter reached 1 in both documents
      expect(await getCounter(doc1Id)).toBe(1);
      expect(await getCounter(doc2Id)).toBe(1);

      // ── Step 5: Push second increment entry ──────────────────────────────
      const entry2 = await api.pushIncrementEntry(timelineId, 1);
      expect(entry2.seq).toBe(2);

      // ── Step 6: Wait for both docs to process the second entry ───────────
      // history count = 3: initialise + two entries
      await Promise.all([waitForHistoryCount(doc1Id, 3), waitForHistoryCount(doc2Id, 3)]);

      // Verify counter reached 2 in both documents
      expect(await getCounter(doc1Id)).toBe(2);
      expect(await getCounter(doc2Id)).toBe(2);

      // ── Step 7: Create a third document after entries already exist ───────
      const { documentId: doc3Id } = await api.createDocument(`IT Gamma ${uid}`, timelineId);

      // ── Step 8: Wait for doc3 to initialise AND replay both past entries ──
      // The replay-document-timelines worker processes both existing entries
      // through processDocumentEntry, so the final history count is also 3.
      await waitForHistoryCount(doc3Id, 3, 120_000);

      // Verify doc3 counter matches the other two — it caught up via replay
      expect(await getCounter(doc3Id)).toBe(2);
    },
    { timeout: 120_000 },
  );
});
