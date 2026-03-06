import { formatRecipeItemAmount } from "@/lib/recipe-utils";
import { paginateStationRecipes } from "@/lib/station-utils";
import type { StationPrintPayload } from "@/types/station";

import styles from "./station-pages.module.css";

type StationPagesProps = {
  payload: StationPrintPayload | null;
  variant: "screen" | "print";
  emptyMessage?: string;
};

const packClassMap = {
  single: styles.packSingle,
  duo: styles.packDuo,
  spread: styles.packSpread,
  dense: styles.packDense,
  compact: styles.packCompact,
};

const cardToneClassMap = {
  Bowl: styles.cardToneBowl,
  Sallad: styles.cardToneSalad,
  Burger: styles.cardToneBurger,
  Taco: styles.cardToneTaco,
  Bao: styles.cardToneBao,
  Sides: styles.cardToneSides,
  Sås: styles.cardToneSauce,
};

export function StationPages({
  payload,
  variant,
  emptyMessage = "Inga recept finns i det här urvalet ännu.",
}: StationPagesProps) {
  const pages =
    payload && payload.recipes.length > 0
      ? paginateStationRecipes(payload.recipes, payload.showCategoryLabel)
      : [];

  if (!payload || pages.length === 0) {
    return (
      <div
        className={`${styles.pages} ${
          variant === "print" ? styles.pagesPrint : styles.pagesScreen
        }`}
      >
        <section className={`${styles.page} ${styles.emptyPage}`}>
          <div className={styles.emptyState}>{emptyMessage}</div>
        </section>
      </div>
    );
  }

  return (
    <div
      className={`${styles.pages} ${
        variant === "print" ? styles.pagesPrint : styles.pagesScreen
      }`}
    >
      {pages.map((page, pageIndex) => {
        const pageMeta =
          pages.length > 1
            ? `Sida ${pageIndex + 1}/${pages.length}`
            : `${payload.recipeCount} recept`;

        return (
          <section key={`${payload.title}-${pageIndex}`} className={styles.page}>
            <div className={styles.pageHeader}>
              <span className={styles.pageLabel}>{payload.title}</span>
              <span className={styles.pageMeta}>{pageMeta}</span>
            </div>

            <div className={`${styles.pack} ${packClassMap[page.layout.key]}`}>
              {page.columns.map((column, columnIndex) => (
                <div key={`${pageIndex}-${columnIndex}`} className={styles.column}>
                  {column.recipes.map((recipe) => (
                    <article
                      key={recipe.id}
                      className={`${styles.card} ${cardToneClassMap[recipe.category]}`}
                    >
                      <header className={styles.cardHeader}>
                        <div className={styles.cardIdentity}>
                          <h2 className={styles.cardTitle}>{recipe.title}</h2>
                          {payload.showCategoryLabel ? (
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
                              className={`${styles.row} ${
                                item.isEmphasis ? styles.rowEmphasis : ""
                              }`}
                            >
                              <div className={styles.rowLead}>
                                {item.info ? (
                                  <span className={styles.rowTag}>{item.info}</span>
                                ) : null}
                                <span className={styles.rowName}>{item.name}</span>
                              </div>
                              <span className={styles.rowAmount}>
                                {formatRecipeItemAmount(item)}
                              </span>
                            </div>
                          ),
                        )}
                      </div>

                      <footer className={styles.cardFooter}>
                        <span className={styles.cardFooterLabel}>Total</span>
                        <strong className={styles.cardFooterValue}>
                          {recipe.totalAmount}
                        </strong>
                      </footer>
                    </article>
                  ))}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
