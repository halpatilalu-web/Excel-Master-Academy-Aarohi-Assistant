import { startGoogleLogin } from "../lib/orvis";

/**
 * "Continue with Google" for the sign-in gate. Renders only when the app has the
 * `google_auth` service (VITE_ORVIS_GOOGLE_AUTH=1, written by provision-service.py).
 * `data-google-login` is the contract verify-site.py checks.
 */
export function GoogleButton({ returnTo = "/" }: { returnTo?: string }) {
  return (
    <button
      type="button"
      data-google-login
      onClick={() => startGoogleLogin(returnTo)}
      className="w-full flex items-center justify-center gap-2 rounded-xl border border-(--color-border) bg-(--color-surface) px-3.5 py-2.5 text-sm font-medium text-(--color-ink) hover:bg-(--color-canvas) transition-colors"
    >
      <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
        <path fill="#EA4335" d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.6 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.3l7.8 6C12.3 13.4 17.7 9.5 24 9.5z" />
        <path fill="#4285F4" d="M46.5 24.5c0-1.6-.1-2.8-.4-4H24v7.6h12.8c-.3 2.1-1.7 5.3-4.8 7.5l7.4 5.7c4.4-4.1 7.1-10 7.1-16.8z" />
        <path fill="#FBBC05" d="M10.4 28.7A14.6 14.6 0 0 1 9.5 24c0-1.6.3-3.2.8-4.7l-7.8-6A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.7l7.8-6z" />
        <path fill="#34A853" d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.4-5.7c-2 1.4-4.7 2.4-8.5 2.4-6.3 0-11.7-3.9-13.6-9.4l-7.8 6C6.5 42.6 14.6 48 24 48z" />
      </svg>
      Continue with Google
    </button>
  );
}
