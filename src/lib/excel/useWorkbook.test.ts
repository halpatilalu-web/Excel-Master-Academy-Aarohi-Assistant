// @vitest-environment jsdom
/**
 * The workbook's autosave contract.
 *
 * Regression: the hook used to `add()` on every save. The first save created the
 * document, and every save after that POSTed the same id again, got a 409, and
 * swallowed it — so only the first edit of a session ever reached the server.
 * The student's later work stayed on screen and vanished on reload.
 *
 * These tests pin the HTTP shape of the save sequence, because that is the part
 * that broke: create once, update from then on, and fall back to creating only
 * when the row is really gone.
 */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearStoreCache } from "../store";

const calls: { method: string; path: string; body?: unknown }[] = [];
let respond: (method: string, path: string) => { status: number; body: unknown };

const jsonResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

beforeEach(() => {
  calls.length = 0;
  clearStoreCache();
  localStorage.clear();
  let nextId = 0;
  respond = (method) => {
    if (method === "GET") return { status: 200, body: [] };
    if (method === "POST") return { status: 201, body: { id: `doc-${++nextId}`, _created: 1, _updated: 1 } };
    return { status: 200, body: {} };
  };
  globalThis.fetch = vi.fn(async (path: string, init?: RequestInit) => {
    const method = (init?.method ?? "GET").toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, path: String(path), body });
    const answer = respond(method, String(path));
    // GET returns the collection array; PUT echoes the stored document back.
    const payload = Array.isArray(answer.body)
      ? answer.body
      : { ...(answer.body as object), ...(method === "PUT" ? body : {}) };
    return jsonResponse(answer.status, payload);
  }) as unknown as typeof fetch;
});

afterEach(cleanup);

async function mountWorkbook() {
  const { useWorkbook } = await import("./useWorkbook");
  const sheet = { name: "S", cells: {} as Record<string, string> };
  return renderHook(() =>
    useWorkbook({ template: "t-autosave", title: "Autosave", initialSheets: [sheet], restore: true }),
  );
}

/** Let the 900 ms save debounce fire, then the request settle. */
async function flushSave() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  });
}

describe("workbook autosave", () => {
  it("creates the document once and updates it for every later edit", async () => {
    const { result } = await mountWorkbook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCell("S", "A1", "10"));
    await flushSave();
    expect(calls.filter((c) => c.method === "POST").length).toBe(1);

    // The second edit must be an update of the row we created — not a second
    // create that the server answers with 409.
    act(() => result.current.setCell("S", "A2", "20"));
    await flushSave();
    expect(calls.filter((c) => c.method === "POST").length).toBe(1);
    expect(calls.filter((c) => c.method === "PUT").length).toBe(1);

    act(() => result.current.setCell("S", "A3", "30"));
    await flushSave();
    expect(calls.filter((c) => c.method === "POST").length).toBe(1);
    expect(calls.filter((c) => c.method === "PUT").length).toBe(2);

    // Every save after the first carries the whole sheet with it.
    const lastPut = calls.filter((c) => c.method === "PUT").at(-1);
    const sheets = (lastPut?.body as { sheets: { cells: Record<string, string> }[] }).sheets;
    expect(sheets[0].cells).toMatchObject({ A1: "10", A2: "20", A3: "30" });
    expect(result.current.saveError).toBeNull();
  });

  it("recreates the row when an update is rejected, then keeps updating it", async () => {
    const { result } = await mountWorkbook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCell("S", "A1", "1"));
    await flushSave();
    expect(calls.filter((c) => c.method === "POST").length).toBe(1);

    // The row was rejected (data moved/restored elsewhere): one update attempt
    // fails, the hook creates a fresh row instead of failing forever, and every
    // save after that goes back to updating — no second duplicate.
    respond = (method) => {
      if (method === "PUT") return { status: 409, body: { detail: "a document with that id already exists" } };
      if (method === "POST") return { status: 201, body: { id: "recreated", _created: 2, _updated: 2 } };
      return { status: 200, body: [] };
    };
    act(() => result.current.setCell("S", "A2", "2"));
    await flushSave();
    expect(calls.filter((c) => c.method === "PUT").length).toBe(1);
    expect(calls.filter((c) => c.method === "POST").length).toBe(2);
    expect(result.current.saveError).toBeNull();

    respond = (method) => {
      if (method === "POST") return { status: 201, body: { id: "should-not-happen", _created: 3, _updated: 3 } };
      return { status: 200, body: {} };
    };
    act(() => result.current.setCell("S", "A3", "3"));
    await flushSave();
    expect(calls.filter((c) => c.method === "PUT").length).toBe(2);
    expect(calls.filter((c) => c.method === "POST").length).toBe(2);
    expect(calls.at(-1)?.path).toContain("recreated");
  });

  it("reports a failed save instead of claiming it worked", async () => {
    const { result } = await mountWorkbook();
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.setCell("S", "A1", "1"));
    await flushSave();

    // A server error that is NOT "the row is gone" must surface, not disappear.
    respond = () => ({ status: 500, body: { detail: "db is locked" } });
    act(() => result.current.setCell("S", "A2", "2"));
    await flushSave();

    await waitFor(() => expect(result.current.saveError).toBeTruthy());
    expect(result.current.saveError).toContain("db is locked");
    expect(result.current.saving).toBe(false);
  });
});
