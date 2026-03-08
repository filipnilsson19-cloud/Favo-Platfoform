import type { PrepRecipe } from "@/types/prep";
import styles from "./prep-book.module.css";

type PrepBookListProps = {
  activeRecipeId: string;
  canManage: boolean;
  recipes: PrepRecipe[];
  onOpenRecipe: (id: string) => void;
  onOpenEditor: (id: string) => void;
  onOpenBatch: (id: string) => void;
};

export function PrepBookList({
  activeRecipeId,
  canManage,
  recipes,
  onOpenRecipe,
  onOpenEditor,
  onOpenBatch,
}: PrepBookListProps) {
  return (
    <div className={styles.prepList}>
      <div className={styles.listHeader} aria-hidden="true">
        <span className={styles.listHeaderCell}>Kategori</span>
        <span className={styles.listHeaderCell}>Prepprecept</span>
        <span className={styles.listHeaderCell}>Hållbarhet</span>
        <span className={styles.listHeaderCell}>Status</span>
        <span className={[styles.listHeaderCell, styles.listHeaderActions].join(" ")}>
          Åtgärder
        </span>
      </div>

      <div className={styles.listBody}>
        {recipes.map((recipe) => {
          const isActive = recipe.id === activeRecipeId;
          return (
            <article
              key={recipe.id}
              className={[styles.prepCard, isActive ? styles.prepCardActive : ""].join(" ")}
              onClick={() => onOpenRecipe(recipe.id)}
            >
              <span className={styles.prepCategory}>{recipe.category}</span>

              <div className={styles.prepMain}>
                <strong className={styles.prepTitle}>{recipe.title}</strong>
                <span className={styles.prepMeta}>
                  {recipe.ingredients.filter((i) => i.name).length} ingredienser
                  {recipe.steps.length > 0
                    ? ` · ${recipe.steps.length} steg`
                    : ""}
                </span>
              </div>

              <span className={styles.prepShelf}>
                {recipe.shelfLifeDays} dagar
              </span>

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
                <button
                  className={[styles.rowAction, styles.rowActionPrepp].join(" ")}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenBatch(recipe.id);
                  }}
                >
                  Prepp klar
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
            </article>
          );
        })}
      </div>
    </div>
  );
}
