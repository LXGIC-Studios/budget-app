import type { Transaction } from "../types";
import { generateId } from "../utils";
import { categorizeDescription } from "./categorize";

interface ParsedRow {
  date: string;
  description: string;
  amount: number;
  type: "expense" | "income";
}

function parseCsvLines(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return lines.map((line) => {
    const cols: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === "," && !inQuotes) {
        cols.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
    cols.push(current.trim());
    return cols;
  });
}

function findColumnIndex(headers: string[], ...names: string[]): number {
  const normalized = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  for (const name of names) {
    const target = name.toLowerCase().replace(/[^a-z]/g, "");
    const idx = normalized.findIndex((h) => h.includes(target));
    if (idx !== -1) return idx;
  }
  return -1;
}

function parseDate(value: string): string {
  // Try common date formats
  const cleaned = value.replace(/"/g, "").trim();

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(Number(year), Number(m) - 1, Number(d)).toISOString();
  }

  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    return new Date(cleaned).toISOString();
  }

  // Fallback
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseAmount(value: string): number {
  return parseFloat(value.replace(/[$,"\s]/g, "")) || 0;
}

export function parseCSV(text: string): Transaction[] {
  const lines = parseCsvLines(text);
  if (lines.length < 2) return [];

  const headers = lines[0];
  const dateIdx = findColumnIndex(headers, "date", "transaction date", "post date", "posting date");
  const descIdx = findColumnIndex(headers, "description", "memo", "name", "payee");
  const amountIdx = findColumnIndex(headers, "amount");
  const debitIdx = findColumnIndex(headers, "debit");
  const creditIdx = findColumnIndex(headers, "credit");

  if (dateIdx === -1 || descIdx === -1) return [];

  const hasDebitCredit = debitIdx !== -1 || creditIdx !== -1;
  if (!hasDebitCredit && amountIdx === -1) return [];

  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (cols.length <= Math.max(dateIdx, descIdx)) continue;

    const dateStr = cols[dateIdx];
    const description = cols[descIdx]?.replace(/"/g, "").trim();
    if (!dateStr || !description) continue;

    let amount: number;
    let type: "expense" | "income";

    if (hasDebitCredit) {
      const debit = debitIdx !== -1 ? parseAmount(cols[debitIdx] || "") : 0;
      const credit = creditIdx !== -1 ? parseAmount(cols[creditIdx] || "") : 0;
      if (debit > 0) {
        amount = debit;
        type = "expense";
      } else if (credit > 0) {
        amount = credit;
        type = "income";
      } else {
        continue;
      }
    } else {
      const raw = parseAmount(cols[amountIdx] || "");
      if (raw === 0) continue;
      // Negative = expense (bank convention), positive = income
      type = raw < 0 ? "expense" : "income";
      amount = Math.abs(raw);
    }

    rows.push({ date: dateStr, description, amount, type });
  }

  return rows.map((row) => ({
    id: generateId(),
    type: row.type,
    amount: Math.round(row.amount * 100) / 100,
    category: row.type === "income" ? "salary" : categorizeDescription(row.description),
    note: row.description,
    date: parseDate(row.date),
    createdAt: new Date().toISOString(),
  }));
}
