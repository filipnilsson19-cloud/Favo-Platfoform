import type { Worksheet } from "exceljs";

import {
  buildStationKitchenPages,
  getStationKitchenCategoryFill,
  STATION_SHEET_PAGE_MAX_ROWS,
} from "@/lib/station-kitchen-layout";
import { formatRecipeItemAmount } from "@/lib/recipe-utils";
import type { StationPrintBundle, StationPrintableRecipe } from "@/types/station";

const EXCEL_MIME_TYPE =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
const BORDER_COLOR = "FF161616";
const BODY_FILL = "FFFDFBF7";
const SPACER_FILL = "FFF6F3ED";
const PAGE_MAX_ROWS = STATION_SHEET_PAGE_MAX_ROWS;
const ROW_HEIGHT = 16;
const HEADER_FONT_SIZE = 11;
const BODY_FONT_SIZE = 9;
const TOTAL_FONT_SIZE = 10;
const AMOUNT_HEADER_FONT_SIZE = 8;

function toFileName(value: string) {
  return (
    value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "lagglista"
  );
}

function getCategoryFill(category: string) {
  return `FF${getStationKitchenCategoryFill(category).replace("#", "")}`;
}

function setCellBorder(
  cell: ReturnType<Worksheet["getCell"]>,
  style: "thin" | "medium" = "thin",
) {
  cell.border = {
    top: { style, color: { argb: BORDER_COLOR } },
    left: { style, color: { argb: BORDER_COLOR } },
    bottom: { style, color: { argb: BORDER_COLOR } },
    right: { style, color: { argb: BORDER_COLOR } },
  };
}

function styleBlockHeader(
  worksheet: Worksheet,
  row: number,
  startColumn: number,
  recipe: StationPrintableRecipe,
  showCategoryLabel: boolean,
) {
  const title = worksheet.getCell(row, startColumn);
  const titleMergeFollower = worksheet.getCell(row, startColumn + 1);
  const amountHeader = worksheet.getCell(row, startColumn + 2);
  const fill = getCategoryFill(recipe.category);

  worksheet.mergeCells(row, startColumn, row, startColumn + 1);
  title.value = showCategoryLabel ? `${recipe.title} (${recipe.category})` : recipe.title;
  title.font = { name: "Arial", bold: true, size: HEADER_FONT_SIZE };
  title.alignment = { horizontal: "center", vertical: "middle" };
  title.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };

  titleMergeFollower.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };

  amountHeader.value = "Mängd";
  amountHeader.font = {
    name: "Arial",
    bold: true,
    size: AMOUNT_HEADER_FONT_SIZE,
  };
  amountHeader.alignment = { horizontal: "center", vertical: "middle" };
  amountHeader.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };

  setCellBorder(title, "medium");
  setCellBorder(titleMergeFollower, "medium");
  setCellBorder(amountHeader, "medium");
}

function styleBodyCell(
  cell: ReturnType<Worksheet["getCell"]>,
  horizontal: "left" | "center" | "right",
  bold = false,
  fill = BODY_FILL,
) {
  cell.font = { name: "Arial", size: BODY_FONT_SIZE, bold };
  cell.alignment = {
    horizontal,
    vertical: "middle",
    wrapText: true,
  };
  cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };
  setCellBorder(cell);
}

function writeRecipeBlock(
  worksheet: Worksheet,
  recipe: StationPrintableRecipe,
  startRow: number,
  startColumn: number,
  showCategoryLabel: boolean,
) {
  styleBlockHeader(worksheet, startRow, startColumn, recipe, showCategoryLabel);

  let cursor = startRow + 1;
  let rowNumber = 1;

  for (const item of recipe.items) {
    const infoCell = worksheet.getCell(cursor, startColumn);
    const nameCell = worksheet.getCell(cursor, startColumn + 1);
    const amountCell = worksheet.getCell(cursor, startColumn + 2);

    if (item.isSpacer) {
      infoCell.value = "";
      nameCell.value = "";
      amountCell.value = "";
      styleBodyCell(infoCell, "center", false, SPACER_FILL);
      styleBodyCell(nameCell, "left", false, SPACER_FILL);
      styleBodyCell(amountCell, "right", false, SPACER_FILL);
      cursor += 1;
      continue;
    }

    infoCell.value = item.info?.trim() || String(rowNumber);
    nameCell.value = item.name;
    amountCell.value = formatRecipeItemAmount(item);

    styleBodyCell(infoCell, "center", Boolean(item.isEmphasis));
    styleBodyCell(nameCell, "left", Boolean(item.isEmphasis));
    styleBodyCell(amountCell, "right", true);

    cursor += 1;
    rowNumber += 1;
  }

  const totalLabel = worksheet.getCell(cursor, startColumn);
  const totalMergeFollower = worksheet.getCell(cursor, startColumn + 1);
  const totalValue = worksheet.getCell(cursor, startColumn + 2);
  const fill = getCategoryFill(recipe.category);

  worksheet.mergeCells(cursor, startColumn, cursor, startColumn + 1);
  totalLabel.value = "Totalt";
  totalLabel.font = { name: "Arial", bold: true, size: TOTAL_FONT_SIZE };
  totalLabel.alignment = { horizontal: "center", vertical: "middle" };
  totalLabel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: fill } };

  totalMergeFollower.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };

  totalValue.value = recipe.totalAmount;
  totalValue.font = { name: "Arial", bold: true, size: TOTAL_FONT_SIZE };
  totalValue.alignment = { horizontal: "right", vertical: "middle" };
  totalValue.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: fill },
  };

  setCellBorder(totalLabel, "medium");
  setCellBorder(totalMergeFollower, "medium");
  setCellBorder(totalValue, "medium");

  return cursor - startRow + 1;
}

function configureWorksheet(worksheet: Worksheet, sheetName: string, title: string) {
  worksheet.columns = [
    { width: 6.2 },
    { width: 18.5 },
    { width: 8.5 },
    { width: 1.3 },
    { width: 6.2 },
    { width: 18.5 },
    { width: 8.5 },
  ];

  worksheet.pageSetup = {
    paperSize: 9,
    orientation: "portrait",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 1,
    margins: {
      left: 0.05,
      right: 0.05,
      top: 0.08,
      bottom: 0.08,
      header: 0.04,
      footer: 0.04,
    },
    horizontalCentered: true,
  };
  worksheet.views = [{ showGridLines: false, zoomScale: 100 }];
  worksheet.headerFooter.oddHeader = `&C&"Arial,Bold"&10${title}`;
  worksheet.headerFooter.oddFooter = `&L${sheetName}&R&P / &N`;

  for (let rowIndex = 1; rowIndex <= PAGE_MAX_ROWS + 2; rowIndex += 1) {
    worksheet.getRow(rowIndex).height = ROW_HEIGHT;
  }
}

function downloadFile(blob: Blob, fileName: string) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(() => window.URL.revokeObjectURL(url), 250);
}

export async function exportStationBundleToExcel(
  bundle: StationPrintBundle | null,
) {
  if (!bundle?.payload || bundle.payload.recipes.length === 0) {
    throw new Error("No station data available for export.");
  }

  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default;
  const workbook = new ExcelJS.Workbook();
  const pages = buildStationKitchenPages(bundle);

  workbook.creator = "FAVO Platform";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = bundle.payload.title;
  workbook.title = `${bundle.payload.title} - lagglista`;

  pages.forEach((page, pageIndex) => {
    const sheetName = `Sida ${pageIndex + 1}`;
    const worksheet = workbook.addWorksheet(sheetName);
    configureWorksheet(worksheet, sheetName, bundle.payload.title);

    let lastRow = 1;

    page.recipes.forEach(({ recipe, startColumn, startRow }) => {
      const blockHeight = writeRecipeBlock(
        worksheet,
        recipe,
        startRow,
        startColumn,
        bundle.payload.showCategoryLabel,
      );

      lastRow = Math.max(lastRow, startRow + blockHeight - 1);
    });

    worksheet.pageSetup.printArea = `A1:G${Math.max(lastRow, page.maxRow)}`;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: EXCEL_MIME_TYPE });
  const fileName = `${toFileName(bundle.payload.title)}-lagglista.xlsx`;

  downloadFile(blob, fileName);
}
