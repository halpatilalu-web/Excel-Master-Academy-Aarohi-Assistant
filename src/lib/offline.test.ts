// @vitest-environment jsdom
/**
 * Being offline must not look like being a different student.
 *
 * The audit found two failures here, both invisible in a unit test that only
 * renders markup:
 *  1. `/api/auth/me` failing with a *network* error dropped the remembered
 *     account and started a brand-new local guest — an empty dashboard for a
 *     student whose work was fine.
 *  2. There was no app shell cache at all, so an offline reload showed a blank
 *     page (verified separately in the browser).
 * Plus: the overlay Back handling, so Android's Back closes a drawer instead of
 * leaving the page.
 */
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { isNetworkFailure, rememberUser, rememberedUser, useOnline } from "./offline";
import { useOverlayBack } from "./useOverlayBack";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe("remembered account", () => {
  it("survives a reload so an offline start keeps the same student", () => {
    rememberUser({ id: "u-1", email: "student@example.com", name: "Aarti", provider: "password" });
    expect(rememberedUser()?.id).toBe("u-1");
    rememberUser(null);
    expect(rememberedUser()).toBeNull();
  });

  it("ignores a corrupted entry instead of crashing the auth gate", () => {
    localStorage.setItem("ema_last_account_v1", "{not json");
    expect(rememberedUser()).toBeNull();
  });
});

describe("isNetworkFailure", () => {
  it("treats an unreachable server as 'keep the student signed in'", () => {
    expect(isNetworkFailure(new TypeError("Failed to fetch"))).toBe(true);
    expect(isNetworkFailure({ status: 0 })).toBe(true);
    expect(isNetworkFailure({ status: 503 })).toBe(true);
  });

  it("treats a real 401/403 as 'signed out'", () => {
    expect(isNetworkFailure({ status: 401 })).toBe(false);
    expect(isNetworkFailure({ status: 403 })).toBe(false);
    expect(isNetworkFailure({ status: 400 })).toBe(false);
  });
});

describe("useOnline", () => {
  it("follows the browser's online/offline events", () => {
    const { result } = renderHook(() => useOnline());
    expect(typeof result.current).toBe("boolean");
    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current).toBe(false);
    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current).toBe(true);
  });
});

describe("useOverlayBack", () => {
  it("adds one history entry while open and closes on Back", () => {
    const closed: number[] = [];
    const { unmount } = renderHook(() => useOverlayBack(true, () => closed.push(1)));
    expect(history.state?.emaOverlay).toBe(true);

    // The student presses the hardware Back button.
    act(() => {
      window.dispatchEvent(new PopStateEvent("popstate", { state: null }));
    });
    expect(closed.length).toBe(1);
    unmount();
  });

  it("does not touch history while closed", () => {
    const before = history.length;
    const { unmount } = renderHook(() => useOverlayBack(false, () => undefined));
    expect(history.length).toBe(before);
    unmount();
  });
});
