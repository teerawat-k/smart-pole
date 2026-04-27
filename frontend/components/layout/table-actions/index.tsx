"use client";

import type { TableActionsProps } from "./types";
import { DEFAULT_MAX_VISIBLE } from "./types";
import {
  visibleItems,
  nonEmptyGroups,
  splitInlineOverflow,
  splitGroupsByMaxVisible,
  countAllItems,
} from "./helpers";
import { ActionButton } from "./action-button";
import { OverflowMenu } from "./overflow-menu";
import { InlineGroupRow } from "./inline-group";

/** Re-export types for backward-compat */
export type { TableActionItem, TableActionGroup, TableActionsProps } from "./types";

export function TableActions({ items, groups, maxVisible = DEFAULT_MAX_VISIBLE }: TableActionsProps) {
  if (items) {
    const filtered = visibleItems(items);
    const { inline, overflow } = splitInlineOverflow(filtered, maxVisible);

    return (
      <div className="inline-flex items-center gap-0.5">
        {inline.map((item, i) => (
          <ActionButton key={i} item={item} />
        ))}
        {overflow.length > 0 && <OverflowMenu items={overflow} />}
      </div>
    );
  }

  if (groups) {
    const filteredGroups = nonEmptyGroups(groups);

    if (countAllItems(filteredGroups) <= maxVisible) {
      return (
        <div className="inline-flex items-center gap-0.5">
          <InlineGroupRow groups={filteredGroups} />
        </div>
      );
    }

    const { inlineGroups, overflowGroups } = splitGroupsByMaxVisible(filteredGroups, maxVisible);

    return (
      <div className="inline-flex items-center gap-0.5">
        <InlineGroupRow groups={inlineGroups} />
        {overflowGroups.length > 0 && <OverflowMenu groups={overflowGroups} />}
      </div>
    );
  }

  return null;
}
