"use client";

import type { Sortable } from "@/lib/useSortable";

// Accessible sortable column header. Renders a native <button> inside the <th>
// so Enter/Space toggle sorting for free, and sets aria-sort on the <th>.
export default function SortableTH<T>({
  label,
  sortKey,
  sortable,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: string;
  sortable: Pick<Sortable<T>, "toggleSort" | "ariaSort" | "indicator">;
  align?: "left" | "center";
  className?: string;
}) {
  const indicator = sortable.indicator(sortKey);
  const justify = align === "center" ? "justify-center" : "justify-start";

  return (
    <th
      scope="col"
      aria-sort={sortable.ariaSort(sortKey)}
      className={`${align === "center" ? "text-center" : "text-left"} ${className}`}
    >
      <button
        type="button"
        onClick={() => sortable.toggleSort(sortKey)}
        className={`inline-flex w-full items-center gap-1 ${justify} rounded px-0.5 py-0.5 uppercase tracking-widest hover:text-accent focus-visible:text-accent`}
      >
        <span>{label}</span>
        <span aria-hidden="true" className="w-2 text-accent">
          {indicator}
        </span>
      </button>
    </th>
  );
}
