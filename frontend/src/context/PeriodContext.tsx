import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

import { periodsApi } from "../api/resources";
import type { Period } from "../api/types";

interface PeriodContextValue {
  periods: Period[];
  loading: boolean;
  selectedPeriodId: number | null;
  setSelectedPeriodId: (id: number | null) => void;
  refresh: () => Promise<void>;
}

const PeriodContext = createContext<PeriodContextValue | null>(null);

export function PeriodProvider({ children }: { children: ReactNode }) {
  const [periods, setPeriods] = useState<Period[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriodId, setSelectedPeriodId] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const list = await periodsApi.list();
      setPeriods(list);
      setSelectedPeriodId((current) => {
        if (current !== null && list.some((p) => p.id === current)) return current;
        return list[0]?.id ?? null;
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  return (
    <PeriodContext.Provider
      value={{ periods, loading, selectedPeriodId, setSelectedPeriodId, refresh }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriodContext(): PeriodContextValue {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriodContext must be used within a PeriodProvider");
  return ctx;
}

/** Like `usePeriodContext`, but returns `null` instead of throwing when no `PeriodProvider`
 * is mounted — for components (e.g. WorldsPage) that render both inside and outside one. */
export function usePeriodContextOptional(): PeriodContextValue | null {
  return useContext(PeriodContext);
}
