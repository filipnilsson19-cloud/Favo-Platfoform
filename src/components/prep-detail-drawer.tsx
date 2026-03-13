"use client";

import { useEffect, useMemo, useState } from "react";

import {
  formatSwedishDateTime,
  isBatchExpired,
  isBatchExpiringSoon,
  formatSwedishDate,
  batchMultipliers,
  batchYieldLabel,
  scalePrepAmount,
} from "@/lib/prep-utils";
import { loadPrepBatchesRequest } from "@/lib/prep-api";
import type { PrepBatch, PrepRecipe } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepDetailDrawerProps = {
  recipe: PrepRecipe | undefined;
  isOpen: boolean;
  canManage: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenBatch: (id: string, multiplier?: number) => void;
  newBatch: PrepBatch | null;
};

export function PrepDetailDrawer({
  recipe,
  isOpen,
  canManage,
  onClose,
  onEdit,
  onDelete,
  onOpenBatch,
  newBatch,
}: PrepDetailDrawerProps) {
  const [batches, setBatches] = useState<PrepBatch[]>([]);
  const [multiplier, setMultiplier] = useState(1);
  const [isCustomMultiplier, setIsCustomMultiplier] = useState(false);
  const [customMultiplierInput, setCustomMultiplierInput] = useState("");
  const [completedStepsByRecipe, setCompletedStepsByRecipe] = useState<
    Record<string, Record<number, boolean>>
  >({});
  const visibleBatches = useMemo(() => {
    if (!newBatch) return batches;

    const without = batches.filter((batch) => batch.id !== newBatch.id);
    return [newBatch, ...without].slice(0, 5);
  }, [batches, newBatch]);

  useEffect(() => {
    if (!isOpen || !recipe) return;
    loadPrepBatchesRequest(recipe.id)
      .then((data) => setBatches(data.batches))
      .catch(console.error);
  }, [isOpen, recipe]);

  if (!recipe) return null;

  const completedSteps = completedStepsByRecipe[recipe.id] ?? {};
  const contentIngredients = recipe.ingredients.filter((i) => i.name.trim());
  const hasAllergens = recipe.allergens.trim().length > 0;
  const hasNotes = recipe.notes.trim().length > 0;
  const parsedCustomMultiplier = Number.parseFloat(customMultiplierInput.replace(",", "."));
  const activeMultiplier =
    isCustomMultiplier && Number.isFinite(parsedCustomMultiplier) && parsedCustomMultiplier > 0
      ? parsedCustomMultiplier
      : multiplier;
  const scaledYield = batchYieldLabel(activeMultiplier, recipe.defaultYield, recipe.yieldUnit);
  const stepCount = recipe.steps.length;
  const completedStepCount = recipe.steps.filter((_, index) => completedSteps[index]).length;
  const canLogPrep = stepCount === 0 || completedStepCount === stepCount;
  const toggleStep = (index: number) => {
    setCompletedStepsByRecipe((current) => ({
      ...current,
      [recipe.id]: {
        ...(current[recipe.id] ?? {}),
        [index]: !(current[recipe.id] ?? {})[index],
      },
    }));
  };

  return (
    <div className={[styles.drawer, isOpen ? styles.drawerOpen : ""].join(" ")}>
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Stäng"
        onClick={onClose}
      />
      <div className={[styles.sheet, styles.detailSheet].join(" ")}>
        <div className={styles.sheetHeader}>
          <div className={styles.detailHero}>
            <p className={styles.detailEyebrow}>Produktionsrecept</p>
            <h2>{recipe.title}</h2>
          </div>
          <div className={styles.sheetActions}>
            {canManage ? (
              <>
                <button
                  className={styles.drawerButtonSecondary}
                  type="button"
                  onClick={() => onEdit(recipe.id)}
                >
                  Redigera
                </button>
                <button
                  className={styles.drawerButtonDanger}
                  type="button"
                  onClick={() => onDelete(recipe.id)}
                >
                  Radera
                </button>
              </>
            ) : null}
            <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
              Stäng
            </button>
          </div>
        </div>

        <div className={styles.detailTopBar}>
          <div className={styles.detailOverview}>
            <div className={styles.detailMetricCard}>
              <span className={styles.detailMetricLabel}>Kategori</span>
              <strong className={styles.detailMetricValue}>{recipe.category}</strong>
            </div>
            <div className={styles.detailMetricCard}>
              <span className={styles.detailMetricLabel}>Hållbarhet</span>
              <strong className={styles.detailMetricValue}>{recipe.shelfLifeDays} dagar</strong>
            </div>
            <div className={styles.detailMetricCard}>
              <span className={styles.detailMetricLabel}>Standardsats</span>
              <strong className={styles.detailMetricValue}>
                {recipe.defaultYield || "1"} {recipe.yieldUnit}
              </strong>
            </div>
            <div className={styles.detailMetricCard}>
              <span className={styles.detailMetricLabel}>Förvaring</span>
              <strong className={styles.detailMetricValue}>{recipe.storage}</strong>
            </div>
            {hasAllergens ? (
              <div className={[styles.detailMetricCard, styles.detailMetricCardWide].join(" ")}>
                <span className={styles.detailMetricLabel}>Allergener</span>
                <strong className={styles.detailMetricValue}>{recipe.allergens}</strong>
              </div>
            ) : null}
          </div>
          <div className={styles.prepScaleBar}>
            <div className={styles.prepScaleMeta}>
              <span className={styles.prepScaleLabel}>Batchskala</span>
              <strong className={styles.prepScaleValue}>{scaledYield}</strong>
            </div>
            <div className={styles.prepScaleButtons}>
              {batchMultipliers.map((option) => (
                <button
                  key={option.value}
                  className={[
                    styles.prepScaleButton,
                    !isCustomMultiplier && multiplier === option.value ? styles.prepScaleButtonActive : "",
                  ].join(" ")}
                  type="button"
                  onClick={() => {
                    setIsCustomMultiplier(false);
                    setMultiplier(option.value);
                  }}
                >
                  {option.label}
                </button>
              ))}
              <button
                className={[
                  styles.prepScaleButton,
                  isCustomMultiplier ? styles.prepScaleButtonActive : "",
                ].join(" ")}
                type="button"
                onClick={() => {
                  setIsCustomMultiplier(true);
                  setCustomMultiplierInput((current) =>
                    current || (multiplier === 1 ? "" : String(multiplier)),
                  );
                }}
              >
                Egen
              </button>
              {isCustomMultiplier ? (
                <label className={styles.prepScaleCustomField}>
                  <span>x</span>
                  <input
                    className={styles.prepScaleCustomInput}
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={customMultiplierInput}
                    onChange={(event) => setCustomMultiplierInput(event.target.value)}
                    placeholder="2.5"
                  />
                </label>
              ) : null}
            </div>
          </div>
        </div>

        <div className={styles.detailWorkbench}>
          {contentIngredients.length > 0 ? (
            <section className={[styles.sheetPanel, styles.detailSection].join(" ")}>
              <div className={styles.sectionHeading}>
                <p>Ingredienser</p>
                <h3>Det här behövs</h3>
              </div>
              <div className={styles.prepIngredientList}>
                {contentIngredients.map((ing, idx) => (
                  <div key={idx} className={styles.prepIngredientRow}>
                    <div className={styles.prepIngredientMeasureChip}>
                      <span className={styles.prepIngredientAmount}>
                        {scalePrepAmount(ing.amount, activeMultiplier)}
                      </span>
                      <span className={styles.prepIngredientUnit}>{ing.unit}</span>
                    </div>
                    <div className={styles.prepIngredientMain}>
                      <span className={styles.prepIngredientName}>{ing.name}</span>
                      {ing.info ? (
                        <span className={styles.prepIngredientInfo}>{ing.info}</span>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {recipe.steps.length > 0 ? (
            <section className={[styles.sheetPanel, styles.detailSection].join(" ")}>
              <div className={styles.sectionHeading}>
                <p>Tillagning</p>
                <h3>Arbetsgång</h3>
              </div>
              <div className={styles.stepsList}>
                {recipe.steps.map((step, idx) => (
                  <div
                    key={idx}
                    className={[
                      styles.stepRow,
                      completedSteps[idx] ? styles.stepRowCompleted : "",
                    ].join(" ")}
                    role="button"
                    tabIndex={0}
                    aria-pressed={completedSteps[idx] ? "true" : "false"}
                    onClick={() => toggleStep(idx)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        toggleStep(idx);
                      }
                    }}
                  >
                    <span className={styles.stepNumber}>{idx + 1}</span>
                    <p className={styles.stepDescription}>{step.description}</p>
                    <span
                      className={styles.stepCheckButton}
                      aria-hidden="true"
                    />
                  </div>
                ))}
              </div>
              <div className={styles.stepCompletionBar}>
                <span className={styles.stepCompletionStatus}>
                  {stepCount === 0
                    ? "Inga moment att bocka av."
                    : `${completedStepCount} / ${stepCount} moment klara`}
                </span>
                <button
                  className={[
                    styles.drawerButtonPrepp,
                    styles.stepCompletionButton,
                    !canLogPrep ? styles.stepCompletionButtonDisabled : "",
                  ].join(" ")}
                  type="button"
                  disabled={!canLogPrep}
                  onClick={() => onOpenBatch(recipe.id, activeMultiplier)}
                >
                  Logga prepp klar
                </button>
              </div>
            </section>
          ) : null}
        </div>

        <div className={styles.detailBottomRow}>
          <section className={[styles.sheetPanel, styles.detailSection].join(" ")}>
            <div className={styles.sectionHeading}>
              <p>Senaste batchar</p>
              <h3>Batchlogg</h3>
            </div>
            {visibleBatches.length === 0 ? (
              <p className={styles.batchEmpty}>Ingen batch loggad ännu.</p>
            ) : (
              <div className={styles.batchList}>
                {visibleBatches.map((batch) => {
                  const expired = isBatchExpired(batch.bestBefore);
                  const soon = !expired && isBatchExpiringSoon(batch.bestBefore);
                  return (
                    <div key={batch.id} className={styles.batchRow}>
                      <div className={styles.batchMain}>
                        <span className={styles.batchTitle}>
                          {batch.batchYield || "1 sats"} — {batch.madeByName}
                        </span>
                        <span className={styles.batchSubtitle}>
                          {formatSwedishDateTime(batch.madeAt)}
                        </span>
                      </div>
                      <span
                        className={[
                          styles.batchBestBefore,
                          expired
                            ? styles.batchBestBeforeExpired
                            : soon
                              ? styles.batchBestBeforeSoon
                              : styles.batchBestBeforeOk,
                        ].join(" ")}
                      >
                        {expired ? "Utgången" : `Bäst före ${formatSwedishDate(new Date(batch.bestBefore))}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside className={[styles.sheetPanel, styles.detailSummaryCard].join(" ")}>
            <div className={styles.sectionHeading}>
              <p>Info</p>
              <h3>Inför produktion</h3>
            </div>
            <div className={styles.detailChecklist}>
              <div className={styles.detailChecklistNote}>
                <span>Allergener</span>
                <p>{hasAllergens ? recipe.allergens : "Inga angivna allergener."}</p>
              </div>
              <div className={styles.detailChecklistNote}>
                <span>Anteckningar</span>
                <p>{hasNotes ? recipe.notes : "Inga särskilda anteckningar."}</p>
              </div>
            </div>
          </aside>
        </div>

      </div>
    </div>
  );
}
