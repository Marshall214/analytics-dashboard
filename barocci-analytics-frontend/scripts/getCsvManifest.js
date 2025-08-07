// scripts/genCsvManifest.js
const fs   = require('fs')
const path = require('path')

// 1. Point at the folder containing your CSVs
const csvDir = path.join(__dirname, '../public/csv')

// 2. Read and filter .csv files
const files = fs
  .readdirSync(csvDir)
  .filter(f => f.toLowerCase().endsWith('.csv'))

// 3. (Optional) Sort filenames alphabetically or by date pattern
files.sort()

// 4. Write JSON manifest into the public folder
const manifestPath = path.join(csvDir, 'csv-manifest.json')
fs.writeFileSync(manifestPath, JSON.stringify(files, null, 2))

console.log(`Generated CSV manifest with ${files.length} entries`)