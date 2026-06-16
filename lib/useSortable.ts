"use client";

import { useCallback, useMemo, useState } from "react";

export type SortDir = "asc" | "desc";

export interface SortState {
  key: string | null;
  dir: SortDir | null;
}

// A comparator returns the ASCENDING ordering for a column; the hook negates it
// for descending. Tri-state cycle per column: asc -> desc -> cleared (default).
export type Comparator<T> = (a: T, b: T) => number;

export interface Sortable<T> {
  /** Rows in the current view order. Default (cleared) order = `rows` as given. */
  sortedRows: T[];
  sort: SortState;
  /** Cycle the sort for a column: asc -> desc -> clear. */
  toggleSort: (key: string) => void;
  /** Value for the th `aria-sort` attribute. */
  ariaSort: (key: string) => "ascending" | "descending" | "none";
  /** ▲ / ▼ / "" indicator for the active column. */
  indicator: (key: string) => string;
}

// Reusable client-side, view-only sorting. Never mutates `rows`; never writes.
export function useSortable<T>(
  rows: T[],
  comparators: Record<string, Comparator<T>>
): Sortable<T> {
  const [sort, setSort] = useState<SortState>({ key: null, dir: null });

  const toggleSort = useCallback((key: string) => {
    setSort((prev) => {
      if (prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return { key: null, dir: null }; // third click -> back to default order
    });
  }, []);

  const sortedRows = useMemo(() => {
    if (!sort.key || !sort.dir) return rows;
    const cmp = comparators[sort.key];
    if (!cmp) return rows;
    const factor = sort.dir === "asc" ? 1 : -1;
    // Array.prototype.sort is stable, so equal rows keep their default order.
    return [...rows].sort((a, b) => factor * cmp(a, b));
  }, [rows, sort, comparators]);

  const ariaSort = useCallback(
    (key: string) => {
      if (sort.key !== key || !sort.dir) return "none" as const;
      return sort.dir === "asc" ? ("ascending" as const) : ("descending" as const);
    },
    [sort]
  );

  const indicator = useCallback(
    (key: string) => {
      if (sort.key !== key || !sort.dir) return "";
      return sort.dir === "asc" ? "▲" : "▼";
    },
    [sort]
  );

  return { sortedRows, sort, toggleSort, ariaSort, indicator };
}

// Handy comparator builders.
export const byNumber =
  <T,>(get: (row: T) => number): Comparator<T> =>
  (a, b) =>
    get(a) - get(b);

export const byText =
  <T,>(get: (row: T) => string): Comparator<T> =>
  (a, b) =>
    get(a).localeCompare(get(b));
