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
 * Writes are optimistic and roll back on failure. `id`, `_created`,
 * `_updated` are managed by the server.
 */
import { useCallback, useEffect, useState } from "react";
import { api, ApiError } from "./api";

export interface Doc {
  id: string;
  _created?: number;
  _updated?: number;
}

export function createStore<T extends Doc>(collection: string) {
  const base = `/api/c/${encodeURIComponent(collection)}`;

  return function useCollection() {
    const [items, setItems] = useState<T[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refresh = useCallback(async () => {
      try {
        setItems(await api.get<T[]>(base));
        setError(null);
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    }, []);

    useEffect(() => {
      void refresh();
      // Re-fetch after the user signs in (AuthGate fires this).
      const onAuth = () => void refresh();
      window.addEventListener("auth:signed-in", onAuth);
      return () => window.removeEventListener("auth:signed-in", onAuth);
    }, [refresh]);

    const add = useCallback(async (doc: Omit<T, "id" | "_created" | "_updated"> & { id?: string }) => {
      const created = await api.post<T>(base, doc);
      setItems((cur) => [created, ...cur]);
      return created;
    }, []);

    const update = useCallback(
      async (id: string, patch: Partial<T>) => {
        const current = items.find((d) => d.id === id);
        if (!current) throw new Error(`no ${collection} document with id ${id}`);
        const merged = { ...current, ...patch, id } as T;
        setItems((cur) => cur.map((d) => (d.id === id ? merged : d)));
        try {
          const saved = await api.put<T>(`${base}/${encodeURIComponent(id)}`, merged);
          setItems((cur) => cur.map((d) => (d.id === id ? saved : d)));
          return saved;
        } catch (e) {
          setItems((cur) => cur.map((d) => (d.id === id ? current : d)));
          throw e;
        }
      },
      [items],
    );

    const remove = useCallback(
      async (id: string) => {
        const prev = items;
        setItems((cur) => cur.filter((d) => d.id !== id));
        try {
          await api.del(`${base}/${encodeURIComponent(id)}`);
        } catch (e) {
          setItems(prev);
          throw e;
        }
      },
      [items],
    );

    const upsert = useCallback(
      async (doc: T) => {
        if (items.some((d) => d.id === doc.id)) return update(doc.id, doc);
        try {
          return await add(doc);
        } catch (error) {
          if (!(error instanceof ApiError) || error.status !== 409) throw error;
          const saved = await api.put<T>(`${base}/${encodeURIComponent(doc.id)}`, doc);
          setItems((cur) => [saved, ...cur.filter((d) => d.id !== doc.id)]);
          return saved;
        }
      },
      [items, add, update],
    );

    return { items, loading, error, refresh, add, update, remove, upsert };
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
