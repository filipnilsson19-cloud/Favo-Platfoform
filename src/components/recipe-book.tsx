"use client";

import { useEffect, useRef, useState } from "react";

import {
  blankRecipe,
  buildRecipeSummary,
  cloneRecipe,
  computeAmountSummary,
  contentItems,
  normalizeRecipe,
  recipeStatusOptions,
  sortRecipeCategories,
} from "@/lib/recipe-utils";
import {
  buildStationPayload,
  buildStationViewScope,
  serializeStationPrintBundle,
  STATION_PRINT_STORAGE_KEY,
} from "@/lib/station-utils";
import type { EditorMode, Recipe, RecipeCategory, RecipeStatus } from "@/types/recipe";
import type {
  StationEditableLayout,
  StationPrintPayload,
  StationSource,
} from "@/types/station";
import type { AppCategory } from "@/types/category";
import type { AppStationView } from "@/types/station-view";

import { CategoryManagerDrawer } from "./category-manager-drawer";
import { RecipeDetailDrawer } from "./recipe-detail-drawer";
import { RecipeEditorDrawer } from "./recipe-editor-drawer";
import { StationDrawer } from "./station-drawer";
import { StationViewManagerDrawer } from "./station-view-manager-drawer";
import styles from "./recipe-book.module.css";

type RecipeBookProps = {
  canManage: boolean;
  categories: RecipeCategory[];
  recipes: Recipe[];
};

type ViewMode = "card" | "table";
type CategoryOption = RecipeCategory | "Alla";
type ActiveStatus = RecipeStatus | "Alla";

export function RecipeBook({ canManage, categories, recipes }: RecipeBookProps) {
  const [recipeList, setRecipeList] = useState<Recipe[]>(() =>
    recipes.map((recipe) => cloneRecipe(recipe)),
  );
  const [categoryList, setCategoryList] = useState<RecipeCategory[]>(() =>
    sortRecipeCategories(categories),
  );
  const [view, setView] = useState<ViewMode>("table");
  const [activeCategories, setActiveCategories] = useState<RecipeCategory[]>([]);
  const [activeStatus, setActiveStatus] = useState<ActiveStatus>("Alla");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRecipeId, setActiveRecipeId] = useState<string>("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isStationViewManagerOpen, setIsStationViewManagerOpen] = useState(false);
  const [isStationOpen, setIsStationOpen] = useState(false);
  const [selectedRecipeIds, setSelectedRecipeIds] = useState<string[]>([]);
  const [stationCategory, setStationCategory] = useState<RecipeCategory | "">("");
  const [editorMode, setEditorMode] = useState<EditorMode>("new");
  const [editorSaveLabel, setEditorSaveLabel] = useState("Inte sparad ännu");
  const [editorDraft, setEditorDraft] = useState<Recipe>(() => blankRecipe());
  const [isSaving, setIsSaving] = useState(false);
  const [managedCategories, setManagedCategories] = useState<AppCategory[]>([]);
  const [managedStationViews, setManagedStationViews] = useState<AppStationView[]>([]);
  const [isManagingCategories, setIsManagingCategories] = useState(false);
  const [isManagingStationViews, setIsManagingStationViews] = useState(false);
  const visibleSelectionRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setRecipeList(recipes.map((recipe) => cloneRecipe(recipe)));
  }, [recipes]);

  useEffect(() => {
    setCategoryList(sortRecipeCategories(categories));
  }, [categories]);

  const availableCategories = sortRecipeCategories(
    recipeList.map((recipe) => recipe.category),
  );
  const editorCategories = sortRecipeCategories([
    ...categoryList,
    ...recipeList.map((recipe) => recipe.category),
  ]);
  const categoryOptions = ["Alla", ...availableCategories] as CategoryOption[];
  const activeCategoryLabel =
    activeCategories.length === 0
      ? "Alla"
      : activeCategories.length === 1
        ? activeCategories[0]
      : "Flera kategorier";
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();
  const matchesSharedRecipeFilters = (recipe: Recipe) => {
    const statusMatch = activeStatus === "Alla" || recipe.status === activeStatus;
    const searchHaystack = [
      recipe.title,
      recipe.category,
      recipe.summary,
      recipe.notes,
      recipe.allergens,
      ...recipe.items.map((item) => `${item.info} ${item.name} ${item.amount} ${item.unit}`),
    ]
      .join(" ")
      .toLowerCase();
    const searchMatch =
      normalizedSearchQuery.length === 0 ||
      searchHaystack.includes(normalizedSearchQuery);

    return statusMatch && searchMatch;
  };
  const visibleRecipes = recipeList.filter((recipe) => {
    const categoryMatch =
      activeCategories.length === 0 || activeCategories.includes(recipe.category);

    return categoryMatch && matchesSharedRecipeFilters(recipe);
  });
  const stationBrowseRecipes = recipeList.filter((recipe) =>
    matchesSharedRecipeFilters(recipe),
  );
  const stationCategoryOptions = availableCategories.filter((category) =>
    stationBrowseRecipes.some((recipe) => recipe.category === category),
  );
  const preferredStationCategory =
    activeCategories.find((category) => stationCategoryOptions.includes(category)) ??
    stationCategoryOptions[0] ??
    "";
  const resolvedStationCategory =
    stationCategory &&
    stationCategoryOptions.includes(stationCategory as RecipeCategory)
      ? stationCategory
      : preferredStationCategory;
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
  const visibleRecipeIds = visibleRecipes.map((recipe) => recipe.id);
  const selectedVisibleRecipeIds = visibleRecipeIds.filter((id) =>
    selectedRecipeIds.includes(id),
  );
  const allVisibleSelected =
    visibleRecipeIds.length > 0 &&
    selectedVisibleRecipeIds.length === visibleRecipeIds.length;
  const someVisibleSelected =
    selectedVisibleRecipeIds.length > 0 && !allVisibleSelected;
  const draftContentItems = contentItems(editorDraft.items);
  const canSaveRecipe =
    editorDraft.title.trim().length > 0 &&
    draftContentItems.length > 0 &&
    draftContentItems.every(
      (item) => item.name.trim().length > 0 && item.amount.trim().length > 0,
    );
  const stationSource: StationSource =
    selectedRecipes.length > 0 ? "selected" : "visible";
  const stationVisibleRecipes =
    stationSource === "selected"
      ? visibleRecipes
      : stationBrowseRecipes.filter(
          (recipe) =>
            resolvedStationCategory.length > 0 &&
            recipe.category === resolvedStationCategory,
        );
  const stationPayload =
    isStationOpen || selectedRecipes.length > 0 || stationBrowseRecipes.length > 0
      ? buildStationPayload({
          source: stationSource,
          visibleRecipes: stationVisibleRecipes,
          selectedRecipes,
          activeCategory:
            stationSource === "selected"
              ? activeCategoryLabel
              : resolvedStationCategory || "Alla",
        })
      : null;
  const stationViewScope = buildStationViewScope({
    source: stationSource,
    activeCategory:
      stationSource === "selected"
        ? activeCategoryLabel
        : resolvedStationCategory || "Alla",
    selectedRecipeIds,
  });
  const stationToggleCategories =
    stationSource === "selected"
      ? [...new Set(selectedRecipes.map((recipe) => recipe.category))]
      : resolvedStationCategory
        ? [resolvedStationCategory]
        : [];
  const canOpenStation =
    selectedRecipes.length > 0 || stationBrowseRecipes.length > 0;

  useEffect(() => {
    document.body.classList.toggle(
      "favo-lock-scroll",
      isDetailOpen ||
        isEditorOpen ||
        isCategoryManagerOpen ||
        isStationViewManagerOpen ||
        isStationOpen,
    );
    document.body.classList.toggle("favo-station-open", isStationOpen);

    return () => {
      document.body.classList.remove("favo-lock-scroll");
      document.body.classList.remove("favo-station-open");
    };
  }, [
    isCategoryManagerOpen,
    isDetailOpen,
    isEditorOpen,
    isStationOpen,
    isStationViewManagerOpen,
  ]);

  useEffect(() => {
    if (!visibleSelectionRef.current) return;
    visibleSelectionRef.current.indeterminate = someVisibleSelected;
  }, [someVisibleSelected]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      setIsDetailOpen(false);
      setIsEditorOpen(false);
      setIsStationViewManagerOpen(false);
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

      if (
        activeCategories.length > 0 &&
        !activeCategories.includes(savedRecipe.category)
      ) {
        setActiveCategories((current) => [...current, savedRecipe.category]);
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

  async function createCategory(name: string) {
    const normalizedName = name.trim();

    if (!normalizedName) {
      return null;
    }

    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create category");
      }

      const payload = (await response.json()) as { category: RecipeCategory };
      const createdCategory = payload.category;

      setCategoryList((current) =>
        sortRecipeCategories([...current, createdCategory]),
      );

      if (isCategoryManagerOpen) {
        void loadManagedCategories();
      }

      return createdCategory;
    } catch (error) {
      console.error("Could not create category", error);
      window.alert("Det gick inte att skapa kategorin. Försök igen.");
      return null;
    }
  }

  async function loadManagedCategories() {
    try {
      setIsManagingCategories(true);
      const response = await fetch("/api/categories?manage=1");

      if (!response.ok) {
        throw new Error("Failed to load categories");
      }

      const payload = (await response.json()) as { categories: AppCategory[] };
      setManagedCategories(payload.categories);
      setIsCategoryManagerOpen(true);
    } catch (error) {
      console.error("Could not load categories", error);
      window.alert("Det gick inte att läsa kategorierna. Försök igen.");
    } finally {
      setIsManagingCategories(false);
    }
  }

  async function loadManagedStationViews() {
    try {
      setIsManagingStationViews(true);
      const response = await fetch("/api/station-views?manage=1");

      if (!response.ok) {
        throw new Error("Failed to load station views");
      }

      const payload = (await response.json()) as { views: AppStationView[] };
      setManagedStationViews(payload.views);
      setIsStationViewManagerOpen(true);
    } catch (error) {
      console.error("Could not load station views", error);
      window.alert("Det gick inte att läsa vyerna. Försök igen.");
    } finally {
      setIsManagingStationViews(false);
    }
  }

  async function renameManagedCategory(name: string, nextName: string) {
    try {
      setIsManagingCategories(true);

      const response = await fetch("/api/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "rename",
          name,
          nextName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename category");
      }

      const payload = (await response.json()) as {
        categories: AppCategory[];
        category: RecipeCategory;
        previousName: RecipeCategory;
      };

      setManagedCategories(payload.categories);
      setCategoryList(
        sortRecipeCategories(
          payload.categories
            .filter((category) => category.isActive)
            .map((category) => category.name),
        ),
      );
      setRecipeList((current) =>
        current.map((recipe) =>
          recipe.category === payload.previousName
            ? { ...recipe, category: payload.category }
            : recipe,
        ),
      );
      setActiveCategories((current) =>
        current.map((category) =>
          category === payload.previousName ? payload.category : category,
        ),
      );
      setStationCategory((current) =>
        current === payload.previousName ? payload.category : current,
      );
      setEditorDraft((current) =>
        current.category === payload.previousName
          ? { ...current, category: payload.category }
          : current,
      );
    } catch (error) {
      console.error("Could not rename category", error);
      window.alert("Det gick inte att byta namn på kategorin. Försök igen.");
    } finally {
      setIsManagingCategories(false);
    }
  }

  async function setManagedCategoryActive(name: string, isActive: boolean) {
    try {
      setIsManagingCategories(true);

      const response = await fetch("/api/categories", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set-active",
          name,
          isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update category state");
      }

      const payload = (await response.json()) as {
        categories: AppCategory[];
      };

      setManagedCategories(payload.categories);
      setCategoryList(
        sortRecipeCategories(
          payload.categories
            .filter((category) => category.isActive)
            .map((category) => category.name),
        ),
      );
    } catch (error) {
      console.error("Could not update category state", error);
      window.alert("Det gick inte att uppdatera kategorin. Försök igen.");
    } finally {
      setIsManagingCategories(false);
    }
  }

  async function renameManagedStationView(viewId: string, nextName: string) {
    try {
      setIsManagingStationViews(true);

      const response = await fetch("/api/station-views", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "rename",
          id: viewId,
          nextName,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to rename station view");
      }

      const payload = (await response.json()) as { views: AppStationView[] };
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not rename station view", error);
      window.alert("Det gick inte att byta namn på vyn. Försök igen.");
    } finally {
      setIsManagingStationViews(false);
    }
  }

  async function setManagedStationViewActive(viewId: string, isActive: boolean) {
    try {
      setIsManagingStationViews(true);

      const response = await fetch("/api/station-views", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "set-active",
          id: viewId,
          isActive,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update station view state");
      }

      const payload = (await response.json()) as { views: AppStationView[] };
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not update station view state", error);
      window.alert("Det gick inte att uppdatera vyn. Försök igen.");
    } finally {
      setIsManagingStationViews(false);
    }
  }

  async function deleteManagedStationView(viewId: string, viewName: string) {
    const shouldDelete = window.confirm(
      `Vill du radera vyn "${viewName}"? Detta går inte att ångra.`,
    );

    if (!shouldDelete) return;

    try {
      setIsManagingStationViews(true);

      const response = await fetch("/api/station-views", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          viewId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to delete station view");
      }

      const payload = (await response.json()) as { views: AppStationView[] };
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not delete station view", error);
      window.alert("Det gick inte att radera vyn. Försök igen.");
    } finally {
      setIsManagingStationViews(false);
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

  function toggleVisibleRecipesSelection() {
    setSelectedRecipeIds((current) => {
      const next = new Set(current);

      if (allVisibleSelected) {
        visibleRecipeIds.forEach((id) => next.delete(id));
      } else {
        visibleRecipeIds.forEach((id) => next.add(id));
      }

      return [...next];
    });
  }

  function toggleCategory(category: CategoryOption) {
    if (category === "Alla") {
      setActiveCategories([]);
      return;
    }

    setActiveCategories((current) => {
      const next = current.includes(category)
        ? current.filter((entry) => entry !== category)
        : [...current, category];

      if (next.length === 0 || next.length === availableCategories.length) {
        return [];
      }

      return next;
    });
  }

  function openStation() {
    if (selectedRecipes.length === 0 && preferredStationCategory) {
      setStationCategory(preferredStationCategory);
    }

    setIsDetailOpen(false);
    setIsEditorOpen(false);
    setIsStationOpen(true);
  }

  function openStationPrint(
    payload: StationPrintPayload | null,
    editableLayout?: StationEditableLayout | null,
  ) {
    if (!payload) return;

    window.localStorage.setItem(
      STATION_PRINT_STORAGE_KEY,
      serializeStationPrintBundle({
        payload,
        editableLayout: editableLayout ?? null,
      }),
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
            <div className={styles.toolbarPrimary}>
              <div className={styles.toolbarMetaRow}>
                <div className={styles.toolbarMetrics}>
                  <span className={styles.toolbarMetric}>
                    <strong>{visibleRecipes.length}</strong> recept
                  </span>
                  <span className={styles.toolbarMetricMuted}>
                    {selectedRecipes.length} valda
                  </span>
                </div>

                {canManage ? (
                  <button
                    className={`${styles.actionButton} ${styles.toolbarActionCompact} ${styles.toolbarTopAction}`}
                    type="button"
                    onClick={() => openEditor("new")}
                  >
                    Nytt recept
                  </button>
                ) : null}
              </div>

              <div className={styles.toolbarFilterStack}>
                <div className={styles.filterSection}>
                  <div className={styles.filterSectionHeader}>
                    <span className={styles.filterSectionLabel}>Kategori</span>
                    {canManage ? (
                      <div className={styles.filterManageStack}>
                        <button
                          className={styles.filterManageButton}
                          type="button"
                          onClick={() => void loadManagedCategories()}
                        >
                          Hantera kategorier
                        </button>
                        <button
                          className={styles.filterManageButton}
                          type="button"
                          onClick={() => void loadManagedStationViews()}
                        >
                          Hantera vyer
                        </button>
                      </div>
                    ) : null}
                  </div>
                  <div className={styles.categoryTabs}>
                    {categoryOptions.map((category) => {
                      const isActive =
                        category === "Alla"
                          ? activeCategories.length === 0
                          : activeCategories.includes(category);

                      return (
                        <button
                          key={category}
                          className={[
                            styles.categoryTab,
                            isActive ? styles.categoryTabActive : "",
                          ].join(" ")}
                          type="button"
                          aria-pressed={isActive}
                          onClick={() => toggleCategory(category)}
                        >
                          <span>{category}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className={styles.toolbarSecondaryRow}>
                <div className={`${styles.filterSection} ${styles.statusSection}`}>
                  <span className={styles.filterSectionLabel}>Status</span>
                  <div className={styles.statusToggle}>
                    {(["Alla", ...recipeStatusOptions] as ActiveStatus[]).map((status) => {
                      const isActive = status === activeStatus;

                      return (
                        <button
                          key={status}
                          className={[
                            styles.statusToggleButton,
                            styles[
                              `statusToggle${
                                status === "Alla"
                                  ? "All"
                                  : status === "Publicerad"
                                    ? "Published"
                                    : status === "Inaktiv"
                                      ? "Inactive"
                                      : "Draft"
                              }`
                            ],
                            isActive ? styles.statusToggleButtonActive : "",
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

                <div className={styles.searchRow}>
                  <div className={styles.searchSection}>
                    <label className={styles.filterSectionLabel} htmlFor="recipe-search">
                      Sök
                    </label>
                    <div className={styles.searchFieldWrap}>
                      <input
                        id="recipe-search"
                        className={styles.searchField}
                        type="search"
                        value={searchQuery}
                        placeholder="Sök recept, komponent eller info"
                        onChange={(event) => setSearchQuery(event.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.toolbarViewRow}>
                  <div className={styles.toolbarViewStack}>
                    <div className={styles.toolbarViewControls}>
                      <button
                        className={`${styles.actionButton} ${styles.toolbarActionCompact} ${styles.stationAction}`}
                        type="button"
                        onClick={() => openStation()}
                        disabled={!canOpenStation}
                      >
                        Stationsvy
                      </button>

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
                    </div>
                  </div>
                </div>
              </div>
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
                <label
                  className={`${styles.recipeHeaderCell} ${styles.recipeHeaderSelect}`}
                >
                  <input
                    ref={visibleSelectionRef}
                    className={styles.recipeCheckbox}
                    type="checkbox"
                    checked={allVisibleSelected}
                    disabled={visibleRecipeIds.length === 0}
                    onChange={toggleVisibleRecipesSelection}
                  />
                  <span>Val</span>
                </label>
                <span
                  className={`${styles.recipeHeaderCell} ${styles.recipeHeaderType}`}
                >
                  Typ
                </span>
                <span className={styles.recipeHeaderCell}>Recept</span>
                <span className={styles.recipeHeaderCell}>Komponenter</span>
                <span className={styles.recipeHeaderCell}>Total</span>
                <span className={styles.recipeHeaderCell}>Status</span>
                <span
                  className={`${styles.recipeHeaderCell} ${styles.recipeHeaderActions}`}
                >
                  Åtgärder
                </span>
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
          key={`${editorMode}-${editorDraft.id || "draft"}-${isEditorOpen ? "open" : "closed"}`}
          categories={editorCategories}
          draft={editorDraft}
          canSave={canSaveRecipe}
          isOpen={isEditorOpen}
          isSaving={isSaving}
          mode={editorMode}
          onCreateCategory={createCategory}
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
        key={
          stationPayload
            ? `${stationPayload.title}-${stationPayload.source}-${stationPayload.recipes
                .map((recipe) => recipe.id)
                .join("-")}`
            : "station-empty"
        }
        activeCategories={stationToggleCategories}
        categoriesLocked={selectedRecipes.length > 0}
        categoryOptions={stationCategoryOptions}
        canManage={canManage}
        isOpen={isStationOpen}
        payload={stationPayload}
        scopeKey={stationViewScope.key}
        scopeLabel={stationViewScope.label}
        onSelectCategory={setStationCategory}
        onClose={() => setIsStationOpen(false)}
        onPrint={openStationPrint}
      />

      {canManage ? (
        <CategoryManagerDrawer
          categories={managedCategories}
          isBusy={isManagingCategories}
          isOpen={isCategoryManagerOpen}
          onClose={() => setIsCategoryManagerOpen(false)}
          onCreate={async (name) => {
            await createCategory(name);
            await loadManagedCategories();
          }}
          onRename={renameManagedCategory}
          onSetActive={setManagedCategoryActive}
        />
      ) : null}

      {canManage ? (
        <StationViewManagerDrawer
          isBusy={isManagingStationViews}
          isOpen={isStationViewManagerOpen}
          views={managedStationViews}
          onClose={() => setIsStationViewManagerOpen(false)}
          onDelete={deleteManagedStationView}
          onRename={renameManagedStationView}
          onSetActive={setManagedStationViewActive}
        />
      ) : null}
    </>
  );
}
