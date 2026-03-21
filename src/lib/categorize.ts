const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    "restaurant", "mcdonald", "starbucks", "uber eats", "doordash", "grubhub",
    "chipotle", "pizza", "cafe", "diner", "taco", "burger", "wendy",
    "chick-fil", "subway", "panera", "dunkin",
  ],
  shopping: [
    "amazon", "walmart", "target", "costco", "bestbuy", "best buy", "ikea",
    "home depot", "lowes", "lowe's", "etsy", "ebay",
  ],
  transport: [
    "uber", "lyft", "gas", "shell", "chevron", "bp", "exxon", "parking",
    "transit", "metro",
  ],
  bills: [
    "electric", "water", "internet", "comcast", "att", "verizon", "t-mobile",
    "rent", "mortgage", "insurance", "geico", "state farm",
  ],
  fun: [
    "netflix", "spotify", "hulu", "disney", "apple music", "steam",
    "playstation", "xbox", "movie", "theater", "concert",
  ],
  health: [
    "pharmacy", "cvs", "walgreens", "doctor", "hospital", "dental", "vision",
    "gym", "fitness",
  ],
};

export function categorizeDescription(description: string): string {
  const lower = description.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return category;
    }
  }
  return "other";
}
