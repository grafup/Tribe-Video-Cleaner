"use client";

import { useEffect, useRef } from "react";
import { useEditorStore } from "@/store/editor";
import { seekVideoTo } from "./VideoPreview";
import type { SegmentType } from "@/types";

const DIVIDER = "divider" as const;

export function ContextMenu() {
  const {
    selection,
    project,
    closeContextMenu,
    setSegmentStatus,
    setMultipleSegmentStatus,
    setAllOfTypeStatus,
  } = useEditorStore();

  const ref = useRef<HTMLDivElement>(null);

  const { contextMenuSegmentId, contextMenuPosition } = selection;
  const segment = project?.transcript.find(
    (s) => s.id === contextMenuSegmentId
  );

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        closeContextMenu();
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") closeContextMenu();
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [closeContextMenu]);

  if (!segment || !contextMenuPosition) return null;

  const selectedIds = selection.selectedSegmentIds;
  const isMultiSelect = selectedIds.length > 1;
  const segType = segment.type as SegmentType;

  const typeLabel: Record<SegmentType, string> = {
    normal: "normal",
    filler: "filler words",
    silence: "silences",
    double_take: "double takes",
  };

  type Item =
    | { label: string; action: () => void; danger?: boolean }
    | typeof DIVIDER;

  const items: Item[] = [
    {
      label: isMultiSelect
        ? `Keep ${selectedIds.length} selected`
        : "Keep this",
      action: () => {
        setMultipleSegmentStatus(selectedIds, "keep");
        closeContextMenu();
      },
    },
    {
      label: isMultiSelect
        ? `Remove ${selectedIds.length} selected`
        : "Remove this",
      action: () => {
        setMultipleSegmentStatus(selectedIds, "remove");
        closeContextMenu();
      },
      danger: true,
    },
    DIVIDER,
    ...(segType !== "normal"
      ? [
          {
            label: `Keep all ${typeLabel[segType]}`,
            action: () => {
              setAllOfTypeStatus(segType, "keep");
              closeContextMenu();
            },
          },
          {
            label: `Remove all ${typeLabel[segType]}`,
            action: () => {
              setAllOfTypeStatus(segType, "remove");
              closeContextMenu();
            },
            danger: true,
          },
          DIVIDER,
        ]
      : []),
    {
      label: "Keep all filler words",
      action: () => {
        setAllOfTypeStatus("filler", "keep");
        closeContextMenu();
      },
    },
    {
      label: "Remove all filler words",
      action: () => {
        setAllOfTypeStatus("filler", "remove");
        closeContextMenu();
      },
      danger: true,
    },
    {
      label: "Keep all double takes",
      action: () => {
        setAllOfTypeStatus("double_take", "keep");
        closeContextMenu();
      },
    },
    {
      label: "Remove all double takes",
      action: () => {
        setAllOfTypeStatus("double_take", "remove");
        closeContextMenu();
      },
      danger: true,
    },
    {
      label: "Keep all silences",
      action: () => {
        setAllOfTypeStatus("silence", "keep");
        closeContextMenu();
      },
    },
    {
      label: "Remove all silences",
      action: () => {
        setAllOfTypeStatus("silence", "remove");
        closeContextMenu();
      },
      danger: true,
    },
    DIVIDER,
    {
      label: "Play from here",
      action: () => {
        seekVideoTo(segment.start);
        closeContextMenu();
      },
    },
    {
      label: "Reset to pending",
      action: () => {
        setSegmentStatus(segment.id, "pending");
        closeContextMenu();
      },
    },
  ];

  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        top: contextMenuPosition.y,
        left: contextMenuPosition.x,
        zIndex: 9999,
      }}
      className="min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-2xl animate-slide-in dark:border-gray-600 dark:bg-gray-900"
    >
      {items.map((item, idx) =>
        item === DIVIDER ? (
          <div key={idx} className="my-1 border-t border-gray-100 dark:border-gray-700" />
        ) : (
          <button
            key={idx}
            onClick={item.action}
            className={`w-full px-4 py-1.5 text-left text-sm transition-colors ${
              item.danger
                ? "text-red-500 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50"
                : "text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {item.label}
          </button>
        )
      )}
    </div>
  );
}
