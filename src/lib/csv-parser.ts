import type { Transaction } from "../types";
import { generateId } from "../utils";
import { classifyTransaction } from "./categorize";

// ---------------------------------------------------------------------------
// CSV line parser (handles quoted fields with commas inside)
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Detect bank format from headers
// ---------------------------------------------------------------------------
type BankFormat = "chase" | "usbank" | "bofa" | "generic";

interface FormatConfig {
  dateIdx: number;
  descIdx: number;
  amountIdx: number;
  typeIdx: number; // -1 if no type column
  detailIdx: number; // -1 if no detail/credit-debit column
}

function detectFormat(headers: string[]): { format: BankFormat; config: FormatConfig } {
  const norm = headers.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ""));

  // Chase: Details, Posting Date, Description, Amount, Type, Balance, ...
  if (norm.includes("details") && norm.includes("postingdate")) {
    return {
      format: "chase",
      config: {
        dateIdx: norm.indexOf("postingdate"),
        descIdx: norm.indexOf("description"),
        amountIdx: norm.indexOf("amount"),
        typeIdx: norm.indexOf("type"),
        detailIdx: norm.indexOf("details"),
      },
    };
  }

  // US Bank: "Date","Transaction","Name","Memo","Amount"
  if (norm.includes("transaction") && norm.includes("memo")) {
    return {
      format: "usbank",
      config: {
        dateIdx: norm.indexOf("date"),
        descIdx: norm.indexOf("name"),
        amountIdx: norm.indexOf("amount"),
        typeIdx: norm.indexOf("transaction"), // CREDIT/DEBIT
        detailIdx: -1,
      },
    };
  }

  // BofA/Mint: Date, Description, Original Description, Category, Amount, Status
  if (norm.includes("originaldescription") || (norm.includes("category") && norm.includes("status"))) {
    const descI = norm.indexOf("originaldescription") !== -1
      ? norm.indexOf("originaldescription")
      : norm.indexOf("description");
    return {
      format: "bofa",
      config: {
        dateIdx: norm.indexOf("date"),
        descIdx: descI,
        amountIdx: norm.indexOf("amount"),
        typeIdx: -1,
        detailIdx: -1,
      },
    };
  }

  // Generic fallback - try to find common column names
  const dateIdx = norm.findIndex((h) => h.includes("date") || h.includes("posted"));
  const descIdx = norm.findIndex((h) =>
    h.includes("description") || h.includes("memo") || h.includes("name") || h.includes("payee")
  );
  const amountIdx = norm.findIndex((h) => h.includes("amount"));

  return {
    format: "generic",
    config: {
      dateIdx: dateIdx !== -1 ? dateIdx : 0,
      descIdx: descIdx !== -1 ? descIdx : 1,
      amountIdx: amountIdx !== -1 ? amountIdx : -1,
      typeIdx: -1,
      detailIdx: -1,
    },
  };
}

// ---------------------------------------------------------------------------
// Date parsing
// ---------------------------------------------------------------------------
function parseDate(value: string): string {
  const cleaned = value.replace(/"/g, "").trim();

  // MM/DD/YYYY or M/D/YYYY
  const slashMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    const [, m, d, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    return new Date(Number(year), Number(m) - 1, Number(d), 12).toISOString();
  }

  // YYYY-MM-DD
  const isoMatch = cleaned.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) {
    const [, y, m, d] = isoMatch;
    return new Date(Number(y), Number(m) - 1, Number(d), 12).toISOString();
  }

  // Fallback
  const d = new Date(cleaned);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function parseAmount(value: string): number {
  return parseFloat(value.replace(/[$,"\s]/g, "")) || 0;
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------
export interface ParseCSVOptions {
  /** Mark all debit transactions as transfers (business account - excluded from personal budget) */
  businessAccount?: boolean;
}

export function parseCSV(text: string, options: ParseCSVOptions = {}): Transaction[] {
  const lines = parseCsvLines(text);
  if (lines.length < 2) return [];

  const headers = lines[0];
  const { format, config } = detectFormat(headers);
  const { dateIdx, descIdx, amountIdx } = config;

  if (dateIdx === -1 || descIdx === -1) return [];

  // Also check for separate debit/credit columns (generic format)
  const normHeaders = headers.map((h) => h.toLowerCase().replace(/[^a-z]/g, ""));
  const debitIdx = normHeaders.findIndex((h) => h === "debit");
  const creditIdx = normHeaders.findIndex((h) => h === "credit");
  const hasDebitCredit = debitIdx !== -1 || creditIdx !== -1;

  const results: Transaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    if (cols.length <= Math.max(dateIdx, descIdx)) continue;

    const dateStr = cols[dateIdx]?.replace(/"/g, "").trim();
    const description = cols[descIdx]?.replace(/"/g, "").trim();
    if (!dateStr || !description) continue;

    let rawAmount: number;

    if (hasDebitCredit && amountIdx === -1) {
      // Separate debit/credit columns
      const debit = debitIdx !== -1 ? parseAmount(cols[debitIdx] || "") : 0;
      const credit = creditIdx !== -1 ? parseAmount(cols[creditIdx] || "") : 0;
      rawAmount = credit > 0 ? credit : -debit;
      if (rawAmount === 0) continue;
    } else if (amountIdx !== -1) {
      rawAmount = parseAmount(cols[amountIdx] || "");
      if (rawAmount === 0) continue;
    } else {
      continue;
    }

    // Business account: tag all debits as transfers (excluded from personal budget)
    if (options.businessAccount && rawAmount < 0) {
      results.push({
        id: generateId(),
        type: "transfer",
        amount: Math.round(Math.abs(rawAmount) * 100) / 100,
        category: "transfer",
        note: description,
        date: parseDate(dateStr),
        createdAt: new Date().toISOString(),
      });
      continue;
    }

    // Classify the transaction using our smart categorizer
    const { category, isTransfer } = classifyTransaction(description, rawAmount);

    // Determine type
    let type: "expense" | "income" | "transfer";
    if (isTransfer) {
      type = "transfer";
    } else if (rawAmount > 0) {
      type = "income";
    } else {
      type = "expense";
    }

    // For income transactions, use the category from classifier.
    // If it came back as "Other" and it's income, call it "salary" for known
    // payroll, otherwise "other_income".
    let finalCategory = category;
    if (type === "income" && finalCategory === "Other") {
      finalCategory = "other_income";
    }

    results.push({
      id: generateId(),
      type,
      amount: Math.round(Math.abs(rawAmount) * 100) / 100,
      category: finalCategory,
      note: description,
      date: parseDate(dateStr),
      createdAt: new Date().toISOString(),
    });
  }

  return results;
}
