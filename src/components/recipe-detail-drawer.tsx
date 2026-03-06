"use client";

import { computeAmountSummary, formatRecipeItemAmount } from "@/lib/recipe-utils";
import type { Recipe } from "@/types/recipe";

import styles from "./recipe-book.module.css";

type RecipeDetailDrawerProps = {
  canManage: boolean;
  recipe?: Recipe;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (recipeId: string) => void;
  onDuplicate: (recipeId: string) => void;
  onDelete: (recipeId: string) => void;
};

export function RecipeDetailDrawer({
  canManage,
  recipe,
  isOpen,
  onClose,
  onEdit,
  onDuplicate,
  onDelete,
}: RecipeDetailDrawerProps) {
  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
    >
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Stäng receptpanel"
        onClick={onClose}
      />

      {recipe ? (
        <article
          className={`${styles.sheet} ${styles.detailSheet}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby="recipe-sheet-title"
        >
          <header className={styles.sheetHeader}>
            <div>
              <p className={styles.pageEyebrow}>Exempelrecept</p>
              <h2 id="recipe-sheet-title">{recipe.title}</h2>
              <p className={styles.sheetIntro}>{recipe.intro}</p>
            </div>

            <div className={styles.drawerActionGroup}>
              <button
                className={styles.drawerButtonSecondary}
                type="button"
                onClick={() => window.print()}
              >
                Skriv ut
              </button>
              <button
                className={styles.drawerButtonSecondary}
                type="button"
                onClick={onClose}
              >
                Stäng
              </button>
              {canManage ? (
                <>
                  <button
                    className={styles.drawerButtonSecondary}
                    type="button"
                    onClick={() => onDuplicate(recipe.id)}
                  >
                    Duplicera
                  </button>
                  <button
                    className={`${styles.drawerButtonSecondary} ${styles.drawerButtonDanger}`}
                    type="button"
                    onClick={() => onDelete(recipe.id)}
                  >
                    Radera
                  </button>
                  <button
                    className={styles.drawerButtonPrimary}
                    type="button"
                    onClick={() => onEdit(recipe.id)}
                  >
                    Redigera
                  </button>
                </>
              ) : null}
            </div>
          </header>

          <div className={styles.sheetMeta}>
            <span className={styles.metaPill}>Kategori: {recipe.category}</span>
            <span className={styles.metaPill}>
              {recipe.servings} portion
              {recipe.servings > 1 ? "er" : ""}
            </span>
            <span className={styles.metaPill}>
              Total: {computeAmountSummary(recipe.items)}
            </span>
            <span className={styles.metaPill}>Status: {recipe.status}</span>
          </div>

          <div className={styles.sheetContent}>
            <section className={styles.sheetPanel}>
              <div className={styles.sectionHeading}>
                <p>Lägglista</p>
                <h3>Komponenter och mått</h3>
              </div>

              <div className={styles.recipeTable}>
                <div className={styles.recipeTableHeader}>
                  <span>Info</span>
                  <span>Komponent</span>
                  <span>Mängd</span>
                </div>

                <div className={styles.recipeTableBody}>
                  {recipe.items.map((item, index) =>
                    item.isSpacer ? (
                      <div
                        key={`${recipe.id}-spacer-${index}`}
                        className={styles.recipeTableSpacer}
                      />
                    ) : (
                      <div
                        key={`${recipe.id}-${item.name}-${index}`}
                        className={`${styles.recipeTableRow} ${
                          item.isEmphasis ? styles.recipeTableRowEmphasis : ""
                        }`}
                      >
                        <span className={styles.recipeTableInfo}>{item.info || "–"}</span>
                        <span>{item.name}</span>
                        <span>{formatRecipeItemAmount(item)}</span>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </section>

            <aside className={styles.sheetSidebar}>
              <section className={styles.sheetPanel}>
                <div className={styles.sectionHeading}>
                  <p>Översikt</p>
                  <h3>Snabb info</h3>
                </div>

                <dl className={styles.infoList}>
                  <div>
                    <dt>Senast uppdaterad</dt>
                    <dd>{recipe.updatedLabel}</dd>
                  </div>
                  <div>
                    <dt>Allergener</dt>
                    <dd>{recipe.allergens || "Inga angivna"}</dd>
                  </div>
                  <div>
                    <dt>Notering</dt>
                    <dd>{recipe.notes || "Ingen extra notering ännu."}</dd>
                  </div>
                </dl>
              </section>
            </aside>
          </div>
        </article>
      ) : null}
    </section>
  );
}
