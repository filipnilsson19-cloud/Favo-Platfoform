"use client";

import { useEffect, useRef } from "react";

import { computePrepAmountSummary, prepStatusOptions } from "@/lib/prep-utils";
import type { PrepEditorMode, PrepIngredient, PrepRecipe, PrepStatus } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepEditorDrawerProps = {
  draft: PrepRecipe;
  isOpen: boolean;
  isSaving: boolean;
  mode: PrepEditorMode;
  canSave: boolean;
  categoryOptions: string[];
  unitOptions: string[];
  storageOptions: string[];
  onClose: () => void;
  onFieldChange: <K extends keyof PrepRecipe>(field: K, value: PrepRecipe[K]) => void;
  onIngredientChange: (index: number, field: keyof PrepIngredient, value: string) => void;
  onAddIngredient: () => void;
  onRemoveIngredient: (index: number) => void;
  onStepChange: (index: number, value: string) => void;
  onAddStep: () => void;
  onRemoveStep: (index: number) => void;
  onSave: () => void;
  onCreateCategory: (name: string) => Promise<string | null>;
};

export function PrepEditorDrawer({
  draft,
  isOpen,
  isSaving,
  mode,
  canSave,
  categoryOptions,
  unitOptions,
  storageOptions,
  onClose,
  onFieldChange,
  onIngredientChange,
  onAddIngredient,
  onRemoveIngredient,
  onStepChange,
  onAddStep,
  onRemoveStep,
  onSave,
  onCreateCategory,
}: PrepEditorDrawerProps) {
  const drawerRef = useRef<HTMLDivElement | null>(null);
  const pendingFocusKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!isOpen || !pendingFocusKeyRef.current) return;

    const focusKey = pendingFocusKeyRef.current;
    pendingFocusKeyRef.current = null;

    const frameId = window.requestAnimationFrame(() => {
      const target = drawerRef.current?.querySelector<HTMLElement>(
        `[data-focus-key="${focusKey}"]`,
      );
      target?.focus();
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [draft.ingredients.length, draft.steps.length, isOpen]);

  function focusField(key: string) {
    const target = drawerRef.current?.querySelector<HTMLElement>(
      `[data-focus-key="${key}"]`,
    );
    target?.focus();
  }

  function queueFocus(key: string) {
    pendingFocusKeyRef.current = key;
  }

  function handleAddIngredientWithFocus() {
    queueFocus(`ingredient-${draft.ingredients.length}-amount`);
    onAddIngredient();
  }

  function handleAddStepWithFocus() {
    queueFocus(`step-${draft.steps.length}`);
    onAddStep();
  }

  function handleIngredientEnter(
    event: React.KeyboardEvent<HTMLInputElement | HTMLSelectElement>,
    index: number,
    field: keyof PrepIngredient,
  ) {
    if (event.key !== "Enter") return;

    event.preventDefault();

    if (field === "amount") {
      focusField(`ingredient-${index}-name`);
      return;
    }

    if (field === "name") {
      focusField(`ingredient-${index}-unit`);
      return;
    }

    if (field === "unit") {
      focusField(`ingredient-${index}-info`);
      return;
    }

    handleAddIngredientWithFocus();
  }

  function handleStepEnter(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
    index: number,
  ) {
    if (event.key !== "Enter" || event.shiftKey) return;

    event.preventDefault();

    if (index < draft.steps.length - 1) {
      focusField(`step-${index + 1}`);
      return;
    }

    handleAddStepWithFocus();
  }

  async function handleNewCategory() {
    const name = window.prompt("Namn på ny kategori:");
    if (!name?.trim()) return;
    const created = await onCreateCategory(name.trim());
    if (created) {
      onFieldChange("category", created);
    }
  }

  return (
    <div className={[styles.drawer, isOpen ? styles.drawerOpen : ""].join(" ")}>
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Stäng"
        onClick={onClose}
      />
      <div ref={drawerRef} className={[styles.sheet, styles.editorSheet].join(" ")}>
        <div className={styles.sheetHeader}>
          <h2>{mode === "new" ? "Nytt prepprecept" : "Redigera prepprecept"}</h2>
          <div className={styles.sheetActions}>
            <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
              Avbryt
            </button>
            <button
              className={styles.drawerButtonPrimary}
              type="button"
              disabled={!canSave || isSaving}
              onClick={onSave}
            >
              {isSaving ? "Sparar..." : "Spara"}
            </button>
          </div>
        </div>

        <div className={styles.editorGrid}>
          {/* Left: fields + ingredients + steps */}
          <div>
            <div className={styles.editorFields}>
              <div className={styles.fieldGroupWide}>
                <span>Namn</span>
                <input
                  data-focus-key="prep-title"
                  className={styles.editorInput}
                  type="text"
                  value={draft.title}
                  placeholder="Namn på preppreceptet"
                  onChange={(e) => onFieldChange("title", e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <span>Kategori</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.4rem" }}>
                  <select
                    data-focus-key="prep-category"
                    className={styles.editorSelect}
                    value={draft.category}
                    onChange={(e) => onFieldChange("category", e.target.value)}
                  >
                    <option value="">Välj kategori</option>
                    {categoryOptions.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                  <button
                    className={styles.iconButton}
                    type="button"
                    title="Ny kategori"
                    onClick={() => void handleNewCategory()}
                  >
                    +
                  </button>
                </div>
              </div>

              <div className={styles.fieldGroup}>
                <span>Status</span>
                <select
                  data-focus-key="prep-status"
                  className={styles.editorSelect}
                  value={draft.status}
                  onChange={(e) => onFieldChange("status", e.target.value as PrepStatus)}
                >
                  {prepStatusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <span>Förvaring</span>
                <select
                  data-focus-key="prep-storage"
                  className={styles.editorSelect}
                  value={draft.storage}
                  onChange={(e) => onFieldChange("storage", e.target.value)}
                >
                  {storageOptions.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroup}>
                <span>Hållbarhet (dagar)</span>
                <input
                  data-focus-key="prep-shelf-life"
                  className={styles.editorInput}
                  type="number"
                  min={1}
                  max={365}
                  value={draft.shelfLifeDays}
                  onChange={(e) => onFieldChange("shelfLifeDays", parseInt(e.target.value) || 1)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <span>Standardsats</span>
                <input
                  data-focus-key="prep-default-yield"
                  className={styles.editorInput}
                  type="text"
                  value={draft.defaultYield}
                  placeholder="t.ex. 2"
                  onChange={(e) => onFieldChange("defaultYield", e.target.value)}
                />
              </div>

              <div className={styles.fieldGroup}>
                <span>Enhet</span>
                <select
                  data-focus-key="prep-yield-unit"
                  className={styles.editorSelect}
                  value={draft.yieldUnit}
                  onChange={(e) => onFieldChange("yieldUnit", e.target.value)}
                >
                  {unitOptions.map((unit) => (
                    <option key={unit} value={unit}>{unit}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroupWide}>
                <span>Allergener</span>
                <input
                  data-focus-key="prep-allergens"
                  className={styles.editorInput}
                  type="text"
                  value={draft.allergens}
                  placeholder="t.ex. gluten, mjölk, ägg"
                  onChange={(e) => onFieldChange("allergens", e.target.value)}
                />
              </div>

              <div className={styles.fieldGroupWide}>
                <span>Anteckningar</span>
                <textarea
                  data-focus-key="prep-notes"
                  className={styles.editorTextarea}
                  value={draft.notes}
                  placeholder="Förvaring, tips, övrigt..."
                  onChange={(e) => onFieldChange("notes", e.target.value)}
                />
              </div>
            </div>

            {/* Ingredients */}
            <div style={{ marginTop: "1.2rem" }}>
              <div className={styles.editorListHeader}>
                <strong style={{ fontSize: "0.9rem" }}>Ingredienser</strong>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={handleAddIngredientWithFocus}
                >
                  + Lägg till
                </button>
              </div>
              <div className={styles.editorTableHeader}>
                <span>Mängd</span>
                <span>Ingrediens</span>
                <span>Enhet</span>
                <span>Info</span>
                <span />
              </div>
              <div className={styles.editorItems}>
                {draft.ingredients.map((ing, idx) => (
                  <div key={idx} className={styles.editorRow}>
                    <input
                      data-focus-key={`ingredient-${idx}-amount`}
                      className={styles.editorInput}
                      type="text"
                      value={ing.amount}
                      placeholder="Mängd"
                      onChange={(e) => onIngredientChange(idx, "amount", e.target.value)}
                      onKeyDown={(event) => handleIngredientEnter(event, idx, "amount")}
                    />
                    <input
                      data-focus-key={`ingredient-${idx}-name`}
                      className={styles.editorInput}
                      type="text"
                      value={ing.name}
                      placeholder="Ingrediens"
                      onChange={(e) => onIngredientChange(idx, "name", e.target.value)}
                      onKeyDown={(event) => handleIngredientEnter(event, idx, "name")}
                    />
                    <select
                      data-focus-key={`ingredient-${idx}-unit`}
                      className={styles.editorSelect}
                      value={ing.unit}
                      onChange={(e) => onIngredientChange(idx, "unit", e.target.value)}
                      onKeyDown={(event) => handleIngredientEnter(event, idx, "unit")}
                    >
                      {unitOptions.map((unit) => (
                        <option key={unit} value={unit}>{unit}</option>
                      ))}
                    </select>
                    <input
                      data-focus-key={`ingredient-${idx}-info`}
                      className={styles.editorInput}
                      type="text"
                      value={ing.info}
                      placeholder="Info"
                      onChange={(e) => onIngredientChange(idx, "info", e.target.value)}
                      onKeyDown={(event) => handleIngredientEnter(event, idx, "info")}
                    />
                    <button
                      className={styles.iconButton}
                      type="button"
                      onClick={() => onRemoveIngredient(idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Steps */}
            <div style={{ marginTop: "1.2rem" }}>
              <div className={styles.editorListHeader}>
                <strong style={{ fontSize: "0.9rem" }}>Tillagning (steg)</strong>
                <button
                  className={styles.iconButton}
                  type="button"
                  onClick={handleAddStepWithFocus}
                >
                  + Lägg till steg
                </button>
              </div>
              <div className={styles.stepsEditorList}>
                {draft.steps.map((step, idx) => (
                  <div key={idx} className={styles.stepEditorRow}>
                    <span className={styles.stepEditorNumber}>{idx + 1}</span>
                    <textarea
                      data-focus-key={`step-${idx}`}
                      className={styles.stepEditorTextarea}
                      value={step.description}
                      placeholder={`Steg ${idx + 1}...`}
                      onChange={(e) => onStepChange(idx, e.target.value)}
                      onKeyDown={(event) => handleStepEnter(event, idx)}
                    />
                    <button
                      className={styles.iconButton}
                      type="button"
                      onClick={() => onRemoveStep(idx)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: sidebar summary */}
          <div className={styles.editorSidebar}>
            <div className={styles.sheetPanel}>
              <div className={styles.sectionHeading}>
                <p>Sammanfattning</p>
              </div>
              <div style={{ display: "grid", gap: "0.5rem" }}>
                <div>
                  <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(20,20,20,0.6)", marginBottom: "0.15rem" }}>Ingredienser</div>
                  <div style={{ fontWeight: 600 }}>{draft.ingredients.filter((i) => i.name.trim()).length} st</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(20,20,20,0.6)", marginBottom: "0.15rem" }}>Total</div>
                  <div style={{ fontWeight: 600 }}>{computePrepAmountSummary(draft.ingredients)}</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(20,20,20,0.6)", marginBottom: "0.15rem" }}>Steg</div>
                  <div style={{ fontWeight: 600 }}>{draft.steps.filter((s) => s.description.trim()).length} st</div>
                </div>
                <div>
                  <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(20,20,20,0.6)", marginBottom: "0.15rem" }}>Hållbarhet</div>
                  <div style={{ fontWeight: 600 }}>{draft.shelfLifeDays} dagar</div>
                </div>
                {draft.defaultYield ? (
                  <div>
                    <div style={{ fontSize: "0.66rem", fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", color: "rgba(20,20,20,0.6)", marginBottom: "0.15rem" }}>Standardsats</div>
                    <div style={{ fontWeight: 600 }}>{draft.defaultYield} {draft.yieldUnit}</div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        <div className={styles.editorFooter}>
          <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
            Avbryt
          </button>
          <button
            className={styles.drawerButtonPrimary}
            type="button"
            disabled={!canSave || isSaving}
            onClick={onSave}
          >
            {isSaving ? "Sparar..." : "Spara prepprecept"}
          </button>
        </div>
      </div>
    </div>
  );
}
