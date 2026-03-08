"use client";

import { useState } from "react";

import type { AppPrepCategory } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepCategoryManagerProps = {
  categories: AppPrepCategory[];
  onClose: () => void;
  onRename: (name: string, nextName: string) => Promise<void>;
  onToggleActive: (name: string, isActive: boolean) => Promise<void>;
  onCreateCategory: (name: string) => Promise<string | null>;
};

export function PrepCategoryManager({
  categories,
  onClose,
  onRename,
  onToggleActive,
  onCreateCategory,
}: PrepCategoryManagerProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  function startRename(cat: AppPrepCategory) {
    setRenamingId(cat.id);
    setRenameValue(cat.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function commitRename(oldName: string) {
    const next = renameValue.trim();
    if (!next || next === oldName) { cancelRename(); return; }
    setIsBusy(true);
    try {
      await onRename(oldName, next);
      cancelRename();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Okänt fel";
      window.alert(`Det gick inte att byta namn: ${msg}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggle(cat: AppPrepCategory) {
    setIsBusy(true);
    try {
      await onToggleActive(cat.name, !cat.isActive);
    } catch {
      window.alert("Det gick inte att uppdatera kategorin.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreate() {
    const name = newCategoryName.trim();
    if (!name) return;
    setIsBusy(true);
    try {
      const created = await onCreateCategory(name);
      if (created) setNewCategoryName("");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.catManager} onClick={onClose}>
      <div className={styles.catManagerCard} onClick={(e) => e.stopPropagation()}>
        <div className={styles.catManagerHeader}>
          <span className={styles.catManagerTitle}>Hantera kategorier</span>
          <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
            Stäng
          </button>
        </div>

        <div className={styles.catManagerBody}>
          {categories.length === 0 ? (
            <p style={{ padding: "1.2rem 1.4rem", color: "rgba(20,20,20,0.5)", fontSize: "0.9rem" }}>
              Inga kategorier än.
            </p>
          ) : (
            categories.map((cat) => {
              const isRenaming = renamingId === cat.id;
              return (
                <div
                  key={cat.id}
                  className={[styles.catManagerRow, !cat.isActive ? styles.catManagerInactive : ""].join(" ")}
                >
                  {isRenaming ? (
                    <input
                      className={styles.catManagerInput}
                      type="text"
                      value={renameValue}
                      autoFocus
                      onChange={(e) => setRenameValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") void commitRename(cat.name);
                        if (e.key === "Escape") cancelRename();
                      }}
                    />
                  ) : (
                    <span className={styles.catManagerName}>{cat.name}</span>
                  )}

                  <span className={styles.catManagerCount}>
                    {cat.recipeCount} recept
                  </span>

                  <div className={styles.catManagerActions}>
                    {isRenaming ? (
                      <>
                        <button
                          className={[styles.catManagerBtn, styles.catManagerBtnSave].join(" ")}
                          type="button"
                          disabled={isBusy}
                          onClick={() => void commitRename(cat.name)}
                        >
                          Spara
                        </button>
                        <button
                          className={styles.catManagerBtn}
                          type="button"
                          onClick={cancelRename}
                        >
                          Avbryt
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.catManagerBtn}
                          type="button"
                          disabled={isBusy}
                          onClick={() => startRename(cat)}
                        >
                          Byt namn
                        </button>
                        <button
                          className={[styles.catManagerBtn, !cat.isActive ? "" : styles.catManagerBtnDanger].join(" ")}
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggle(cat)}
                        >
                          {cat.isActive ? "Avaktivera" : "Aktivera"}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className={styles.catManagerFooter}>
          <input
            className={styles.catManagerFooterInput}
            type="text"
            value={newCategoryName}
            placeholder="Ny kategori..."
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") void handleCreate(); }}
          />
          <button
            className={[styles.catManagerBtn, styles.catManagerBtnSave].join(" ")}
            type="button"
            disabled={isBusy || !newCategoryName.trim()}
            onClick={() => void handleCreate()}
          >
            Lägg till
          </button>
        </div>
      </div>
    </div>
  );
}
