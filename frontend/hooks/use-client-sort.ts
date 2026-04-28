"use client";

import { useState, useMemo } from "react";

export interface SortState {
  column:    string;
  direction: "asc" | "desc";
}

/** Client-side sort hook — sort array ใน memory */
export function useClientSort<T>(data: T[]) {
  const [sort, setSort] = useState<SortState | undefined>();

  const sorted = useMemo(() => {
    if (!sort) return data;
    return [...data].sort((a, b) => {
      const av = getNestedValue(a, sort.column);
      const bv = getNestedValue(b, sort.column);
      const cmp = compareValues(av, bv);
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [data, sort]);

  const onSort = (column: string, direction: "asc" | "desc" | null) => {
    setSort(direction ? { column, direction } : undefined);
  };

  return { sorted, sort, onSort };
}

function getNestedValue(obj: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>(
    (acc, key) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[key] : undefined),
    obj,
  );
}

function compareValues(a: unknown, b: unknown): number {
  if (a === null || a === undefined) return 1;
  if (b === null || b === undefined) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "th");
}
