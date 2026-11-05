// @vitest-environment jsdom
/**
 * Boot test for the whole app shell.
 *
 * The pure-logic tests cannot catch the failure this repo actually had twice: a
 * view that throws on mount leaves a white screen while `tsc` and the bundle
 * stay green. This mounts <App /> with a stubbed `/api` and visits the routes
 * that are code-split (Charts, Reference, Aarohi) so a broken lazy import or a
 * bad prop reaches CI as a red test instead of a blank preview.
 */
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const GUEST = { id: "u-test", email: "guest-test@guest.local", name: "", provider: "guest", picture: "" };

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

let calls: string[] = [];

// jsdom has no matchMedia / speechSynthesis; both are browser APIs the shell
// reads during render (dark mode) or on demand (Aarohi's voice).
function stubBrowserApis() {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  // jsdom has no layout, so the Aarohi chat's scrollIntoView is missing.
  Element.prototype.scrollIntoView = () => {};
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: () => {}, cancel: () => {}, getVoices: () => [], addEventListener: () => {}, removeEventListener: () => {} },
  });
}

beforeEach(() => {
  stubBrowserApis();
  calls = [];
  window.location.hash = "";
  localStorage.clear();
  sessionStorage.clear();
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push(`${method} ${url}`);
    if (url === "/api/auth/me") return json(GUEST);
    if (url.startsWith("/api/auth/")) return json(GUEST, 201);
    if (url.startsWith("/api/c/")) {
      if (method === "GET") return json([]);
      return json({ ok: true }, 201);
    }
    if (url === "/api/export") return json({ exported: 0, user: GUEST, collections: {} });
    return json({ detail: "not found" }, 404);
  }) as unknown as typeof fetch;
});

afterEach(cleanup);

async function mountApp(hash = "") {
  window.location.hash = hash;
  const { default: App } = await import("./App");
  render(<App />);
  // Every view waits for the guest session, which the layout shows as this chip.
  await screen.findByText(/Guest · this device/i);
}

describe("app shell", () => {
  it("creates a guest session and renders the dashboard", async () => {
    await mountApp();
    expect(calls).toContain("GET /api/auth/me");
    expect(screen.getByText(/Guest · this device/i)).toBeTruthy();
  });

  it("opens a single chapter from a deep link", async () => {
    await mountApp("#/chapters/3");
    expect((await screen.findAllByText(/Chapter 3/i)).length).toBeGreaterThan(0);
  });

  it("renders the code-split Charts route", async () => {
    await mountApp("#/charts");
    expect(await screen.findByRole("heading", { name: /Charts & Dashboards/i })).toBeTruthy();
  });

  it("renders the code-split Reference route with a searchable list", async () => {
    await mountApp("#/reference");
    expect(await screen.findByRole("heading", { name: /Excel Reference/i })).toBeTruthy();
    // Both reference tabs are data-driven; an empty render means a broken import.
    expect(screen.getByRole("button", { name: /Formula (Library|Encyclopedia) \(\d+\)/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /VBA (Code|Automation) \(\d+\)/ })).toBeTruthy();
  });

  it("renders the code-split Pro Toolkit route", async () => {
    await mountApp("#/toolkit");
    expect(await screen.findByRole("heading", { name: /AI Prompt Builder/i })).toBeTruthy();
  });

  it("renders the code-split Aarohi route", async () => {
    await mountApp("#/aarohi");
    expect(await screen.findByLabelText(/Apna Excel sawal/i)).toBeTruthy();
  });

  it("renders the practice exam without starting one", async () => {
    await mountApp("#/exam");
    expect(await screen.findByRole("button", { name: /Start|Shuru/i })).toBeTruthy();
  });

  it("renders the account view with a working sign-out and delete section", async () => {
    await mountApp("#/account");
    expect(await screen.findByText(/Delete my account/i)).toBeTruthy();
  });

  it("opens cleanly in local browser mode on static hosts (like Vercel) without a blank page", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response("<!doctype html><html><body>Not Found</body></html>", {
        status: 404,
        headers: { "content-type": "text/html" },
      }),
    ) as unknown as typeof fetch;
    await mountApp();
    expect(await screen.findByText(/Guest · this device/i)).toBeTruthy();
    expect(screen.getByText(/Master Excel A-to-Z/i)).toBeTruthy();
  });
});
