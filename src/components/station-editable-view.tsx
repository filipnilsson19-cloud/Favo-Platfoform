"use client";

import { useEffect, useRef, useState } from "react";
import type { Dispatch, PointerEvent as ReactPointerEvent, SetStateAction } from "react";

import {
  bringEditableItemToFront,
  groupEditableLayoutPages,
  updateEditableItem,
} from "@/lib/station-editable-utils";
import type {
  StationEditableLayout,
  StationEditableLayoutItem,
  StationPrintPayload,
} from "@/types/station";

import sharedStyles from "./station-pages.module.css";
import styles from "./station-editable-view.module.css";
import { StationRecipeCard } from "./station-recipe-card";

type StationEditableViewProps = {
  payload: StationPrintPayload | null;
  layout: StationEditableLayout | null;
  variant: "screen" | "print";
  emptyMessage?: string;
  interactive?: boolean;
  onLayoutChange?: Dispatch<SetStateAction<StationEditableLayout | null>>;
};

type Interaction =
  | {
      kind: "move";
      recipeId: string;
      pageIndex: number;
      startClientX: number;
      startClientY: number;
      pageWidth: number;
      pageHeight: number;
      startItem: StationEditableLayoutItem;
    }
  | {
      kind: "resize-width" | "resize-height" | "resize-both";
      recipeId: string;
      pageIndex: number;
      startClientX: number;
      startClientY: number;
      pageWidth: number;
      pageHeight: number;
      startItem: StationEditableLayoutItem;
    };

export function StationEditableView({
  payload,
  layout,
  variant,
  emptyMessage = "Inga recept finns i det här urvalet ännu.",
  interactive = false,
  onLayoutChange,
}: StationEditableViewProps) {
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [selectedRecipeId, setSelectedRecipeId] = useState("");
  const [interaction, setInteraction] = useState<Interaction | null>(null);

  const pages =
    payload && layout
      ? groupEditableLayoutPages(payload, layout)
      : [];

  useEffect(() => {
    if (!interaction || !onLayoutChange) {
      return;
    }

    const activeInteraction = interaction;
    const updateLayout = onLayoutChange;

    function handlePointerMove(event: PointerEvent) {
      const deltaXPercent =
        ((event.clientX - activeInteraction.startClientX) / activeInteraction.pageWidth) * 100;
      const deltaYPercent =
        ((event.clientY - activeInteraction.startClientY) / activeInteraction.pageHeight) * 100;

      updateLayout((currentLayout) => {
        if (!currentLayout) return currentLayout;

        if (activeInteraction.kind === "move") {
          return updateEditableItem(currentLayout, activeInteraction.recipeId, {
            x: activeInteraction.startItem.x + deltaXPercent,
            y: activeInteraction.startItem.y + deltaYPercent,
          });
        }

        if (activeInteraction.kind === "resize-width") {
          return updateEditableItem(currentLayout, activeInteraction.recipeId, {
            width: activeInteraction.startItem.width + deltaXPercent,
          });
        }

        if (activeInteraction.kind === "resize-height") {
          return updateEditableItem(currentLayout, activeInteraction.recipeId, {
            height: activeInteraction.startItem.height + deltaYPercent,
          });
        }

        return updateEditableItem(currentLayout, activeInteraction.recipeId, {
          width: activeInteraction.startItem.width + deltaXPercent,
          height: activeInteraction.startItem.height + deltaYPercent,
        });
      });
    }

    function handlePointerUp() {
      setInteraction(null);
    }

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [interaction, onLayoutChange]);

  if (!payload || !layout || pages.length === 0) {
    return (
      <div
        className={`${sharedStyles.pages} ${
          variant === "print" ? sharedStyles.pagesPrint : sharedStyles.pagesScreen
        }`}
      >
        <section className={`${sharedStyles.page} ${sharedStyles.emptyPage}`}>
          <div className={sharedStyles.emptyState}>{emptyMessage}</div>
        </section>
      </div>
    );
  }

  function startInteraction(
    event: ReactPointerEvent<HTMLDivElement | HTMLButtonElement>,
    kind: Interaction["kind"],
    item: StationEditableLayoutItem,
    pageIndex: number,
  ) {
    if (!interactive || !onLayoutChange) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const pageNode = pageRefs.current[pageIndex];
    if (!pageNode) return;

    const rect = pageNode.getBoundingClientRect();
    setSelectedRecipeId(item.recipeId);
    onLayoutChange((currentLayout) =>
      currentLayout
        ? bringEditableItemToFront(currentLayout, item.recipeId)
        : currentLayout,
    );
    setInteraction({
      kind,
      recipeId: item.recipeId,
      pageIndex,
      startClientX: event.clientX,
      startClientY: event.clientY,
      pageWidth: rect.width,
      pageHeight: rect.height,
      startItem: item,
    });
  }

  return (
    <div
      className={`${sharedStyles.pages} ${
        variant === "print" ? sharedStyles.pagesPrint : sharedStyles.pagesScreen
      }`}
    >
      {pages.map((page) => {
        const pageMeta =
          pages.length > 1
            ? `Sida ${page.pageIndex + 1}/${pages.length}`
            : `${payload.recipeCount} recept`;

        return (
          <section key={`${payload.title}-${page.pageIndex}`} className={sharedStyles.page}>
            <div className={sharedStyles.pageHeader}>
              <span className={sharedStyles.pageLabel}>{payload.title}</span>
              <span className={sharedStyles.pageMeta}>{pageMeta}</span>
            </div>

            <div
              ref={(node) => {
                pageRefs.current[page.pageIndex] = node;
              }}
              className={`${sharedStyles.pageCanvas} ${sharedStyles.pack} ${sharedStyles[
                ({
                  single: "packSingle",
                  duo: "packDuo",
                  spread: "packSpread",
                  dense: "packDense",
                  compact: "packCompact",
                } as const)[page.packKey]
              ]} ${styles.canvas}`}
              onPointerDown={() => {
                if (interactive) {
                  setSelectedRecipeId("");
                }
              }}
            >
              {page.items.map((item) => {
                const isSelected = interactive && selectedRecipeId === item.recipeId;
                const isDragging =
                  interaction?.recipeId === item.recipeId && interaction.kind === "move";

                return (
                  <div
                    key={item.recipeId}
                    className={[
                      styles.object,
                      isSelected ? styles.objectSelected : "",
                      isDragging ? styles.objectDragging : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    style={{
                      left: `${item.x}%`,
                      top: `${item.y}%`,
                      width: `${item.width}%`,
                      height: `${item.height}%`,
                      zIndex: item.zIndex,
                    }}
                    onPointerDown={(event) =>
                      startInteraction(event, "move", item, page.pageIndex)
                    }
                  >
                    <StationRecipeCard
                      recipe={item.recipe}
                      showCategoryLabel={payload.showCategoryLabel}
                      className={`${styles.objectCard} ${sharedStyles.cardCanvas}`}
                      articleProps={{
                        "data-station-editable-card": item.recipeId,
                      }}
                    />

                    {interactive ? (
                      <>
                        <button
                          className={`${styles.resizeHandle} ${styles.resizeHandleWidth}`}
                          type="button"
                          aria-label={`Ändra bredd på ${item.recipe.title}`}
                          onPointerDown={(event) =>
                            startInteraction(event, "resize-width", item, page.pageIndex)
                          }
                        />
                        <button
                          className={`${styles.resizeHandle} ${styles.resizeHandleHeight}`}
                          type="button"
                          aria-label={`Ändra höjd på ${item.recipe.title}`}
                          onPointerDown={(event) =>
                            startInteraction(event, "resize-height", item, page.pageIndex)
                          }
                        />
                        <button
                          className={`${styles.resizeHandle} ${styles.resizeHandleCorner}`}
                        type="button"
                        aria-label={`Ändra storlek på ${item.recipe.title}`}
                        onPointerDown={(event) =>
                          startInteraction(event, "resize-both", item, page.pageIndex)
                        }
                      />
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
