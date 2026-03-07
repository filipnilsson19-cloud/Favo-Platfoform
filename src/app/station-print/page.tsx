"use client";

import { useEffect, useRef, useState } from "react";

import { StationAutoView } from "@/components/station-auto-view";
import { StationEditableView } from "@/components/station-editable-view";
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
  const [bundle] = useState<StationPrintBundle | null>(() => readBundle());
  const payload = bundle?.payload ?? null;
  const hasAutoPrinted = useRef(false);

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

  useEffect(() => {
    if (payload?.title) {
      document.title = `${payload.title} - Utskrift`;
    }
  }, [payload]);

  useEffect(() => {
    if (!payload || hasAutoPrinted.current) return;

    hasAutoPrinted.current = true;
    window.setTimeout(() => {
      window.print();
    }, 250);
  }, [payload]);

  const summary = payload
    ? `${payload.sourceLabel} • ${payload.recipeCount} recept`
    : "Ingen utskriftsdata hittades.";

  return (
    <div className={styles.page}>
      <header className={styles.toolbar}>
        <div className={styles.copy}>
          <strong>{payload?.title || "Stationsblad"}</strong>
          <span>{summary}</span>
        </div>

        <div className={styles.actions}>
          <button
            className={styles.buttonGhost}
            type="button"
            onClick={handleClose}
          >
            Stäng
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => window.print()}
          >
            Skriv ut
          </button>
        </div>
      </header>

      {bundle?.editableLayout ? (
        <StationEditableView
          payload={payload}
          layout={bundle.editableLayout}
          variant="print"
          emptyMessage="Ingen utskriftsdata hittades. Gå tillbaka till stationsvyn och försök igen."
        />
      ) : (
        <StationAutoView
          payload={payload}
          variant="print"
          emptyMessage="Ingen utskriftsdata hittades. Gå tillbaka till stationsvyn och försök igen."
        />
      )}
    </div>
  );
}
