#!/bin/bash
set -euo pipefail

# Build script for eJayJay
# Creates dist/ with only allowed public files
# Financial JSON is served under /personal/data/ (gated by edge function)

echo "Building eJayJay..."

# Clean and create dist
rm -rf dist
mkdir -p dist

# PUBLIC FILES ALLOWLIST
# Hub page
cp index.html dist/

# Static assets - explicit allowlist (only files the hub actually uses)
# This prevents future private files in static/ from shipping automatically
mkdir -p dist/static/css dist/static/js dist/static/img
cp static/css/style.css dist/static/css/
cp static/js/main.js dist/static/js/
cp static/img/hero-atmosphere.png dist/static/img/
# NOTE: static/js/money.js is NOT shipped publicly (fetches /data/money.json, unused by public pages)

# Public data (only projects.json is public)
mkdir -p dist/data
cp data/projects.json dist/data/

# PERSONAL SECTION (protected by edge function)
# Copy personal pages
cp -r personal dist/

# Copy financial JSON to personal/data/
# Source files stay in data/ for automation compatibility
mkdir -p dist/personal/data

# Financial data files - copy if they exist
FINANCIAL_FILES=(
    "bills.json"
    "money.json"
    "misc.json"
    "card-4243.json"
    "rental.json"
    "rental-balance.json"
)

for file in "${FINANCIAL_FILES[@]}"; do
    if [ -f "data/$file" ]; then
        cp "data/$file" "dist/personal/data/"
        echo "  copied data/$file -> dist/personal/data/$file"
    fi
done

echo ""
echo "Build complete. Contents of dist/:"
find dist -type f | sort
echo ""
echo "Total files: $(find dist -type f | wc -l)"
