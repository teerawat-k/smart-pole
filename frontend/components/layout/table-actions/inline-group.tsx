"use client";

import type { TableActionGroup } from "./types";
import { ActionButton } from "./action-button";

interface InlineGroupRowProps {
  groups: TableActionGroup[];
}

/** Render หลาย group inline พร้อม divider ระหว่าง group */
export function InlineGroupRow({ groups }: InlineGroupRowProps) {
  return (
    <>
      {groups.map((group, gi) => (
        <span key={gi} className="inline-flex items-center gap-0.5">
          {gi > 0 && <span className="w-px h-4 bg-border mx-0.5 shrink-0" />}
          {group.items.map((item, i) => (
            <ActionButton key={i} item={item} />
          ))}
        </span>
      ))}
    </>
  );
}
