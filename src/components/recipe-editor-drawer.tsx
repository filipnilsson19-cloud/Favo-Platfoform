"use client";

import { useEffect, useRef, useState } from "react";

import {
  computeAmountSummary,
  contentItems,
  recipeStatusOptions,
  recipeUnitOptions,
} from "@/lib/recipe-utils";
import type {
  EditorMode,
  Recipe,
  RecipeCategory,
  RecipeStatus,
  RecipeUnit,
} from "@/types/recipe";

import styles from "./recipe-book.module.css";

type RecipeEditorDrawerProps = {
  categories: RecipeCategory[];
  draft: Recipe;
  isOpen: boolean;
  mode: EditorMode;
  saveLabel: string;
  canSave: boolean;
  isSaving: boolean;
  onAddItem: () => void;
  onClose: () => void;
  onCreateCategory: (name: string) => Promise<RecipeCategory | null>;
  onFieldChange: <K extends keyof Recipe>(field: K, value: Recipe[K]) => void;
  onItemChange: (
    index: number,
    field: "info" | "name" | "amount" | "unit",
    value: string,
  ) => void;
  onItemFlagToggle: (index: number, flag: "isEmphasis" | "isSpacer") => void;
  onPublish: () => void;
  onRemoveItem: (index: number) => void;
  onSaveDraft: () => void;
};

export function RecipeEditorDrawer({
  categories,
  draft,
  isOpen,
  mode,
  saveLabel,
  canSave,
  isSaving,
  onAddItem,
  onClose,
  onCreateCategory,
  onFieldChange,
  onItemChange,
  onItemFlagToggle,
  onPublish,
  onRemoveItem,
  onSaveDraft,
}: RecipeEditorDrawerProps) {
  const editorTitle =
    mode === "new"
      ? "Ny maträtt"
      : mode === "duplicate"
        ? "Duplicera rätt"
        : "Redigera rätt";
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [categoryDraft, setCategoryDraft] = useState("");
  const [isCreatingCategoryPending, setIsCreatingCategoryPending] = useState(false);
  const [categoryFeedback, setCategoryFeedback] = useState("");
  const sheetRef = useRef<HTMLElement | null>(null);
  const pendingFocusKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !pendingFocusKeyRef.current) return;

    const focusKey = pendingFocusKeyRef.current;
    pendingFocusKeyRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      const target = sheetRef.current?.querySelector<HTMLElement>(
        `[data-focus-key="${focusKey}"]`,
      );
      target?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [draft.items.length, isCreatingCategory, isOpen]);

  function focusField(key: string) {
    const target = sheetRef.current?.querySelector<HTMLElement>(
      `[data-focus-key="${key}"]`,
    );
    target?.focus();
  }

  function handleAddItemWithFocus() {
    pendingFocusKeyRef.current = `item-${draft.items.length}-info`;
    onAddItem();
  }

  function handleItemEnter(
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
    field: "info" | "name" | "amount" | "unit",
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (field === "info") {
      focusField(`item-${index}-name`);
      return;
    }

    if (field === "name") {
      focusField(`item-${index}-amount`);
      return;
    }

    if (field === "amount") {
      focusField(`item-${index}-unit`);
      return;
    }

    handleAddItemWithFocus();
  }

  async function handleCreateCategory() {
    const nextName = categoryDraft.trim();

    if (!nextName) {
      setCategoryFeedback("Skriv ett kategorinamn först.");
      return;
    }

    setCategoryFeedback("Skapar kategori...");
    setIsCreatingCategoryPending(true);

    const createdCategory = await onCreateCategory(nextName);

    if (createdCategory) {
      onFieldChange("category", createdCategory);
      setCategoryDraft("");
      setIsCreatingCategory(false);
      setCategoryFeedback("");
      pendingFocusKeyRef.current = "recipe-category";
    } else {
      setCategoryFeedback("Kunde inte skapa kategorin.");
    }

    setIsCreatingCategoryPending(false);
  }

  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
    >
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Stäng editor"
        onClick={onClose}
      />

      <article
        ref={sheetRef}
        className={`${styles.sheet} ${styles.editorSheet}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recipe-editor-title"
        >
          <header className={styles.sheetHeader}>
            <div>
              <p className={styles.pageEyebrow}>{editorTitle}</p>
              <h2 id="recipe-editor-title">{draft.title.trim() || "Ny maträtt"}</h2>
            <p className={styles.sheetIntro}>
              Skapa, ändra och publicera rätter direkt i den riktiga appen.
            </p>
          </div>

          <div className={styles.drawerActionStack}>
            <span className={styles.drawerStatusBadge}>{saveLabel}</span>
            <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
              Stäng
            </button>
          </div>
        </header>

        <div className={styles.editorGrid}>
          <section className={styles.sheetPanel}>
            <div className={styles.sectionHeading}>
              <p>Grundinfo</p>
              <h3>Maträttsdata</h3>
            </div>

            <div className={styles.editorFields}>
              <label className={styles.fieldGroup}>
                <span>Namn</span>
                <input
                  data-focus-key="recipe-title"
                  className={styles.editorInput}
                  type="text"
                  value={draft.title}
                  onChange={(event) => onFieldChange("title", event.target.value)}
                />
              </label>

              <label className={styles.fieldGroup}>
                <span>Kategori</span>
                <div className={styles.categoryControl}>
                  <select
                    data-focus-key="recipe-category"
                    className={styles.editorInput}
                    value={draft.category}
                    onChange={(event) =>
                      onFieldChange("category", event.target.value as RecipeCategory)
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>

                  <button
                    className={styles.categoryAddButton}
                    type="button"
                    aria-label="Skapa ny kategori"
                    onClick={() => {
                      setIsCreatingCategory((current) => {
                        const next = !current;
                        if (next) {
                          pendingFocusKeyRef.current = "recipe-new-category";
                        }
                        return next;
                      });
                      setCategoryFeedback("");
                    }}
                  >
                    +
                  </button>
                </div>

                {isCreatingCategory ? (
                  <div className={styles.categoryCreatePanel}>
                    <input
                      data-focus-key="recipe-new-category"
                      className={styles.editorInput}
                      type="text"
                      placeholder="Ny kategori"
                      value={categoryDraft}
                      onChange={(event) => setCategoryDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void handleCreateCategory();
                      }}
                    />
                    <button
                      className={styles.drawerButtonSecondary}
                      type="button"
                      disabled={isCreatingCategoryPending}
                      onClick={() => void handleCreateCategory()}
                    >
                      {isCreatingCategoryPending ? "Skapar..." : "Lägg till"}
                    </button>
                  </div>
                ) : null}

                {isCreatingCategory && categoryFeedback ? (
                  <span className={styles.fieldHint}>{categoryFeedback}</span>
                ) : null}
              </label>

              <label className={styles.fieldGroup}>
                <span>Portioner</span>
                <input
                  data-focus-key="recipe-servings"
                  className={styles.editorInput}
                  type="number"
                  min="1"
                  value={draft.servings}
                  onChange={(event) =>
                    onFieldChange("servings", Number(event.target.value || 1))
                  }
                />
              </label>

              <label className={styles.fieldGroup}>
                <span>Status</span>
                <select
                  data-focus-key="recipe-status"
                  className={styles.editorInput}
                  value={draft.status}
                  onChange={(event) =>
                    onFieldChange("status", event.target.value as RecipeStatus)
                  }
                >
                  {recipeStatusOptions.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>

              <label className={styles.fieldGroupWide}>
                <span>Allergener</span>
                <input
                  data-focus-key="recipe-allergens"
                  className={styles.editorInput}
                  type="text"
                  value={draft.allergens}
                  onChange={(event) => onFieldChange("allergens", event.target.value)}
                />
              </label>

              <label className={styles.fieldGroupWide}>
                <span>Notering</span>
                <textarea
                  data-focus-key="recipe-notes"
                  className={styles.editorTextarea}
                  value={draft.notes}
                  onChange={(event) => onFieldChange("notes", event.target.value)}
                />
              </label>
            </div>
          </section>

          <aside className={styles.editorSidebar}>
            <section className={styles.sheetPanel}>
              <div className={styles.sectionHeading}>
                <p>Översikt</p>
                <h3>Snabbstatus</h3>
              </div>

              <div className={styles.summaryGrid}>
                <div className={styles.summaryCard}>
                  <span>Rader</span>
                  <strong>{contentItems(draft.items).length}</strong>
                </div>
                <div className={styles.summaryCard}>
                  <span>Total</span>
                  <strong>{computeAmountSummary(draft.items)}</strong>
                </div>
                <div className={styles.summaryCard}>
                  <span>Status</span>
                  <strong>{draft.status}</strong>
                </div>
              </div>
            </section>
          </aside>
        </div>

        <section className={styles.sheetPanel}>
          <div className={styles.editorListHeader}>
            <div className={styles.sectionHeading}>
              <p>Lägglista</p>
              <h3>Komponenter</h3>
            </div>

            <button
              className={styles.drawerButtonSecondary}
              type="button"
              onClick={handleAddItemWithFocus}
            >
              Ny rad
            </button>
          </div>

          <div className={styles.editorTableHeader}>
            <span>Info</span>
            <span>Komponent</span>
            <span>Mängd</span>
            <span>Mått</span>
            <span>Verktyg</span>
          </div>

          <div className={styles.editorItems}>
            {draft.items.map((item, index) => (
              <div
                key={`${draft.id || "draft"}-${index}`}
                className={`${styles.editorRow} ${item.isSpacer ? styles.editorRowSpacer : ""}`}
              >
                <input
                  data-focus-key={`item-${index}-info`}
                  className={styles.editorInput}
                  type="text"
                  placeholder="slungas"
                  value={item.info}
                  onChange={(event) => onItemChange(index, "info", event.target.value)}
                  onKeyDown={(event) => handleItemEnter(event, index, "info")}
                />

                <input
                  data-focus-key={`item-${index}-name`}
                  className={styles.editorInput}
                  type="text"
                  placeholder="Komponent"
                  value={item.name}
                  onChange={(event) => onItemChange(index, "name", event.target.value)}
                  onKeyDown={(event) => handleItemEnter(event, index, "name")}
                />

                <input
                  data-focus-key={`item-${index}-amount`}
                  className={styles.editorInput}
                  type="text"
                  placeholder="35"
                  value={item.amount}
                  onChange={(event) => onItemChange(index, "amount", event.target.value)}
                  onKeyDown={(event) => handleItemEnter(event, index, "amount")}
                />

                <select
                  data-focus-key={`item-${index}-unit`}
                  className={styles.editorInput}
                  value={item.unit}
                  onChange={(event) =>
                    onItemChange(index, "unit", event.target.value as RecipeUnit)
                  }
                  onKeyDown={(event) => handleItemEnter(event, index, "unit")}
                >
                  {recipeUnitOptions.map((unit) => (
                    <option key={unit.value} value={unit.value}>
                      {unit.label}
                    </option>
                  ))}
                </select>

                <div className={styles.editorRowControls}>
                  <button
                    className={`${styles.iconButton} ${
                      item.isEmphasis ? styles.iconButtonActive : ""
                    }`}
                    type="button"
                    aria-pressed={item.isEmphasis}
                    onClick={() => onItemFlagToggle(index, "isEmphasis")}
                  >
                    B
                  </button>
                  <button
                    className={`${styles.iconButton} ${
                      item.isSpacer ? styles.iconButtonActive : ""
                    }`}
                    type="button"
                    aria-pressed={item.isSpacer}
                    onClick={() => onItemFlagToggle(index, "isSpacer")}
                  >
                    Luft
                  </button>
                  <button
                    className={styles.iconButton}
                    type="button"
                    onClick={() => onRemoveItem(index)}
                  >
                    Ta bort
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <footer className={styles.editorFooter}>
          <button
            className={styles.drawerButtonSecondary}
            type="button"
            disabled={!canSave || isSaving}
            onClick={onSaveDraft}
          >
            {isSaving ? "Sparar..." : "Spara"}
          </button>
          <button
            className={styles.drawerButtonPrimary}
            type="button"
            disabled={!canSave || isSaving}
            onClick={onPublish}
          >
            {isSaving ? "Sparar..." : "Publicera"}
          </button>
        </footer>
      </article>
    </section>
  );
}
