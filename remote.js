const got = require('got')
const csvparse = require('csv-parse/lib/sync')
const debug = require('debug')('remote')

async function fetchCSV (url) {
  // Rewrite a Google Sheets URL into the export-CSV form
  const m = url.match(/^https:\/\/docs.google.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  if (m) {
    const id = m[1]
    url = `https://docs.google.com/spreadsheets/export?format=csv&id=${id}`
  }

  const response = await got(url)
  const records = csvparse(response.body, {
      columns: true
  })
  return records
}

module.exports = { fetchCSV }
