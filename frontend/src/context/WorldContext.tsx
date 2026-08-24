import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { setCurrentWorldId } from "../api/client";
import { worldsApi } from "../api/resources";
import type { World } from "../api/types";

const WORLD_STORAGE_KEY = "chronodemica.selectedWorldId";

interface WorldContextValue {
  worlds: World[];
  loading: boolean;
  selectedWorldId: number | null;
  setSelectedWorldId: (id: number | null) => void;
  refresh: () => Promise<void>;
}

const WorldContext = createContext<WorldContextValue | null>(null);

export function WorldProvider({ children }: { children: ReactNode }) {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWorldId, setSelectedWorldIdState] = useState<number | null>(null);
  const selectedWorldIdRef = useRef<number | null>(null);

  const selectWorld = (id: number | null) => {
    selectedWorldIdRef.current = id;
    setSelectedWorldIdState(id);
    setCurrentWorldId(id);
    if (id !== null) {
      localStorage.setItem(WORLD_STORAGE_KEY, String(id));
    } else {
      localStorage.removeItem(WORLD_STORAGE_KEY);
    }
  };

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await worldsApi.list();
      setWorlds(list);
      const storedRaw = localStorage.getItem(WORLD_STORAGE_KEY);
      const candidate = selectedWorldIdRef.current ?? (storedRaw ? Number(storedRaw) : null);
      const validId = list.some((w) => w.id === candidate) ? candidate : (list[0]?.id ?? null);
      selectWorld(validId);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <WorldContext.Provider value={{ worlds, loading, selectedWorldId, setSelectedWorldId: selectWorld, refresh }}>
      {children}
    </WorldContext.Provider>
  );
}

export function useWorldContext(): WorldContextValue {
  const ctx = useContext(WorldContext);
  if (!ctx) throw new Error("useWorldContext must be used within a WorldProvider");
  return ctx;
}
