"use client";

import { useMemo, useState } from "react";

import type { AppCategory } from "@/types/category";

import styles from "./recipe-book.module.css";

type CategoryManagerDrawerProps = {
  categories: AppCategory[];
  isBusy: boolean;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => Promise<void>;
  onRename: (name: string, nextName: string) => Promise<void>;
  onSetActive: (name: string, isActive: boolean) => Promise<void>;
};

export function CategoryManagerDrawer({
  categories,
  isBusy,
  isOpen,
  onClose,
  onCreate,
  onRename,
  onSetActive,
}: CategoryManagerDrawerProps) {
  const [newCategoryName, setNewCategoryName] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const sortedCategories = useMemo(
    () =>
      [...categories].sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        if (left.recipeCount !== right.recipeCount) {
          return right.recipeCount - left.recipeCount;
        }

        return left.name.localeCompare(right.name, "sv");
      }),
    [categories],
  );

  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
    >
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Stäng kategorihantering"
        onClick={onClose}
      />

      <article
        className={`${styles.sheet} ${styles.categorySheet}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-manager-title"
      >
        <header className={styles.sheetHeader}>
          <div>
            <p className={styles.pageEyebrow}>Kategorier</p>
            <h2 id="category-manager-title">Hantera kategorier</h2>
            <p className={styles.sheetIntro}>
              Byt namn, skapa nya och aktivera eller inaktivera kategorier utan
              att lämna receptboken.
            </p>
          </div>

          <div className={styles.drawerActionStack}>
            <button className={styles.drawerButtonSecondary} type="button" onClick={onClose}>
              Stäng
            </button>
          </div>
        </header>

        <section className={`${styles.sheetPanel} ${styles.categoryPanel}`}>
          <div className={styles.sectionHeading}>
            <p>Ny kategori</p>
            <h3>Skapa snabbt</h3>
          </div>

          <div className={styles.categoryCreateInline}>
            <input
              className={styles.editorInput}
              type="text"
              placeholder="Till exempel Dessert"
              value={newCategoryName}
              onChange={(event) => setNewCategoryName(event.target.value)}
            />
            <button
              className={styles.drawerButtonPrimary}
              type="button"
              disabled={isBusy || newCategoryName.trim().length === 0}
              onClick={async () => {
                await onCreate(newCategoryName);
                setNewCategoryName("");
              }}
            >
              Lägg till
            </button>
          </div>
        </section>

        <section className={`${styles.sheetPanel} ${styles.categoryPanel}`}>
          <div className={styles.sectionHeading}>
            <p>Översikt</p>
            <h3>Befintliga kategorier</h3>
          </div>

          <div className={styles.categoryManagerList}>
            {sortedCategories.map((category) => {
              const draftValue = drafts[category.name] ?? category.name;
              const hasChanges = draftValue.trim() !== category.name;

              return (
                <div key={category.id} className={styles.categoryManagerRow}>
                  <div className={styles.categoryManagerMain}>
                    <input
                      className={styles.editorInput}
                      type="text"
                      value={draftValue}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [category.name]: event.target.value,
                        }))
                      }
                    />

                    <div className={styles.categoryManagerMeta}>
                      <span className={styles.categoryUsage}>
                        {category.recipeCount} recept
                      </span>
                      <span
                        className={`${styles.recipeStatus} ${
                          category.isActive
                            ? styles.recipeStatusPublished
                            : styles.recipeStatusInactive
                        }`}
                      >
                        {category.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.categoryManagerActions}>
                    <button
                      className={styles.drawerButtonSecondary}
                      type="button"
                      disabled={isBusy || !hasChanges || draftValue.trim().length === 0}
                      onClick={() => onRename(category.name, draftValue)}
                    >
                      Spara namn
                    </button>
                    <button
                      className={styles.drawerButtonSecondary}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSetActive(category.name, !category.isActive)}
                    >
                      {category.isActive ? "Inaktivera" : "Aktivera"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </article>
    </section>
  );
}
