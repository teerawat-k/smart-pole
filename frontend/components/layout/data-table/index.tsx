import { Loader2 } from "lucide-react";
import { Table } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { DataTableProps } from "./types";
import { computeStickyOffsets, flattenColumns, hasGroupedHeader, nextSortDirection } from "./helpers";
import { GroupHeader } from "./group-header";
import { TableBodyRows } from "./table-body";
import { PaginationFooter } from "./pagination-footer";

const DEFAULT_PAGE_SIZE_OPTIONS = [20, 50, 100];

/** Re-export public types — backward-compat */
export type { Column, ColumnFilter, SummaryCell, DataTableProps, SortState } from "./types";

export function DataTable<T>({
  columns,
  dataSource,
  loading,
  rowKey = "id" as keyof T,
  className,
  pagination,
  sort,
  onSort,
  emptyText = "ไม่มีข้อมูล",
  onRowDoubleClick,
  onRowClick,
  selectedRowKey,
  rowClassName,
  rowStyle,
  rowOverlay,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  summary,
}: DataTableProps<T>) {
  // Flatten สำหรับ tbody + sticky offset (group header ไม่ถือเป็น cell)
  const leafColumns = flattenColumns(columns);
  const isGrouped   = hasGroupedHeader(columns);
  const { left: stickyLeftOffsets, right: stickyRightOffsets } = computeStickyOffsets(leafColumns);

  function handleSort(columnKey: string): void {
    if (!onSort) return;
    onSort(columnKey, nextSortDirection(sort?.column, sort?.direction, columnKey));
  }

  return (
    <div className={cn("flex flex-col min-h-0", className)}>
      {/* Table scroll area */}
      <div className="relative isolate flex-1 min-h-0 overflow-auto rounded-md border">
        <Table>
          <GroupHeader
            columns={columns}
            isGrouped={isGrouped}
            stickyLeftOffsets={stickyLeftOffsets}
            stickyRightOffsets={stickyRightOffsets}
            sort={sort}
            onSort={handleSort}
          />
          <TableBodyRows
            leafColumns={leafColumns}
            dataSource={dataSource}
            loading={loading}
            emptyText={emptyText}
            rowKey={rowKey}
            stickyLeftOffsets={stickyLeftOffsets}
            stickyRightOffsets={stickyRightOffsets}
            selectedRowKey={selectedRowKey}
            onRowClick={onRowClick}
            onRowDoubleClick={onRowDoubleClick}
            rowClassName={rowClassName}
            rowStyle={rowStyle}
            rowOverlay={rowOverlay}
            summary={summary}
          />
        </Table>

        {/* Loading overlay */}
        {loading && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-background/60">
            <Loader2 className="text-primary animate-spin" size={36} />
          </div>
        )}
      </div>

      {/* Pagination footer */}
      {pagination && (
        <PaginationFooter pagination={pagination} pageSizeOptions={pageSizeOptions} />
      )}
    </div>
  );
}
