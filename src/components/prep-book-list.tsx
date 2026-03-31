import { computePrepAmountSummary } from "@/lib/prep-utils";
import type { PrepRecipe } from "@/types/prep";
import styles from "./prep-book.module.css";
import type { PrepViewMode } from "./prep-book-types";

type PrepBookListProps = {
  activeRecipeId: string;
  canManage: boolean;
  recipes: PrepRecipe[];
  view: PrepViewMode;
  onOpenRecipe: (id: string) => void;
  onOpenEditor: (id: string) => void;
};

export function PrepBookList({
  activeRecipeId,
  canManage,
  recipes,
  view,
  onOpenRecipe,
  onOpenEditor,
}: PrepBookListProps) {
  return (
    <div
      className={[
        styles.prepList,
        view === "card" ? styles.prepListCard : "",
        view === "table" ? styles.prepListTable : "",
      ].join(" ")}
    >
      {view === "table" ? (
      <div className={styles.listHeader} aria-hidden="true">
        <span className={`${styles.listHeaderCell} ${styles.listHeaderCategory}`}>Kategori</span>
        <span className={styles.listHeaderCell}>Prepprecept</span>
        <span className={`${styles.listHeaderCell} ${styles.listHeaderContent}`}>Innehåll</span>
        <span className={`${styles.listHeaderCell} ${styles.listHeaderShelf}`}>Hållbarhet</span>
        <span className={`${styles.listHeaderCell} ${styles.listHeaderStatus}`}>Status</span>
        <span className={[styles.listHeaderCell, styles.listHeaderActions].join(" ")}>
          Åtgärder
        </span>
      </div>
      ) : null}

      <div className={styles.listBody}>
        {recipes.map((recipe) => {
          const isActive = recipe.id === activeRecipeId;
          const ingredientNames = recipe.ingredients
            .map((ingredient) => ingredient.name.trim())
            .filter(Boolean);
          const totalAmount = computePrepAmountSummary(recipe.ingredients);
          const contentPreview = ingredientNames.slice(0, 4).join(", ");
          const hiddenCount = Math.max(ingredientNames.length - 4, 0);
          return (
            <article
              key={recipe.id}
              className={[
                styles.prepCard,
                view === "card" ? styles.prepCardCard : "",
                view === "table" ? styles.prepCardTable : "",
                isActive ? styles.prepCardActive : "",
              ].join(" ")}
              onClick={() => onOpenRecipe(recipe.id)}
            >
              <span className={styles.prepCategoryCell}>
                <span className={styles.prepCategory}>{recipe.category}</span>
              </span>

              <div className={styles.prepMain}>
                <strong className={styles.prepTitle}>{recipe.title}</strong>
                <div className={styles.prepMetaRow}>
                  <span className={styles.prepMeta}>
                    {recipe.ingredients.filter((i) => i.name).length} ingredienser
                    {recipe.steps.length > 0
                      ? ` · ${recipe.steps.length} steg`
                      : ""}
                  </span>
                  <span className={styles.prepTotalChip}>{totalAmount}</span>
                </div>
              </div>

              <span className={styles.prepContentCell}>
                {contentPreview}
                {hiddenCount > 0 ? `, +${hiddenCount}` : "."}
              </span>

              <span className={styles.prepShelfCell}>{recipe.shelfLifeDays} dagar</span>

              <span className={styles.prepStatusCell}>
                <span
                  className={[
                    styles.prepStatus,
                    recipe.status === "Publicerad"
                      ? styles.prepStatusPublished
                      : recipe.status === "Inaktiv"
                        ? styles.prepStatusInactive
                        : styles.prepStatusDraft,
                  ].join(" ")}
                >
                  {recipe.status}
                </span>
              </span>

              <div className={styles.prepActionsCell}>
                <div className={styles.prepActions}>
                <button
                  className={styles.rowAction}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRecipe(recipe.id);
                  }}
                  >
                    Visa
                  </button>
                {canManage ? (
                  <button
                    className={[styles.rowAction, styles.rowActionStrong].join(" ")}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenEditor(recipe.id);
                    }}
                    >
                      Redigera
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
