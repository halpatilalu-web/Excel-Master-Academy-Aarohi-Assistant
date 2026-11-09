/**
 * Make an open overlay (drawer, sheet, search) respond to the Android Back
 * button and gesture.
 *
 * Routes already behave: they are hash URLs, so Back moves to the previous
 * route. But an overlay is *not* a route — it is a piece of state. Inside the
 * APK, tapping Back with the drawer or a dialog open used to leave the page
 * entirely (the WebView pops the history entry behind it): the student lost
 * their place and, if an exam or a half-written sheet was behind the overlay,
 * the work was interrupted for nothing. Android users expect Back to close the
 * thing on top first.
 *
 * The trick is one extra history entry per open overlay: Back pops it, the
 * `popstate` closes the overlay, and the page stays exactly where it was. If
 * the overlay is closed by its own button instead, the entry is popped in
 * code so history does not grow.
 */
import { useEffect, useRef } from "react";

/** Marker stored in `history.state` so a pop we caused is not mistaken for a Back. */
const OVERLAY_TAG = "emaOverlay";

export function useOverlayBack(open: boolean, close: () => void): void {
  // Kept in a ref so a handler that changes identity every render does not
  // re-push a history entry on every render.
  const closeRef = useRef(close);
  closeRef.current = close;
  const pushed = useRef(false);

  useEffect(() => {
    if (!open) return;
    if (typeof window === "undefined") return;

    try {
      window.history.pushState({ [OVERLAY_TAG]: true }, "");
    } catch {
      return; // a sandboxed iframe can refuse; Back then keeps its old meaning
    }
    pushed.current = true;

    const onPop = () => {
      // Any pop while we own an entry means the user pressed Back.
      pushed.current = false;
      closeRef.current();
    };
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed by the UI, not by Back: drop the entry we added, otherwise the
      // next Back would do nothing visible.
      if (pushed.current) {
        pushed.current = false;
        try {
          window.history.back();
        } catch {
          /* nothing sensible to do in a torn-down document */
        }
      }
    };
  }, [open]);
}
