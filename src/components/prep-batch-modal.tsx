"use client";

import { useState } from "react";

import { batchMultipliers, batchYieldLabel, addDaysToDate, formatSwedishDate } from "@/lib/prep-utils";
import { logPrepBatchRequest } from "@/lib/prep-api";
import type { PrepBatch, PrepRecipe } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepBatchModalProps = {
  recipe: PrepRecipe;
  onClose: () => void;
  onLogged: (batch: PrepBatch) => void;
};

export function PrepBatchModal({ recipe, onClose, onLogged }: PrepBatchModalProps) {
  const [multiplier, setMultiplier] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  const bestBefore = addDaysToDate(new Date(), recipe.shelfLifeDays);
  const yieldLabel = batchYieldLabel(multiplier, recipe.defaultYield, recipe.yieldUnit);

  async function handleConfirm() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const payload = await logPrepBatchRequest(recipe.id, {
        batchYield: yieldLabel,
        shelfLifeDays: recipe.shelfLifeDays,
        notes: "",
      });
      onLogged(payload.batch);
      onClose();
    } catch (error) {
      console.error("Failed to log batch", error);
      window.alert("Det gick inte att logga batchen. Försök igen.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className={styles.batchModal} onClick={onClose}>
      <div className={styles.batchModalCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.batchModalHeader}>
          <p className={styles.batchModalEyebrow}>Logga prepp</p>
          <h2 className={styles.batchModalTitle}>{recipe.title}</h2>
        </div>

        <div className={styles.batchModalSection}>
          <p className={styles.batchModalLabel}>Batchstorlek</p>
          <div className={styles.batchMultiplierRow}>
            {batchMultipliers.map((m) => (
              <button
                key={m.value}
                className={[
                  styles.batchMultiplierButton,
                  multiplier === m.value ? styles.batchMultiplierActive : "",
                ].join(" ")}
                type="button"
                onClick={() => setMultiplier(m.value)}
              >
                <span className={styles.batchMultiplierLabel}>{m.label}</span>
                {recipe.defaultYield ? (
                  <span className={styles.batchMultiplierAmount}>
                    {batchYieldLabel(m.value, recipe.defaultYield, recipe.yieldUnit)}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.batchModalSection}>
          <p className={styles.batchModalLabel}>Bäst före</p>
          <div className={styles.batchBestBeforeDisplay}>
            <span className={styles.batchBestBeforeIcon}>📅</span>
            <span className={styles.batchBestBeforeText}>
              {formatSwedishDate(bestBefore)} ({recipe.shelfLifeDays} dagar)
            </span>
          </div>
        </div>

        <div className={styles.batchModalFooter}>
          <button
            className={styles.batchCancelButton}
            type="button"
            onClick={onClose}
          >
            Avbryt
          </button>
          <button
            className={styles.batchConfirmButton}
            type="button"
            disabled={isSaving}
            onClick={() => void handleConfirm()}
          >
            {isSaving ? "Loggar..." : "Bekräfta prepp klar ✓"}
          </button>
        </div>
      </div>
    </div>
  );
}
