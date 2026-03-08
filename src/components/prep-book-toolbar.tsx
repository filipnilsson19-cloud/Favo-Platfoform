import styles from "./prep-book.module.css";

type PrepBookToolbarProps = {
  activeCategories: string[];
  categoryOptions: string[];
  searchQuery: string;
  visibleCount: number;
  canManage: boolean;
  onToggleCategory: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onOpenNewRecipe: () => void;
  onOpenCategoryManager: () => void;
};

export function PrepBookToolbar({
  activeCategories,
  categoryOptions,
  searchQuery,
  visibleCount,
  canManage,
  onToggleCategory,
  onSearchChange,
  onOpenNewRecipe,
  onOpenCategoryManager,
}: PrepBookToolbarProps) {
  return (
    <div className={styles.prepToolbar}>
      <div className={styles.toolbarPrimary}>
        <div className={styles.toolbarMetaRow}>
          <div className={styles.toolbarMetrics}>
            <span className={styles.toolbarMetric}>
              <strong>{visibleCount}</strong> prepprecept
            </span>
          </div>
          {canManage ? (
            <button className={styles.actionButton} type="button" onClick={onOpenNewRecipe}>
              Nytt prepprecept
            </button>
          ) : null}
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterSectionHeader}>
            <span className={styles.filterSectionLabel}>Kategori</span>
            {canManage ? (
              <button
                className={styles.filterManageButton}
                type="button"
                onClick={onOpenCategoryManager}
              >
                Hantera kategorier
              </button>
            ) : null}
          </div>
          <div className={styles.categoryTabs}>
            {(["Alla", ...categoryOptions] as string[]).map((cat) => {
              const isActive =
                cat === "Alla" ? activeCategories.length === 0 : activeCategories.includes(cat);
              return (
                <button
                  key={cat}
                  className={[styles.categoryTab, isActive ? styles.categoryTabActive : ""].join(" ")}
                  type="button"
                  aria-pressed={isActive}
                  onClick={() => onToggleCategory(cat)}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.toolbarSecondaryRow}>
          <div className={styles.filterSection}>
            <label className={styles.filterSectionLabel} htmlFor="prep-search">
              Sök
            </label>
            <div className={styles.searchSection}>
              <div className={styles.searchFieldWrap}>
                <input
                  id="prep-search"
                  className={styles.searchField}
                  type="search"
                  value={searchQuery}
                  placeholder="Sök prepprecept, ingrediens..."
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
