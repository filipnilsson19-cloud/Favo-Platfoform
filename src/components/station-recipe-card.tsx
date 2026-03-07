import type { HTMLAttributes } from "react";

import { formatRecipeItemAmount } from "@/lib/recipe-utils";
import type { StationPrintableRecipe } from "@/types/station";

import styles from "./station-pages.module.css";

const cardToneClassMap: Record<string, string> = {
  Bowl: styles.cardToneBowl,
  Sallad: styles.cardToneSalad,
  Burger: styles.cardToneBurger,
  Taco: styles.cardToneTaco,
  Bao: styles.cardToneBao,
  Sides: styles.cardToneSides,
  Sås: styles.cardToneSauce,
};

type StationRecipeCardProps = {
  recipe: StationPrintableRecipe;
  showCategoryLabel: boolean;
  className?: string;
  articleProps?: HTMLAttributes<HTMLElement> & Record<string, unknown>;
};

export function StationRecipeCard({
  recipe,
  showCategoryLabel,
  className = "",
  articleProps,
}: StationRecipeCardProps) {
  return (
    <article
      {...articleProps}
      className={[
        styles.card,
        cardToneClassMap[recipe.category] ?? "",
        className,
        articleProps?.className ?? "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <header className={styles.cardHeader}>
        <div className={styles.cardIdentity}>
          <h2 className={styles.cardTitle}>{recipe.title}</h2>
          {showCategoryLabel ? (
            <span className={styles.cardCategory}>{recipe.category}</span>
          ) : null}
        </div>
      </header>

      <div className={styles.list}>
        {recipe.items.map((item, index) =>
          item.isSpacer ? (
            <div
              key={`${recipe.id}-spacer-${index}`}
              className={styles.rowSpacer}
              aria-hidden="true"
            />
          ) : (
            <div
              key={`${recipe.id}-${item.name}-${index}`}
              className={`${styles.row} ${item.isEmphasis ? styles.rowEmphasis : ""}`}
            >
              <span
                className={`${styles.rowInfo} ${item.info ? "" : styles.rowInfoEmpty}`}
              >
                {item.info || "Info"}
              </span>
              <span className={styles.rowName}>{item.name}</span>
              <span className={styles.rowAmount}>
                {formatRecipeItemAmount(item)}
              </span>
            </div>
          ),
        )}
      </div>

      <footer className={styles.cardFooter}>
        <span className={styles.cardFooterLabel}>Total</span>
        <strong className={styles.cardFooterValue}>{recipe.totalAmount}</strong>
      </footer>
    </article>
  );
}
