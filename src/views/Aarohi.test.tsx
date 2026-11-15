// @vitest-environment jsdom
/**
 * The Aarohi chat, rendered for real.
 *
 * The regression this file guards: every question used to get the same canned
 * paragraph. These tests type actual questions into the real component and read
 * the answers out of the DOM, so a keyword-table change that collapses the
 * replies back into one answer turns CI red.
 */
import { cleanup, configure, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Aarohi } from "./Aarohi";
import { DEFAULT_CONFIG } from "../lib/aarohi/provider";

configure({ asyncUtilTimeout: 5000 });

beforeEach(() => {
  localStorage.clear();
  Element.prototype.scrollIntoView = () => {};
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
  Object.defineProperty(window, "speechSynthesis", {
    configurable: true,
    value: { speak: () => {}, cancel: () => {}, getVoices: () => [], addEventListener: () => {} },
  });
});

afterEach(() => cleanup());

/** The app's `/api/assistant` is unreachable here, so the offline brain answers. */
function offlineFetch() {
  globalThis.fetch = vi.fn(async () => {
    throw new TypeError("offline");
  }) as unknown as typeof fetch;
}

async function ask(question: string) {
  const input = screen.getByLabelText(/Apna Excel sawal/i) as HTMLInputElement;
  fireEvent.change(input, { target: { value: question } });
  fireEvent.submit(input.closest("form") as HTMLFormElement);
}

const lastAnswer = () =>
  [...document.querySelectorAll("[data-role='bot']")].at(-1)?.textContent ?? "";

describe("Aarohi chat", () => {
  it("welcomes the student with suggestions, not one canned line", () => {
    offlineFetch();
    render(<Aarohi />);
    expect(screen.getByRole("heading", { name: /Aarohi/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /VLOOKUP kya hai\?/ })).toBeTruthy();
    expect(screen.getByText(/VLOOKUP step by step sikhao/)).toBeTruthy();
  });

  it("answers a definition question with the concept and an example", async () => {
    offlineFetch();
    render(<Aarohi />);
    await ask("VLOOKUP kya hai");
    await waitFor(() => expect(lastAnswer()).toContain("Kya hai ye"));
    expect(lastAnswer()).toContain("VLOOKUP");
    // A worked example is rendered as a real table, not as ASCII text.
    expect(document.querySelector("table")).toBeTruthy();
  });

  it("gives a different answer to a different question about the same formula", async () => {
    offlineFetch();
    render(<Aarohi />);
    await ask("VLOOKUP kya hai");
    await waitFor(() => expect(lastAnswer()).toContain("Kya hai ye"));
    const define = lastAnswer();

    await ask("VLOOKUP step by step sikhao");
    await waitFor(() => expect(lastAnswer()).not.toBe(define));
    const howto = lastAnswer();

    expect(howto).toContain("Step by step");
    expect(howto).toContain("Step by step");
    // Numbered steps render as a real <ol>, which is the point of the change.
    expect(document.querySelector("ol li")).toBeTruthy();

    await ask("#N/A kyun aa raha hai");
    await waitFor(() => expect(lastAnswer()).not.toBe(howto));
    expect(lastAnswer().toLowerCase()).toContain("wajah");
  });

  it("remembers the topic for a bare follow-up", async () => {
    offlineFetch();
    render(<Aarohi />);
    await ask("XLOOKUP samjhao");
    await waitFor(() => expect(lastAnswer()).toContain("XLOOKUP"));
    await ask("aur samjhao");
    await waitFor(() => expect(lastAnswer()).toContain("XLOOKUP"));
  });

  it("uses an online model when the endpoint answers", async () => {
    globalThis.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url === "/api/assistant") {
        return new Response(JSON.stringify({ reply: "**Gemini:** `=XLOOKUP(A2,B:B,C:C)` ye line-by-line…", source: "gemini" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      }
      throw new TypeError("offline");
    }) as unknown as typeof fetch;

    render(<Aarohi />);
    // A question the brain flags as low confidence gets sent to the model.
    await ask("quantum physics ka Frenet-Serret equation samjhao");
    await waitFor(() => expect(screen.getByText(/Online AI/)).toBeTruthy());
    expect(screen.getByText(/ye line-by-line/)).toBeTruthy();
  });

  it("shows the offline badge when the model is unreachable", async () => {
    offlineFetch();
    render(<Aarohi />);
    await ask("quantum physics ka Frenet-Serret equation samjhao");
    await waitFor(() => expect(screen.getByText(/online AI abhi uplabdh nahi/i)).toBeTruthy());
  });

  it("clears the conversation", async () => {
    offlineFetch();
    render(<Aarohi />);
    await ask("pivot table banao");
    await waitFor(() => expect(lastAnswer()).toContain("Pivot"));
    fireEvent.click(screen.getByRole("button", { name: /Chat saaf karo/i }));
    await waitFor(() => expect(screen.queryByText(/Pivot Table —/)).toBeNull());
  });
});

describe("Aarohi AI settings", () => {
  it("opens the panel and saves a key without showing it back", async () => {
    offlineFetch();
    render(<Aarohi />);

    fireEvent.click(screen.getByRole("button", { name: /Aarohi ka AI settings/i }));

    const key = screen.getByLabelText(/Gemini API key/i) as HTMLInputElement;
    // A key typed here must be a password field by default.
    expect(key.type).toBe("password");
    fireEvent.change(key, { target: { value: "AIzaSECRET123" } });

    // Saved, described by name, but never printed.
    expect(screen.getByText(/saved/i)).toBeTruthy();
    expect(document.body.textContent).not.toContain("AIzaSECRET123");
    expect(localStorage.getItem("aarohi_ai_config_v1")).toContain("AIzaSECRET123");
  });

  it("shows a clear error when the key is rejected by the provider", async () => {
    globalThis.fetch = vi.fn(async () =>
      new Response(JSON.stringify({ error: { message: "API key not valid." } }), {
        status: 400,
        headers: { "content-type": "application/json" },
      }),
    ) as unknown as typeof fetch;
    localStorage.setItem(
      "aarohi_ai_config_v1",
      JSON.stringify({ ...DEFAULT_CONFIG, provider: "gemini", geminiKey: "bad" }),
    );

    render(<Aarohi />);
    await ask("quantum physics ka Frenet-Serret equation samjhao");

    await waitFor(() => expect(screen.getByText(/AI se connect nahi hua/i)).toBeTruthy());
    // The student still got a real answer from the brain.
    expect(lastAnswer().length).toBeGreaterThan(100);
    // And the provider chip says the key is in use.
    expect(screen.getAllByText(/Gemini/).length).toBeGreaterThan(0);
  });

  it("never calls the network when 'sirf built-in' is chosen", async () => {
    const fetchMock = vi.fn(async () => {
      throw new TypeError("offline");
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    localStorage.setItem(
      "aarohi_ai_config_v1",
      JSON.stringify({ ...DEFAULT_CONFIG, provider: "local", geminiKey: "AIzaX" }),
    );

    render(<Aarohi />);
    await ask("quantum physics ka Frenet-Serret equation samjhao");
    await waitFor(() => expect(lastAnswer().length).toBeGreaterThan(100));
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
