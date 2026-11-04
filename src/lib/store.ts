/**
 * Server-backed collection store over `/api/c/{collection}` — the one way an
 * app in this template reads and writes data. Data is saved on the server,
 * scoped to the signed-in user, and reachable from any device.
 *
 *   interface Transaction extends Doc { amount: number; note: string; date: string }
 *   const useTransactions = createStore<Transaction>("transactions");
 *   // in a component:
 *   const { items, loading, add, update, remove } = useTransactions();
 *
 * One cache per collection, shared by every component that asks for it: the
 * Dashboard used to fetch `progress` and `exams` twice each on every visit
 * because it and StreakBadges both called the hook. Writes are optimistic and
 * roll back on failure; `id`, `_created`, `_updated` are managed by the server.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

export interface Doc {
  id: string;
  _created?: number;
  _updated?: number;
}

interface State<T> {
  items: T[];
  loading: boolean;
  error: string | null;
}

const states = new Map<string, State<unknown>>();
const listeners = new Map<string, Set<() => void>>();
const inflight = new Map<string, Promise<void>>();

function stateOf<T>(key: string): State<T> {
  let state = states.get(key) as State<T> | undefined;
  if (!state) {
    state = { items: [], loading: true, error: null };
    states.set(key, state as State<unknown>);
  }
  return state;
}

function setState<T>(key: string, patch: Partial<State<T>>) {
  const next = { ...stateOf<T>(key), ...patch };
  states.set(key, next as State<unknown>);
  listeners.get(key)?.forEach((listener) => listener());
}

function subscribe(key: string, listener: () => void): () => void {
  let set = listeners.get(key);
  if (!set) {
    set = new Set();
    listeners.set(key, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (!set!.size) listeners.delete(key);
  };
}

/** Drop every cached collection (sign-out, account switch, test reset). */
export function clearStoreCache(): void {
  for (const key of states.keys()) states.delete(key);
  inflight.clear();
  for (const set of listeners.values()) set.forEach((listener) => listener());
}

async function refreshKey(key: string, path: string): Promise<void> {
  const running = inflight.get(key);
  if (running) return running; // de-duplicate concurrent refreshes
  const task = (async () => {
    try {
      setState<unknown>(key, { items: await api.get<unknown[]>(path), error: null });
    } catch (error) {
      setState<unknown>(key, { error: (error as Error).message });
    } finally {
      setState<unknown>(key, { loading: false });
      inflight.delete(key);
    }
  })();
  inflight.set(key, task);
  return task;
}

export function createStore<T extends Doc>(collection: string) {
  const base = `/api/c/${encodeURIComponent(collection)}`;
  const key = collection;

  return function useCollection() {
    const [snapshot, setSnapshot] = useState<State<T>>(() => stateOf<T>(key));

    useEffect(() => {
      setSnapshot(stateOf<T>(key));
      const off = subscribe(key, () => setSnapshot(stateOf<T>(key)));
      void refreshKey(key, base);
      // Re-fetch after a different user signs in.
      const onAuth = () => void refreshKey(key, base);
      window.addEventListener("auth:signed-in", onAuth);
      return () => {
        off();
        window.removeEventListener("auth:signed-in", onAuth);
      };
    }, []);

    const refresh = useCallback(() => refreshKey(key, base), []);

    const add = useCallback(
      async (doc: Omit<T, "id" | "_created" | "_updated"> & { id?: string }) => {
        const created = await api.post<T>(base, doc);
        setState<T>(key, { items: [created, ...stateOf<T>(key).items] });
        return created;
      },
      [],
    );

    const update = useCallback(
      async (id: string, patch: Partial<T>) => {
        // Read the CURRENT list, not the list from the render that created this
        // callback: two fast clicks used to resurrect a stale row.
        const current = stateOf<T>(key).items.find((doc) => doc.id === id);
        if (!current) throw new Error(`no ${collection} document with id ${id}`);
        const merged = { ...current, ...patch, id } as T;
        setState<T>(key, { items: stateOf<T>(key).items.map((doc) => (doc.id === id ? merged : doc)) });
        try {
          const saved = await api.put<T>(`${base}/${encodeURIComponent(id)}`, merged);
          setState<T>(key, { items: stateOf<T>(key).items.map((doc) => (doc.id === id ? saved : doc)) });
          return saved;
        } catch (error) {
          setState<T>(key, { items: stateOf<T>(key).items.map((doc) => (doc.id === id ? current : doc)) });
          throw error;
        }
      },
      [],
    );

    const remove = useCallback(async (id: string) => {
      const previous = stateOf<T>(key).items;
      setState<T>(key, { items: previous.filter((doc) => doc.id !== id) });
      try {
        await api.del(`${base}/${encodeURIComponent(id)}`);
      } catch (error) {
        // Restore the removed row without clobbering unrelated changes.
        const after = stateOf<T>(key).items;
        const restored = previous.filter((doc) => !after.some((current) => current.id === doc.id));
        setState<T>(key, { items: [...after, ...restored] });
        throw error;
      }
    }, []);

    const upsert = useCallback(
      async (doc: T) => {
        if (stateOf<T>(key).items.some((item) => item.id === doc.id)) return update(doc.id, doc);
        try {
          return await add(doc);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error;
          const saved = await api.put<T>(`${base}/${encodeURIComponent(doc.id)}`, doc);
          setState<T>(key, { items: [saved, ...stateOf<T>(key).items.filter((item) => item.id !== doc.id)] });
          return saved;
        }
      },
      [add, update],
    );

    return { items: snapshot.items, loading: snapshot.loading, error: snapshot.error, refresh, add, update, remove, upsert };
  };
}

/** Download every collection of the signed-in user as one JSON file. */
export async function exportJSON(): Promise<void> {
  const data = await api.get<unknown>("/api/export");
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export const todayISO = (): string => new Date().toISOString().slice(0, 10);
