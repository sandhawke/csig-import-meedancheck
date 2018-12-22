// eventually make this its own module, probably
//
// and maybe split out the stats part

const kgx = require('kgx')
const is = require('@sindresorhus/is');
const setdefault = require('setdefault')
const pad = require('pad')
const csvStringify = require('csv-stringify/lib/sync')
const debug = require('debug')(__filename.split('/').slice(-1).join())

class Dataset {
  constructor (opts) {
    this.kb = opts.kb // just this for now
    this.generateSignalMap()
  }

  /*
  *observationNodes () {
    // is this safely DG only?
    for (const q of this.kb.match('?obs x:by ?user.')) {
      yield q.subject
    }

    for (const b of this.kb.solve('?obs x:by ?user.')) {
      yield b.obs
    }

    return
  }

  *signals () {
    for (const b of this.kb.solve(`
?_obs 
   x:by ?_user;
   dc:date ?_date.
?_obs { ?_subject ?signal ?_reading }
`
                                 )) {
      yield b.signal
    }
    return
  }

  *raters (signal) {
    for (const b of this.kb.solve(`
?_obs 
   x:by ?user;
   dc:date ?_date.
?_obs { ?_subject ?signal ?_reading }
`, { bind: { signal } }
                                 )) {
      yield b.user
    }
    return
  }

*/

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
    const series = {}  // series[rater] = vector of ratings by that rater
    const rows = []    // table with 1 column per rater
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
        debug('Columns: %o', {subject, rater, reading})
        setdefault.array(series, rater).push(reading)
      }
      // fill in row, which is how other code likes it
      const r = {}
      for (const [rater, reading] of raterMap.entries()) {
        debug('Rows: %o', {subject, rater, reading})
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
      columns: tables.raters.map(key => ({key, header: this.niceName(key)}))
    }
    return csvStringify(tables.raterRows, opts)
  }

  irrR (signal, filename = 'out-from-R.png') {
    const { raters, nums, raterColumns } = this.irrTable(signal)
    const cmd = []
    const NAify = (x => x === undefined ? 'NA' : x)
    cmd.push('# signal = ' + signal)
    cmd.push('#           ' + nums.map(NAify).map(x => pad(2,x)).join(','))
    for (const user of raters) {
      const numbers = raterColumns[user].map(NAify)
      cmd.push(`${this.niceName(user)} <- c(${numbers.map(x => pad(2,x)).join(',')});`)
    }
    cmd.push(`all <- cbind(${raters.map(x => this.niceName(x)).join(',')})`)
    cmd.push(`library("Hmisc")`)
    cmd.push(`library("GGally")`)
    cmd.push(`rcorr(all)`)
    cmd.push(`ggcorr(all,label=TRUE)`)
    cmd.push(`ggsave("${filename}")`)
    cmd.push(`library("irr")`)
    cmd.push(`kripp.alpha(t(all), "interval")`)   // ** variable type needed **
    return cmd.join('\n')
  }
}  


const dataset = (...args) => new Dataset(...args)

module.exports = {Dataset, dataset}

