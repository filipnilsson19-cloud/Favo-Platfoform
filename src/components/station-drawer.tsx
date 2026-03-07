"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createEditableLayoutFromMeasuredPages,
  mergeEditableLayouts,
} from "@/lib/station-editable-utils";
import type { RecipeCategory } from "@/types/recipe";
import type {
  StationEditableLayout,
  StationPrintPayload,
  StationViewMode,
} from "@/types/station";
import type { AppStationView } from "@/types/station-view";

import { StationAutoView } from "./station-auto-view";
import { StationEditableView } from "./station-editable-view";
import styles from "./station-drawer.module.css";

type StationDrawerProps = {
  activeCategories: RecipeCategory[];
  canManage: boolean;
  categoriesLocked: boolean;
  categoryOptions: RecipeCategory[];
  isOpen: boolean;
  onClose: () => void;
  onPrint: (
    payload: StationPrintPayload | null,
    editableLayout?: StationEditableLayout | null,
  ) => void;
  onSelectCategory: (category: RecipeCategory) => void;
  payload: StationPrintPayload | null;
  scopeKey: string;
  scopeLabel: string;
};

export function StationDrawer({
  activeCategories,
  canManage,
  categoriesLocked,
  categoryOptions,
  isOpen,
  onClose,
  onPrint,
  onSelectCategory,
  payload,
  scopeKey,
  scopeLabel,
}: StationDrawerProps) {
  const previewWrapRef = useRef<HTMLDivElement | null>(null);
  const [editorSession, setEditorSession] = useState<{
    signature: string;
    viewMode: StationViewMode;
    baselineLayout: StationEditableLayout | null;
    editableLayout: StationEditableLayout | null;
  }>({
    signature: "",
    viewMode: "static",
    baselineLayout: null,
    editableLayout: null,
  });
  const [savedViews, setSavedViews] = useState<AppStationView[]>([]);
  const [isLoadingViews, setIsLoadingViews] = useState(false);
  const [isSavingView, setIsSavingView] = useState(false);
  const [activeViewId, setActiveViewId] = useState("");
  const [viewNameDraft, setViewNameDraft] = useState("");

  const payloadSignature = useMemo(() => {
    if (!payload) return "";

    return [
      payload.title,
      payload.source,
      payload.sourceLabel,
      ...payload.recipes.map((recipe) => recipe.id),
    ].join("|");
  }, [payload]);

  const sessionMatchesPayload = editorSession.signature === payloadSignature;
  const viewMode = sessionMatchesPayload ? editorSession.viewMode : "static";
  const baselineLayout = sessionMatchesPayload ? editorSession.baselineLayout : null;
  const editableLayout = sessionMatchesPayload ? editorSession.editableLayout : null;
  const activeSavedView =
    savedViews.find((view) => view.id === activeViewId) ?? null;
  const canUpdateSavedView =
    Boolean(activeSavedView) &&
    viewNameDraft.trim().length > 0 &&
    viewNameDraft.trim() === activeSavedView?.name;

  function captureStaticLayout() {
    if (!payload || !previewWrapRef.current) {
      return null;
    }

    const pageNodes = Array.from(
      previewWrapRef.current.querySelectorAll<HTMLElement>("[data-station-auto-page]"),
    );

    const measuredPages = pageNodes
      .map((pageNode) => {
        const pageIndex = Number(pageNode.dataset.pageIndex ?? "-1");
        const pageRect = pageNode.getBoundingClientRect();

        if (pageIndex < 0 || pageRect.width === 0 || pageRect.height === 0) {
          return null;
        }

        const cards = Array.from(
          pageNode.querySelectorAll<HTMLElement>("[data-station-auto-card]"),
        ).map((cardNode) => {
          const cardRect = cardNode.getBoundingClientRect();
          return {
            recipeId: cardNode.dataset.stationAutoCard ?? "",
            x: ((cardRect.left - pageRect.left) / pageRect.width) * 100,
            y: ((cardRect.top - pageRect.top) / pageRect.height) * 100,
            width: (cardRect.width / pageRect.width) * 100,
            height: (cardRect.height / pageRect.height) * 100,
          };
        });

        return {
          pageIndex,
          packKey:
            (pageNode.dataset.packKey as
              | "single"
              | "duo"
              | "spread"
              | "dense"
              | "compact"
              | undefined) ?? "dense",
          cards: cards.filter((card) => card.recipeId.length > 0),
        };
      })
      .filter(
        (
          page,
        ): page is {
          pageIndex: number;
          packKey: "single" | "duo" | "spread" | "dense" | "compact";
          cards: Array<{
            recipeId: string;
            x: number;
            y: number;
            width: number;
            height: number;
          }>;
        } => Boolean(page),
      );

    if (measuredPages.length === 0) {
      return null;
    }

    return createEditableLayoutFromMeasuredPages({
      payload,
      pages: measuredPages,
    });
  }

  useEffect(() => {
    if (!isOpen || !payload || !scopeKey) {
      return;
    }

    let isCancelled = false;

    async function loadViews() {
      try {
        setIsLoadingViews(true);
        const params = new URLSearchParams({
          scopeKey,
          payload: JSON.stringify(payload),
        });
        const response = await fetch(`/api/station-views?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to load station views");
        }

        const result = (await response.json()) as { views: AppStationView[] };

        if (isCancelled) return;
        setSavedViews(result.views);
      } catch (error) {
        console.error("Could not load station views", error);
      } finally {
        if (!isCancelled) {
          setIsLoadingViews(false);
        }
      }
    }

    void loadViews();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, payload, payloadSignature, scopeKey]);

  useEffect(() => {
    setActiveViewId("");
    setViewNameDraft("");
  }, [payloadSignature, scopeKey]);

  function ensureBaselineLayout() {
    if (baselineLayout) {
      return baselineLayout;
    }

    return captureStaticLayout();
  }

  function switchViewMode(mode: StationViewMode) {
    if (mode === "editable") {
      if (editableLayout) {
        setEditorSession((current) => ({
          ...current,
          signature: payloadSignature,
          viewMode: "editable",
        }));
        return;
      }

      const measuredLayout = captureStaticLayout();
      if (measuredLayout) {
        setEditorSession({
          signature: payloadSignature,
          viewMode: "editable",
          baselineLayout: measuredLayout,
          editableLayout: measuredLayout,
        });
      }

      return;
    }

    setEditorSession((current) => ({
      ...current,
      signature: payloadSignature,
      viewMode: "static",
    }));
  }

  function resetEditableView() {
    if (!baselineLayout) return;
    setEditorSession((current) => ({
      ...current,
      signature: payloadSignature,
      editableLayout: baselineLayout,
    }));
    setActiveViewId("");
    setViewNameDraft("");
  }

  function applySavedView(view: AppStationView) {
    if (!payload || !view.layout) {
      return;
    }

    const nextBaseline = ensureBaselineLayout();
    if (!nextBaseline) {
      return;
    }

    setEditorSession({
      signature: payloadSignature,
      viewMode: "editable",
      baselineLayout: nextBaseline,
      editableLayout: mergeEditableLayouts(nextBaseline, view.layout),
    });
    setActiveViewId(view.id);
    setViewNameDraft(view.name);
  }

  async function saveCurrentView() {
    const normalizedName = viewNameDraft.trim();
    const layoutToSave = editableLayout ?? ensureBaselineLayout();

    if (!payload || !layoutToSave || !normalizedName || isSavingView) {
      return;
    }

    try {
      setIsSavingView(true);

      const response = await fetch("/api/station-views", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: canUpdateSavedView ? activeSavedView?.id : undefined,
          name: normalizedName,
          scopeKey,
          scopeLabel,
          recipeCount: payload.recipeCount,
          payload,
          layout: layoutToSave,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save station view");
      }

      const result = (await response.json()) as { view: AppStationView };
      setSavedViews((current) =>
        [...current.filter((view) => view.id !== result.view.id), result.view].sort(
          (left, right) => left.name.localeCompare(right.name, "sv"),
        ),
      );
      setActiveViewId(result.view.id);
      setViewNameDraft(result.view.name);
    } catch (error) {
      console.error("Could not save station view", error);
      window.alert("Det gick inte att spara vyn. Försök igen.");
    } finally {
      setIsSavingView(false);
    }
  }

  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
      aria-label="Stationsvy"
    >
      <button
        className={styles.backdrop}
        type="button"
        aria-label="Stäng stationsvy"
        onClick={onClose}
      />

      <article
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-sheet-title"
      >
        <header className={styles.toolbar}>
          <div className={styles.meta}>
            <h2 id="station-sheet-title">{payload?.title || "Stationsblad"}</h2>
            <p>
              {payload
                ? `${payload.sourceLabel} • ${payload.recipeCount} recept`
                : "Inget urval"}
            </p>

            <div
              className={`${styles.sourceToggle} ${
                categoriesLocked ? styles.sourceToggleLocked : ""
              }`}
              role="group"
              aria-label="Välj kategori för stationsvy"
              aria-disabled={categoriesLocked}
            >
              {categoryOptions.map((category) => {
                const isActive = activeCategories.includes(category);

                return (
                  <button
                    key={category}
                    className={`${styles.sourceButton} ${
                      isActive ? styles.sourceButtonActive : ""
                    }`}
                    type="button"
                    disabled={categoriesLocked}
                    aria-pressed={isActive}
                    onClick={() => onSelectCategory(category)}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.toolbarRight}>
            <div className={styles.actions}>
              {canManage ? (
                <div className={styles.headerSavedViewSave}>
                  <input
                    className={styles.savedViewInput}
                    type="text"
                    value={viewNameDraft}
                    placeholder="Spara nuvarande vy"
                    onChange={(event) => setViewNameDraft(event.target.value)}
                  />
                  <button
                    className={styles.button}
                    type="button"
                    disabled={
                      !payload ||
                      viewNameDraft.trim().length === 0 ||
                      isSavingView
                    }
                    onClick={() => void saveCurrentView()}
                  >
                    {isSavingView
                      ? "Sparar..."
                      : canUpdateSavedView
                        ? "Uppdatera vy"
                        : "Spara vy"}
                  </button>
                </div>
              ) : null}

              <div className={styles.modeToggle} role="group" aria-label="Välj stationsläge">
                <button
                  className={`${styles.modeButton} ${
                    viewMode === "static" ? styles.modeButtonActive : ""
                  }`}
                  type="button"
                  onClick={() => switchViewMode("static")}
                >
                  Statisk vy
                </button>
                <button
                  className={`${styles.modeButton} ${
                    viewMode === "editable" ? styles.modeButtonActive : ""
                  }`}
                  type="button"
                  disabled={!payload}
                  onClick={() => switchViewMode("editable")}
                >
                  Redigerbar vy
                </button>
              </div>

              {viewMode === "editable" ? (
                <button
                  className={styles.buttonGhost}
                  type="button"
                  onClick={resetEditableView}
                >
                  Återställ vy
                </button>
              ) : null}

              <button
                className={styles.button}
                type="button"
                onClick={() =>
                  onPrint(payload, viewMode === "editable" ? editableLayout : null)
                }
              >
                Skriv ut A4
              </button>
              <button className={styles.buttonGhost} type="button" onClick={onClose}>
                Stäng
              </button>
            </div>

            {payload ? (
              <div className={styles.savedViewsHeader}>
                <span className={styles.savedViewsLabel}>Sparade vyer</span>
                <div className={styles.savedViewsList}>
                  {isLoadingViews ? (
                    <span className={styles.savedViewsHint}>Laddar...</span>
                  ) : savedViews.length > 0 ? (
                    savedViews.map((view) => (
                      <button
                        key={view.id}
                        className={`${styles.savedViewChip} ${
                          activeViewId === view.id ? styles.savedViewChipActive : ""
                        }`}
                        type="button"
                        onClick={() => applySavedView(view)}
                      >
                        {view.name}
                      </button>
                    ))
                  ) : (
                    <span className={styles.savedViewsHint}>Inga sparade vyer ännu</span>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </header>

        <div ref={previewWrapRef} className={styles.previewWrap}>
          {viewMode === "editable" ? (
            <StationEditableView
              payload={payload}
              layout={editableLayout}
              variant="screen"
              interactive
              emptyMessage="Inga recept finns i det här urvalet ännu."
              onLayoutChange={(value) => {
                setEditorSession((current) => ({
                  ...current,
                  signature: payloadSignature,
                  editableLayout:
                    typeof value === "function"
                      ? value(
                          current.signature === payloadSignature
                            ? current.editableLayout
                            : null,
                        )
                      : value,
                }));
              }}
            />
          ) : (
            <StationAutoView
              payload={payload}
              variant="screen"
              emptyMessage="Inga recept finns i det här urvalet ännu."
            />
          )}
        </div>
      </article>
    </section>
  );
}
