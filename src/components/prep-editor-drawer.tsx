"use client";

import { prepStatusOptions, prepUnitOptions, yieldUnitOptions } from "@/lib/prep-utils";
import type { PrepEditorMode, PrepIngredient, PrepRecipe, PrepStatus } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepEditorDrawerProps = {
  draft: PrepRecipe;
  isOpen: boolean;
  isSaving: boolean;
  mode: PrepEditorMode;
  canSave: boolean;
  categoryOptions: string[];
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
      <div className={[styles.sheet, styles.editorSheet].join(" ")}>
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
                <span>Hållbarhet (dagar)</span>
                <input
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
                  className={styles.editorSelect}
                  value={draft.yieldUnit}
                  onChange={(e) => onFieldChange("yieldUnit", e.target.value)}
                >
                  {yieldUnitOptions.map((u) => (
                    <option key={u.value} value={u.value}>{u.label}</option>
                  ))}
                </select>
              </div>

              <div className={styles.fieldGroupWide}>
                <span>Allergener</span>
                <input
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
                <button className={styles.iconButton} type="button" onClick={onAddIngredient}>
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
                      className={styles.editorInput}
                      type="text"
                      value={ing.amount}
                      placeholder="Mängd"
                      onChange={(e) => onIngredientChange(idx, "amount", e.target.value)}
                    />
                    <input
                      className={styles.editorInput}
                      type="text"
                      value={ing.name}
                      placeholder="Ingrediens"
                      onChange={(e) => onIngredientChange(idx, "name", e.target.value)}
                    />
                    <select
                      className={styles.editorSelect}
                      value={ing.unit}
                      onChange={(e) => onIngredientChange(idx, "unit", e.target.value)}
                    >
                      {prepUnitOptions.map((u) => (
                        <option key={u.value} value={u.value}>{u.label}</option>
                      ))}
                    </select>
                    <input
                      className={styles.editorInput}
                      type="text"
                      value={ing.info}
                      placeholder="Info"
                      onChange={(e) => onIngredientChange(idx, "info", e.target.value)}
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
                <button className={styles.iconButton} type="button" onClick={onAddStep}>
                  + Lägg till steg
                </button>
              </div>
              <div className={styles.stepsEditorList}>
                {draft.steps.map((step, idx) => (
                  <div key={idx} className={styles.stepEditorRow}>
                    <span className={styles.stepEditorNumber}>{idx + 1}</span>
                    <textarea
                      className={styles.stepEditorTextarea}
                      value={step.description}
                      placeholder={`Steg ${idx + 1}...`}
                      onChange={(e) => onStepChange(idx, e.target.value)}
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
