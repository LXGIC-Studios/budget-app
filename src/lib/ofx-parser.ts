import type { Transaction } from "../types";
import { generateId } from "../utils";
import { categorizeDescription } from "./categorize";

function extractTag(block: string, tag: string): string {
  // OFX uses <TAG>value (no closing tag) or <TAG>value</TAG>
  const regex = new RegExp(`<${tag}>([^<\\r\\n]+)`, "i");
  const match = block.match(regex);
  return match ? match[1].trim() : "";
}

function parseOFXDate(dateStr: string): string {
  // OFX dates: YYYYMMDDHHMMSS or YYYYMMDD
  const cleaned = dateStr.replace(/\[.*\]/, "").trim();
  const y = cleaned.slice(0, 4);
  const m = cleaned.slice(4, 6);
  const d = cleaned.slice(6, 8);
  if (!y || !m || !d) return new Date().toISOString();
  return new Date(Number(y), Number(m) - 1, Number(d)).toISOString();
}

export function parseOFX(text: string): Transaction[] {
  // Split on <STMTTRN> to find transaction blocks
  const blocks = text.split(/<STMTTRN>/i).slice(1);

  return blocks
    .map((block) => {
      const dateStr = extractTag(block, "DTPOSTED");
      const amountStr = extractTag(block, "TRNAMT");
      const name = extractTag(block, "NAME") || extractTag(block, "MEMO");

      if (!dateStr || !amountStr || !name) return null;

      const rawAmount = parseFloat(amountStr);
      if (isNaN(rawAmount) || rawAmount === 0) return null;

      const type: "expense" | "income" = rawAmount < 0 ? "expense" : "income";
      const amount = Math.round(Math.abs(rawAmount) * 100) / 100;

      return {
        id: generateId(),
        type,
        amount,
        category: type === "income" ? "salary" : categorizeDescription(name),
        note: name,
        date: parseOFXDate(dateStr),
        createdAt: new Date().toISOString(),
      } as Transaction;
    })
    .filter((t): t is Transaction => t !== null);
}
