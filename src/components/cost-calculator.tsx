"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

import {
  buildMenuCostDetail,
  buildMenuCostSummary,
  buildPrepCostDetail,
  buildPrepCostSummary,
  formatComparePrice,
  formatPercent,
  formatRawIngredientPackage,
  formatRawIngredientTotalQuantity,
  formatSek,
} from "@/lib/costing-utils";
import {
  deleteRawIngredientRequest,
  savePrepCostLinkRequest,
  saveRawIngredientRequest,
  saveRecipeCostLinkRequest,
  saveRecipePricingRequest,
} from "@/lib/costing-api";
import type {
  CostingPayload,
  CostSection,
  CostSourceKind,
  RawIngredient,
} from "@/types/costing";

import { useAppUser } from "./app-user-provider";
import styles from "./cost-calculator.module.css";

const rawIngredientUnitOptions = [
  { value: "kg", label: "Kilogram" },
  { value: "g", label: "Gram" },
  { value: "l", label: "Liter" },
  { value: "ml", label: "Milliliter" },
  { value: "st", label: "Styck" },
] as const;

const rawIngredientPackageOptions = [
  { value: "förpackning", label: "Förpackning" },
  { value: "låda", label: "Låda" },
  { value: "påse", label: "Påse" },
  { value: "kartong", label: "Kartong" },
  { value: "dunk", label: "Dunk" },
  { value: "flaska", label: "Flaska" },
  { value: "burk", label: "Burk" },
] as const;

type RawIngredientDraft = Omit<
  RawIngredient,
  "purchasePrice" | "packageCount" | "purchaseAmount" | "yieldPercent"
> & {
  purchasePrice: string;
  packageCount: string;
  purchaseAmount: string;
  yieldPercent: string;
};

function blankRawIngredient(): RawIngredientDraft {
  return {
    id: "",
    name: "",
    supplier: "",
    purchasePrice: "",
    packageType: "förpackning",
    packageCount: "1",
    purchaseAmount: "",
    purchaseUnit: "kg",
    yieldPercent: "100",
    notes: "",
    isActive: true,
  };
}

function toDraftValue(value: number) {
  if (!Number.isFinite(value)) return "";
  return String(value).replace(/\.0+$/, "");
}

function rawIngredientToDraft(rawIngredient: RawIngredient): RawIngredientDraft {
  return {
    ...rawIngredient,
    purchasePrice: toDraftValue(rawIngredient.purchasePrice),
    packageCount: toDraftValue(rawIngredient.packageCount),
    purchaseAmount: toDraftValue(rawIngredient.purchaseAmount),
    yieldPercent: toDraftValue(rawIngredient.yieldPercent),
  };
}

function parseDecimalInput(value: string) {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function draftToRawIngredient(rawDraft: RawIngredientDraft): RawIngredient | null {
  const purchasePrice = parseDecimalInput(rawDraft.purchasePrice);
  const packageCount = parseDecimalInput(rawDraft.packageCount);
  const purchaseAmount = parseDecimalInput(rawDraft.purchaseAmount);
  const yieldPercent = parseDecimalInput(rawDraft.yieldPercent);

  if (
    purchasePrice === null ||
    packageCount === null ||
    packageCount <= 0 ||
    purchaseAmount === null ||
    purchaseAmount <= 0 ||
    yieldPercent === null ||
    yieldPercent <= 0
  ) {
    return null;
  }

  return {
    ...rawDraft,
    purchasePrice,
    packageCount,
    purchaseAmount,
    yieldPercent,
  };
}

function bySv<T extends { name?: string; title?: string }>(items: T[]) {
  return [...items].sort((left, right) =>
    (left.name ?? left.title ?? "").localeCompare(right.name ?? right.title ?? "", "sv"),
  );
}

type PricingDraft = {
  sellingPriceInclVat: string;
  vatRate: string;
};

type CostCalculatorProps = CostingPayload;

export function CostCalculator({
  rawIngredients: initialRawIngredients,
  prepRecipes: initialPrepRecipes,
  menuRecipes: initialMenuRecipes,
}: CostCalculatorProps) {
  const { role } = useAppUser();
  const canManage = role === "admin";

  const [section, setSection] = useState<CostSection>("raw");
  const [searchQuery, setSearchQuery] = useState("");
  const [rawIngredients, setRawIngredients] = useState(bySv(initialRawIngredients));
  const [prepRecipes, setPrepRecipes] = useState(initialPrepRecipes);
  const [menuRecipes, setMenuRecipes] = useState(initialMenuRecipes);
  const [selectedRawId, setSelectedRawId] = useState(initialRawIngredients[0]?.id ?? "");
  const [selectedPrepId, setSelectedPrepId] = useState(initialPrepRecipes[0]?.id ?? "");
  const [selectedMenuId, setSelectedMenuId] = useState(initialMenuRecipes[0]?.id ?? "");
  const [rawDraft, setRawDraft] = useState<RawIngredientDraft>(() =>
    initialRawIngredients[0] ? rawIngredientToDraft(initialRawIngredients[0]) : blankRawIngredient(),
  );
  const [pricingDraft, setPricingDraft] = useState<PricingDraft>({ sellingPriceInclVat: "", vatRate: "12" });
  const [pricingDraftSourceId, setPricingDraftSourceId] = useState(initialMenuRecipes[0]?.id ?? "");
  const [isSavingRaw, setIsSavingRaw] = useState(false);

  const deferredSearch = useDeferredValue(searchQuery);
  const normalizedSearch = deferredSearch.trim().toLowerCase();
  const isRawSection = section === "raw";
  const isPrepSection = section === "prep";
  const isMenuSection = section === "menu";
  const parsedRawDraft = useMemo(() => draftToRawIngredient(rawDraft), [rawDraft]);

  const filteredRawIngredients = useMemo(
    () =>
      isRawSection
        ? rawIngredients.filter((ingredient) =>
            [ingredient.name, ingredient.supplier, ingredient.notes]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch),
          )
        : rawIngredients,
    [isRawSection, normalizedSearch, rawIngredients],
  );

  const filteredPrepRecipes = useMemo(
    () =>
      isPrepSection
        ? prepRecipes.filter((recipe) =>
            [recipe.title, recipe.category, recipe.notes, ...recipe.ingredients.map((ingredient) => ingredient.name)]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch),
          )
        : prepRecipes,
    [isPrepSection, normalizedSearch, prepRecipes],
  );

  const filteredMenuRecipes = useMemo(
    () =>
      isMenuSection
        ? menuRecipes.filter((recipe) =>
            [recipe.title, recipe.category, recipe.summary, ...recipe.items.map((item) => item.name)]
              .join(" ")
              .toLowerCase()
              .includes(normalizedSearch),
          )
        : menuRecipes,
    [isMenuSection, menuRecipes, normalizedSearch],
  );

  const activeRawIngredient = useMemo(
    () => rawIngredients.find((ingredient) => ingredient.id === selectedRawId) ?? filteredRawIngredients[0] ?? null,
    [filteredRawIngredients, rawIngredients, selectedRawId],
  );

  const activePrepRecipe = useMemo(
    () => prepRecipes.find((recipe) => recipe.id === selectedPrepId) ?? filteredPrepRecipes[0] ?? null,
    [filteredPrepRecipes, prepRecipes, selectedPrepId],
  );

  const activeMenuRecipe = useMemo(
    () => menuRecipes.find((recipe) => recipe.id === selectedMenuId) ?? filteredMenuRecipes[0] ?? null,
    [filteredMenuRecipes, menuRecipes, selectedMenuId],
  );

  const prepSummaries = useMemo(
    () => (isPrepSection ? filteredPrepRecipes.map((recipe) => buildPrepCostSummary(recipe, rawIngredients)) : []),
    [filteredPrepRecipes, isPrepSection, rawIngredients],
  );

  const menuSummaries = useMemo(
    () =>
      isMenuSection
        ? filteredMenuRecipes.map((recipe) => buildMenuCostSummary(recipe, rawIngredients, prepRecipes))
        : [],
    [filteredMenuRecipes, isMenuSection, prepRecipes, rawIngredients],
  );

  const activePrepDetail = useMemo(
    () => (isPrepSection && activePrepRecipe ? buildPrepCostDetail(activePrepRecipe, rawIngredients) : null),
    [activePrepRecipe, isPrepSection, rawIngredients],
  );

  const activeMenuDetail = useMemo(
    () =>
      isMenuSection && activeMenuRecipe
        ? buildMenuCostDetail(activeMenuRecipe, rawIngredients, prepRecipes)
        : null,
    [activeMenuRecipe, isMenuSection, prepRecipes, rawIngredients],
  );

  const rawIngredientOptions = useMemo(
    () => rawIngredients.filter((ingredient) => ingredient.isActive),
    [rawIngredients],
  );
  const prepRecipeOptions = useMemo(
    () => prepRecipes.filter((recipe) => recipe.status !== "Inaktiv"),
    [prepRecipes],
  );

  useEffect(() => {
    if (!activeMenuRecipe) return;
    if (pricingDraftSourceId === activeMenuRecipe.id) return;
    setPricingDraft({
      sellingPriceInclVat:
        activeMenuRecipe.costProfile.sellingPriceInclVat > 0
          ? toDraftValue(activeMenuRecipe.costProfile.sellingPriceInclVat)
          : "",
      vatRate: toDraftValue(activeMenuRecipe.costProfile.vatRate),
    });
    setPricingDraftSourceId(activeMenuRecipe.id);
  }, [activeMenuRecipe, pricingDraftSourceId]);

  async function handleSaveRawIngredient() {
    if (!canManage || !rawDraft.name.trim() || isSavingRaw) return;
    const payloadDraft = draftToRawIngredient(rawDraft);
    if (!payloadDraft) {
      window.alert("Fyll i giltigt inköpspris, antal i förpackning, innehåll per enhet och svinn innan du sparar.");
      return;
    }
    setIsSavingRaw(true);
    try {
      const payload = await saveRawIngredientRequest(payloadDraft);
      setRawIngredients((current) => {
        const exists = current.some((ingredient) => ingredient.id === payload.rawIngredient.id);
        const next = exists
          ? current.map((ingredient) =>
              ingredient.id === payload.rawIngredient.id ? payload.rawIngredient : ingredient,
            )
          : [payload.rawIngredient, ...current];
        return bySv(next);
      });
      setSelectedRawId(payload.rawIngredient.id);
      setRawDraft(rawIngredientToDraft(payload.rawIngredient));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Det gick inte att spara råvaran.");
    } finally {
      setIsSavingRaw(false);
    }
  }

  async function handleDeleteRawIngredient() {
    if (!canManage || !activeRawIngredient?.id) return;
    if (!window.confirm(`Radera "${activeRawIngredient.name}"?`)) return;

    try {
      await deleteRawIngredientRequest(activeRawIngredient.id);
      setRawIngredients((current) => current.filter((ingredient) => ingredient.id !== activeRawIngredient.id));
      setSelectedRawId("");
      setRawDraft(blankRawIngredient());
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Det gick inte att radera råvaran.");
    }
  }

  async function handlePrepLinkChange(prepRecipeId: string, ingredientIndex: number, rawIngredientId: string | null) {
    try {
      const payload = await savePrepCostLinkRequest({ prepRecipeId, ingredientIndex, rawIngredientId });
      setPrepRecipes((current) =>
        current.map((recipe) =>
          recipe.id !== prepRecipeId
            ? recipe
            : {
                ...recipe,
                ingredientLinks: [
                  ...recipe.ingredientLinks.filter((link) => link.ingredientIndex !== ingredientIndex),
                  payload.link,
                ],
              },
        ),
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Det gick inte att spara råvarulänken.");
    }
  }

  async function handleMenuLinkChange(
    recipeId: string,
    itemIndex: number,
    sourceKind: CostSourceKind,
    sourceId: string | null,
  ) {
    try {
      const payload = await saveRecipeCostLinkRequest({
        recipeId,
        itemIndex,
        sourceKind,
        rawIngredientId: sourceKind === "raw" ? sourceId : null,
        prepRecipeId: sourceKind === "prep" ? sourceId : null,
      });
      setMenuRecipes((current) =>
        current.map((recipe) =>
          recipe.id !== recipeId
            ? recipe
            : {
                ...recipe,
                itemLinks: [
                  ...recipe.itemLinks.filter((link) => link.itemIndex !== itemIndex),
                  payload.link,
                ],
              },
        ),
      );
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Det gick inte att spara kalkyllänken.");
    }
  }

  async function handleSavePricing() {
    if (!canManage || !activeMenuRecipe) return;

    const sellingPriceInclVat = parseDecimalInput(pricingDraft.sellingPriceInclVat);
    const vatRate = parseDecimalInput(pricingDraft.vatRate);

    if (sellingPriceInclVat === null || sellingPriceInclVat < 0 || vatRate === null || vatRate < 0) {
      window.alert("Fyll i giltigt pris inkl moms och moms % innan du sparar.");
      return;
    }

    try {
      const payload = await saveRecipePricingRequest({
        recipeId: activeMenuRecipe.id,
        sellingPriceInclVat,
        vatRate,
      });
      setMenuRecipes((current) =>
        current.map((recipe) =>
          recipe.id === activeMenuRecipe.id
            ? {
                ...recipe,
                costProfile: payload.costProfile,
              }
            : recipe,
        ),
      );
      setPricingDraft({
        sellingPriceInclVat: toDraftValue(payload.costProfile.sellingPriceInclVat),
        vatRate: toDraftValue(payload.costProfile.vatRate),
      });
      setPricingDraftSourceId(payload.costProfile.recipeId);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Det gick inte att spara prisinställningarna.");
    }
  }

  return (
    <section className={styles.page} aria-labelledby="cost-page-title">
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Receptkalkyl</p>
          <h1 id="cost-page-title">Råvara till marginal</h1>
          <p className={styles.intro}>
            Bygg kostnadsbilden från inköpspris till prepp och färdig menyrätt. Justera råvaror,
            länka komponenter och följ marginalen på varje rätt.
          </p>
        </div>
      </header>

      <div className={styles.toolbar}>
        <div className={styles.sectionTabs} role="tablist" aria-label="Kalkylsektioner">
          {([
            ["raw", "Råvarubank"],
            ["prep", "Preppkalkyl"],
            ["menu", "Menykalkyl"],
          ] as const).map(([value, label]) => (
            <button
              key={value}
              className={`${styles.sectionTab} ${section === value ? styles.sectionTabActive : ""}`}
              type="button"
              role="tab"
              aria-selected={section === value}
              onClick={() => setSection(value)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className={styles.searchWrap}>
          <label className={styles.searchLabel} htmlFor="cost-search">
            Sök
          </label>
          <input
            id="cost-search"
            className={styles.searchField}
            type="search"
            value={searchQuery}
            placeholder="Sök råvara, prepp eller rätt"
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Råvaror</span>
          <strong>{rawIngredients.length}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Prepprecept</span>
          <strong>{prepRecipes.length}</strong>
        </article>
        <article className={styles.summaryCard}>
          <span className={styles.summaryLabel}>Menyrätter</span>
          <strong>{menuRecipes.length}</strong>
        </article>
      </div>

      {section === "raw" ? (
        <div className={styles.workspace}>
          <div className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Råvarubank</p>
                <h2>Inköpspriser och jämförpris</h2>
              </div>
              {canManage ? (
                <button
                  className={styles.primaryButton}
                  type="button"
                  onClick={() => {
                    setSelectedRawId("");
                    setRawDraft(blankRawIngredient());
                  }}
                >
                  Ny råvara
                </button>
              ) : null}
            </div>

            <div className={`${styles.tableHeader} ${styles.rawTableHeader}`}>
              <span>Råvara</span>
              <span>Inköp</span>
              <span>Förpackning</span>
              <span>Total</span>
              <span>Jmf-pris</span>
              <span>Svinn</span>
            </div>

            <div className={styles.listBody}>
              {filteredRawIngredients.map((ingredient) => (
                <button
                  key={ingredient.id}
                  className={`${styles.listRow} ${styles.rawListRow} ${
                    (selectedRawId || activeRawIngredient?.id) === ingredient.id ? styles.listRowActive : ""
                  }`}
                  type="button"
                  onClick={() => {
                    setSelectedRawId(ingredient.id);
                    setRawDraft(rawIngredientToDraft(ingredient));
                  }}
                >
                  <span className={styles.rowTitleCell}>
                    <strong>{ingredient.name}</strong>
                    <small>{ingredient.supplier || "Ingen leverantör angiven"}</small>
                  </span>
                  <span>{ingredient.purchasePrice.toFixed(2)} kr</span>
                  <span>{formatRawIngredientPackage(ingredient)}</span>
                  <span>{formatRawIngredientTotalQuantity(ingredient)}</span>
                  <span>{formatComparePrice(ingredient)}</span>
                  <span>{ingredient.yieldPercent}%</span>
                </button>
              ))}
            </div>
          </div>

          <aside className={styles.detailPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Redigera råvara</p>
                <h2>{rawDraft.id ? rawDraft.name : "Ny råvara"}</h2>
              </div>
            </div>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Råvara</span>
                <input
                  value={rawDraft.name}
                  onChange={(event) => setRawDraft((current) => ({ ...current, name: event.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Leverantör</span>
                <input
                  value={rawDraft.supplier}
                  onChange={(event) => setRawDraft((current) => ({ ...current, supplier: event.target.value }))}
                />
              </label>
              <label className={styles.field}>
                <span>Inköpspris</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex. 240"
                  value={rawDraft.purchasePrice}
                  onChange={(event) =>
                    setRawDraft((current) => ({
                      ...current,
                      purchasePrice: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Förpackning</span>
                <select
                  value={rawDraft.packageType}
                  onChange={(event) => setRawDraft((current) => ({ ...current, packageType: event.target.value }))}
                >
                  {rawIngredientPackageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Antal i förpackning</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex. 4"
                  value={rawDraft.packageCount}
                  onChange={(event) =>
                    setRawDraft((current) => ({
                      ...current,
                      packageCount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Innehåll per enhet</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex. 2,5"
                  value={rawDraft.purchaseAmount}
                  onChange={(event) =>
                    setRawDraft((current) => ({
                      ...current,
                      purchaseAmount: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={styles.field}>
                <span>Enhet</span>
                <select
                  value={rawDraft.purchaseUnit}
                  onChange={(event) => setRawDraft((current) => ({ ...current, purchaseUnit: event.target.value }))}
                >
                  {rawIngredientUnitOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className={styles.field}>
                <span>Svinn %</span>
                <input
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex. 100"
                  value={rawDraft.yieldPercent}
                  onChange={(event) =>
                    setRawDraft((current) => ({
                      ...current,
                      yieldPercent: event.target.value,
                    }))
                  }
                />
              </label>
              <label className={`${styles.field} ${styles.fieldWide}`}>
                <span>Anteckningar</span>
                <textarea
                  value={rawDraft.notes}
                  onChange={(event) => setRawDraft((current) => ({ ...current, notes: event.target.value }))}
                />
              </label>
            </div>

            <div className={styles.inlineSummary}>
              <div>
                <span>Total mängd</span>
                <strong>
                  {parsedRawDraft
                    ? formatRawIngredientTotalQuantity(parsedRawDraft)
                    : `— ${rawDraft.purchaseUnit}`}
                </strong>
              </div>
              <div>
                <span>Jämförpris</span>
                <strong>
                  {parsedRawDraft ? formatComparePrice(parsedRawDraft) : "Ej beräknad"}
                </strong>
              </div>
            </div>

            <div className={styles.detailActions}>
              {rawDraft.id ? (
                <button className={styles.secondaryButton} type="button" onClick={handleDeleteRawIngredient}>
                  Radera
                </button>
              ) : <span />}
              {canManage ? (
                <button className={styles.primaryButton} type="button" disabled={isSavingRaw} onClick={handleSaveRawIngredient}>
                  {isSavingRaw ? "Sparar..." : "Spara råvara"}
                </button>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {section === "prep" ? (
        <div className={styles.workspace}>
          <div className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Preppkalkyl</p>
                <h2>Kostnad per batch och enhet</h2>
              </div>
            </div>

            <div className={styles.tableHeader}>
              <span>Prepprecept</span>
              <span>Batchkostnad</span>
              <span>Jmf-pris</span>
              <span>Länkat</span>
            </div>

            <div className={styles.listBody}>
              {prepSummaries.map((summary) => (
                <button
                  key={summary.id}
                  className={`${styles.listRow} ${selectedPrepId === summary.id ? styles.listRowActive : ""}`}
                  type="button"
                  onClick={() => setSelectedPrepId(summary.id)}
                >
                  <span className={styles.rowTitleCell}>
                    <strong>{summary.title}</strong>
                    <small>{summary.category}</small>
                  </span>
                  <span>{formatSek(summary.totalCost)}</span>
                  <span>{summary.unitCostLabel}</span>
                  <span>
                    {summary.resolvedCount}/{summary.ingredientCount}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <aside className={styles.detailPanel}>
            {activePrepDetail ? (
              <>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Detalj</p>
                    <h2>{activePrepDetail.recipe.title}</h2>
                  </div>
                </div>

                <div className={styles.inlineSummary}>
                  <div>
                    <span>Batchkostnad</span>
                    <strong>{formatSek(activePrepDetail.totalCost)}</strong>
                  </div>
                  <div>
                    <span>Jmf-pris</span>
                    <strong>{activePrepDetail.unitCostLabel}</strong>
                  </div>
                  <div>
                    <span>Output</span>
                    <strong>{activePrepDetail.outputLabel}</strong>
                  </div>
                </div>

                <div className={styles.detailTable}>
                  <div className={styles.detailTableHeader}>
                    <span>Mängd</span>
                    <span>Ingrediens</span>
                    <span>Råvara</span>
                    <span>Kostnad</span>
                  </div>
                  <div className={styles.detailTableBody}>
                    {activePrepDetail.rows.map((row) => (
                      <div key={`${activePrepDetail.recipe.id}-${row.index}`} className={styles.detailTableRow}>
                        <span>{row.amount} {row.unit}</span>
                        <span className={styles.detailNameCell}>
                          <strong>{row.name}</strong>
                          <small>{row.info || "Ingen info"}</small>
                        </span>
                        <select
                          disabled={!canManage}
                          value={row.linkedRawIngredientId ?? row.guessedRawIngredientId ?? ""}
                          onChange={(event) =>
                            void handlePrepLinkChange(
                              activePrepDetail.recipe.id,
                              row.index,
                              event.target.value || null,
                            )
                          }
                        >
                          <option value="">Välj råvara</option>
                          {rawIngredientOptions.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
                            </option>
                          ))}
                        </select>
                        <span>{formatSek(row.lineCost)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}

      {section === "menu" ? (
        <div className={styles.workspace}>
          <div className={styles.listPanel}>
            <div className={styles.panelHeader}>
              <div>
                <p className={styles.panelEyebrow}>Menykalkyl</p>
                <h2>Kostnad, moms och marginal</h2>
              </div>
            </div>

            <div className={styles.tableHeader}>
              <span>Rätt</span>
              <span>Råvarukostnad</span>
              <span>Pris inkl moms</span>
              <span>Marginal</span>
            </div>

            <div className={styles.listBody}>
              {menuSummaries.map((summary) => (
                <button
                  key={summary.id}
                  className={`${styles.listRow} ${selectedMenuId === summary.id ? styles.listRowActive : ""}`}
                  type="button"
                  onClick={() => {
                    setSelectedMenuId(summary.id);
                    setPricingDraft({
                      sellingPriceInclVat:
                        summary.sellingPriceInclVat > 0 ? toDraftValue(summary.sellingPriceInclVat) : "",
                      vatRate: toDraftValue(summary.vatRate),
                    });
                    setPricingDraftSourceId(summary.id);
                  }}
                >
                  <span className={styles.rowTitleCell}>
                    <strong>{summary.title}</strong>
                    <small>{summary.category}</small>
                  </span>
                  <span>{formatSek(summary.totalCost)}</span>
                  <span>{summary.sellingPriceInclVat > 0 ? `${summary.sellingPriceInclVat.toFixed(2)} kr` : "Ej satt"}</span>
                  <span>{formatPercent(summary.grossMarginPercent)}</span>
                </button>
              ))}
            </div>
          </div>

          <aside className={styles.detailPanel}>
            {activeMenuDetail ? (
              <>
                <div className={styles.panelHeader}>
                  <div>
                    <p className={styles.panelEyebrow}>Detalj</p>
                    <h2>{activeMenuDetail.recipe.title}</h2>
                  </div>
                </div>

                <div className={styles.pricingGrid}>
                  <label className={styles.field}>
                    <span>Pris inkl moms</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="t.ex. 129,00"
                      value={pricingDraft.sellingPriceInclVat}
                      onChange={(event) =>
                        setPricingDraft((current) => ({
                          ...current,
                          sellingPriceInclVat: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label className={styles.field}>
                    <span>Moms %</span>
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="t.ex. 12"
                      value={pricingDraft.vatRate}
                      onChange={(event) =>
                        setPricingDraft((current) => ({
                          ...current,
                          vatRate: event.target.value,
                        }))
                      }
                    />
                  </label>
                  {canManage ? (
                    <button
                      className={`${styles.primaryButton} ${styles.pricingSaveButton}`}
                      type="button"
                      onClick={() => void handleSavePricing()}
                    >
                      Spara pris
                    </button>
                  ) : null}
                </div>

                <div className={styles.inlineSummary}>
                  <div>
                    <span>Råvarukostnad</span>
                    <strong>{formatSek(activeMenuDetail.totalCost)}</strong>
                  </div>
                  <div>
                    <span>Pris ex moms</span>
                    <strong>{formatSek(activeMenuDetail.sellingPriceExVat)}</strong>
                  </div>
                  <div>
                    <span>Food cost</span>
                    <strong>{formatPercent(activeMenuDetail.foodCostPercent)}</strong>
                  </div>
                  <div>
                    <span>Bruttomarginal</span>
                    <strong>{formatPercent(activeMenuDetail.grossMarginPercent)}</strong>
                  </div>
                </div>

                <div className={styles.detailTable}>
                  <div className={styles.detailTableHeaderWide}>
                    <span>Mängd</span>
                    <span>Del</span>
                    <span>Källa</span>
                    <span>Vald källa</span>
                    <span>Kostnad</span>
                  </div>
                  <div className={styles.detailTableBody}>
                    {activeMenuDetail.rows.map((row) => {
                      const sourceId = row.sourceKind === "prep" ? row.prepRecipeId : row.rawIngredientId;
                      return (
                        <div key={`${activeMenuDetail.recipe.id}-${row.index}`} className={styles.detailTableRowWide}>
                          <span>{row.amount} {row.unit}</span>
                          <span className={styles.detailNameCell}>
                            <strong>{row.name}</strong>
                            <small>{row.info || "Ingen info"}</small>
                          </span>
                          <select
                            disabled={!canManage}
                            value={row.sourceKind}
                            onChange={(event) =>
                              void handleMenuLinkChange(
                                activeMenuDetail.recipe.id,
                                row.index,
                                event.target.value as CostSourceKind,
                                null,
                              )
                            }
                          >
                            <option value="raw">Råvara</option>
                            <option value="prep">Prepp</option>
                          </select>
                          <select
                            disabled={!canManage}
                            value={sourceId ?? ""}
                            onChange={(event) =>
                              void handleMenuLinkChange(
                                activeMenuDetail.recipe.id,
                                row.index,
                                row.sourceKind,
                                event.target.value || null,
                              )
                            }
                          >
                            <option value="">Välj källa</option>
                            {row.sourceKind === "raw"
                              ? rawIngredientOptions.map((ingredient) => (
                                  <option key={ingredient.id} value={ingredient.id}>
                                    {ingredient.name}
                                  </option>
                                ))
                              : prepRecipeOptions.map((prepRecipe) => (
                                  <option key={prepRecipe.id} value={prepRecipe.id}>
                                    {prepRecipe.title}
                                  </option>
                                ))}
                          </select>
                          <span>{formatSek(row.lineCost)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </>
            ) : null}
          </aside>
        </div>
      ) : null}
    </section>
  );
}
