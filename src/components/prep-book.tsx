"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  blankPrepRecipe,
  clonePrepRecipe,
} from "@/lib/prep-utils";
import {
  createPrepCategoryRequest,
  createPrepStorageOptionRequest,
  createPrepUnitRequest,
  deletePrepRecipeRequest,
  loadManagedPrepCategoriesRequest,
  loadManagedPrepStorageOptionsRequest,
  loadManagedPrepUnitsRequest,
  renameManagedPrepStorageOptionRequest,
  renameManagedPrepUnitRequest,
  renameManagedPrepCategoryRequest,
  savePrepRecipeRequest,
  setManagedPrepCategoryActiveRequest,
  setManagedPrepStorageOptionActiveRequest,
  setManagedPrepUnitActiveRequest,
} from "@/lib/prep-api";
import type {
  AppPrepCategory,
  AppPrepOption,
  PrepBatch,
  PrepEditorMode,
  PrepIngredient,
  PrepRecipe,
} from "@/types/prep";
import styles from "./prep-book.module.css";
import { useAppUser } from "./app-user-provider";
import { PrepBookList } from "./prep-book-list";
import { PrepBookToolbar } from "./prep-book-toolbar";
import { PrepCategoryManager } from "./prep-category-manager";
import { PrepOptionManager } from "./prep-option-manager";
import type { PrepActiveStatus, PrepViewMode } from "./prep-book-types";

const PrepDetailDrawer = dynamic(
  () => import("./prep-detail-drawer").then((m) => ({ default: m.PrepDetailDrawer })),
  { ssr: false },
);

const PrepEditorDrawer = dynamic(
  () => import("./prep-editor-drawer").then((m) => ({ default: m.PrepEditorDrawer })),
  { ssr: false },
);

const PrepBatchModal = dynamic(
  () => import("./prep-batch-modal").then((m) => ({ default: m.PrepBatchModal })),
  { ssr: false },
);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

type PrepBookProps = {
  recipes: PrepRecipe[];
  categories: string[];
  unitOptions: string[];
  storageOptions: string[];
};

function sortSv(values: Iterable<string>) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b, "sv"));
}

function derivePrepUnitOptions(recipes: PrepRecipe[], managedOptions: AppPrepOption[]) {
  return sortSv([
    ...managedOptions.filter((option) => option.isActive).map((option) => option.name),
    ...recipes.map((recipe) => recipe.yieldUnit).filter(Boolean),
    ...recipes.flatMap((recipe) => recipe.ingredients.map((ingredient) => ingredient.unit)).filter(Boolean),
  ]);
}

function derivePrepStorageOptions(recipes: PrepRecipe[], managedOptions: AppPrepOption[]) {
  return sortSv([
    ...managedOptions.filter((option) => option.isActive).map((option) => option.name),
    ...recipes.map((recipe) => recipe.storage).filter(Boolean),
  ]);
}

export function PrepBook({
  recipes: initialRecipes,
  categories: initialCategories,
  unitOptions: initialUnitOptions,
  storageOptions: initialStorageOptions,
}: PrepBookProps) {
  const { role } = useAppUser();
  const canManage = role === "admin";
  const [recipeList, setRecipeList] = useState<PrepRecipe[]>(initialRecipes);
  const [categoryList, setCategoryList] = useState<string[]>(initialCategories);
  const [unitOptionList, setUnitOptionList] = useState<string[]>(initialUnitOptions);
  const [storageOptionList, setStorageOptionList] = useState<string[]>(initialStorageOptions);
  const [activeCategory, setActiveCategory] = useState<string>("Alla");
  const [activeStatus, setActiveStatus] = useState<PrepActiveStatus>("Alla");
  const [searchQuery, setSearchQuery] = useState("");
  const [view, setView] = useState<PrepViewMode>("table");
  const [activeRecipeId, setActiveRecipeId] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchRecipeId, setBatchRecipeId] = useState("");
  const [batchMultiplier, setBatchMultiplier] = useState(1);
  const [editorMode, setEditorMode] = useState<PrepEditorMode>("new");
  const [editorDraft, setEditorDraft] = useState<PrepRecipe>(() => blankPrepRecipe());
  const [isSaving, setIsSaving] = useState(false);
  const [managedCategories, setManagedCategories] = useState<AppPrepCategory[]>([]);
  const [managedUnits, setManagedUnits] = useState<AppPrepOption[]>([]);
  const [managedStorageOptions, setManagedStorageOptions] = useState<AppPrepOption[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [isUnitManagerOpen, setIsUnitManagerOpen] = useState(false);
  const [isStorageManagerOpen, setIsStorageManagerOpen] = useState(false);
  const [newBatch, setNewBatch] = useState<PrepBatch | null>(null);

  const deferredSearch = useDeferredValue(searchQuery);
  const normalized = deferredSearch.trim().toLowerCase();

  const availableCategories = useMemo(
    () => [...new Set(recipeList.map((r) => r.category))].sort((a, b) => a.localeCompare(b, "sv")),
    [recipeList],
  );

  const visibleRecipes = useMemo(
    () =>
      recipeList.filter((recipe) => {
        if (recipe.status === "Inaktiv" && !canManage) return false;
        if (activeStatus !== "Alla" && recipe.status !== activeStatus) return false;
        const categoryMatch =
          activeCategory === "Alla" || recipe.category === activeCategory;
        if (!categoryMatch) return false;
        if (!normalized) return true;
        const haystack = [
          recipe.title,
          recipe.category,
          recipe.allergens,
          recipe.notes,
          ...recipe.ingredients.map((i) => `${i.name} ${i.info}`),
          ...recipe.steps.map((s) => s.description),
        ]
          .join(" ")
          .toLowerCase();
        return haystack.includes(normalized);
      }),
    [activeCategory, activeStatus, canManage, normalized, recipeList],
  );

  const activeRecipe = useMemo(
    () => recipeList.find((r) => r.id === activeRecipeId) ?? visibleRecipes[0],
    [activeRecipeId, recipeList, visibleRecipes],
  );
  const batchRecipe = useMemo(
    () => recipeList.find((r) => r.id === batchRecipeId),
    [batchRecipeId, recipeList],
  );

  useEffect(() => {
    document.body.classList.toggle("favo-lock-scroll", isDetailOpen || isEditorOpen);
    return () => document.body.classList.remove("favo-lock-scroll");
  }, [isDetailOpen, isEditorOpen]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      setIsDetailOpen(false);
      setIsEditorOpen(false);
      setIsBatchOpen(false);
      setIsCategoryManagerOpen(false);
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  function toggleCategory(cat: string) {
    setActiveCategory(cat);
  }

  function openRecipe(id: string) {
    setActiveRecipeId(id);
    setIsEditorOpen(false);
    setIsDetailOpen(true);
  }

  function openBatch(id: string, multiplier = 1) {
    setBatchRecipeId(id);
    setBatchMultiplier(multiplier);
    setIsBatchOpen(true);
  }

  function openEditor(mode: PrepEditorMode, id?: string) {
    if (!canManage) return;
    setEditorMode(mode);
    setIsDetailOpen(false);
    if (mode === "new") {
      setEditorDraft(blankPrepRecipe());
    } else {
      const source = recipeList.find((r) => r.id === id);
      if (!source) return;
      setActiveRecipeId(source.id);
      setEditorDraft(clonePrepRecipe(source));
    }
    setIsEditorOpen(true);
  }

  function updateDraftField<K extends keyof PrepRecipe>(field: K, value: PrepRecipe[K]) {
    setEditorDraft((cur) => ({ ...cur, [field]: value }));
  }

  function updateIngredient(index: number, field: keyof PrepIngredient, value: string) {
    setEditorDraft((cur) => ({
      ...cur,
      ingredients: cur.ingredients.map((ing, i) =>
        i === index ? { ...ing, [field]: value } : ing,
      ),
    }));
  }

  function addIngredient() {
    setEditorDraft((cur) => ({
      ...cur,
      ingredients: [...cur.ingredients, { info: "", name: "", amount: "", unit: "g" }],
    }));
  }

  function removeIngredient(index: number) {
    setEditorDraft((cur) => ({
      ...cur,
      ingredients:
        cur.ingredients.length === 1
          ? [{ info: "", name: "", amount: "", unit: "g" }]
          : cur.ingredients.filter((_, i) => i !== index),
    }));
  }

  function updateStep(index: number, value: string) {
    setEditorDraft((cur) => ({
      ...cur,
      steps: cur.steps.map((s, i) => (i === index ? { description: value } : s)),
    }));
  }

  function addStep() {
    setEditorDraft((cur) => ({ ...cur, steps: [...cur.steps, { description: "" }] }));
  }

  function removeStep(index: number) {
    setEditorDraft((cur) => ({
      ...cur,
      steps:
        cur.steps.length === 1
          ? [{ description: "" }]
          : cur.steps.filter((_, i) => i !== index),
    }));
  }

  const canSave =
    editorDraft.title.trim().length > 0 && editorDraft.category.trim().length > 0;

  async function saveRecipe() {
    if (!canSave || isSaving) return;
    setIsSaving(true);
    try {
      const payload = await savePrepRecipeRequest(editorDraft);
      const saved = payload.recipe;
      setRecipeList((cur) => {
        const idx = cur.findIndex((r) => r.id === saved.id);
        if (idx === -1) return [saved, ...cur];
        return cur.map((r, i) => (i === idx ? saved : r));
      });
      if (!categoryList.includes(saved.category)) {
        setCategoryList((cur) => [...cur, saved.category].sort());
      }
      setActiveRecipeId(saved.id);
      setIsEditorOpen(false);
      setIsDetailOpen(true);
    } catch (error) {
      console.error("Failed to save prep recipe", error);
      window.alert(getErrorMessage(error, "Det gick inte att spara. Försök igen."));
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteRecipe(id: string) {
    const recipe = recipeList.find((r) => r.id === id);
    if (!window.confirm(`Vill du radera "${recipe?.title}"? Det går inte att ångra.`)) return;
    try {
      await deletePrepRecipeRequest(id);
      setRecipeList((cur) => cur.filter((r) => r.id !== id));
      setIsDetailOpen(false);
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att radera. Försök igen."));
    }
  }

  async function createCategory(name: string): Promise<string | null> {
    try {
      const payload = await createPrepCategoryRequest(name);
      setCategoryList((cur) => [...cur, payload.category].sort());
      setManagedCategories((cur) => {
        const exists = cur.some((c) => c.name === payload.category);
        if (exists) return cur;
        return [...cur, { id: payload.category, name: payload.category, isActive: true, recipeCount: 0 }].sort((a, b) => a.name.localeCompare(b.name, "sv"));
      });
      return payload.category;
    } catch {
      window.alert("Det gick inte att skapa kategorin.");
      return null;
    }
  }

  async function openCategoryManager() {
    setIsCategoryManagerOpen(true);
    try {
      const payload = await loadManagedPrepCategoriesRequest();
      setManagedCategories(payload.categories);
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att läsa kategorier."));
    }
  }

  async function renameCategory(name: string, nextName: string) {
    try {
      const payload = await renameManagedPrepCategoryRequest(name, nextName);
      setManagedCategories(payload.categories);
      setCategoryList((cur) => cur.map((c) => (c === name ? nextName : c)).sort());
      setRecipeList((cur) => cur.map((r) => r.category === name ? { ...r, category: nextName } : r));
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att byta namn på kategorin."));
    }
  }

  async function toggleCategoryActive(name: string, isActive: boolean) {
    try {
      const payload = await setManagedPrepCategoryActiveRequest(name, isActive);
      setManagedCategories(payload.categories);
      if (!isActive) {
        setCategoryList((cur) => cur.filter((c) => c !== name));
      } else {
        setCategoryList((cur) => [...cur, name].sort());
      }
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att uppdatera kategorin."));
    }
  }

  async function createUnitOption(name: string): Promise<string | null> {
    try {
      const payload = await createPrepUnitRequest(name);
      setManagedUnits(payload.options);
      setUnitOptionList(derivePrepUnitOptions(recipeList, payload.options));
      return payload.option;
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att skapa mått/enhet."));
      return null;
    }
  }

  async function openUnitManager() {
    setIsUnitManagerOpen(true);
    try {
      const payload = await loadManagedPrepUnitsRequest();
      setManagedUnits(payload.options);
      setUnitOptionList(derivePrepUnitOptions(recipeList, payload.options));
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att läsa mått/enheter."));
    }
  }

  async function renameUnitOption(name: string, nextName: string) {
    try {
      const payload = await renameManagedPrepUnitRequest(name, nextName);
      setManagedUnits(payload.options);
      setRecipeList((cur) =>
        cur.map((recipe) => ({
          ...recipe,
          yieldUnit: recipe.yieldUnit === name ? nextName : recipe.yieldUnit,
          ingredients: recipe.ingredients.map((ingredient) =>
            ingredient.unit === name ? { ...ingredient, unit: nextName } : ingredient,
          ),
        })),
      );
      setEditorDraft((cur) => ({
        ...cur,
        yieldUnit: cur.yieldUnit === name ? nextName : cur.yieldUnit,
        ingredients: cur.ingredients.map((ingredient) =>
          ingredient.unit === name ? { ...ingredient, unit: nextName } : ingredient,
        ),
      }));
      setUnitOptionList(
        derivePrepUnitOptions(
          recipeList.map((recipe) => ({
            ...recipe,
            yieldUnit: recipe.yieldUnit === name ? nextName : recipe.yieldUnit,
            ingredients: recipe.ingredients.map((ingredient) =>
              ingredient.unit === name ? { ...ingredient, unit: nextName } : ingredient,
            ),
          })),
          payload.options,
        ),
      );
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att byta namn på mått/enhet."));
    }
  }

  async function toggleUnitOptionActive(name: string, isActive: boolean) {
    try {
      const payload = await setManagedPrepUnitActiveRequest(name, isActive);
      setManagedUnits(payload.options);
      setUnitOptionList(derivePrepUnitOptions(recipeList, payload.options));
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att uppdatera mått/enhet."));
    }
  }

  async function createStorageOption(name: string): Promise<string | null> {
    try {
      const payload = await createPrepStorageOptionRequest(name);
      setManagedStorageOptions(payload.options);
      setStorageOptionList(derivePrepStorageOptions(recipeList, payload.options));
      return payload.option;
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att skapa förvaring."));
      return null;
    }
  }

  async function openStorageManager() {
    setIsStorageManagerOpen(true);
    try {
      const payload = await loadManagedPrepStorageOptionsRequest();
      setManagedStorageOptions(payload.options);
      setStorageOptionList(derivePrepStorageOptions(recipeList, payload.options));
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att läsa förvaringsalternativ."));
    }
  }

  async function renameStorageOption(name: string, nextName: string) {
    try {
      const payload = await renameManagedPrepStorageOptionRequest(name, nextName);
      setManagedStorageOptions(payload.options);
      setRecipeList((cur) =>
        cur.map((recipe) => (recipe.storage === name ? { ...recipe, storage: nextName } : recipe)),
      );
      setEditorDraft((cur) => ({
        ...cur,
        storage: cur.storage === name ? nextName : cur.storage,
      }));
      setStorageOptionList(
        derivePrepStorageOptions(
          recipeList.map((recipe) => (recipe.storage === name ? { ...recipe, storage: nextName } : recipe)),
          payload.options,
        ),
      );
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att byta namn på förvaring."));
    }
  }

  async function toggleStorageOptionActive(name: string, isActive: boolean) {
    try {
      const payload = await setManagedPrepStorageOptionActiveRequest(name, isActive);
      setManagedStorageOptions(payload.options);
      setStorageOptionList(derivePrepStorageOptions(recipeList, payload.options));
    } catch (error) {
      window.alert(getErrorMessage(error, "Det gick inte att uppdatera förvaring."));
    }
  }

  return (
    <>
      <section className={styles.prepPage} aria-labelledby="prep-page-title">
        <header className={styles.pageHeader}>
          <p className={styles.pageEyebrow}>Produktionsprepp</p>
          <h1 id="prep-page-title">Preppbank</h1>
          <p className={styles.pageIntro}>
            Hur varje ingrediens tillagas — med steg-för-steg-instruktioner och batchlogg.
          </p>
        </header>

        <PrepBookToolbar
          activeCategory={activeCategory}
          activeStatus={activeStatus}
          categoryOptions={availableCategories}
          searchQuery={searchQuery}
          visibleCount={visibleRecipes.length}
          view={view}
          canManage={canManage}
          onToggleCategory={toggleCategory}
          onSetActiveStatus={setActiveStatus}
          onSearchChange={setSearchQuery}
          onViewChange={setView}
          onOpenNewRecipe={() => openEditor("new")}
          onOpenCategoryManager={() => void openCategoryManager()}
          onOpenUnitManager={() => void openUnitManager()}
          onOpenStorageManager={() => void openStorageManager()}
        />

        <PrepBookList
          activeRecipeId={activeRecipeId}
          canManage={canManage}
          recipes={visibleRecipes}
          view={view}
          onOpenRecipe={openRecipe}
          onOpenEditor={(id) => openEditor("edit", id)}
        />
      </section>

      <PrepDetailDrawer
        key={activeRecipe?.id || "prep-detail"}
        recipe={activeRecipe}
        isOpen={isDetailOpen}
        canManage={canManage}
        newBatch={newBatch}
        onClose={() => setIsDetailOpen(false)}
        onEdit={(id) => openEditor("edit", id)}
        onDelete={(id) => void deleteRecipe(id)}
        onOpenBatch={openBatch}
      />

      {canManage ? (
        <PrepEditorDrawer
          key={`${editorMode}-${editorDraft.id || "new"}-${isEditorOpen}`}
          draft={editorDraft}
          isOpen={isEditorOpen}
          isSaving={isSaving}
          mode={editorMode}
          canSave={canSave}
          categoryOptions={categoryList}
          unitOptions={unitOptionList}
          storageOptions={storageOptionList}
          onClose={() => setIsEditorOpen(false)}
          onFieldChange={updateDraftField}
          onIngredientChange={updateIngredient}
          onAddIngredient={addIngredient}
          onRemoveIngredient={removeIngredient}
          onStepChange={updateStep}
          onAddStep={addStep}
          onRemoveStep={removeStep}
          onSave={() => void saveRecipe()}
          onCreateCategory={createCategory}
        />
      ) : null}

      {isBatchOpen && batchRecipe ? (
        <PrepBatchModal
          recipe={batchRecipe}
          initialMultiplier={batchMultiplier}
          onClose={() => setIsBatchOpen(false)}
          onLogged={(batch) => {
            setNewBatch(batch);
            setIsBatchOpen(false);
          }}
        />
      ) : null}

      {canManage && isCategoryManagerOpen ? (
        <PrepCategoryManager
          categories={managedCategories}
          onClose={() => setIsCategoryManagerOpen(false)}
          onRename={renameCategory}
          onToggleActive={toggleCategoryActive}
          onCreateCategory={createCategory}
        />
      ) : null}

      {canManage && isUnitManagerOpen ? (
        <PrepOptionManager
          items={managedUnits}
          title="Hantera mått/enhet"
          emptyLabel="Inga mått eller enheter ännu."
          createPlaceholder="Ny enhet eller nytt mått..."
          onClose={() => setIsUnitManagerOpen(false)}
          onRename={renameUnitOption}
          onToggleActive={toggleUnitOptionActive}
          onCreate={createUnitOption}
        />
      ) : null}

      {canManage && isStorageManagerOpen ? (
        <PrepOptionManager
          items={managedStorageOptions}
          title="Hantera förvaring"
          emptyLabel="Inga förvaringsalternativ ännu."
          createPlaceholder="Ny förvaring..."
          onClose={() => setIsStorageManagerOpen(false)}
          onRename={renameStorageOption}
          onToggleActive={toggleStorageOptionActive}
          onCreate={createStorageOption}
        />
      ) : null}
    </>
  );
}
