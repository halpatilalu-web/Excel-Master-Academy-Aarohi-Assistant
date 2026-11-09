/**
 * @license MIT
 * The "Windows" tab — the whole screen becomes a PC.
 *
 * The route is deliberately full-bleed (no course chrome) so it feels like
 * switching to a desktop rather than opening another page. `onExit` takes the
 * student back to the course dashboard.
 */
import { Desktop } from "../components/desktop/Desktop";

export function Windows({ onExit }: { onExit: () => void }) {
  return (
    <div className="-m-3 sm:-m-4 lg:-m-6">
      <Desktop onExit={onExit} />
    </div>
  );
}
