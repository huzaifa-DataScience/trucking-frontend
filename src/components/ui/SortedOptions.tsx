"use client";

import { Children, isValidElement, type ReactElement, type ReactNode } from "react";
import { compareText } from "@/lib/sort";

type OptionProps = { value?: unknown; children?: ReactNode; "data-pin"?: boolean };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === "boolean") return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textOf).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return textOf(node.props.children);
  return "";
}

/**
 * Renders <option> children in A–Z order by their visible text.
 * Placeholders stay first in their written order: options with value "" ("All", "—", "Select…")
 * or marked `data-pin` (e.g. an "All" option whose value is "all").
 */
export function SortedOptions({ children }: { children: ReactNode }) {
  const pinned: ReactNode[] = [];
  const rest: ReactElement<OptionProps>[] = [];
  for (const child of Children.toArray(children)) {
    if (isValidElement<OptionProps>(child) && child.props.value !== "" && !child.props["data-pin"]) rest.push(child);
    else pinned.push(child);
  }
  rest.sort((a, b) => compareText(textOf(a.props.children), textOf(b.props.children)));
  return (
    <>
      {pinned}
      {rest}
    </>
  );
}
