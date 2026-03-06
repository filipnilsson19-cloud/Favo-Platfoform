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
  recipes: Recipe[];
};

type ViewMode = "list" | "card" | "table";
type ActiveCategory = RecipeCategory | "Alla";

export function RecipeBook({ recipes }: RecipeBookProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>(() =>
    recipes.map((recipe) => cloneRecipe(recipe)),
  );
  const [view, setView] = useState<ViewMode>("list");
  const [activeCategory, setActiveCategory] = useState<ActiveCategory>("Alla");
  const [activeRecipeId, setActiveRecipeId] = useState<string>(recipes[0]?.id ?? "");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isStationOpen, setIsStationOpen] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [stationSource, setStationSource] = useState<StationSource>("visible");
  const [editorMode, setEditorMode] = useState<EditorMode>("new");
  const [editorSaveLabel, setEditorSaveLabel] = useState("Inte sparad ännu");
  const [editorDraft, setEditorDraft] = useState<Recipe>(() => blankRecipe());

  const categories = ["Alla", ...new Set(recipeList.map((recipe) => recipe.category))] as ActiveCategory[];
  const visibleRecipes =
    activeCategory === "Alla"
      ? recipeList
      : recipeList.filter((recipe) => recipe.category === activeCategory);
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
    setEditorMode(mode);
    setIsDetailOpen(false);
    setIsStationOpen(false);

    if (mode === "new") {
      setEditorDraft(blankRecipe());
      setEditorSaveLabel("Tomt utkast");
    } else {
      const source = recipeList.find((recipe) => recipe.id === recipeId);
      if (!source) return;

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
    field: "info" | "name" | "amount",
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

  function saveRecipe(status: RecipeStatus) {
    const normalized = normalizeRecipe(editorDraft, status);
    normalized.summary = buildRecipeSummary(normalized.items);

    setRecipeList((current) => {
      const existingIndex = current.findIndex((recipe) => recipe.id === normalized.id);

      if (existingIndex === -1) {
        return [normalized, ...current];
      }

      return current.map((recipe, index) =>
        index === existingIndex ? normalized : recipe,
      );
    });

    if (activeCategory !== "Alla" && activeCategory !== normalized.category) {
      setActiveCategory(normalized.category);
    }

    setActiveRecipeId(normalized.id);
    setEditorDraft(cloneRecipe(normalized));
    setEditorMode("edit");
    setEditorSaveLabel(status === "Publicerad" ? "Publicerad" : "Utkast sparat");

    if (status === "Publicerad") {
      setIsEditorOpen(false);
      setIsDetailOpen(true);
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

    const printUrl = `/station-print?ts=${Date.now()}`;
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
        ].join(" ")}
      >
        <label className={styles.recipeSelect} aria-label={`Välj ${recipe.title}`}>
          <input
            className={styles.recipeCheckbox}
            type="checkbox"
            checked={isSelected}
            onChange={() => toggleRecipeSelection(recipe.id)}
          />
        </label>
        <span className={styles.recipeType}>{recipe.category}</span>

        <button
          className={styles.recipeMain}
          type="button"
          onClick={() => openRecipe(recipe.id)}
        >
          <strong className={styles.recipeTitle}>{recipe.title}</strong>
          <span className={styles.recipeCopy}>{recipe.summary}</span>
        </button>

        <span className={styles.recipeCell}>{itemCount} komponenter</span>
        <span className={styles.recipeCell}>{computeAmountSummary(recipe.items)}</span>
        <span className={styles.recipeCell}>{recipe.updatedLabel}</span>

        <div className={styles.recipeActions}>
          <button
            className={styles.rowAction}
            type="button"
            onClick={() => openRecipe(recipe.id)}
          >
            Visa
          </button>
          <button
            className={`${styles.rowAction} ${styles.rowActionStrong}`}
            type="button"
            onClick={() => openEditor("edit", recipe.id)}
          >
            Redigera
          </button>
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
          </div>

          <div className={styles.toolbarActions}>
            <div className={styles.viewToggle} role="group" aria-label="Välj vy">
              {(["list", "card", "table"] as ViewMode[]).map((mode) => (
                <button
                  key={mode}
                  className={`${styles.viewToggleButton} ${
                    view === mode ? styles.viewToggleButtonActive : ""
                  }`}
                  type="button"
                  aria-pressed={view === mode}
                  onClick={() => setView(mode)}
                >
                  {mode === "list" ? "Lista" : mode === "card" ? "Kort" : "Tabell"}
                </button>
              ))}
            </div>

            <button
              className={styles.actionButton}
              type="button"
              onClick={() => openStation("auto")}
              disabled={visibleRecipes.length === 0}
            >
              Stationsvy
            </button>
            <button
              className={styles.actionButtonGhost}
              type="button"
              onClick={() => openEditor("new")}
            >
              Nytt recept
            </button>
          </div>
        </div>

        <div
          className={[
            styles.recipeList,
            view === "card" ? styles.recipeListCard : "",
            view === "table" ? styles.recipeListTable : "",
          ].join(" ")}
        >
          {view !== "card" ? (
            <div className={styles.recipeListHeader} aria-hidden="true">
              <span>Val</span>
              <span>Typ</span>
              <span>Recept</span>
              <span>Komponenter</span>
              <span>Total</span>
              <span>Uppdaterad</span>
              <span>Åtgärder</span>
            </div>
          ) : null}

          <div className={styles.recipeListBody}>
            {visibleRecipes.map((recipe) => renderRecipeRow(recipe))}
          </div>
        </div>
      </section>

      <RecipeDetailDrawer
        recipe={activeRecipe}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(recipeId) => openEditor("edit", recipeId)}
        onDuplicate={(recipeId) => openEditor("duplicate", recipeId)}
      />

      <RecipeEditorDrawer
        categories={categories.filter((category): category is RecipeCategory => category !== "Alla")}
        draft={editorDraft}
        isOpen={isEditorOpen}
        mode={editorMode}
        saveLabel={editorSaveLabel}
        onAddItem={addDraftItem}
        onClose={() => setIsEditorOpen(false)}
        onFieldChange={updateDraftField}
        onItemChange={updateDraftItem}
        onItemFlagToggle={toggleDraftItemFlag}
        onPublish={() => saveRecipe("Publicerad")}
        onRemoveItem={removeDraftItem}
        onSaveDraft={() => saveRecipe("Utkast")}
      />

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
