import { useState } from "react";

export type SortDirection = "asc" | "desc";

export function compareSortValues(a: string | number, b: string | number, dir: SortDirection): number {
  const cmp = typeof a === "string" && typeof b === "string" ? a.localeCompare(b) : (a as number) - (b as number);
  return dir === "asc" ? cmp : -cmp;
}

/** Column-sort state for a clickable table header: same column toggles direction, a new one resets to ascending. */
export function useSort<Key>(initialKey: Key, initialDir: SortDirection = "asc") {
  const [sortKey, setSortKey] = useState<Key>(initialKey);
  const [sortDir, setSortDir] = useState<SortDirection>(initialDir);

  const toggleSort = (key: Key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return { sortKey, sortDir, toggleSort };
}
