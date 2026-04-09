const API_URL = process.env.API_URL ?? "http://localhost:3001";
const TEST_USER = process.env.TEST_USER ?? "integration-test";

export interface Timeline {
  id: string;
  name: string;
  owner: string;
}

export interface TimelineEntry {
  id: string;
  seq: number;
  payload: Record<string, unknown>;
}

export interface Document {
  id: string;
  owner: string;
  name: string;
  definition: Record<string, unknown>;
  state: Record<string, unknown> | null;
  initialized: boolean;
  changes_count?: number;
}

export interface HistoryEntry {
  id: number;
  seq: number;
  event: Record<string, unknown>;
  diff: Record<string, unknown>[] | null;
  created_at: string;
}

export class ApiClient {
  private readonly headers: HeadersInit;

  constructor(user = TEST_USER) {
    this.headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer user ${user}`,
    };
  }

  async createTimeline(name: string): Promise<Timeline> {
    const res = await fetch(`${API_URL}/api/timelines`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`createTimeline failed: ${await res.text()}`);
    return res.json();
  }

  async createDocument(name: string, timelineId: string): Promise<{ documentId: string }> {
    const res = await fetch(`${API_URL}/api/documents`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({ name, definition: counterDefinition(timelineId) }),
    });
    if (!res.ok) throw new Error(`createDocument failed: ${await res.text()}`);
    return res.json();
  }

  async getDocument(id: string): Promise<Document> {
    const res = await fetch(`${API_URL}/api/documents/${id}`, { headers: this.headers });
    if (!res.ok) throw new Error(`getDocument failed: ${await res.text()}`);
    return res.json();
  }

  async getDocumentHistory(id: string): Promise<HistoryEntry[]> {
    const res = await fetch(`${API_URL}/api/documents/${id}/history`, { headers: this.headers });
    if (!res.ok) throw new Error(`getDocumentHistory failed: ${await res.text()}`);
    const body: { documentId: string; history: HistoryEntry[] } = await res.json();
    return body.history;
  }

  async pushIncrementEntry(timelineId: string, request: number): Promise<TimelineEntry> {
    const res = await fetch(`${API_URL}/api/timelines/${timelineId}/entries`, {
      method: "POST",
      headers: this.headers,
      body: JSON.stringify({
        type: "Conversation/Operation Request",
        operation: "increment",
        request,
      }),
    });
    if (!res.ok) throw new Error(`pushIncrementEntry failed: ${await res.text()}`);
    return res.json();
  }
}

function counterDefinition(timelineId: string): Record<string, unknown> {
  return {
    name: "Counter",
    counter: 0,
    contracts: {
      ownerChannel: {
        type: "MyOS/MyOS Timeline Channel",
        timelineId,
      },
      increment: {
        description: "Increment the counter by the given number",
        type: "Conversation/Operation",
        channel: "ownerChannel",
        request: {
          description: "Represents a value by which counter will be incremented",
          type: "Integer",
        },
      },
      incrementImpl: {
        type: "Conversation/Sequential Workflow Operation",
        operation: "increment",
        steps: [
          {
            type: "Conversation/Update Document",
            changeset: [
              {
                op: "replace",
                path: "/counter",
                // biome-ignore lint/suspicious/noTemplateCurlyInString: Blue Language expression — not a JS template literal
                val: "${event.message.request + document('/counter')}",
              },
            ],
          },
        ],
      },
    },
  };
}
