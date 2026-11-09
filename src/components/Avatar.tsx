/**
 * Round avatar: the user's picture when they signed in with Google, otherwise
 * their initial on the accent colour. Falls back to the initial if the image fails.
 */
import { useState } from "react";

export function Avatar({ name, email, picture, size = 32 }: { name?: string; email?: string; picture?: string; size?: number }) {
  const [broken, setBroken] = useState(false);
  const label = (name || email || "?").trim();
  const initial = label.charAt(0).toUpperCase();
  const style = { width: size, height: size, fontSize: Math.round(size * 0.42) };
  if (picture && !broken) {
    return (
      <img loading="lazy" decoding="async"
        src={picture}
        alt={label}
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="rounded-full object-cover shrink-0"
        style={style}
        data-avatar
      />
    );
  }
  return (
    <span
      aria-label={label}
      className="rounded-full bg-(--color-accent) text-white font-semibold flex items-center justify-center shrink-0"
      style={style}
      data-avatar
    >
      {initial}
    </span>
  );
}
