#!/bin/bash
# Daily Supabase backup for Stackd Budget App
# Backs up all tables to JSON files in backups/ directory

BACKUP_DIR="$(dirname "$0")/../backups"
DATE=$(date +%Y-%m-%d_%H%M)
DIR="$BACKUP_DIR/$DATE"
mkdir -p "$DIR"

URL="https://rdptbefetmtjuxtgxlxd.supabase.co/rest/v1"
ANON="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcHRiZWZldG10anV4dGd4bHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjQ1OTEsImV4cCI6MjA4OTY0MDU5MX0.ViXfRd0zj62wuqlK2i8h8NEQiyS3omhMscM6-6HS8BY"
SVC="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJkcHRiZWZldG10anV4dGd4bHhkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2NDU5MSwiZXhwIjoyMDg5NjQwNTkxfQ.2P_f-5lZo9zpwDlVJbwmTFvT77oNeiUtcTe6UqOA5R8"

TABLES="profiles transactions budget_categories debts user_accounts households household_members"

for TABLE in $TABLES; do
  echo "Backing up $TABLE..."
  curl -s "$URL/$TABLE?select=*" \
    -H "apikey: $ANON" \
    -H "Authorization: Bearer $SVC" \
    > "$DIR/$TABLE.json"
done

# Count records
echo ""
echo "=== Backup complete: $DIR ==="
for TABLE in $TABLES; do
  COUNT=$(python3 -c "import json; print(len(json.load(open('$DIR/$TABLE.json'))))" 2>/dev/null || echo "?")
  echo "  $TABLE: $COUNT records"
done

# Prune backups older than 30 days
find "$BACKUP_DIR" -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \; 2>/dev/null
echo "Done."
