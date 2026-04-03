"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  createEditableLayoutFromMeasuredPages,
} from "@/lib/station-editable-utils";
import { mapRecipesToStationPrintableRecipes } from "@/lib/station-utils";
import type { Recipe, RecipeCategory } from "@/types/recipe";
import type {
  StationEditableLayout,
  StationPrintPayload,
  StationPrintableRecipe,
  StationViewMode,
} from "@/types/station";
import type { AppStationView } from "@/types/station-view";

import { StationAutoView } from "./station-auto-view";
import { StationEditableView } from "./station-editable-view";
import styles from "./station-drawer.module.css";

type StationDrawerProps = {
  activeCategories: RecipeCategory[];
  allRecipes: Recipe[];
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

function buildSelectedStationPayload(
  payload: StationPrintPayload | null,
  recipeIds: string[],
  titleOverride?: string | null,
): StationPrintPayload | null {
  if (!payload) {
    return null;
  }

  const recipeMap = new Map(payload.recipes.map((recipe) => [recipe.id, recipe]));
  const recipes = recipeIds
    .map((recipeId) => recipeMap.get(recipeId))
    .filter((recipe): recipe is StationPrintableRecipe => Boolean(recipe));

  return {
    ...payload,
    title: titleOverride?.trim() || payload.title,
    sourceLabel:
      recipes.length === 0
        ? "Tom lägglista"
        : `${recipes.length} ${recipes.length === 1 ? "rätt" : "rätter"} i lägglistan`,
    showCategoryLabel: new Set(recipes.map((recipe) => recipe.category)).size > 1,
    recipeCount: recipes.length,
    recipes,
  };
}

function matchesRecipeSearch(recipe: StationPrintableRecipe, query: string) {
  if (!query) return true;

  const haystack = [
    recipe.title,
    recipe.category,
    recipe.totalAmount,
    ...recipe.items.map((item) => `${item.info} ${item.name} ${item.amount} ${item.unit}`),
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(query);
}

export function StationDrawer({
  activeCategories,
  allRecipes,
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
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [isRecipePickerOpen, setIsRecipePickerOpen] = useState(false);
  const [recipeSearch, setRecipeSearch] = useState("");

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
  const allCandidateRecipes = useMemo(
    () =>
      mapRecipesToStationPrintableRecipes(
        [...allRecipes].sort((left, right) =>
          left.title.localeCompare(right.title, "sv"),
        ),
      ),
    [allRecipes],
  );
  const candidateRecipes = useMemo(
    () => (allCandidateRecipes.length > 0 ? allCandidateRecipes : payload?.recipes ?? []),
    [allCandidateRecipes, payload],
  );
  const quickFillRecipes = useMemo(
    () => payload?.recipes ?? [],
    [payload],
  );
  const builderPayload = useMemo<StationPrintPayload | null>(() => {
    if (!payload && candidateRecipes.length === 0) {
      return null;
    }

    return {
      title: "Lägglista",
      source: payload?.source ?? "visible",
      sourceLabel:
        candidateRecipes.length === 0
          ? "Tom lägglista"
          : `${candidateRecipes.length} tillgängliga rätter`,
      showCategoryLabel:
        new Set(candidateRecipes.map((recipe) => recipe.category)).size > 1,
      recipeCount: candidateRecipes.length,
      recipes: candidateRecipes,
    };
  }, [candidateRecipes, payload]);
  const candidateRecipeIdSet = useMemo(
    () => new Set(candidateRecipes.map((recipe) => recipe.id)),
    [candidateRecipes],
  );
  const selectedRecipeIdsInScope = useMemo(
    () => selectedRecipeIds.filter((recipeId) => candidateRecipeIdSet.has(recipeId)),
    [candidateRecipeIdSet, selectedRecipeIds],
  );
  const currentPayload = useMemo(
    () =>
      buildSelectedStationPayload(
        builderPayload,
        selectedRecipeIdsInScope,
        activeSavedView?.name || "Lägglista",
      ),
    [activeSavedView?.name, builderPayload, selectedRecipeIdsInScope],
  );
  const normalizedRecipeSearch = recipeSearch.trim().toLowerCase();
  const filteredCandidateRecipes = useMemo(
    () =>
      candidateRecipes.filter((recipe) =>
        matchesRecipeSearch(recipe, normalizedRecipeSearch),
      ),
    [candidateRecipes, normalizedRecipeSearch],
  );

  function resetEditorForCurrentSelection() {
    setEditorSession({
      signature: payloadSignature,
      viewMode: "static",
      baselineLayout: null,
      editableLayout: null,
    });
  }

  function replaceSelectedRecipes(nextRecipeIds: string[]) {
    const normalizedIds = [...new Set(nextRecipeIds)].filter((recipeId) =>
      candidateRecipeIdSet.has(recipeId),
    );

    setSelectedRecipeIds(normalizedIds);
    resetEditorForCurrentSelection();
  }

  function toggleRecipeSelection(recipeId: string) {
    replaceSelectedRecipes(
      selectedRecipeIds.includes(recipeId)
        ? selectedRecipeIds.filter((currentId) => currentId !== recipeId)
        : [...selectedRecipeIds, recipeId],
    );
  }

  function addCurrentScopeToSelection() {
    replaceSelectedRecipes([
      ...selectedRecipeIds,
      ...quickFillRecipes.map((recipe) => recipe.id),
    ]);
  }

  function clearSelection(options?: { keepPickerOpen?: boolean }) {
    setActiveViewId("");
    setViewNameDraft("");
    setSelectedRecipeIds([]);
    setIsRecipePickerOpen(options?.keepPickerOpen ? true : false);
    setRecipeSearch("");
    resetEditorForCurrentSelection();
  }

  function captureStaticLayout() {
    if (!currentPayload || currentPayload.recipes.length === 0 || !previewWrapRef.current) {
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
      payload: currentPayload,
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
        const payloadForViews = builderPayload ?? payload;

        if (!payloadForViews) {
          setSavedViews([]);
          return;
        }

        const response = await fetch("/api/station-views", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "load",
            scopeKey,
            payload: payloadForViews,
          }),
        });

        if (!response.ok) {
          if (!isCancelled) {
            setSavedViews([]);
          }
          return;
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
  }, [builderPayload, isOpen, payload, payloadSignature, scopeKey]);

  useEffect(() => {
    setActiveViewId("");
    setViewNameDraft("");
    setSelectedRecipeIds([]);
    setRecipeSearch("");
    setIsRecipePickerOpen(false);
    setEditorSession({
      signature: payloadSignature,
      viewMode: "static",
      baselineLayout: null,
      editableLayout: null,
    });
  }, [payloadSignature, scopeKey]);

  function ensureBaselineLayout() {
    if (baselineLayout) {
      return baselineLayout;
    }

    return captureStaticLayout();
  }

  function switchViewMode(mode: StationViewMode) {
    if (mode === "editable") {
      if (!currentPayload || currentPayload.recipes.length === 0) {
        return;
      }

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
  }

  function applySavedView(view: AppStationView) {
    if (!payload) {
      return;
    }

    const nextRecipeIds = (view.recipeIds?.length
      ? view.recipeIds
      : candidateRecipes.map((recipe) => recipe.id)
    ).filter((recipeId) => candidateRecipeIdSet.has(recipeId));

    setSelectedRecipeIds(nextRecipeIds);
    setEditorSession({
      signature: payloadSignature,
      viewMode: view.layout ? "editable" : "static",
      baselineLayout: view.layout ?? null,
      editableLayout: view.layout ?? null,
    });
    setActiveViewId(view.id);
    setViewNameDraft(view.name);
    setIsRecipePickerOpen(false);
    setRecipeSearch("");
  }

  async function saveCurrentView() {
    const normalizedName = viewNameDraft.trim();
    const layoutToSave = editableLayout ?? ensureBaselineLayout();

    if (
      !currentPayload ||
      currentPayload.recipes.length === 0 ||
      !layoutToSave ||
      !normalizedName ||
      isSavingView
    ) {
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
          recipeCount: currentPayload.recipeCount,
          recipeIds: selectedRecipeIdsInScope,
          payload: currentPayload,
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
      console.error("Could not save station views", error);
      window.alert("Det gick inte att spara vyn. Försök igen.");
    } finally {
      setIsSavingView(false);
    }
  }

  const toolbarTitle = activeSavedView?.name || payload?.title || "Stationsblad";
  const selectedCount = selectedRecipeIdsInScope.length;
  const toolbarSummary = currentPayload
    ? currentPayload.recipeCount > 0
      ? currentPayload.sourceLabel
      : "Tom lägglista. Lägg till rätter för att börja."
    : "Inget urval";
  const canQuickFill = quickFillRecipes.length > 0;
  const canExport = Boolean(currentPayload && currentPayload.recipes.length > 0);

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
            <h2 id="station-sheet-title">{toolbarTitle}</h2>
            <p>{toolbarSummary}</p>

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
              <button
                className={styles.buttonGhost}
                type="button"
                disabled={candidateRecipes.length === 0}
                onClick={() => {
                  setRecipeSearch("");
                  setIsRecipePickerOpen(true);
                }}
              >
                Lägg till rätt
              </button>

              <button
                className={styles.buttonGhost}
                type="button"
                disabled={!canQuickFill}
                onClick={addCurrentScopeToSelection}
              >
                Lägg till aktuellt urval
              </button>

              <button
                className={styles.buttonGhost}
                type="button"
                disabled={selectedRecipeIds.length === 0}
                onClick={() => clearSelection()}
              >
                Rensa
              </button>

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
                      !canExport ||
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
                  Byggläge
                </button>
                <button
                  className={`${styles.modeButton} ${
                    viewMode === "editable" ? styles.modeButtonActive : ""
                  }`}
                  type="button"
                  disabled={!canExport}
                  onClick={() => switchViewMode("editable")}
                >
                  Redigera layout
                </button>
              </div>

              {viewMode === "editable" ? (
                <button
                  className={styles.buttonGhost}
                  type="button"
                  onClick={resetEditableView}
                >
                  Återställ layout
                </button>
              ) : null}

              <button
                className={styles.button}
                type="button"
                disabled={!canExport}
                onClick={() =>
                  onPrint(currentPayload, viewMode === "editable" ? editableLayout : null)
                }
              >
                Öppna exportvy
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
          {canExport ? (
            viewMode === "editable" ? (
              <StationEditableView
                payload={currentPayload}
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
                payload={currentPayload}
                variant="screen"
                emptyMessage="Inga recept finns i det här urvalet ännu."
              />
            )
          ) : (
            <button
              className={styles.emptyBuilder}
              type="button"
              disabled={candidateRecipes.length === 0}
              onClick={() => {
                setRecipeSearch("");
                setIsRecipePickerOpen(true);
              }}
            >
              <strong>Bygg din lägglista</strong>
              <span>
                {candidateRecipes.length > 0
                  ? "Klicka här för att välja bland alla rätter i systemet, eller använd snabbgenvägen för att fylla med aktuellt urval."
                  : "Det finns inga rätter att välja just nu."}
              </span>
            </button>
          )}

          {isRecipePickerOpen ? (
            <div className={styles.recipePickerOverlay}>
              <button
                className={styles.recipePickerBackdrop}
                type="button"
                aria-label="Stäng väljare för rätter"
                onClick={() => setIsRecipePickerOpen(false)}
              />

              <section className={styles.recipePickerCard}>
                <header className={styles.recipePickerHeader}>
                  <div>
                    <strong>Välj rätter till lägglistan</strong>
                    <span>
                      {candidateRecipes.length > 0
                        ? `${candidateRecipes.length} rätter tillgängliga, ${selectedCount} valda`
                        : "Inga rätter tillgängliga just nu"}
                    </span>
                  </div>

                  <div className={styles.recipePickerHeaderActions}>
                    <button
                      className={styles.buttonGhost}
                      type="button"
                      disabled={selectedCount === 0}
                      onClick={() => clearSelection({ keepPickerOpen: true })}
                    >
                      Rensa
                    </button>
                    <button
                      className={styles.buttonGhost}
                      type="button"
                      onClick={() => setIsRecipePickerOpen(false)}
                    >
                      Klar
                    </button>
                  </div>
                </header>

                <input
                  className={styles.recipePickerSearch}
                  type="search"
                  value={recipeSearch}
                  placeholder="Sök på rätt, kategori eller ingrediens"
                  onChange={(event) => setRecipeSearch(event.target.value)}
                />

                <div className={styles.recipePickerList}>
                  <div className={styles.recipePickerListHeader} aria-hidden="true">
                    <span />
                    <span className={styles.recipePickerHeaderTitle}>Rätt</span>
                    <span className={styles.recipePickerHeaderCategory}>Kategori</span>
                    <span className={styles.recipePickerHeaderAmount}>Total</span>
                  </div>

                  {filteredCandidateRecipes.length > 0 ? (
                    filteredCandidateRecipes.map((recipe) => {
                      const isSelected = selectedRecipeIds.includes(recipe.id);

                      return (
                        <label
                          key={recipe.id}
                          className={`${styles.recipePickerItem} ${
                            isSelected ? styles.recipePickerItemSelected : ""
                          }`}
                        >
                          <input
                            className={styles.recipePickerCheckbox}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleRecipeSelection(recipe.id)}
                          />
                          <strong className={styles.recipePickerTitle}>{recipe.title}</strong>
                          <span className={styles.recipePickerCategory}>
                            {recipe.category}
                          </span>
                          <span className={styles.recipePickerAmount}>
                            {recipe.totalAmount}
                          </span>
                        </label>
                      );
                    })
                  ) : (
                    <div className={styles.recipePickerEmpty}>
                      Inga rätter matchade din sökning.
                    </div>
                  )}
                </div>
              </section>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  );
}
