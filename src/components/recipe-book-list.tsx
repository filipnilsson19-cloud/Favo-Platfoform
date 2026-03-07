import type { RefObject } from "react";

import { computeAmountSummary, contentItems } from "@/lib/recipe-utils";
import type { Recipe } from "@/types/recipe";
import styles from "./recipe-book.module.css";
import type { ViewMode } from "./recipe-book-types";

type RecipeBookListProps = {
  activeRecipeId: string;
  allVisibleSelected: boolean;
  canManage: boolean;
  recipes: Recipe[];
  selectedRecipeIds: string[];
  view: ViewMode;
  visibleRecipeIds: string[];
  visibleSelectionRef: RefObject<HTMLInputElement | null>;
  onOpenEditor: (recipeId: string) => void;
  onOpenRecipe: (recipeId: string) => void;
  onToggleRecipeSelection: (recipeId: string) => void;
  onToggleVisibleRecipesSelection: () => void;
};

export function RecipeBookList({
  activeRecipeId,
  allVisibleSelected,
  canManage,
  recipes,
  selectedRecipeIds,
  view,
  visibleRecipeIds,
  visibleSelectionRef,
  onOpenEditor,
  onOpenRecipe,
  onToggleRecipeSelection,
  onToggleVisibleRecipesSelection,
}: RecipeBookListProps) {
  function renderRecipeRow(recipe: Recipe) {
    const itemCount = contentItems(recipe.items).length;
    const isActive = recipe.id === activeRecipeId;
    const isSelected = selectedRecipeIds.includes(recipe.id);

    return (
      <article
        key={recipe.id}
        className={[
          styles.recipeCard,
          view === "card" ? styles.recipeCardCard : "",
          view === "table" ? styles.recipeCardTable : "",
          isActive ? styles.recipeCardActive : "",
          isSelected ? styles.recipeCardSelected : "",
        ].join(" ")}
        onClick={() => onOpenRecipe(recipe.id)}
      >
        <label
          className={styles.recipeSelect}
          aria-label={`Välj ${recipe.title}`}
          onClick={(event) => event.stopPropagation()}
        >
          <input
            className={styles.recipeCheckbox}
            type="checkbox"
            checked={isSelected}
            onClick={(event) => event.stopPropagation()}
            onChange={() => onToggleRecipeSelection(recipe.id)}
          />
        </label>
        <span className={styles.recipeType}>{recipe.category}</span>

        <div className={styles.recipeMain}>
          <strong className={styles.recipeTitle}>{recipe.title}</strong>
          <span className={styles.recipeCopy}>{recipe.summary}</span>
        </div>

        <span className={`${styles.recipeCell} ${styles.recipeComponentsCell}`}>
          {itemCount} komponenter
        </span>
        <span className={`${styles.recipeCell} ${styles.recipeTotalCell}`}>
          {computeAmountSummary(recipe.items)}
        </span>
        <span className={`${styles.recipeCell} ${styles.recipeUpdatedCell}`}>
          <span
            className={`${styles.recipeStatus} ${
              recipe.status === "Publicerad"
                ? styles.recipeStatusPublished
                : recipe.status === "Inaktiv"
                  ? styles.recipeStatusInactive
                  : styles.recipeStatusDraft
            }`}
          >
            {recipe.status}
          </span>
        </span>

        <div className={styles.recipeActions}>
          <button
            className={styles.rowAction}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onOpenRecipe(recipe.id);
            }}
          >
            Visa
          </button>
          {canManage ? (
            <button
              className={`${styles.rowAction} ${styles.rowActionStrong}`}
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onOpenEditor(recipe.id);
              }}
            >
              Redigera
            </button>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div
      className={[
        styles.recipeList,
        view === "card" ? styles.recipeListCard : "",
        view === "table" ? styles.recipeListTable : "",
      ].join(" ")}
    >
      {view === "table" ? (
        <div className={styles.recipeListHeader} aria-hidden="true">
          <label
            className={`${styles.recipeHeaderCell} ${styles.recipeHeaderSelect}`}
          >
            <input
              ref={visibleSelectionRef}
              className={styles.recipeCheckbox}
              type="checkbox"
              checked={allVisibleSelected}
              disabled={visibleRecipeIds.length === 0}
              onChange={onToggleVisibleRecipesSelection}
            />
            <span>Val</span>
          </label>
          <span className={`${styles.recipeHeaderCell} ${styles.recipeHeaderType}`}>
            Typ
          </span>
          <span className={styles.recipeHeaderCell}>Recept</span>
          <span className={styles.recipeHeaderCell}>Komponenter</span>
          <span className={styles.recipeHeaderCell}>Total</span>
          <span className={styles.recipeHeaderCell}>Status</span>
          <span
            className={`${styles.recipeHeaderCell} ${styles.recipeHeaderActions}`}
          >
            Åtgärder
          </span>
        </div>
      ) : null}

      <div className={styles.recipeListBody}>
        {recipes.map((recipe) => renderRecipeRow(recipe))}
      </div>
    </div>
  );
}
