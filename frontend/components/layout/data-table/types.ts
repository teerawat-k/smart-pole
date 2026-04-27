import type React from "react";
import type { ColumnFilterOption } from "../column-filter-popover";

/** Config ของ Excel-like filter per column
 *  - `options` มาจาก lookup (คอลัมน์เจ้าของจะ fetch เอง)
 *  - `value` = IDs ที่ยังแสดง (undefined = แสดงทั้งหมด)
 *  - `onChange` แจ้ง parent เก็บ state + ส่งไป backend
 *  - `sortKey` ถ้าแตกต่างจาก filter key (override sortKey ของ column ปกติ)
 */
export interface ColumnFilter {
  filterKey: string;
  options:   ColumnFilterOption[];
  isLoading?: boolean;
  value:     number[] | undefined;
  onChange:  (values: number[] | undefined) => void;
}

export interface Column<T> {
  title: React.ReactNode;
  dataIndex?: keyof T | string | string[];
  key?: string;
  render?: (record: T, value: unknown, index: number) => React.ReactNode;
  /** ความกว้างคอลัมน์ — ใส่ตัวเลข/string ปกติ หรือ "fit" เพื่อให้ shrink ตาม content */
  width?: string | number | "fit";
  className?: string;
  dataType?: "text" | "number";
  fixed?: "left" | "right";
  align?: "left" | "center" | "right";
  /** header alignment — ถ้าไม่ใส่ ใช้ align (cell + header ร่วมกัน) */
  headerAlign?: "left" | "center" | "right";
  sorter?: boolean;
  /** sort key ที่ส่งไป backend (default = resolveDataKey ของ dataIndex/key) */
  sortKey?: string;
  /** Excel-like filter config — ไม่ใส่ = ไม่มี filter button */
  filter?: ColumnFilter;
  /** ลูกภายใต้กลุ่มคอลัมน์ — ถ้ากำหนด: row 1 แสดง title เป็น group header (colSpan = ผลรวม leaf),
   *  row 2 แสดง children ทีละตัว; ตัวเองจะไม่ถูก render เป็น cell */
  children?: Column<T>[];
}

export interface SummaryCell {
  /** จำนวน column ที่เซลล์นี้คลุม (default 1) */
  colSpan?: number;
  content: React.ReactNode;
  align?: "left" | "center" | "right";
  className?: string;
}

export interface SortState {
  column:    string;
  direction: "asc" | "desc";
}

export interface PaginationState {
  current:  number;
  limit:    number;
  total:    number;
  onChange: (page: number, limit: number) => void;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  dataSource: T[];
  loading?: boolean;
  rowKey?: keyof T | ((record: T) => string | number);
  className?: string;
  pagination?: PaginationState;
  sort?: SortState;
  onSort?: (column: string, direction: "asc" | "desc" | null) => void;
  emptyText?: React.ReactNode;
  onRowDoubleClick?: (record: T) => void;
  onRowClick?: (record: T) => void;
  selectedRowKey?: string | number | null;
  rowClassName?: (record: T) => string | undefined;
  rowStyle?: (record: T) => React.CSSProperties | undefined;
  rowOverlay?: (record: T) => React.ReactNode;
  pageSizeOptions?: number[];
  /** Summary row — render ใต้ tbody (sticky bottom) เพื่อแสดง total/aggregate */
  summary?: SummaryCell[];
}
