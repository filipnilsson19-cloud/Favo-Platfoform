import styles from "./prep-book.module.css";
import type { PrepActiveStatus, PrepViewMode } from "./prep-book-types";

type PrepBookToolbarProps = {
  activeCategory: string;
  activeStatus: PrepActiveStatus;
  categoryOptions: string[];
  searchQuery: string;
  visibleCount: number;
  view: PrepViewMode;
  canManage: boolean;
  onSetActiveStatus: (status: PrepActiveStatus) => void;
  onToggleCategory: (cat: string) => void;
  onSearchChange: (q: string) => void;
  onViewChange: (view: PrepViewMode) => void;
  onOpenNewRecipe: () => void;
  onOpenCategoryManager: () => void;
  onOpenUnitManager: () => void;
  onOpenStorageManager: () => void;
};

export function PrepBookToolbar({
  activeCategory,
  activeStatus,
  categoryOptions,
  searchQuery,
  visibleCount,
  view,
  canManage,
  onSetActiveStatus,
  onToggleCategory,
  onSearchChange,
  onViewChange,
  onOpenNewRecipe,
  onOpenCategoryManager,
  onOpenUnitManager,
  onOpenStorageManager,
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
          <div className={styles.prepToolbarActions}>
            {canManage ? (
              <>
                <button className={styles.actionButton} type="button" onClick={onOpenNewRecipe}>
                  Nytt prepprecept
                </button>
                <div className={styles.filterManageStackSubtle}>
                  <button
                    className={styles.filterManageButtonSubtle}
                    type="button"
                    onClick={onOpenCategoryManager}
                  >
                    Hantera kategorier
                  </button>
                  <button
                    className={styles.filterManageButtonSubtle}
                    type="button"
                    onClick={onOpenUnitManager}
                  >
                    Hantera mått/enhet
                  </button>
                  <button
                    className={styles.filterManageButtonSubtle}
                    type="button"
                    onClick={onOpenStorageManager}
                  >
                    Hantera förvaring
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>

        <div className={styles.filterSection}>
          <div className={styles.filterSectionHeader}>
            <span className={styles.filterSectionLabel}>Kategori</span>
          </div>
          <div className={styles.categoryTabs}>
            {(["Alla", ...categoryOptions] as string[]).map((cat) => {
              const isActive = cat === activeCategory;
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
          <div className={`${styles.filterSection} ${styles.statusSection}`}>
            <span className={styles.filterSectionLabel}>Status</span>
            <div className={styles.statusToggle}>
              {(["Alla", "Publicerad", "Utkast", "Inaktiv"] as PrepActiveStatus[]).map((status) => {
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
              <label className={styles.filterSectionLabel} htmlFor="prep-search">
                Sök
              </label>
              <div className={styles.searchFieldWrap}>
                <input
                  id="prep-search"
                  className={styles.searchField}
                  type="search"
                  value={searchQuery}
                  placeholder="Sök recept, ingrediens eller info"
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.toolbarViewRow}>
            <div className={styles.toolbarViewControls}>
              <div className={styles.viewToggle} role="group" aria-label="Välj vy">
                {(["table", "card"] as PrepViewMode[]).map((mode) => (
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
  );
}
