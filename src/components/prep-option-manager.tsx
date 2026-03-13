"use client";

import { useState } from "react";

import type { AppPrepOption } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepOptionManagerProps = {
  items: AppPrepOption[];
  title: string;
  emptyLabel: string;
  createPlaceholder: string;
  onClose: () => void;
  onRename: (name: string, nextName: string) => Promise<void>;
  onToggleActive: (name: string, isActive: boolean) => Promise<void>;
  onCreate: (name: string) => Promise<string | null>;
};

export function PrepOptionManager({
  items,
  title,
  emptyLabel,
  createPlaceholder,
  onClose,
  onRename,
  onToggleActive,
  onCreate,
}: PrepOptionManagerProps) {
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [newName, setNewName] = useState("");
  const [isBusy, setIsBusy] = useState(false);

  function startRename(item: AppPrepOption) {
    setRenamingId(item.id);
    setRenameValue(item.name);
  }

  function cancelRename() {
    setRenamingId(null);
    setRenameValue("");
  }

  async function commitRename(currentName: string) {
    const next = renameValue.trim();
    if (!next || next === currentName) {
      cancelRename();
      return;
    }
    setIsBusy(true);
    try {
      await onRename(currentName, next);
      cancelRename();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Okänt fel";
      window.alert(`Det gick inte att byta namn: ${message}`);
    } finally {
      setIsBusy(false);
    }
  }

  async function handleToggle(item: AppPrepOption) {
    setIsBusy(true);
    try {
      await onToggleActive(item.name, !item.isActive);
    } catch {
      window.alert("Det gick inte att uppdatera alternativet.");
    } finally {
      setIsBusy(false);
    }
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;
    setIsBusy(true);
    try {
      const created = await onCreate(name);
      if (created) setNewName("");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className={styles.catManager} onClick={onClose}>
      <div className={styles.catManagerCard} onClick={(event) => event.stopPropagation()}>
        <div className={styles.catManagerHeader}>
          <span className={styles.catManagerTitle}>{title}</span>
          <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
            Stäng
          </button>
        </div>

        <div className={styles.catManagerBody}>
          {items.length === 0 ? (
            <p className={styles.optionManagerEmpty}>{emptyLabel}</p>
          ) : (
            items.map((item) => {
              const isRenaming = renamingId === item.id;
              return (
                <div
                  key={item.id}
                  className={[styles.catManagerRow, !item.isActive ? styles.catManagerInactive : ""].join(" ")}
                >
                  {isRenaming ? (
                    <input
                      className={styles.catManagerInput}
                      type="text"
                      value={renameValue}
                      autoFocus
                      onChange={(event) => setRenameValue(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") void commitRename(item.name);
                        if (event.key === "Escape") cancelRename();
                      }}
                    />
                  ) : (
                    <span className={styles.catManagerName}>{item.name}</span>
                  )}

                  <span className={styles.catManagerCount}>
                    {item.usageCount} användningar
                  </span>

                  <div className={styles.catManagerActions}>
                    {isRenaming ? (
                      <>
                        <button
                          className={[styles.catManagerBtn, styles.catManagerBtnSave].join(" ")}
                          type="button"
                          disabled={isBusy}
                          onClick={() => void commitRename(item.name)}
                        >
                          Spara
                        </button>
                        <button className={styles.catManagerBtn} type="button" onClick={cancelRename}>
                          Avbryt
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className={styles.catManagerBtn}
                          type="button"
                          disabled={isBusy}
                          onClick={() => startRename(item)}
                        >
                          Byt namn
                        </button>
                        <button
                          className={[styles.catManagerBtn, !item.isActive ? "" : styles.catManagerBtnDanger].join(" ")}
                          type="button"
                          disabled={isBusy}
                          onClick={() => void handleToggle(item)}
                        >
                          {item.isActive ? "Avaktivera" : "Aktivera"}
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
            value={newName}
            placeholder={createPlaceholder}
            onChange={(event) => setNewName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void handleCreate();
            }}
          />
          <button
            className={[styles.catManagerBtn, styles.catManagerBtnSave].join(" ")}
            type="button"
            disabled={isBusy || !newName.trim()}
            onClick={() => void handleCreate()}
          >
            Lägg till
          </button>
        </div>
      </div>
    </div>
  );
}
