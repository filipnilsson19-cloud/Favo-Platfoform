"use client";

import { useEffect, useState } from "react";

import {
  blankRecipe,
  buildRecipeSummary,
  categoryToneMap,
  cloneRecipe,
  computeAmountSummary,
  contentItems,
  normalizeRecipe,
  recipeStatusOptions,
} from "@/lib/recipe-utils";
import {
  buildStationPayload,
  STATION_PRINT_STORAGE_KEY,
} from "@/lib/station-utils";
import type { EditorMode, Recipe, RecipeCategory, RecipeStatus } from "@/types/recipe";
import type { StationSource } from "@/types/station";

import { RecipeDetailDrawer } from "./recipe-detail-drawer";
import { RecipeEditorDrawer } from "./recipe-editor-drawer";
import { StationDrawer } from "./station-drawer";
import styles from "./recipe-book.module.css";

type RecipeBookProps = {
  canManage: boolean;
  recipes: Recipe[];
};

type ViewMode = "card" | "table";
type ActiveCategory = RecipeCategory | "Alla";
type ActiveStatus = RecipeStatus | "Alla";

export function RecipeBook({ canManage, recipes }: RecipeBookProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>(() =>
    recipes.map((recipe) => cloneRecipe(recipe)),
  );
  const [view, setView] = useState<ViewMode>("table");
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("Alla");
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>("Alla");
  const [activeRecipeId, setActiveRecipeId] = useState<string>("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isStationOpen, setIsStationOpen] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [stationSource, setStationSource] = useState<StationSource>("visible");
  const [editorMode, setEditorMode] = useState<EditorMode>("new");
  const [editorSaveLabel, setEditorSaveLabel] = useState("Inte sparad ännu");
  const [editorDraft, setEditorDraft] = useState<Recipe>(() => blankRecipe());
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setRecipeList(recipes.map((recipe) => cloneRecipe(recipe)));
  }, [recipes]);

  const categories = ["Alla", ...new Set(recipeList.map((recipe) => recipe.category))] as ActiveCategory[];
  const visibleRecipes = recipeList.filter((recipe) => {
    const categoryMatch =
      activeCategory === "Alla" || recipe.category === activeCategory;
    const statusMatch = activeStatus === "Alla" || recipe.status === activeStatus;
    return categoryMatch && statusMatch;
  });
  const resolvedActiveRecipeId =
    visibleRecipes.find((recipe) => recipe.id === activeRecipeId)?.id ??
    recipeList.find((recipe) => recipe.id === activeRecipeId)?.id ??
    visibleRecipes[0]?.id ??
    recipeList[0]?.id ??
    "";
  const activeRecipe =
    recipeList.find((recipe) => recipe.id === resolvedActiveRecipeId) ??
    visibleRecipes[0] ??
    recipeList[0];
  const selectedRecipes = recipeList.filter((recipe) =>
    selectedRecipeIds.includes(recipe.id),
  );
  const draftContentItems = contentItems(editorDraft.items);
  const canSaveRecipe =
    editorDraft.title.trim().length > 0 &&
    draftContentItems.length > 0 &&
    draftContentItems.every(
      (item) => item.name.trim().length > 0 && item.amount.trim().length > 0,
    );
  const resolvedStationSource =
    stationSource === "selected" && selectedRecipes.length === 0
      ? "visible"
      : stationSource;
  const stationPayload =
    isStationOpen || selectedRecipes.length > 0 || visibleRecipes.length > 0
      ? buildStationPayload({
          source: resolvedStationSource,
          visibleRecipes,
          selectedRecipes,
          activeCategory,
        })
      : null;

  useEffect(() => {
    document.body.classList.toggle(
      "favo-lock-scroll",
      isDetailOpen || isEditorOpen || isStationOpen,
    );

    return () => {
      document.body.classList.remove("favo-lock-scroll");
    };
  }, [isDetailOpen, isEditorOpen, isStationOpen]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsDetailOpen(false);
      setIsEditorOpen(false);
      setIsStationOpen(false);
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function openRecipe(recipeId: string) {
    setActiveRecipeId(recipeId);
    setIsStationOpen(false);
    setIsEditorOpen(false);
    setIsDetailOpen(true);
  }

  function openEditor(mode: EditorMode, recipeId?: string) {
    if (!canManage) return;

    setEditorMode(mode);
    setIsDetailOpen(false);
    setIsStationOpen(false);

    if (mode === "new") {
      setActiveRecipeId("");
      setEditorDraft(blankRecipe());
      setEditorSaveLabel("Tomt utkast");
    } else {
      const source = recipeList.find((recipe) => recipe.id === recipeId);
      if (!source) return;
      setActiveRecipeId(source.id);

      if (mode === "duplicate") {
        setEditorDraft({
          ...cloneRecipe(source),
          id: "",
          title: `${source.title} Kopia`,
          status: "Utkast",
          updatedLabel: "Inte sparad ännu",
        });
        setEditorSaveLabel("Kopia skapad");
      } else {
        setEditorDraft(cloneRecipe(source));
        setEditorSaveLabel("Redo att redigera");
      }
    }

    setIsEditorOpen(true);
  }

  function updateDraftField<K extends keyof Recipe>(field: K, value: Recipe[K]) {
    setEditorDraft((current) => ({
      ...current,
      [field]: value,
    }));
    setEditorSaveLabel("Ändringar ej sparade");
  }

  function updateDraftItem(
    index: number,
    field: "info" | "name" | "amount" | "unit",
    value: string,
  ) {
    setEditorDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item,
      ),
    }));
    setEditorSaveLabel("Ändringar ej sparade");
  }

  function addDraftItem() {
    setEditorDraft((current) => ({
      ...current,
      items: [
        ...current.items,
        {
          info: "",
          name: "",
          amount: "",
          unit: "g",
          isEmphasis: false,
          isSpacer: false,
        },
      ],
    }));
    setEditorSaveLabel("Ändringar ej sparade");
  }

  function removeDraftItem(index: number) {
    setEditorDraft((current) => ({
      ...current,
      items:
        current.items.length === 1
          ? blankRecipe().items
          : current.items.filter((_, itemIndex) => itemIndex !== index),
    }));
    setEditorSaveLabel("Ändringar ej sparade");
  }

  function toggleDraftItemFlag(index: number, flag: "isEmphasis" | "isSpacer") {
    setEditorDraft((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) => {
        if (itemIndex !== index) return item;

        const nextValue = !item[flag];
        return {
          ...item,
          [flag]: nextValue,
          ...(flag === "isEmphasis" && nextValue ? { isSpacer: false } : {}),
          ...(flag === "isSpacer" && nextValue ? { isEmphasis: false } : {}),
        };
      }),
    }));
    setEditorSaveLabel("Ändringar ej sparade");
  }

  async function saveRecipe(statusOverride?: RecipeStatus) {
    if (!canSaveRecipe || isSaving) {
      setEditorSaveLabel("Fyll i namn och minst en komplett rad");
      return;
    }

    const nextStatus = statusOverride ?? editorDraft.status;
    const normalized = normalizeRecipe(editorDraft, nextStatus);
    normalized.summary = buildRecipeSummary(normalized.items);

    setEditorSaveLabel("Sparar...");
    setIsSaving(true);

    try {
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipe: normalized,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save recipe");
      }

      const payload = (await response.json()) as { recipe: Recipe };
      const savedRecipe = cloneRecipe(payload.recipe);

      setRecipeList((current) => {
        const existingIndex = current.findIndex(
          (recipe) => recipe.id === savedRecipe.id,
        );

        if (existingIndex === -1) {
          return [savedRecipe, ...current];
        }

        return current.map((recipe, index) =>
          index === existingIndex ? savedRecipe : recipe,
        );
      });

      if (activeCategory !== "Alla" && activeCategory !== savedRecipe.category) {
        setActiveCategory(savedRecipe.category);
      }

      setActiveRecipeId(savedRecipe.id);
      setEditorDraft(cloneRecipe(savedRecipe));
      setEditorMode("edit");
      setEditorSaveLabel(
        nextStatus === "Publicerad"
          ? "Publicerad"
          : nextStatus === "Inaktiv"
            ? "Inaktiv"
            : "Utkast sparat",
      );

      if (nextStatus === "Publicerad") {
        setIsEditorOpen(false);
        setIsDetailOpen(true);
      }
    } catch (error) {
      console.error("Could not save recipe", error);
      setEditorSaveLabel("Kunde inte spara");
      window.alert("Det gick inte att spara receptet. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRecipe(recipeId: string) {
    const recipe = recipeList.find((entry) => entry.id === recipeId);
    const shouldDelete = window.confirm(
      `Vill du radera "${recipe?.title || "receptet"}"? Detta går inte att ångra.`,
    );

    if (!shouldDelete) return;

    try {
      const response = await fetch("/api/recipes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          recipeId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete recipe");
      }

      setRecipeList((current) => current.filter((entry) => entry.id !== recipeId));
      setSelectedRecipeIds((current) => current.filter((id) => id !== recipeId));
      setIsDetailOpen(false);

      if (activeRecipeId === recipeId) {
        setActiveRecipeId("");
      }
    } catch (error) {
      console.error("Could not delete recipe", error);
      window.alert("Det gick inte att radera receptet. Försök igen.");
    }
  }

  function toggleRecipeSelection(recipeId: string) {
    setSelectedRecipeIds((current) =>
      current.includes(recipeId)
        ? current.filter((id) => id !== recipeId)
        : [...current, recipeId],
    );
  }

  function selectVisibleRecipes() {
    setSelectedRecipeIds((current) => {
      const next = new Set(current);
      visibleRecipes.forEach((recipe) => next.add(recipe.id));
      return [...next];
    });
  }

  function clearSelectedRecipes() {
    setSelectedRecipeIds([]);
  }

  function openStation(source: "auto" | StationSource = "auto") {
    const nextSource =
      source === "auto"
        ? selectedRecipes.length > 0
          ? "selected"
          : "visible"
        : source === "selected" && selectedRecipes.length === 0
          ? "visible"
          : source;

    setStationSource(nextSource);
    setIsDetailOpen(false);
    setIsEditorOpen(false);
    setIsStationOpen(true);
  }

  function openStationPrint() {
    if (!stationPayload) return;

    window.localStorage.setItem(
      STATION_PRINT_STORAGE_KEY,
      JSON.stringify(stationPayload),
    );

    const printUrl = "/station-print";
    const printWindow = window.open(printUrl, "_blank", "noopener,noreferrer");

    if (!printWindow) {
      window.location.assign(printUrl);
    }
  }

  function renderRecipeRow(recipe: Recipe) {
    const itemCount = contentItems(recipe.items).length;
    const isActive = recipe.id === activeRecipeId;
    const isSelected = selectedRecipeIds.includes(recipe.id);

    return (
      <article
        key={recipe.id}
        className={[
          styles.recipeCard,
          view === "card" ? styles.recipeCardCard : "",
          view === "table" ? styles.recipeCardTable : "",
          isActive ? styles.recipeCardActive : "",
          isSelected ? styles.recipeCardSelected : "",
        ].join(" ")}
        onClick={() => openRecipe(recipe.id)}
      >
        <label
          className={styles.recipeSelect}
          aria-label={`Välj ${recipe.title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            className={styles.recipeCheckbox}
            type="checkbox"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => toggleRecipeSelection(recipe.id)}
          />
        </label>
        <span className={styles.recipeType}>{recipe.category}</span>

        <div className={styles.recipeMain}>
          <strong className={styles.recipeTitle}>{recipe.title}</strong>
          <span className={styles.recipeCopy}>{recipe.summary}</span>
        </div>

        <span className={`${styles.recipeCell} ${styles.recipeComponentsCell}`}>
          {itemCount} komponenter
        </span>
        <span className={`${styles.recipeCell} ${styles.recipeTotalCell}`}>
          {computeAmountSummary(recipe.items)}
        </span>
        <span className={`${styles.recipeCell} ${styles.recipeUpdatedCell}`}>
          <span
            className={`${styles.recipeStatus} ${
              recipe.status === "Publicerad"
                ? styles.recipeStatusPublished
                : recipe.status === "Inaktiv"
                  ? styles.recipeStatusInactive
                  : styles.recipeStatusDraft
            }`}
          >
            {recipe.status}
          </span>
        </span>

        <div className={styles.recipeActions}>
          <button
            className={styles.rowAction}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              openRecipe(recipe.id);
            }}
          >
            Visa
          </button>
          {canManage ? (
            <button
              className={`${styles.rowAction} ${styles.rowActionStrong}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                openEditor("edit", recipe.id);
              }}
            >
              Redigera
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <>
      <section className={styles.recipePage} aria-labelledby="recipe-page-title">
        <header className={styles.pageHeader}>
          <p className={styles.pageEyebrow}>Recept</p>
          <h1 id="recipe-page-title">Receptbok</h1>
          <p className={styles.pageIntro}>
            En enkel och tydlig översikt där personalen snabbt hittar rätt recept,
            öppnar detaljer och skriver ut vid behov.
          </p>
        </header>

        <div className={styles.recipeWorkspace}>
          <div className={styles.recipeToolbar} aria-label="Receptöversikt">
            <div className={styles.toolbarCluster}>
              <div className={styles.toolbarGroup}>
                <span className={`${styles.toolbarPill} ${styles.toolbarPillActive}`}>
                  {visibleRecipes.length} recept
                </span>
                <span className={styles.toolbarPill}>
                  {selectedRecipes.length} valda
                </span>
                <button
                  className={styles.toolbarButton}
                  type="button"
                  onClick={selectVisibleRecipes}
                >
                  Markera synliga
                </button>
                <button
                  className={styles.toolbarButton}
                  type="button"
                  onClick={clearSelectedRecipes}
                  disabled={selectedRecipes.length === 0}
                >
                  Rensa val
                </button>
              </div>

              <div className={styles.toolbarFilters}>
                {categories.map((category) => {
                  const isActive = category === activeCategory;

                  return (
                    <button
                      key={category}
                      className={[
                        styles.filterChip,
                        styles[
                          `filterChip${categoryToneMap[category][0].toUpperCase()}${categoryToneMap[category].slice(1)}`
                        ],
                        isActive ? styles.filterChipActive : "",
                      ].join(" ")}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveCategory(category)}
                    >
                      {category}
                    </button>
                  );
                })}
              </div>

              <div className={styles.toolbarStatusFilters}>
                {(["Alla", ...recipeStatusOptions] as ActiveStatus[]).map((status) => {
                  const isActive = status === activeStatus;

                  return (
                    <button
                      key={status}
                      className={[
                        styles.filterChip,
                        styles[
                          `statusChip${
                            status === "Alla"
                              ? "All"
                              : status === "Publicerad"
                                ? "Published"
                                : status === "Inaktiv"
                                  ? "Inactive"
                                  : "Draft"
                          }`
                        ],
                        isActive ? styles.filterChipActive : "",
                      ].join(" ")}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() => setActiveStatus(status)}
                    >
                      {status}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className={styles.toolbarActions}>
              <div className={styles.viewToggle} role="group" aria-label="Välj vy">
                {(["table", "card"] as ViewMode[]).map((mode) => (
                  <button
                    key={mode}
                    className={`${styles.viewToggleButton} ${
                      view === mode ? styles.viewToggleButtonActive : ""
                    }`}
                    type="button"
                    aria-pressed={view === mode}
                    onClick={() => setView(mode)}
                  >
                    {mode === "card" ? "Kort" : "Tabell"}
                  </button>
                ))}
              </div>

              <button
                className={`${styles.actionButton} ${styles.toolbarActionCompact}`}
                type="button"
                onClick={() => openStation("auto")}
                disabled={visibleRecipes.length === 0}
              >
                Stationsvy
              </button>
              {canManage ? (
                <button
                  className={styles.actionButtonGhost}
                  type="button"
                  onClick={() => openEditor("new")}
                >
                  Nytt recept
                </button>
              ) : null}
            </div>
          </div>

          <div
            className={[
              styles.recipeList,
              view === "card" ? styles.recipeListCard : "",
              view === "table" ? styles.recipeListTable : "",
            ].join(" ")}
          >
            {view === "table" ? (
              <div className={styles.recipeListHeader} aria-hidden="true">
                <span>Val</span>
                <span>Typ</span>
                <span>Recept</span>
                <span>Komponenter</span>
                <span>Total</span>
                <span>Status</span>
                <span>Åtgärder</span>
              </div>
            ) : null}

            <div className={styles.recipeListBody}>
              {visibleRecipes.map((recipe) => renderRecipeRow(recipe))}
            </div>
          </div>
        </div>
      </section>

      <RecipeDetailDrawer
        canManage={canManage}
        recipe={activeRecipe}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(recipeId) => openEditor("edit", recipeId)}
        onDuplicate={(recipeId) => openEditor("duplicate", recipeId)}
        onDelete={deleteRecipe}
      />

      {canManage ? (
        <RecipeEditorDrawer
          categories={categories.filter((category): category is RecipeCategory => category !== "Alla")}
          draft={editorDraft}
          canSave={canSaveRecipe}
          isOpen={isEditorOpen}
          isSaving={isSaving}
          mode={editorMode}
          saveLabel={editorSaveLabel}
          onAddItem={addDraftItem}
          onClose={() => setIsEditorOpen(false)}
          onFieldChange={updateDraftField}
          onItemChange={updateDraftItem}
          onItemFlagToggle={toggleDraftItemFlag}
          onPublish={() => saveRecipe("Publicerad")}
          onRemoveItem={removeDraftItem}
          onSaveDraft={() => saveRecipe()}
        />
      ) : null}

      <StationDrawer
        canBuildSelected={selectedRecipes.length > 0}
        isOpen={isStationOpen}
        payload={stationPayload}
        source={resolvedStationSource}
        onBuildSelected={() => {
          setStationSource("selected");
          setIsStationOpen(true);
        }}
        onBuildVisible={() => {
          setStationSource("visible");
          setIsStationOpen(true);
        }}
        onClose={() => setIsStationOpen(false)}
        onPrint={openStationPrint}
      />
    </>
  );
}
