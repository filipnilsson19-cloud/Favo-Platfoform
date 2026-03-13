"use client";

import dynamic from "next/dynamic";
import { useDeferredValue, useEffect, useState } from "react";

import {
  blankPrepRecipe,
  clonePrepRecipe,
} from "@/lib/prep-utils";
import {
  createPrepCategoryRequest,
  deletePrepRecipeRequest,
  loadManagedPrepCategoriesRequest,
  renameManagedPrepCategoryRequest,
  savePrepRecipeRequest,
  setManagedPrepCategoryActiveRequest,
} from "@/lib/prep-api";
import type { AppPrepCategory, PrepBatch, PrepEditorMode, PrepIngredient, PrepRecipe } from "@/types/prep";
import styles from "./prep-book.module.css";
import { useAppUser } from "./app-user-provider";
import { PrepBookList } from "./prep-book-list";
import { PrepBookToolbar } from "./prep-book-toolbar";
import { PrepCategoryManager } from "./prep-category-manager";

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

type PrepBookProps = {
  recipes: PrepRecipe[];
  categories: string[];
};

export function PrepBook({ recipes: initialRecipes, categories: initialCategories }: PrepBookProps) {
  const { role } = useAppUser();
  const canManage = role === "admin";
  const [recipeList, setRecipeList] = useState<PrepRecipe[]>(initialRecipes);
  const [categoryList, setCategoryList] = useState<string[]>(initialCategories);
  const [activeCategories, setActiveCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeRecipeId, setActiveRecipeId] = useState("");
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  const [batchRecipeId, setBatchRecipeId] = useState("");
  const [editorMode, setEditorMode] = useState<PrepEditorMode>("new");
  const [editorDraft, setEditorDraft] = useState<PrepRecipe>(() => blankPrepRecipe());
  const [isSaving, setIsSaving] = useState(false);
  const [managedCategories, setManagedCategories] = useState<AppPrepCategory[]>([]);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [newBatch, setNewBatch] = useState<PrepBatch | null>(null);

  const deferredSearch = useDeferredValue(searchQuery);
  const normalized = deferredSearch.trim().toLowerCase();

  const availableCategories = [...new Set(recipeList.map((r) => r.category))].sort();

  const visibleRecipes = recipeList.filter((recipe) => {
    if (recipe.status === "Inaktiv" && !canManage) return false;
    const categoryMatch =
      activeCategories.length === 0 || activeCategories.includes(recipe.category);
    if (!categoryMatch) return false;
    if (!normalized) return true;
    const haystack = [recipe.title, recipe.category, recipe.allergens, recipe.notes,
      ...recipe.ingredients.map((i) => `${i.name} ${i.info}`),
      ...recipe.steps.map((s) => s.description),
    ].join(" ").toLowerCase();
    return haystack.includes(normalized);
  });

  const activeRecipe = recipeList.find((r) => r.id === activeRecipeId) ?? visibleRecipes[0];
  const batchRecipe = recipeList.find((r) => r.id === batchRecipeId);

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
    if (cat === "Alla") { setActiveCategories([]); return; }
    setActiveCategories((cur) => {
      const next = cur.includes(cat) ? cur.filter((c) => c !== cat) : [...cur, cat];
      return next.length === availableCategories.length ? [] : next;
    });
  }

  function openRecipe(id: string) {
    setActiveRecipeId(id);
    setIsEditorOpen(false);
    setIsDetailOpen(true);
  }

  function openBatch(id: string) {
    setBatchRecipeId(id);
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
      window.alert("Det gick inte att spara. Försök igen.");
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
    } catch {
      window.alert("Det gick inte att radera. Försök igen.");
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
    try {
      const payload = await loadManagedPrepCategoriesRequest();
      setManagedCategories(payload.categories);
      setIsCategoryManagerOpen(true);
    } catch {
      window.alert("Det gick inte att läsa kategorier.");
    }
  }

  async function renameCategory(name: string, nextName: string) {
    const payload = await renameManagedPrepCategoryRequest(name, nextName);
    setManagedCategories(payload.categories);
    setCategoryList((cur) => cur.map((c) => (c === name ? nextName : c)).sort());
    setRecipeList((cur) => cur.map((r) => r.category === name ? { ...r, category: nextName } : r));
  }

  async function toggleCategoryActive(name: string, isActive: boolean) {
    const payload = await setManagedPrepCategoryActiveRequest(name, isActive);
    setManagedCategories(payload.categories);
    if (!isActive) {
      setCategoryList((cur) => cur.filter((c) => c !== name));
    } else {
      setCategoryList((cur) => [...cur, name].sort());
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
          activeCategories={activeCategories}
          categoryOptions={availableCategories}
          searchQuery={searchQuery}
          visibleCount={visibleRecipes.length}
          canManage={canManage}
          onToggleCategory={toggleCategory}
          onSearchChange={setSearchQuery}
          onOpenNewRecipe={() => openEditor("new")}
          onOpenCategoryManager={() => void openCategoryManager()}
        />

        <PrepBookList
          activeRecipeId={activeRecipeId}
          canManage={canManage}
          recipes={visibleRecipes}
          onOpenRecipe={openRecipe}
          onOpenEditor={(id) => openEditor("edit", id)}
          onOpenBatch={openBatch}
        />
      </section>

      <PrepDetailDrawer
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
    </>
  );
}
