import { buildStationMeta, paginateStationRecipes } from "@/lib/station-utils";
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
        const pageRecipes = page.columns.flatMap((column) => column.recipes);
        const meta =
          pages.length > 1
            ? `${buildStationMeta(pageRecipes.length)} • Sida ${pageIndex + 1}/${pages.length}`
            : buildStationMeta(pageRecipes.length);

        return (
          <section key={`${payload.title}-${pageIndex}`} className={styles.page}>
            <div className={styles.pageHeader}>
              <span>{payload.title}</span>
              <span>{meta}</span>
            </div>

            <div className={`${styles.pack} ${packClassMap[page.layout.key]}`}>
              {page.columns.map((column, columnIndex) => (
                <div key={`${pageIndex}-${columnIndex}`} className={styles.column}>
                  {column.recipes.map((recipe) => (
                    <article key={recipe.id} className={styles.card}>
                      <header className={styles.cardHeader}>
                        <h2 className={styles.cardTitle}>{recipe.title}</h2>
                        {payload.showCategoryLabel ? (
                          <span className={styles.cardCategory}>{recipe.category}</span>
                        ) : null}
                      </header>

                      <div className={styles.table}>
                        {recipe.items.map((item, index) =>
                          item.isSpacer ? (
                            <div
                              key={`${recipe.id}-spacer-${index}`}
                              className={`${styles.row} ${styles.rowSpacer}`}
                              aria-hidden="true"
                            />
                          ) : (
                            <div
                              key={`${recipe.id}-${item.name}-${index}`}
                              className={`${styles.row} ${
                                item.isEmphasis ? styles.rowEmphasis : ""
                              }`}
                            >
                              <span
                                className={`${styles.rowInfo} ${
                                  item.info ? "" : styles.rowInfoEmpty
                                }`}
                              >
                                {item.info || "–"}
                              </span>
                              <span className={styles.rowName}>{item.name}</span>
                              <span className={styles.rowAmount}>{item.amount}</span>
                            </div>
                          ),
                        )}

                        <div className={styles.total}>
                          <span className={styles.totalLabel}>Totalvikt</span>
                          <strong className={styles.totalValue}>
                            {recipe.totalAmount}
                          </strong>
                        </div>
                      </div>
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
