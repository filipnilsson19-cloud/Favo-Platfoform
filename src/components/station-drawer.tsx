"use client";

import { StationPages } from "@/components/station-pages";
import type { StationPrintPayload, StationSource } from "@/types/station";

import styles from "./station-drawer.module.css";

type StationDrawerProps = {
  isOpen: boolean;
  payload: StationPrintPayload | null;
  source: StationSource;
  canBuildSelected: boolean;
  onBuildVisible: () => void;
  onBuildSelected: () => void;
  onClose: () => void;
  onPrint: () => void;
};

export function StationDrawer({
  isOpen,
  payload,
  source,
  canBuildSelected,
  onBuildVisible,
  onBuildSelected,
  onClose,
  onPrint,
}: StationDrawerProps) {
  return (
    <section
      className={`${styles.drawer} ${isOpen ? styles.drawerOpen : ""}`}
      aria-hidden={isOpen ? "false" : "true"}
      aria-label="Stationsvy"
    >
      <button
        className={styles.backdrop}
        type="button"
        aria-label="Stäng stationsvy"
        onClick={onClose}
      />

      <article
        className={styles.sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby="station-sheet-title"
      >
        <header className={styles.toolbar}>
          <div className={styles.meta}>
            <h2 id="station-sheet-title">{payload?.title || "Stationsblad"}</h2>
            <p>
              {payload
                ? `${payload.sourceLabel} • ${payload.recipeCount} recept`
                : "Inget urval"}
            </p>
          </div>

          <div className={styles.actions}>
            <div className={styles.sourceToggle} role="group" aria-label="Välj urval">
              <button
                className={`${styles.sourceButton} ${
                  source === "visible" ? styles.sourceButtonActive : ""
                }`}
                type="button"
                onClick={onBuildVisible}
              >
                Synliga
              </button>
              <button
                className={`${styles.sourceButton} ${
                  source === "selected" ? styles.sourceButtonActive : ""
                }`}
                type="button"
                disabled={!canBuildSelected}
                onClick={onBuildSelected}
              >
                Valda
              </button>
            </div>
            <button className={styles.button} type="button" onClick={onPrint}>
              Skriv ut A4
            </button>
            <button className={styles.buttonGhost} type="button" onClick={onClose}>
              Stäng
            </button>
          </div>
        </header>

        <div className={styles.previewWrap}>
          <StationPages payload={payload} variant="screen" />
        </div>
      </article>
    </section>
  );
}
