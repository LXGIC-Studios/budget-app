/**
 * Smart transaction categorizer.
 *
 * Key feature: detects internal transfers (Zelle between household members,
 * account-to-account moves, Cash App self-transfers, etc.) and tags them as
 * "transfer" so they are excluded from income/expense totals.
 */

// ---------------------------------------------------------------------------
// Household member names - these people are "internal" to the budget.
// Transfers to/from them are NOT real income or spending.
// ---------------------------------------------------------------------------
const HOUSEHOLD_NAMES = [
  "ashley ray",
  "ashley welton",
  "welton ashley",
  "nathan welton",
  "nathan j welton",
];

// EchoFern is Nathan's own business. Money FROM EchoFern = real income.
// Money TO EchoFern = transfer (returning capital to business).
const OWN_BUSINESS_NAMES = ["echofern llc", "echofern"];

// ---------------------------------------------------------------------------
// Transfer detection patterns
// ---------------------------------------------------------------------------
const TRANSFER_EXACT_PATTERNS = [
  "online transfer from chk",
  "online transfer to chk",
  "online transfer from sav",
  "online transfer to sav",
  "overdraft paid fee",
  "overdraft paid fee waived",
];

function isTransfer(description: string, amount: number): boolean {
  const lower = description.toLowerCase();

  // Account-to-account transfers
  if (TRANSFER_EXACT_PATTERNS.some((p) => lower.includes(p))) return true;

  // Zelle to/from household members
  if (lower.includes("zelle")) {
    // Zelle TO household member = transfer
    for (const name of HOUSEHOLD_NAMES) {
      if (lower.includes(name)) return true;
    }
    // Zelle TO own business = transfer (returning money)
    if (amount < 0 || lower.includes(" to ")) {
      for (const name of OWN_BUSINESS_NAMES) {
        if (lower.includes(name)) return true;
      }
    }
  }

  // Cash App self-transfers
  if (lower.includes("cash app*nathan") && amount > 0) return true;
  if (lower.includes("cash app*nathan") && lower.includes("cash.app")) return true;

  // Venmo to/from household members
  if (lower.includes("venmo")) {
    for (const name of HOUSEHOLD_NAMES) {
      if (lower.includes(name)) return true;
    }
  }

  // Apple Cash self-transfers
  if (lower.includes("apple cash") && (lower.includes("sent") || lower.includes("inst xfer"))) return true;

  // Wire transfer fees (paired with wire deposits, not real spending)
  if (lower === "wire transfer fee" || lower.includes("wire transfer fee")) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Real income detection - these are actual money coming in
// ---------------------------------------------------------------------------
function isRealIncome(description: string): boolean {
  const lower = description.toLowerCase();

  // Payroll
  if (lower.includes("payroll")) return true;

  // Wire deposits from business bank
  if (lower.includes("wire transfer deposit")) return true;

  // EchoFern paying personal account = business income
  if (lower.includes("echofern") && (lower.includes("from") || lower.includes("credit"))) return true;

  return false;
}

// ---------------------------------------------------------------------------
// Category keyword matching
// ---------------------------------------------------------------------------
const CATEGORY_KEYWORDS: Record<string, string[]> = {
  "Groceries": [
    "kroger", "publix", "costco whse", "walmart", "wal-mart", "wm supercenter",
    "costco by instac", "instacart", "cash saver", "aldi",
  ],
  "Eating Out": [
    "mcdonald", "starbucks", "doordash", "dd *doordash", "grubhub", "uber eats",
    "chipotle", "taco bell", "taco", "burger king", "chick-fil-a", "wendy",
    "subway", "panera", "dunkin", "dutch bros", "sonic", "papa johns",
    "pizza", "cafe", "diner", "restaurant", "sbarro", "moes", "regal",
    "cilantro", "cheba hut", "bishops", "waldo", "komugi", "arigato",
    "skinny dennis", "sully", "charley", "daddy's dogs", "pelican", "bread box",
    "kave", "gregory", "lynco",
  ],
  "Gas/Transport": [
    "costco gas", "kroger fuel", "racetrac", "shell", "chevron", "bp",
    "exxon", "mapco", "speedway", "fuel", "parking",
  ],
  "Shopping": [
    "amazon", "amzn", "target", "old navy", "american eagle", "marshalls",
    "ikea", "etsy", "ebay", "costco.com", "www costco", "walmart.com",
    "books a million", "barnes & noble", "barnes and nobl", "bombas",
    "carhartt", "patagonia", "games workshop", "box lunch", "pop cult",
    "pepper palace", "girl scouts", "uniqlo", "bloom consign", "hooked on consign",
    "gammon", "rare bird", "brilliant sky", "kid to kid", "hanna andersson",
    "dr. squatch", "tractor-supply",
  ],
  "Subscriptions": [
    "apple.com/bill", "netflix", "spotify", "hulu", "hbo", "disney",
    "crunchyroll", "amazon kids", "amazon grocery sub", "dashpass",
    "playstation", "xbox", "steam", "battle.net", "google *google one",
    "ring multi", "oura ring", "ouraring", "canva", "roku", "suno",
    "openai", "chatgpt", "anthropic", "cursor", "xai", "layers ai",
    "strykr", "acorns", "walmart+", "format magic",
  ],
  "Bills": [
    "amerihome", "nes*", "att*", "at&t", "verizon", "t-mobile", "comcast",
    "progressive", "prog direct ins", "orkin", "hendersonville utilit",
    "paymentus", "on inc", "affirm", "monthly maintenance fee",
    "monthly service fee",
  ],
  "Auto": [
    "champion car wash", "take 5 oil", "jiffy lube",
  ],
  "Health": [
    "walgreens", "cvs", "pharmacy", "doctor", "hospital", "dental",
    "adapthealth", "hendersonville martial", "hendersonville a",
  ],
  "Kids": [
    "conservation lan", "venmo *laura mass", "cash app*ari",
    "roblox", "amazon kids", "hanna andersson", "brilliant sky",
    "kid to kid", "girl scouts", "hendersonville s clubs",
  ],
  "Payments": [
    "payment to chase card", "venmo *noah pine",
    "venmo *howard", "venmo *emilie", "venmo *kenneth",
    "zelle payment to faith", "zelle payment to daniel",
    "cash app*constance", "affirm", "loan pmt",
  ],
  "Clothing": [
    "rsvlts", "den nashville",
  ],
  "Laundry": [
    "csc service", "cantaloupe",
  ],
  "Fees": [
    "wire transfer fee",
  ],
};

function matchCategory(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "Other";
}

// ---------------------------------------------------------------------------
// Main export: classify a transaction description
// ---------------------------------------------------------------------------
export interface TransactionClassification {
  category: string;
  isTransfer: boolean;
}

export function classifyTransaction(
  description: string,
  amount: number
): TransactionClassification {
  // Check transfer first
  if (isTransfer(description, amount)) {
    return { category: "transfer", isTransfer: true };
  }

  // Check if this is payroll/business income
  if (isRealIncome(description)) {
    return { category: "salary", isTransfer: false };
  }

  // Regular categorization
  return { category: matchCategory(description), isTransfer: false };
}

/**
 * Backward-compatible wrapper. Returns just the category string.
 * Transfer transactions get category "transfer".
 */
export function categorizeDescription(description: string, amount = 0): string {
  return classifyTransaction(description, amount).category;
}
