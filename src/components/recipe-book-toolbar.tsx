import { recipeStatusOptions } from "@/lib/recipe-utils";
import type { RecipeCategory } from "@/types/recipe";
import styles from "./recipe-book.module.css";
import type {
  ActiveStatus,
  CategoryOption,
  ViewMode,
} from "./recipe-book-types";

type RecipeBookToolbarProps = {
  activeCategories: RecipeCategory[];
  activeStatus: ActiveStatus;
  canManage: boolean;
  canOpenStation: boolean;
  categoryOptions: CategoryOption[];
  searchQuery: string;
  selectedRecipesCount: number;
  visibleRecipesCount: number;
  view: ViewMode;
  onOpenCategoryManager: () => void;
  onOpenNewRecipe: () => void;
  onOpenStation: () => void;
  onOpenStationViewManager: () => void;
  onSearchQueryChange: (value: string) => void;
  onSetActiveStatus: (status: ActiveStatus) => void;
  onToggleCategory: (category: CategoryOption) => void;
  onViewChange: (view: ViewMode) => void;
};

export function RecipeBookToolbar({
  activeCategories,
  activeStatus,
  canManage,
  canOpenStation,
  categoryOptions,
  searchQuery,
  selectedRecipesCount,
  visibleRecipesCount,
  view,
  onOpenCategoryManager,
  onOpenNewRecipe,
  onOpenStation,
  onOpenStationViewManager,
  onSearchQueryChange,
  onSetActiveStatus,
  onToggleCategory,
  onViewChange,
}: RecipeBookToolbarProps) {
  return (
    <div className={styles.recipeToolbar} aria-label="Receptoversikt">
      <div className={styles.toolbarPrimary}>
        <div className={styles.toolbarMetaRow}>
          <div className={styles.toolbarMetrics}>
            <span className={styles.toolbarMetric}>
              <strong>{visibleRecipesCount}</strong> rätter
            </span>
            <span className={styles.toolbarMetricMuted}>
              {selectedRecipesCount} valda
            </span>
          </div>

          {canManage ? (
            <button
              className={`${styles.actionButton} ${styles.toolbarActionCompact} ${styles.toolbarTopAction}`}
              type="button"
              onClick={onOpenNewRecipe}
            >
              Ny maträtt
            </button>
          ) : null}
        </div>

        <div className={styles.toolbarFilterStack}>
          <div className={styles.filterSection}>
            <div className={styles.filterSectionHeader}>
              <span className={styles.filterSectionLabel}>Kategori</span>
              {canManage ? (
                <div className={styles.filterManageStack}>
                  <button
                    className={styles.filterManageButton}
                    type="button"
                    onClick={onOpenCategoryManager}
                  >
                    Hantera menykategorier
                  </button>
                  <button
                    className={styles.filterManageButton}
                    type="button"
                    onClick={onOpenStationViewManager}
                  >
                    Hantera lägglistor
                  </button>
                </div>
              ) : null}
            </div>
            <div className={styles.categoryTabs}>
              {categoryOptions.map((category) => {
                const isActive =
                  category === "Alla"
                    ? activeCategories.length === 0
                    : activeCategories.includes(category);

                return (
                  <button
                    key={category}
                    className={[
                      styles.categoryTab,
                      isActive ? styles.categoryTabActive : "",
                    ].join(" ")}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onToggleCategory(category)}
                  >
                    <span>{category}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className={styles.toolbarSecondaryRow}>
          <div className={`${styles.filterSection} ${styles.statusSection}`}>
            <span className={styles.filterSectionLabel}>Status</span>
            <div className={styles.statusToggle}>
              {(["Alla", ...recipeStatusOptions] as ActiveStatus[]).map((status) => {
                const isActive = status === activeStatus;

                return (
                  <button
                    key={status}
                    className={[
                      styles.statusToggleButton,
                      styles[
                        `statusToggle${
                          status === "Alla"
                            ? "All"
                            : status === "Publicerad"
                              ? "Published"
                              : status === "Inaktiv"
                                ? "Inactive"
                                : "Draft"
                        }`
                      ],
                      isActive ? styles.statusToggleButtonActive : "",
                    ].join(" ")}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() => onSetActiveStatus(status)}
                  >
                    {status}
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.searchRow}>
            <div className={styles.searchSection}>
              <label className={styles.filterSectionLabel} htmlFor="recipe-search">
                Sök
              </label>
              <div className={styles.searchFieldWrap}>
                <input
                  id="recipe-search"
                  className={styles.searchField}
                  type="search"
                  value={searchQuery}
                  placeholder="Sök rätt, komponent eller info"
                  onChange={(event) => onSearchQueryChange(event.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.toolbarViewRow}>
            <div className={styles.toolbarViewStack}>
              <div className={styles.toolbarViewControls}>
                <button
                  className={`${styles.actionButton} ${styles.toolbarActionCompact} ${styles.stationAction}`}
                  type="button"
                  onClick={onOpenStation}
                  disabled={!canOpenStation}
                >
                  Lägglista
                </button>

                <div className={styles.viewToggle} role="group" aria-label="Välj vy">
                  {(["table", "card"] as ViewMode[]).map((mode) => (
                    <button
                      key={mode}
                      className={`${styles.viewToggleButton} ${
                        view === mode ? styles.viewToggleButtonActive : ""
                      }`}
                      type="button"
                      aria-pressed={view === mode}
                      onClick={() => onViewChange(mode)}
                    >
                      {mode === "card" ? "Kort" : "Tabell"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
