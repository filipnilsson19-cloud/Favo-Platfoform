"use client";

import { StationPages } from "@/components/station-pages";
import type { RecipeCategory } from "@/types/recipe";
import type { StationPrintPayload } from "@/types/station";

import styles from "./station-drawer.module.css";

type StationDrawerProps = {
  isOpen: boolean;
  payload: StationPrintPayload | null;
  categoryOptions: RecipeCategory[];
  activeCategories: RecipeCategory[];
  categoriesLocked: boolean;
  onSelectCategory: (category: RecipeCategory) => void;
  onClose: () => void;
  onPrint: () => void;
};

export function StationDrawer({
  isOpen,
  payload,
  categoryOptions,
  activeCategories,
  categoriesLocked,
  onSelectCategory,
  onClose,
  onPrint,
}: StationDrawerProps) {
  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
      aria-label="Stationsvy"
    >
      <button
        className={styles.backdrop}
        type="button"
        aria-label="Stäng stationsvy"
        onClick={onClose}
      />

      <article
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-sheet-title"
      >
        <header className={styles.toolbar}>
          <div className={styles.meta}>
            <h2 id="station-sheet-title">{payload?.title || "Stationsblad"}</h2>
            <p>
              {payload
                ? `${payload.sourceLabel} • ${payload.recipeCount} recept`
                : "Inget urval"}
            </p>
          </div>

          <div className={styles.actions}>
            <div
              className={`${styles.sourceToggle} ${
                categoriesLocked ? styles.sourceToggleLocked : ""
              }`}
              role="group"
              aria-label="Välj kategori för stationsvy"
              aria-disabled={categoriesLocked}
            >
              {categoryOptions.map((category) => {
                const isActive = activeCategories.includes(category);

                return (
                  <button
                    key={category}
                    className={`${styles.sourceButton} ${
                      isActive ? styles.sourceButtonActive : ""
                    }`}
                    type="button"
                    disabled={categoriesLocked}
                    aria-pressed={isActive}
                    onClick={() => onSelectCategory(category)}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
            <button className={styles.button} type="button" onClick={onPrint}>
              Skriv ut A4
            </button>
            <button className={styles.buttonGhost} type="button" onClick={onClose}>
              Stäng
            </button>
          </div>
        </header>

        <div className={styles.previewWrap}>
          <StationPages payload={payload} variant="screen" />
        </div>
      </article>
    </section>
  );
}
