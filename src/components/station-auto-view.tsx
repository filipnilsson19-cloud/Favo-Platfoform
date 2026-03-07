import { paginateStationRecipes } from "@/lib/station-utils";
import type { StationPrintPayload } from "@/types/station";

import { StationRecipeCard } from "./station-recipe-card";
import styles from "./station-pages.module.css";

type StationAutoViewProps = {
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

export function StationAutoView({
  payload,
  variant,
  emptyMessage = "Inga recept finns i det här urvalet ännu.",
}: StationAutoViewProps) {
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

            <div
              className={styles.pageCanvas}
              data-station-auto-page
              data-page-index={pageIndex}
              data-pack-key={page.layout.key}
            >
              <div className={`${styles.pack} ${packClassMap[page.layout.key]}`}>
                {page.columns.map((column, columnIndex) => (
                  <div key={`${pageIndex}-${columnIndex}`} className={styles.column}>
                    {column.recipes.map((recipe) => (
                      <StationRecipeCard
                        key={recipe.id}
                        recipe={recipe}
                        showCategoryLabel={payload.showCategoryLabel}
                        articleProps={{
                          "data-station-auto-card": recipe.id,
                        }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
