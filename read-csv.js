const parse = require('csv-parse/lib/sync')
const fs = require('fs').promises
const moment = require('moment')
const path = require('path')

async function readCSV(filename, cb) {
  const text = await fs.readFile(filename)
  const records = parse(text, {
    columns: true,
    cast: function (value, context) {
      if (context.column.match && context.column.match(/.*date.*/)) {
        if (value === '') return null
        return moment.parseZone(value, 'YYYY-MM-DD HH-mm-ss Z')
      } else {
        return value
      }
    }
  })
  return records
}

module.exports = { readCSV } 
