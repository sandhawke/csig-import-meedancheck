// eventually make this its own module, probably

const setdefault = require('setdefault')
const csvStringify = require('csv-stringify/lib/sync')
const debug = require('debug')(__filename.split('/').slice(-1).join())

class Dataset {
  constructor (opts = {}) {
    this.kb = opts.kb // just this for now
    if (this.kb) this.generateSignalMap()
  }

  generateSignalMap () {
    const d = new Map()
    const x = 'https://example.org/#'.length
    const pat = `
?obs { ?subject ?signal ?reading }
?obs x:by ?user.`
    for (const b of this.kb.solve(pat)) {
      // essentially: d[signal][subject][user] = rating
      setdefault.map(setdefault.map(d, b.signal.value.slice(x)), b.subject.value)
        .set(b.user.value, b.reading.value)
    }
    this.signalMap = d
    return d
  }

  signals () {
    return this.signalMap.keys()
  }

  raters (signal) {
    const raters = new Set()
    for (const raterMap of this.signalMap.get(signal).values()) {
      for (const rater of raterMap.keys()) {
        raters.add(rater)
      }
    }
    return raters.keys()
  }

  irrTable (signal) {
    const series = {} // series[rater] = vector of ratings by that rater
    const rows = [] // table with 1 column per rater
    const raters = [...this.raters(signal)].sort()
    const nums = []
    let n = 1
    for (const [subject, raterMap] of this.signalMap.get(signal).entries()) {
      // build an array to help with cross-referencing in R scripts
      nums.push(n++)

      // console.log('\n\nsubject=%o\n\nratermap=%O', subject, raterMap)

      // fill in series, which is how some code likes it
      for (const rater of raters) {
        let reading = raterMap.get(rater)
        debug('Columns: %o', { subject, rater, reading })
        setdefault.array(series, rater).push(reading)
      }
      // fill in row, which is how other code likes it
      const r = {}
      for (const [rater, reading] of raterMap.entries()) {
        debug('Rows: %o', { subject, rater, reading })
        r[rater] = reading
      }
      rows.push(r)
    }
    // um, yes, I should just implement transpose() of course
    // ... but it's slightly more complicated because array vs object
    return { raters, nums, raterColumns: series, raterRows: rows }
  }

  niceName (rater) {
    // how to generalize this?
    rater = rater.replace('Check-2018-', 'user')
    return rater
  }

  irrCSV (signal) {
    const tables = this.irrTable(signal)
    const opts = {
      header: true,
      columns: tables.raters.map(key => ({ key, header: this.niceName(key) }))
    }
    return csvStringify(tables.raterRows, opts)
  }
}

const dataset = (...args) => new Dataset(...args)

module.exports = { Dataset, dataset }
