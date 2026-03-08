"use client";

import { useMemo, useState } from "react";

import type { AppStationView } from "@/types/station-view";

import styles from "./recipe-book.module.css";

type StationViewManagerDrawerProps = {
  isBusy: boolean;
  isOpen: boolean;
  views: AppStationView[];
  onClose: () => void;
  onDelete: (viewId: string, viewName: string) => Promise<void>;
  onRename: (viewId: string, nextName: string) => Promise<void>;
  onSetActive: (viewId: string, isActive: boolean) => Promise<void>;
};

export function StationViewManagerDrawer({
  isBusy,
  isOpen,
  views,
  onClose,
  onDelete,
  onRename,
  onSetActive,
}: StationViewManagerDrawerProps) {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const sortedViews = useMemo(
    () =>
      [...views].sort((left, right) => {
        if (left.isActive !== right.isActive) {
          return left.isActive ? -1 : 1;
        }

        if (left.scopeLabel !== right.scopeLabel) {
          return left.scopeLabel.localeCompare(right.scopeLabel, "sv");
        }

        return left.name.localeCompare(right.name, "sv");
      }),
    [views],
  );

  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
    >
      <button
        className={styles.drawerBackdrop}
        type="button"
        aria-label="Stäng lägglisthantering"
        onClick={onClose}
      />

      <article
        className={`${styles.sheet} ${styles.categorySheet}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-view-manager-title"
      >
        <header className={styles.sheetHeader}>
          <div>
            <p className={styles.pageEyebrow}>Lägglistor</p>
            <h2 id="station-view-manager-title">Hantera lägglistor</h2>
            <p className={styles.sheetIntro}>
              Byt namn, aktivera, inaktivera eller radera sparade lägglistor.
            </p>
          </div>

          <div className={styles.drawerActionStack}>
            <button
              className={styles.drawerButtonSecondary}
              type="button"
              onClick={onClose}
            >
              Stäng
            </button>
          </div>
        </header>

        <section className={`${styles.sheetPanel} ${styles.categoryPanel}`}>
          <div className={styles.sectionHeading}>
            <p>Översikt</p>
            <h3>Sparade lägglistor</h3>
          </div>

          <div className={styles.categoryManagerList}>
            {sortedViews.length === 0 ? (
              <div className={styles.categoryManagerEmpty}>
                Inga sparade vyer ännu. Skapa en i stationsvyn och spara den därifrån.
              </div>
            ) : null}

            {sortedViews.map((view) => {
              const draftValue = drafts[view.id] ?? view.name;
              const hasChanges = draftValue.trim() !== view.name;

              return (
                <div key={view.id} className={styles.categoryManagerRow}>
                  <div className={styles.categoryManagerMain}>
                    <input
                      className={styles.editorInput}
                      type="text"
                      value={draftValue}
                      onChange={(event) =>
                        setDrafts((current) => ({
                          ...current,
                          [view.id]: event.target.value,
                        }))
                      }
                    />

                    <div className={styles.categoryManagerMeta}>
                      <span className={styles.categoryUsage}>{view.scopeLabel}</span>
                      <span className={styles.categoryUsage}>
                        {view.recipeCount} rätter
                      </span>
                      <span
                        className={`${styles.recipeStatus} ${
                          view.isActive
                            ? styles.recipeStatusPublished
                            : styles.recipeStatusInactive
                        }`}
                      >
                        {view.isActive ? "Aktiv" : "Inaktiv"}
                      </span>
                    </div>
                  </div>

                  <div className={styles.categoryManagerActions}>
                    <button
                      className={styles.drawerButtonSecondary}
                      type="button"
                      disabled={isBusy || !hasChanges || draftValue.trim().length === 0}
                      onClick={() => onRename(view.id, draftValue)}
                    >
                      Spara namn
                    </button>
                    <button
                      className={styles.drawerButtonSecondary}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onSetActive(view.id, !view.isActive)}
                    >
                      {view.isActive ? "Inaktivera" : "Aktivera"}
                    </button>
                    <button
                      className={styles.drawerButtonDanger}
                      type="button"
                      disabled={isBusy}
                      onClick={() => onDelete(view.id, view.name)}
                    >
                      Radera
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </article>
    </section>
  );
}
