// @vitest-environment jsdom
/**
 * @license MIT
 * The Windows desktop tab: apps open, windows behave, files round-trip.
 *
 * These tests drive the shell the way a student does — double-click an icon,
 * type in Word, save, then find the file in Explorer.
 */
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Desktop, DESKTOP_APPS } from "./Desktop";

beforeEach(() => {
  localStorage.clear();
  // The store syncs against the API; in jsdom there is no server, so make it
  // fail fast and fall back to localStorage like the offline app does.
  globalThis.fetch = vi.fn(async () => {
    throw new TypeError("offline");
  }) as unknown as typeof fetch;
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const open = (name: RegExp) => fireEvent.doubleClick(screen.getAllByRole("button", { name })[0]);

describe("Windows desktop", () => {
  it("lists every app on the desktop and in the Start menu", () => {
    render(<Desktop onExit={() => undefined} />);
    for (const app of DESKTOP_APPS) {
      expect(screen.getAllByRole("button", { name: new RegExp(app.name.split(" ")[0], "i") }).length).toBeGreaterThan(0);
    }
    expect(screen.getByRole("application", { name: /Windows desktop/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Start menu/i }));
    expect(screen.getByLabelText(/Search apps and files/i)).toBeTruthy();
  });

  it("opens Excel, Word and Paint as separate windows and shows them on the taskbar", () => {
    render(<Desktop onExit={() => undefined} />);
    open(/^Excel$/i);
    open(/^Word$/i);
    open(/^Paint$/i);
    expect(screen.getByRole("dialog", { name: /Excel window/i })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Word window/i })).toBeTruthy();
    expect(screen.getByRole("dialog", { name: /Paint window/i })).toBeTruthy();
    expect(screen.getByTitle("Excel")).toBeTruthy();
  });

  it("minimises, maximises and closes a window", () => {
    render(<Desktop onExit={() => undefined} />);
    open(/^Notepad$/i);
    fireEvent.click(screen.getByRole("button", { name: /Minimise Notepad/i }));
    // The window is hidden but still on the taskbar, ready to restore.
    expect(screen.getByTitle("Notepad")).toBeTruthy();
    // Clicking the taskbar button restores the window.
    fireEvent.click(screen.getByTitle("Notepad"));
    fireEvent.click(screen.getByRole("button", { name: /Maximise Notepad/i }));
    fireEvent.click(screen.getByRole("button", { name: /Close Notepad/i }));
    expect(screen.queryByRole("dialog", { name: /Notepad window/i })).toBeNull();
  });

  it("edits a Word document and saves it to the desktop file system", async () => {
    render(<Desktop onExit={() => undefined} />);
    open(/^Word$/i);
    const window = screen.getByRole("dialog", { name: /Word window/i });
    fireEvent.change(within(window).getByLabelText(/Word document text/i), {
      target: { value: "# Report\n**Bold** claim" },
    });
    // The page preview renders the markdown heading.
    expect(within(window).getByRole("heading", { level: 1 }).textContent).toBe("Report");
    fireEvent.click(within(window).getByRole("button", { name: /^Save/i }));
    // Give the offline store a tick to write localStorage.
    await waitFor(() => expect(localStorage.getItem("ema_local_col_desktopFiles") ?? "").toContain("Document1.docx"));
    // Explorer lists what Word saved.
    open(/^File Explorer$/i);
    const explorer = screen.getByRole("dialog", { name: /File Explorer window/i });
    await waitFor(() => expect(within(explorer).getByText(/Document1\.docx/i)).toBeTruthy());
  });

  it("computes in the Calculator app", () => {
    render(<Desktop onExit={() => undefined} />);
    open(/^Calculator$/i);
    const calc = screen.getByRole("dialog", { name: /Calculator window/i });
    for (const key of ["7", "*", "6"]) fireEvent.click(within(calc).getByRole("button", { name: key }));
    fireEvent.click(within(calc).getByRole("button", { name: "=" }));
    expect(within(calc).getByText("42")).toBeTruthy();
  });

  it("opens a saved slide deck in PowerPoint and runs the slide show", () => {
    render(<Desktop onExit={() => undefined} />);
    open(/^PowerPoint$/i);
    const deck = screen.getByRole("dialog", { name: /PowerPoint window/i });
    fireEvent.click(within(deck).getByRole("button", { name: /Slide show/i }));
    expect(screen.getByRole("dialog", { name: /Slide show/i })).toBeTruthy();
  });

  it("exits back to the course through the taskbar", () => {
    const onExit = vi.fn();
    render(<Desktop onExit={onExit} />);
    const taskbar = screen.getByRole("application", { name: /Windows desktop/i });
    fireEvent.click(within(taskbar).getByRole("button", { name: /Exit to the course/i }));
    expect(onExit).toHaveBeenCalled();
  });
});
