import type { CSSProperties } from "react";

import {
  buildStationKitchenPages,
  getStationKitchenCategoryFill,
} from "@/lib/station-kitchen-layout";
import { formatRecipeItemAmount } from "@/lib/recipe-utils";
import type { StationPrintBundle } from "@/types/station";

import styles from "./station-kitchen-sheet.module.css";

type StationKitchenSheetProps = {
  bundle: StationPrintBundle | null;
  emptyMessage?: string;
};

export function StationKitchenSheet({
  bundle,
  emptyMessage = "Ingen utskriftsdata hittades. Gå tillbaka till lägglistan och försök igen.",
}: StationKitchenSheetProps) {
  const pages = buildStationKitchenPages(bundle);
  const payload = bundle?.payload ?? null;

  if (!payload || pages.length === 0) {
    return (
      <div className={styles.pages}>
        <section className={`${styles.page} ${styles.emptyPage}`}>
          <div className={styles.emptyState}>{emptyMessage}</div>
        </section>
      </div>
    );
  }

  return (
    <div className={styles.pages}>
      {pages.map((page, pageIndex) => {
        const leftColumnRecipes = page.recipes
          .filter((entry) => entry.startColumn === 1)
          .sort((left, right) => left.startRow - right.startRow);
        const rightColumnRecipes = page.recipes
          .filter((entry) => entry.startColumn !== 1)
          .sort((left, right) => left.startRow - right.startRow);

        return (
          <section key={`${payload.title}-${pageIndex}`} className={styles.page}>
            <div className={styles.screenMeta} data-print-hide="true">
              <span>{payload.title}</span>
              <span>
                Sida {pageIndex + 1}/{pages.length}
              </span>
            </div>

            <div className={styles.columns}>
              {[leftColumnRecipes, rightColumnRecipes].map((columnRecipes, columnIndex) => (
                <div key={`${pageIndex}-${columnIndex}`} className={styles.column}>
                  {columnRecipes.map(({ recipe }) => {
                    const accent = getStationKitchenCategoryFill(recipe.category);
                    const title = payload.showCategoryLabel
                      ? `${recipe.title} (${recipe.category})`
                      : recipe.title;

                    return (
                      <article
                        key={`${pageIndex}-${recipe.id}`}
                        className={styles.block}
                        style={
                          {
                            "--sheet-accent": accent,
                          } as CSSProperties
                        }
                      >
                        <table className={styles.table}>
                          <thead>
                            <tr>
                              <th className={styles.titleCell} colSpan={2}>
                                {title}
                              </th>
                              <th className={styles.amountHeaderCell}>Mängd</th>
                            </tr>
                          </thead>
                          <tbody>
                            {recipe.items.map((item, index) =>
                              item.isSpacer ? (
                                <tr
                                  key={`${recipe.id}-spacer-${index}`}
                                  className={styles.spacerRow}
                                  aria-hidden="true"
                                >
                                  <td className={styles.spacerCell} />
                                  <td className={styles.spacerCell} />
                                  <td className={styles.spacerCell} />
                                </tr>
                              ) : (
                                <tr
                                  key={`${recipe.id}-${item.name}-${index}`}
                                  className={item.isEmphasis ? styles.emphasisRow : ""}
                                >
                                  <td className={styles.infoCell}>
                                    {item.info?.trim() || String(index + 1)}
                                  </td>
                                  <td className={styles.nameCell}>{item.name}</td>
                                  <td className={styles.amountCell}>
                                    {formatRecipeItemAmount(item)}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                          <tfoot>
                            <tr>
                              <th className={styles.totalLabelCell} colSpan={2}>
                                Totalt
                              </th>
                              <th className={styles.totalValueCell}>{recipe.totalAmount}</th>
                            </tr>
                          </tfoot>
                        </table>
                      </article>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
