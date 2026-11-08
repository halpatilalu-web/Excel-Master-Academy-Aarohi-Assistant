// @vitest-environment jsdom
/**
 * Phones get their own layout: five thumb-reachable destinations in a floating
 * Android-style bar, with "More" opening the full drawer. These tests pin the
 * behaviour a student on a phone depends on.
 */
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Layout, type NavItem } from "./Layout";
import { BookOpen, FlaskConical, LayoutDashboard, Library, Table2, Video } from "lucide-react";

afterEach(cleanup);

const NAV: NavItem[] = [
  { key: "home", label: "Dashboard", icon: LayoutDashboard },
  { key: "workbook", label: "Free Workbook", icon: Table2 },
  { key: "lab", label: "Practice Lab", icon: FlaskConical },
  { key: "reference", label: "Excel Reference", icon: Library },
  { key: "exam", label: "Exam Hub", icon: BookOpen },
  { key: "notes", label: "Notes", icon: Video },
];

function mount(onNavigate = vi.fn()) {
  render(
    <Layout
      brand="Excel Diploma Academy"
      nav={NAV}
      active="home"
      onNavigate={onNavigate}
      userEmail="guest@local"
    >
      <p>content</p>
    </Layout>,
  );
  return onNavigate;
}

describe("phone layout", () => {
  it("shows a bottom navigation bar with the five primary destinations", () => {
    mount();
    const bar = screen.getByRole("navigation", { name: /Primary/i });
    for (const label of ["Dashboard", "Free Workbook", "Practice Lab", "Excel Reference", "Exam Hub"]) {
      expect(within(bar).getByRole("button", { name: label })).toBeTruthy();
    }
    // Sections outside the five are behind "More", like Android's overflow.
    expect(within(bar).queryByRole("button", { name: "Notes" })).toBeNull();
    expect(within(bar).getByRole("button", { name: /More sections/i })).toBeTruthy();
  });

  it("navigates from the bar and marks the current tab", () => {
    const onNavigate = mount();
    const bar = screen.getByRole("navigation", { name: /Primary/i });
    fireEvent.click(within(bar).getByRole("button", { name: "Practice Lab" }));
    expect(onNavigate).toHaveBeenCalledWith("lab");
    expect(within(bar).getByRole("button", { name: "Dashboard" }).getAttribute("aria-current")).toBe("page");
  });

  it("opens the full drawer from More, so no section is unreachable on a phone", () => {
    mount();
    fireEvent.click(screen.getByRole("button", { name: /More sections/i }));
    // The drawer lists every section, including the five-strong bar's overflow.
    expect(screen.getByRole("button", { name: /Close menu/i })).toBeTruthy();
    expect(screen.getAllByRole("button", { name: /Notes/i }).length).toBeGreaterThan(0);
  });
});

describe("practice task brief", () => {
  it("shows numbered steps, the exact cells and what a correct sheet looks like", async () => {
    const { TaskBrief } = await import("./excel/TaskBrief");
    const { taskFor } = await import("../data/practiceTasks");
    render(<TaskBrief task={taskFor("sheet-marks")} />);
    const brief = screen.getByRole("region", { name: /Task brief/i });
    // Instructions, not an example: every step is numbered and visible.
    expect(within(brief).getByText(/Steps — isi order mein karo/i)).toBeTruthy();
    expect(within(brief).getAllByRole("listitem").length).toBeGreaterThanOrEqual(4);
    // The cells and the literal formula to type are listed.
    expect(within(brief).getByRole("button", { name: "E2" })).toBeTruthy();
    expect(within(brief).getAllByText(/=SUM\(B2:D2\)/).length).toBeGreaterThan(0);
    // The common mistake and the finish line are both written out.
    expect(within(brief).getByText(/Yahan galti hoti hai/i)).toBeTruthy();
    expect(within(brief).getByText(/Sahi hone par aisa dikhega/i)).toBeTruthy();
  });

  it("jumps the grid to the cell tapped in the instruction table", async () => {
    const { TaskBrief } = await import("./excel/TaskBrief");
    const { taskFor } = await import("../data/practiceTasks");
    const onApplyStep = vi.fn();
    render(<TaskBrief task={taskFor("sheet-marks")} onApplyStep={onApplyStep} />);
    fireEvent.click(screen.getByRole("button", { name: "F2" }));
    expect(onApplyStep).toHaveBeenCalledWith("F2");
  });
});
