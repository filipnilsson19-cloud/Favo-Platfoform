"use client";

import { useEffect, useState } from "react";

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

function toAbsoluteUrl(value: string) {
  return new URL(value, window.location.origin).toString();
}

function absolutizeSrcSet(value: string) {
  return value
    .split(",")
    .map((entry) => {
      const [url, descriptor] = entry.trim().split(/\s+/, 2);
      const absoluteUrl = toAbsoluteUrl(url);
      return descriptor ? `${absoluteUrl} ${descriptor}` : absoluteUrl;
    })
    .join(", ");
}

function toFileName(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "stationsblad"
  );
}

export default function StationPrintPage() {
  const [bundle] = useState<StationPrintBundle | null>(() => readBundle());
  const payload = bundle?.payload ?? null;

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

  function handleDownloadHtml() {
    const documentClone = document.documentElement.cloneNode(true) as HTMLHtmlElement;

    documentClone
      .querySelectorAll('[data-export-hide="true"]')
      .forEach((element) => element.remove());
    documentClone.querySelectorAll("script").forEach((element) => element.remove());

    documentClone.querySelectorAll<HTMLElement>("[hidden]").forEach((element) => {
      element.removeAttribute("hidden");
    });

    documentClone.querySelectorAll<HTMLLinkElement>('link[href]').forEach((element) => {
      element.href = toAbsoluteUrl(element.getAttribute("href") ?? element.href);
    });

    documentClone.querySelectorAll<HTMLElement>("[src]").forEach((element) => {
      const src = element.getAttribute("src");
      if (!src) return;
      element.setAttribute("src", toAbsoluteUrl(src));
    });

    documentClone.querySelectorAll<HTMLElement>("[srcset]").forEach((element) => {
      const srcSet = element.getAttribute("srcset");
      if (!srcSet) return;
      element.setAttribute("srcset", absolutizeSrcSet(srcSet));
    });

    const html = `<!DOCTYPE html>\n${documentClone.outerHTML}`;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const downloadUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = downloadUrl;
    link.download = `${toFileName(payload?.title || "stationsblad")}-export.html`;
    document.body.append(link);
    link.click();
    link.remove();

    window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 250);
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
            Öppna den här sidan, justera om det behövs och skriv sedan ut eller spara som PDF.
          </span>
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
            className={styles.buttonGhost}
            type="button"
            onClick={handleDownloadHtml}
          >
            Ladda ner HTML
          </button>
          <button
            className={styles.button}
            type="button"
            onClick={() => window.print()}
          >
            Skriv ut / spara PDF
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
