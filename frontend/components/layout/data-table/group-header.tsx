import type React from "react";
import { TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Column, SortState } from "./types";
import { countLeaves } from "./helpers";
import { LeafHeader } from "./leaf-header";

interface GroupHeaderProps<T> {
  columns:            Column<T>[];
  isGrouped:          boolean;
  stickyLeftOffsets:  number[];
  stickyRightOffsets: number[];
  sort:               SortState | undefined;
  onSort:             (columnKey: string) => void;
}

/** Render TableHeader ที่รองรับทั้ง single-level และ 2-level grouped header */
export function GroupHeader<T>({
  columns,
  isGrouped,
  stickyLeftOffsets,
  stickyRightOffsets,
  sort,
  onSort,
}: GroupHeaderProps<T>) {
  // Build Row 1: group header (colSpan) หรือ leaf (rowSpan=2 เมื่อ grouped)
  const row1Cells: React.ReactNode[] = [];
  let leafCursor = 0;
  columns.forEach((col, idx) => {
    if (col.children && col.children.length > 0) {
      const span = countLeaves(col);
      row1Cells.push(
        <TableHead
          key={col.key ?? `group-${idx}`}
          colSpan={span}
          className={cn(
            "bg-muted/50 text-foreground sticky top-0 z-30 text-center border-b border-r last:border-r-0",
            col.className,
          )}
        >
          {col.title}
        </TableHead>,
      );
      leafCursor += span;
    } else {
      row1Cells.push(
        <LeafHeader
          key={col.key ?? `leaf-${leafCursor}`}
          col={col}
          leafIdx={leafCursor}
          stickyLeftOffsets={stickyLeftOffsets}
          stickyRightOffsets={stickyRightOffsets}
          isGrouped={isGrouped}
          sort={sort}
          onSort={onSort}
          rowSpan={isGrouped ? 2 : undefined}
        />,
      );
      leafCursor += 1;
    }
  });

  // Build Row 2: leaves ของ group เท่านั้น (ถ้า table มี group)
  let row2Cells: React.ReactNode[] = [];
  if (isGrouped) {
    let leafCursor2 = 0;
    const cells: React.ReactNode[] = [];
    for (const col of columns) {
      if (col.children && col.children.length > 0) {
        for (const child of col.children) {
          cells.push(
            <LeafHeader
              key={child.key ?? `child-${leafCursor2}`}
              col={child}
              leafIdx={leafCursor2}
              stickyLeftOffsets={stickyLeftOffsets}
              stickyRightOffsets={stickyRightOffsets}
              isGrouped={isGrouped}
              sort={sort}
              onSort={onSort}
              isRow2
            />,
          );
          leafCursor2 += 1;
        }
      } else {
        leafCursor2 += 1; // leaf ใน row 1 (rowSpan=2) — ข้ามใน row 2
      }
    }
    row2Cells = cells;
  }

  return (
    <TableHeader>
      <TableRow className="hover:bg-transparent">{row1Cells}</TableRow>
      {isGrouped && (
        <TableRow className="hover:bg-transparent">{row2Cells}</TableRow>
      )}
    </TableHeader>
  );
}
