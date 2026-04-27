import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { PaginationState } from "./types";
import { buildPageRange } from "./helpers";

interface PaginationFooterProps {
  pagination:      PaginationState;
  pageSizeOptions: number[];
}

/** Pagination footer — page buttons + ellipsis + page size selector */
export function PaginationFooter({ pagination, pageSizeOptions }: PaginationFooterProps) {
  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="flex items-center justify-between shrink-0 pt-3">
      <p className="text-sm text-muted-foreground">
        หน้า {pagination.current} จาก {totalPages} · {pagination.total} รายการ
      </p>
      <div className="flex items-center gap-2">
        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onChange(pagination.current - 1, pagination.limit)}
              disabled={pagination.current <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            {buildPageRange(pagination.current, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground text-sm select-none">…</span>
              ) : (
                <Button
                  key={p}
                  variant={p === pagination.current ? "default" : "outline"}
                  size="icon"
                  className={cn("h-8 w-8", p === pagination.current && "pointer-events-none")}
                  onClick={() => pagination.onChange(p, pagination.limit)}
                >
                  {p}
                </Button>
              )
            )}
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              onClick={() => pagination.onChange(pagination.current + 1, pagination.limit)}
              disabled={pagination.current >= totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
        <Select
          value={pagination.limit.toString()}
          onValueChange={(value) => pagination.onChange(1, Number(value))}
        >
          <SelectTrigger className="w-32" size="sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={`${size}`}>
                {size} รายการ
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
