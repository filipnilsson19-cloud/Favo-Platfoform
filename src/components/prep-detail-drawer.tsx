"use client";

import { useEffect, useMemo, useState } from "react";

import {
  formatSwedishDateTime,
  isBatchExpired,
  isBatchExpiringSoon,
  formatSwedishDate,
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
  onOpenBatch: (id: string) => void;
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

  const contentIngredients = recipe.ingredients.filter((i) => i.name.trim());

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
          <div>
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

        <div className={styles.sheetMeta}>
          <span className={styles.metaPill}>{recipe.category}</span>
          <span className={styles.metaPill}>Hållbarhet {recipe.shelfLifeDays} dagar</span>
          {recipe.defaultYield ? (
            <span className={styles.metaPill}>
              {recipe.defaultYield} {recipe.yieldUnit}
            </span>
          ) : null}
          {recipe.allergens ? (
            <span className={styles.metaPill}>Allergener: {recipe.allergens}</span>
          ) : null}
        </div>

        <div className={styles.sheetContent}>
          {contentIngredients.length > 0 ? (
            <div className={styles.sheetPanel}>
              <div className={styles.sectionHeading}>
                <p>Ingredienser</p>
                <h3>Vad du behöver</h3>
              </div>
              <div className={styles.ingredientTable}>
                <div className={styles.ingredientTableHeader}>
                  <span>Mängd</span>
                  <span>Ingrediens</span>
                  <span>Info</span>
                </div>
                <div className={styles.ingredientTableBody}>
                  {contentIngredients.map((ing, idx) => (
                    <div key={idx} className={styles.ingredientTableRow}>
                      <span>
                        {ing.amount} {ing.unit}
                      </span>
                      <span>{ing.name}</span>
                      <span className={styles.ingredientInfo}>{ing.info}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {recipe.steps.length > 0 ? (
            <div className={styles.sheetPanel}>
              <div className={styles.sectionHeading}>
                <p>Tillagning</p>
                <h3>Så här gör du</h3>
              </div>
              <div className={styles.stepsList}>
                {recipe.steps.map((step, idx) => (
                  <div key={idx} className={styles.stepRow}>
                    <span className={styles.stepNumber}>{idx + 1}</span>
                    <p className={styles.stepDescription}>{step.description}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {recipe.notes ? (
            <div className={styles.sheetPanel}>
              <div className={styles.sectionHeading}>
                <p>Anteckningar</p>
              </div>
              <p style={{ margin: 0, fontSize: "0.93rem", lineHeight: 1.5 }}>{recipe.notes}</p>
            </div>
          ) : null}

          <div className={styles.sheetPanel}>
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
          </div>
        </div>

        <div className={styles.batchConfirmBar}>
          <span style={{ fontSize: "0.84rem", color: "rgba(17,17,17,0.5)" }}>
            Klar med en batch?
          </span>
          <button
            className={styles.drawerButtonPrepp}
            type="button"
            onClick={() => onOpenBatch(recipe.id)}
          >
            Logga prepp klar
          </button>
        </div>
      </div>
    </div>
  );
}
