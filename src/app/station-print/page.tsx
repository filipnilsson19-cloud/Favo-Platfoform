"use client";

import { useEffect, useState } from "react";

import { StationKitchenSheet } from "@/components/station-kitchen-sheet";
import { exportStationBundleToExcel } from "@/lib/station-excel";
import { STATION_PRINT_STORAGE_KEY } from "@/lib/station-utils";
import type { StationPrintBundle } from "@/types/station";

import styles from "./page.module.css";

function readBundle(): StationPrintBundle | null {
  if (typeof window === "undefined") return null;

  try {
    const raw = window.localStorage.getItem(STATION_PRINT_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StationPrintBundle) : null;
  } catch {
    return null;
  }
}

export default function StationPrintPage() {
  const [bundle, setBundle] = useState<StationPrintBundle | null>(null);
  const [isExportingExcel, setIsExportingExcel] = useState(false);
  const payload = bundle?.payload ?? null;

  useEffect(() => {
    setBundle(readBundle());
  }, []);

  function handleClose() {
    window.close();

    window.setTimeout(() => {
      if (window.history.length > 1) {
        window.history.back();
        return;
      }

      window.location.assign("/");
    }, 120);
  }

  async function handleDownloadExcel() {
    if (!bundle) return;

    try {
      setIsExportingExcel(true);
      await exportStationBundleToExcel(bundle);
    } catch (error) {
      console.error("Failed to export Excel", error);
      window.alert("Det gick inte att exportera Excel-filen. Försök igen.");
    } finally {
      setIsExportingExcel(false);
    }
  }

  useEffect(() => {
    if (payload?.title) {
      document.title = `${payload.title} - Utskrift`;
    }
  }, [payload]);

  const summary = payload
    ? `${payload.sourceLabel} • ${payload.recipeCount} recept`
    : "Ingen utskriftsdata hittades.";

  return (
    <div className={styles.page}>
      <header className={styles.toolbar} data-export-hide="true">
        <div className={styles.copy}>
          <strong>{payload?.title || "Stationsblad"}</strong>
          <span>{summary}</span>
          <span className={styles.hint}>
            Utskriftsvyn matchar nu samma t\u00e4ta layout som Excel-exporten.
          </span>
        </div>

        <div className={styles.actions}>
          <button className={styles.buttonGhost} type="button" onClick={handleClose}>
            Stäng
          </button>
          <button
            className={styles.buttonGhost}
            type="button"
            disabled={!bundle || isExportingExcel}
            onClick={() => void handleDownloadExcel()}
          >
            {isExportingExcel ? "Exporterar..." : "Exportera Excel"}
          </button>
          <button className={styles.button} type="button" onClick={() => window.print()}>
            Skriv ut / spara PDF
          </button>
        </div>
      </header>

      <StationKitchenSheet bundle={bundle} />
    </div>
  );
}
