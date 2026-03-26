const CATEGORY_KEYWORDS: Record<string, string[]> = {
  food: [
    "restaurant", "mcdonald", "starbucks", "uber eats", "doordash", "grubhub",
    "chipotle", "pizza", "cafe", "diner", "taco", "burger", "wendy",
    "chick-fil", "subway", "panera", "dunkin", "kroger", "publix", "instacart",
    "taco bell", "dutch bros", "sonic", "burger king",
  ],
  shopping: [
    "amazon", "amzn", "walmart", "target", "costco", "bestbuy", "best buy", "ikea",
    "home depot", "lowes", "lowe's", "etsy", "ebay", "old navy", "american eagle",
  ],
  transport: [
    "uber", "lyft", "gas", "fuel", "shell", "chevron", "bp", "exxon", "parking",
    "transit", "metro", "racetrac", "mapco", "speedway",
  ],
  bills: [
    "electric", "water", "internet", "comcast", "att", "at&t", "verizon", "t-mobile",
    "rent", "mortgage", "amerihome", "nes", "orkin", "progressive", "insurance",
    "geico", "state farm", "utility", "netflix", "spotify", "hulu", "hbo",
    "disney", "apple.com/bill",
  ],
  fun: [
    "apple music", "steam", "playstation", "xbox", "movie", "theater", "concert",
  ],
  health: [
    "pharmacy", "cvs", "walgreens", "doctor", "hospital", "dental", "vision",
    "gym", "fitness",
  ],
  transfer: [
    "zelle", "venmo", "cash app", "online transfer",
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
