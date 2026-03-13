import styles from "@/components/favo-shell.module.css";

function LoadingRows() {
  return (
    <div className={styles.appLoadingRows} aria-hidden="true">
      {Array.from({ length: 7 }).map((_, index) => (
        <div key={index} className={styles.appLoadingRow}>
          <span className={styles.appLoadingBadge} />
          <span className={styles.appLoadingTitle} />
          <span className={styles.appLoadingMeta} />
          <span className={styles.appLoadingMetaShort} />
        </div>
      ))}
    </div>
  );
}

export default function AppLoading() {
  return (
    <section className={styles.appLoadingPage} aria-label="Laddar innehåll">
      <div className={styles.appLoadingHeader}>
        <span className={styles.appLoadingEyebrow} />
        <span className={styles.appLoadingHeading} />
        <span className={styles.appLoadingCopy} />
      </div>

      <div className={styles.appLoadingPanel}>
        <div className={styles.appLoadingToolbar}>
          <div className={styles.appLoadingMetrics}>
            <span className={styles.appLoadingMetric} />
            <span className={styles.appLoadingMetricSmall} />
          </div>

          <div className={styles.appLoadingActions}>
            <span className={styles.appLoadingChip} />
            <span className={styles.appLoadingChip} />
            <span className={styles.appLoadingButton} />
          </div>
        </div>

        <LoadingRows />
      </div>
    </section>
  );
}
