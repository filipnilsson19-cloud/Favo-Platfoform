"use client";

import dynamic from "next/dynamic";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";

import {
  blankRecipe,
  buildRecipeSummary,
  cloneRecipe,
  contentItems,
  normalizeRecipe,
  sortRecipeCategories,
} from "@/lib/recipe-utils";
import {
  buildStationPayload,
  buildStationViewScope,
  serializeStationPrintBundle,
  STATION_PRINT_STORAGE_KEY,
} from "@/lib/station-utils";
import {
  createCategoryRequest,
  deleteManagedStationViewRequest,
  deleteRecipeRequest,
  loadManagedCategoriesRequest,
  loadManagedStationViewsRequest,
  renameManagedCategoryRequest,
  renameManagedStationViewRequest,
  saveRecipeRequest,
  setManagedCategoryActiveRequest,
  setManagedStationViewActiveRequest,
} from "@/lib/recipe-book-api";
import type { EditorMode, Recipe, RecipeCategory, RecipeStatus } from "@/types/recipe";
import type {
  StationEditableLayout,
  StationPrintPayload,
  StationSource,
} from "@/types/station";
import type { AppCategory } from "@/types/category";
import type { AppStationView } from "@/types/station-view";
import styles from "./recipe-book.module.css";
import { useAppUser } from "./app-user-provider";
import { RecipeBookList } from "./recipe-book-list";
import { RecipeBookToolbar } from "./recipe-book-toolbar";
import type {
  ActiveStatus,
  CategoryOption,
  ViewMode,
} from "./recipe-book-types";

type RecipeBookProps = {
  categories: RecipeCategory[];
  recipes: Recipe[];
};

const RecipeDetailDrawer = dynamic(
  () =>
    import("./recipe-detail-drawer").then((mod) => ({
      default: mod.RecipeDetailDrawer,
    })),
  {
    ssr: false,
  },
);

const RecipeEditorDrawer = dynamic(
  () =>
    import("./recipe-editor-drawer").then((mod) => ({
      default: mod.RecipeEditorDrawer,
    })),
  {
    ssr: false,
  },
);

const StationDrawer = dynamic(
  () =>
    import("./station-drawer").then((mod) => ({
      default: mod.StationDrawer,
    })),
  {
    ssr: false,
  },
);

const CategoryManagerDrawer = dynamic(
  () =>
    import("./category-manager-drawer").then((mod) => ({
      default: mod.CategoryManagerDrawer,
    })),
  {
    ssr: false,
  },
);

const StationViewManagerDrawer = dynamic(
  () =>
    import("./station-view-manager-drawer").then((mod) => ({
      default: mod.StationViewManagerDrawer,
    })),
  {
    ssr: false,
  },
);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export function RecipeBook({ categories, recipes }: RecipeBookProps) {
  const { role } = useAppUser();
  const canManage = role === "admin";
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

  const availableCategories = useMemo(
    () => sortRecipeCategories(recipeList.map((recipe) => recipe.category)),
    [recipeList],
  );
  const editorCategories = useMemo(
    () =>
      sortRecipeCategories([
        ...categoryList,
        ...recipeList.map((recipe) => recipe.category),
      ]),
    [categoryList, recipeList],
  );
  const categoryOptions = ["Alla", ...availableCategories] as CategoryOption[];
  const activeCategoryLabel =
    activeCategories.length === 0
      ? "Alla"
      : activeCategories.length === 1
        ? activeCategories[0]
      : "Flera kategorier";
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const normalizedSearchQuery = deferredSearchQuery.trim().toLowerCase();
  const matchesSharedRecipeFilters = useCallback(
    (recipe: Recipe) => {
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
    },
    [activeStatus, normalizedSearchQuery],
  );
  const visibleRecipes = useMemo(
    () =>
      recipeList.filter((recipe) => {
        const categoryMatch =
          activeCategories.length === 0 || activeCategories.includes(recipe.category);

        return categoryMatch && matchesSharedRecipeFilters(recipe);
      }),
    [activeCategories, matchesSharedRecipeFilters, recipeList],
  );
  const stationBrowseRecipes = useMemo(
    () => recipeList.filter((recipe) => matchesSharedRecipeFilters(recipe)),
    [matchesSharedRecipeFilters, recipeList],
  );
  const stationCategoryOptions = useMemo(
    () =>
      availableCategories.filter((category) =>
        stationBrowseRecipes.some((recipe) => recipe.category === category),
      ),
    [availableCategories, stationBrowseRecipes],
  );
  const preferredStationCategory = useMemo(
    () =>
      activeCategories.find((category) => stationCategoryOptions.includes(category)) ??
      stationCategoryOptions[0] ??
      "",
    [activeCategories, stationCategoryOptions],
  );
  const resolvedStationCategory = useMemo(
    () =>
      stationCategory &&
      stationCategoryOptions.includes(stationCategory as RecipeCategory)
        ? stationCategory
        : preferredStationCategory,
    [preferredStationCategory, stationCategory, stationCategoryOptions],
  );
  const resolvedActiveRecipeId = useMemo(
    () =>
      visibleRecipes.find((recipe) => recipe.id === activeRecipeId)?.id ??
      recipeList.find((recipe) => recipe.id === activeRecipeId)?.id ??
      visibleRecipes[0]?.id ??
      recipeList[0]?.id ??
      "",
    [activeRecipeId, recipeList, visibleRecipes],
  );
  const activeRecipe = useMemo(
    () =>
      recipeList.find((recipe) => recipe.id === resolvedActiveRecipeId) ??
      visibleRecipes[0] ??
      recipeList[0],
    [recipeList, resolvedActiveRecipeId, visibleRecipes],
  );
  const selectedRecipes = useMemo(
    () => recipeList.filter((recipe) => selectedRecipeIds.includes(recipe.id)),
    [recipeList, selectedRecipeIds],
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
  const stationVisibleRecipes = useMemo(
    () =>
      stationSource === "selected"
        ? visibleRecipes
        : stationBrowseRecipes.filter(
            (recipe) =>
              resolvedStationCategory.length > 0 &&
              recipe.category === resolvedStationCategory,
          ),
    [resolvedStationCategory, stationBrowseRecipes, stationSource, visibleRecipes],
  );
  const stationPayload = useMemo(
    () =>
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
        : null,
    [
      activeCategoryLabel,
      isStationOpen,
      resolvedStationCategory,
      selectedRecipes,
      stationBrowseRecipes.length,
      stationSource,
      stationVisibleRecipes,
    ],
  );
  const stationViewScope = useMemo(
    () =>
      buildStationViewScope({
        source: stationSource,
        activeCategory:
          stationSource === "selected"
            ? activeCategoryLabel
            : resolvedStationCategory || "Alla",
        selectedRecipeIds,
      }),
    [activeCategoryLabel, resolvedStationCategory, selectedRecipeIds, stationSource],
  );
  const stationToggleCategories = useMemo(
    () =>
      stationSource === "selected"
        ? [...new Set(selectedRecipes.map((recipe) => recipe.category))]
        : resolvedStationCategory
          ? [resolvedStationCategory]
          : [],
    [resolvedStationCategory, selectedRecipes, stationSource],
  );
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
      const payload = await saveRecipeRequest(normalized);
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
      window.alert(getErrorMessage(error, "Det gick inte att spara receptet. Försök igen."));
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
      const payload = await createCategoryRequest(normalizedName);
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
      window.alert(getErrorMessage(error, "Det gick inte att skapa kategorin. Försök igen."));
      return null;
    }
  }

  async function loadManagedCategories() {
    try {
      setIsCategoryManagerOpen(true);
      setIsManagingCategories(true);
      const payload = await loadManagedCategoriesRequest();
      setManagedCategories(payload.categories);
    } catch (error) {
      console.error("Could not load categories", error);
      window.alert(getErrorMessage(error, "Det gick inte att läsa kategorierna. Försök igen."));
    } finally {
      setIsManagingCategories(false);
    }
  }

  async function loadManagedStationViews() {
    try {
      setIsStationViewManagerOpen(true);
      setIsManagingStationViews(true);
      const payload = await loadManagedStationViewsRequest();
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not load station views", error);
      window.alert(getErrorMessage(error, "Det gick inte att läsa vyerna. Försök igen."));
    } finally {
      setIsManagingStationViews(false);
    }
  }

  async function renameManagedCategory(name: string, nextName: string) {
    try {
      setIsManagingCategories(true);
      const payload = await renameManagedCategoryRequest(name, nextName);

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
      window.alert(getErrorMessage(error, "Det gick inte att byta namn på kategorin. Försök igen."));
    } finally {
      setIsManagingCategories(false);
    }
  }

  async function setManagedCategoryActive(name: string, isActive: boolean) {
    try {
      setIsManagingCategories(true);
      const payload = await setManagedCategoryActiveRequest(name, isActive);

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
      window.alert(getErrorMessage(error, "Det gick inte att uppdatera kategorin. Försök igen."));
    } finally {
      setIsManagingCategories(false);
    }
  }

  async function renameManagedStationView(viewId: string, nextName: string) {
    try {
      setIsManagingStationViews(true);
      const payload = await renameManagedStationViewRequest(viewId, nextName);
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not rename station view", error);
      window.alert(getErrorMessage(error, "Det gick inte att byta namn på vyn. Försök igen."));
    } finally {
      setIsManagingStationViews(false);
    }
  }

  async function setManagedStationViewActive(viewId: string, isActive: boolean) {
    try {
      setIsManagingStationViews(true);
      const payload = await setManagedStationViewActiveRequest(viewId, isActive);
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not update station view state", error);
      window.alert(getErrorMessage(error, "Det gick inte att uppdatera vyn. Försök igen."));
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
      const payload = await deleteManagedStationViewRequest(viewId);
      setManagedStationViews(payload.views);
    } catch (error) {
      console.error("Could not delete station view", error);
      window.alert(getErrorMessage(error, "Det gick inte att radera vyn. Försök igen."));
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
      await deleteRecipeRequest(recipeId);

      setRecipeList((current) => current.filter((entry) => entry.id !== recipeId));
      setSelectedRecipeIds((current) => current.filter((id) => id !== recipeId));
      setIsDetailOpen(false);

      if (activeRecipeId === recipeId) {
        setActiveRecipeId("");
      }
    } catch (error) {
      console.error("Could not delete recipe", error);
      window.alert(getErrorMessage(error, "Det gick inte att radera receptet. Försök igen."));
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

  return (
    <>
      <section className={styles.recipePage} aria-labelledby="recipe-page-title">
        <header className={styles.pageHeader}>
          <p className={styles.pageEyebrow}>Meny</p>
          <h1 id="recipe-page-title">Meny & lägglistor</h1>
          <p className={styles.pageIntro}>
            Alla rätter på menyn med ingredienser, läggning och stationsvyer för köket.
          </p>
        </header>

        <div className={styles.recipeWorkspace}>
          <RecipeBookToolbar
            activeCategories={activeCategories}
            activeStatus={activeStatus}
            canManage={canManage}
            canOpenStation={canOpenStation}
            categoryOptions={categoryOptions}
            searchQuery={searchQuery}
            selectedRecipesCount={selectedRecipes.length}
            view={view}
            visibleRecipesCount={visibleRecipes.length}
            onOpenCategoryManager={() => void loadManagedCategories()}
            onOpenNewRecipe={() => openEditor("new")}
            onOpenStation={openStation}
            onOpenStationViewManager={() => void loadManagedStationViews()}
            onSearchQueryChange={setSearchQuery}
            onSetActiveStatus={setActiveStatus}
            onToggleCategory={toggleCategory}
            onViewChange={setView}
          />

          <RecipeBookList
            activeRecipeId={activeRecipeId}
            allVisibleSelected={allVisibleSelected}
            canManage={canManage}
            recipes={visibleRecipes}
            selectedRecipeIds={selectedRecipeIds}
            view={view}
            visibleRecipeIds={visibleRecipeIds}
            visibleSelectionRef={visibleSelectionRef}
            onOpenEditor={(recipeId) => openEditor("edit", recipeId)}
            onOpenRecipe={openRecipe}
            onToggleRecipeSelection={toggleRecipeSelection}
            onToggleVisibleRecipesSelection={toggleVisibleRecipesSelection}
          />
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
        allRecipes={recipeList}
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
