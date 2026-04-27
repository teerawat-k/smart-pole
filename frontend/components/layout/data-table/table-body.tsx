import type React from "react";
import { TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { Column, SummaryCell } from "./types";
import { resolveCellValue, resolveDataKey } from "./helpers";

interface TableBodyRowsProps<T> {
  leafColumns:        Column<T>[];
  dataSource:         T[];
  loading:            boolean | undefined;
  emptyText:          React.ReactNode;
  rowKey:             keyof T | ((record: T) => string | number);
  stickyLeftOffsets:  number[];
  stickyRightOffsets: number[];
  selectedRowKey?:    string | number | null;
  onRowClick?:        (record: T) => void;
  onRowDoubleClick?:  (record: T) => void;
  rowClassName?:      (record: T) => string | undefined;
  rowStyle?:          (record: T) => React.CSSProperties | undefined;
  rowOverlay?:        (record: T) => React.ReactNode;
  summary?:           SummaryCell[];
}

/** Render tbody — empty state, body rows, summary row */
export function TableBodyRows<T>({
  leafColumns,
  dataSource,
  loading,
  emptyText,
  rowKey,
  stickyLeftOffsets,
  stickyRightOffsets,
  selectedRowKey,
  onRowClick,
  onRowDoubleClick,
  rowClassName,
  rowStyle,
  rowOverlay,
  summary,
}: TableBodyRowsProps<T>) {
  const isEmpty = (dataSource ?? []).length === 0 && !loading;

  return (
    <TableBody>
      {isEmpty ? (
        <TableRow>
          <TableCell colSpan={leafColumns.length} className="h-24 text-center text-muted-foreground">
            {emptyText}
          </TableCell>
        </TableRow>
      ) : (
        dataSource.map((record, index) => {
          const key =
            typeof rowKey === "function"
              ? rowKey(record)
              : (record[rowKey] as React.Key);
          const overlay = rowOverlay?.(record);
          return (
            <TableRow
              key={key}
              className={cn(
                (onRowDoubleClick || onRowClick) && "cursor-pointer",
                selectedRowKey !== undefined && selectedRowKey === key && "bg-primary/10",
                index === dataSource.length - 1 && "border-b",
                rowClassName?.(record),
              )}
              style={rowStyle?.(record)}
              onClick={() => onRowClick?.(record)}
              onDoubleClick={() => onRowDoubleClick?.(record)}
            >
              {leafColumns.map((col, colIndex) => {
                const value         = resolveCellValue(record, col.dataIndex);
                const colKey        = col.key ?? resolveDataKey(col.dataIndex) ?? colIndex.toString();
                const isStickyLeft  = col.fixed === "left";
                const isStickyRight = col.fixed === "right";
                const isFit         = col.width === "fit";
                const style: React.CSSProperties = {
                  width:    isFit ? 1 : col.width,
                  minWidth: isFit ? undefined : col.width,
                  left:     isStickyLeft  ? stickyLeftOffsets[colIndex]  : undefined,
                  right:    isStickyRight ? stickyRightOffsets[colIndex] : undefined,
                };

                return (
                  <TableCell
                    key={colKey}
                    className={cn(
                      col.className,
                      col.align && `text-${col.align}`,
                      (isStickyLeft || isStickyRight) && "sticky z-10 bg-background",
                      isStickyRight && "border-l shadow-[-5px_0_10px_-5px_rgba(0,0,0,0.08)]",
                      isStickyLeft  && "shadow-[5px_0_10px_-5px_rgba(0,0,0,0.08)]",
                      overlay && "relative",
                      isFit && "whitespace-nowrap",
                    )}
                    style={style}
                  >
                    {col.render
                      ? col.render(record, value, index)
                      : ((col.dataType === "number"
                          ? (value as number | undefined)?.toLocaleString()
                          : value) as React.ReactNode)}
                    {overlay && (
                      <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden flex items-center">
                        {overlay}
                      </div>
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          );
        })
      )}
      {summary && summary.length > 0 && (
        <TableRow className="sticky bottom-0 z-20 bg-muted/70 hover:bg-muted/70 border-t font-semibold">
          {summary.map((cell, i) => (
            <TableCell
              key={`summary-${i}`}
              colSpan={cell.colSpan ?? 1}
              className={cn(
                cell.align && `text-${cell.align}`,
                cell.className,
              )}
            >
              {cell.content}
            </TableCell>
          ))}
        </TableRow>
      )}
    </TableBody>
  );
}
