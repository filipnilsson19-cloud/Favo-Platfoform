"use client";

import { useState } from "react";

import { batchMultipliers, batchYieldLabel, addDaysToDate, formatSwedishDate } from "@/lib/prep-utils";
import { logPrepBatchRequest } from "@/lib/prep-api";
import type { PrepBatch, PrepRecipe } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepBatchModalProps = {
  recipe: PrepRecipe;
  initialMultiplier?: number;
  onClose: () => void;
  onLogged: (batch: PrepBatch) => void;
};

export function PrepBatchModal({
  recipe,
  initialMultiplier = 1,
  onClose,
  onLogged,
}: PrepBatchModalProps) {
  const initialIsCustom = !batchMultipliers.some((m) => m.value === initialMultiplier);
  const [multiplier, setMultiplier] = useState(initialIsCustom ? 1 : initialMultiplier);
  const [isCustomMultiplier, setIsCustomMultiplier] = useState(initialIsCustom);
  const [customMultiplierInput, setCustomMultiplierInput] = useState(
    initialIsCustom ? String(initialMultiplier) : "",
  );
  const [isSaving, setIsSaving] = useState(false);
  const parsedCustomMultiplier = Number.parseFloat(customMultiplierInput.replace(",", "."));
  const activeMultiplier =
    isCustomMultiplier && Number.isFinite(parsedCustomMultiplier) && parsedCustomMultiplier > 0
      ? parsedCustomMultiplier
      : multiplier;

  const bestBefore = addDaysToDate(new Date(), recipe.shelfLifeDays);
  const yieldLabel = batchYieldLabel(activeMultiplier, recipe.defaultYield, recipe.yieldUnit);

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
                  !isCustomMultiplier && multiplier === m.value ? styles.batchMultiplierActive : "",
                ].join(" ")}
                type="button"
                onClick={() => {
                  setIsCustomMultiplier(false);
                  setMultiplier(m.value);
                }}
              >
                <span className={styles.batchMultiplierLabel}>{m.label}</span>
                {recipe.defaultYield ? (
                  <span className={styles.batchMultiplierAmount}>
                    {batchYieldLabel(m.value, recipe.defaultYield, recipe.yieldUnit)}
                  </span>
                ) : null}
              </button>
            ))}
            <button
              className={[
                styles.batchMultiplierButton,
                isCustomMultiplier ? styles.batchMultiplierActive : "",
              ].join(" ")}
              type="button"
              onClick={() => {
                setIsCustomMultiplier(true);
                setCustomMultiplierInput((current) =>
                  current || (multiplier === 1 ? "" : String(multiplier)),
                );
              }}
            >
              <span className={styles.batchMultiplierLabel}>Egen</span>
            </button>
          </div>
          {isCustomMultiplier ? (
            <label className={styles.batchCustomField}>
              <span className={styles.batchCustomLabel}>Egen batchskala</span>
              <input
                className={styles.batchCustomInput}
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
