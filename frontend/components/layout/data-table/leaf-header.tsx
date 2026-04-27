import type React from "react";
import { TableHead } from "@/components/ui/table";
import { ArrowUp, ArrowDown, ArrowUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { ColumnFilterPopover } from "../column-filter-popover";
import type { Column, SortState } from "./types";
import { resolveDataKey } from "./helpers";

interface LeafHeaderProps<T> {
  col:                Column<T>;
  leafIdx:            number;
  stickyLeftOffsets:  number[];
  stickyRightOffsets: number[];
  isGrouped:          boolean;
  sort:               SortState | undefined;
  onSort:             (columnKey: string) => void;
  /** rowSpan=2 → leaf ของ row 1 ในโหมด grouped (กินสองแถว) */
  rowSpan?:           number;
  /** isRow2=true → leaf ใน row 2 (ลูกของ group) — sticky top ต้องต่อจาก row 1 */
  isRow2?:            boolean;
}

/** Render หนึ่ง leaf header cell (มี sort/filter icon)
 *  - rowSpan=2 → leaf ของ row 1 ในโหมด grouped (กินสองแถว)
 *  - isRow2=true → leaf ใน row 2 (ลูกของ group) — sticky top ต้องต่อจาก row 1
 *  - อื่นๆ → single-level table ทั่วไป — sticky top=0
 */
export function LeafHeader<T>({
  col,
  leafIdx,
  stickyLeftOffsets,
  stickyRightOffsets,
  isGrouped,
  sort,
  onSort,
  rowSpan,
  isRow2,
}: LeafHeaderProps<T>) {
  const colKey        = col.key ?? resolveDataKey(col.dataIndex) ?? leafIdx.toString();
  const isStickyLeft  = col.fixed === "left";
  const isStickyRight = col.fixed === "right";
  const isFit         = col.width === "fit";
  const style: React.CSSProperties = {
    width:    isFit ? 1 : col.width,
    minWidth: isFit ? undefined : col.width,
    left:     isStickyLeft  ? stickyLeftOffsets[leafIdx]  : undefined,
    right:    isStickyRight ? stickyRightOffsets[leafIdx] : undefined,
  };
  const sortKey      = col.sortKey ?? resolveDataKey(col.dataIndex) ?? col.key;
  const isSortActive = Boolean(col.sorter && sortKey && sort?.column === sortKey);

  return (
    <TableHead
      key={colKey}
      rowSpan={rowSpan}
      className={cn(
        "bg-muted/50 text-foreground",
        // vertical border เฉพาะ table ที่มี grouped header (ไม่กระทบ table ทั่วไป)
        isGrouped && "border-r last:border-r-0",
        col.className,
        "sticky z-30",
        isRow2 ? "top-[calc(var(--table-head-row1-h,2.5rem))]" : "top-0",
        (isStickyLeft || isStickyRight) && "z-40",
        isStickyRight && "border-l shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.08)]",
        isStickyLeft  && "shadow-[5px_0_10px_-5px_rgba(0,0,0,0.08)]",
        col.sorter && "cursor-pointer transition-colors hover:bg-muted",
        isSortActive && "bg-muted text-primary",
      )}
      style={style}
      onClick={() => {
        if (col.sorter && sortKey) onSort(sortKey);
      }}
    >
      <div className={cn(
        "flex items-center gap-2",
        (col.headerAlign ?? col.align) === "center" && "justify-center",
        (col.headerAlign ?? col.align) === "right"  && "justify-end",
      )}>
        {col.title}
        {col.sorter && (
          <span className={cn(
            "relative inline-flex items-center justify-center",
            isSortActive ? "text-primary" : "text-muted-foreground",
          )}>
            {isSortActive && (
              <span
                aria-hidden
                className="absolute inset-0 rounded-full bg-primary/40 opacity-60 animate-ping pointer-events-none"
              />
            )}
            {isSortActive ? (
              sort?.direction === "asc"
                ? <ArrowUp size={14} className="relative" strokeWidth={2.5} />
                : <ArrowDown size={14} className="relative" strokeWidth={2.5} />
            ) : (
              <ArrowUpDown size={14} />
            )}
          </span>
        )}
        {col.filter && (
          <ColumnFilterPopover
            title={typeof col.title === "string" ? col.title : col.filter.filterKey}
            options={col.filter.options}
            isLoading={col.filter.isLoading}
            value={col.filter.value}
            onApply={col.filter.onChange}
          />
        )}
      </div>
    </TableHead>
  );
}
