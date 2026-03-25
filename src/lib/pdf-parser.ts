import { Platform } from "react-native";
import type { Transaction } from "../types";
import { generateId } from "../utils";
import { categorizeDescription } from "./categorize";

interface ParsedLine {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
}

function parseDate(dateStr: string): string {
  const cleaned = dateStr.trim();

  // MM/DD/YYYY or MM/DD/YY
  const slashFull = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashFull) {
    const [, m, d, y] = slashFull;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(Number(year), Number(m) - 1, Number(d)).toISOString();
  }

  // MM/DD (no year — assume current year)
  const slashShort = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);
  if (slashShort) {
    const [, m, d] = slashShort;
    return new Date(
      new Date().getFullYear(),
      Number(m) - 1,
      Number(d)
    ).toISOString();
  }

  // MM-DD-YYYY
  const dashFull = cleaned.match(/^(\d{1,2})-(\d{1,2})-(\d{2,4})$/);
  if (dashFull) {
    const [, m, d, y] = dashFull;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(Number(year), Number(m) - 1, Number(d)).toISOString();
  }

  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(cleaned).toISOString();
  }

  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function cleanAmount(raw: string): number {
  // Remove $, commas, spaces; keep digits, dot, and minus
  const cleaned = raw.replace(/[$,\s]/g, "");
  return parseFloat(cleaned) || 0;
}

/**
 * Parse transaction lines from bank statement text.
 * Handles common formats from Chase, Bank of America, Wells Fargo, etc.
 */
function parseTransactionLines(text: string): ParsedLine[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const results: ParsedLine[] = [];

  // Pattern: date followed by description followed by amount
  // Captures: MM/DD/YYYY or MM/DD/YY or MM/DD  ...  -$1,234.56 or $1,234.56 or 1,234.56
  const txnPattern =
    /^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s*$/;

  // Some statements put debit/credit amounts in separate positions
  // Pattern: date  description  debit_amount  credit_amount
  const debitCreditPattern =
    /^(\d{1,2}[\/\-]\d{1,2}(?:[\/\-]\d{2,4})?)\s+(.+?)\s+(-?\$?[\d,]+\.\d{2})\s+(-?\$?[\d,]+\.\d{2})\s*$/;

  for (const line of lines) {
    // Try debit/credit two-column pattern first
    const dcMatch = line.match(debitCreditPattern);
    if (dcMatch) {
      const [, dateStr, desc, col1, col2] = dcMatch;
      const amt1 = cleanAmount(col1);
      const amt2 = cleanAmount(col2);
      // Typically one column is 0 or empty and the other has the value
      const amount = amt1 !== 0 ? amt1 : amt2;
      if (amount === 0) continue;
      // If it's in the debit column (first), it's an expense
      const type: "expense" | "income" =
        amt1 !== 0 ? "expense" : "income";
      results.push({
        date: dateStr,
        description: desc.trim(),
        amount: Math.abs(amount),
        type,
      });
      continue;
    }

    // Try single amount pattern
    const match = line.match(txnPattern);
    if (match) {
      const [, dateStr, desc, amtStr] = match;
      const amount = cleanAmount(amtStr);
      if (amount === 0) continue;
      // Negative = expense (bank convention)
      const type: "expense" | "income" = amount < 0 ? "expense" : "income";
      results.push({
        date: dateStr,
        description: desc.trim(),
        amount: Math.abs(amount),
        type,
      });
    }
  }

  return results;
}

/**
 * Convert parsed lines into Transaction objects.
 */
function toTransactions(parsed: ParsedLine[]): Transaction[] {
  return parsed.map((row) => ({
    id: generateId(),
    type: row.type,
    amount: Math.round(row.amount * 100) / 100,
    category:
      row.type === "income"
        ? "salary"
        : categorizeDescription(row.description),
    note: row.description,
    date: parseDate(row.date),
    createdAt: new Date().toISOString(),
  }));
}

/**
 * Parse bank statement text (already extracted from PDF) into transactions.
 */
export function parsePDFText(text: string): Transaction[] {
  const lines = parseTransactionLines(text);
  return toTransactions(lines);
}

/**
 * Extract text from a PDF file on web using pdfjs-dist.
 * Returns the full text content of the PDF.
 */
export async function extractPDFText(
  fileUri: string
): Promise<string> {
  if (Platform.OS !== "web") {
    throw new Error("PDF import is only available on web.");
  }

  const pdfjsLib = await import("pdfjs-dist");

  // Use the bundled worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const response = await fetch(fileUri);
  const arrayBuffer = await response.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((item: { str?: string }) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(text);
  }

  return pageTexts.join("\n");
}

/**
 * Full pipeline: extract text from PDF and parse transactions.
 * Web only — on native, throws with a user-friendly message.
 */
export async function parsePDF(fileUri: string): Promise<Transaction[]> {
  const text = await extractPDFText(fileUri);
  return parsePDFText(text);
}
