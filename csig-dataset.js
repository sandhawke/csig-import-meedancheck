// eventually make this its own module, probably
//
// and maybe split out the stats part

const kgx = require('kgx')
const is = require('@sindresorhus/is');
const setdefault = require('setdefault')
const pad = require('pad')
const csvStringify = require('csv-stringify/lib/sync')
const execa = require('execa')

const debug = require('debug')(__filename.split('/').slice(-1).join())

class Dataset {
  constructor (opts = {}) {
    this.kb = opts.kb // just this for now
    if (this.kb) this.generateSignalMap()
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

  /**
   * Given x[rowIndex][columnIndex], output the R syntax to generate
   * that matrix.  Or x[columnIndex][rowIndex] if you add the
   * transpose flag.
   *
   * Objects or arrays are fine.  Order will be JS's Objects.values
   * order, such as it is.  If you care, then pass arrays.
   */
  matrixR (x, transpose) {
    let values= []
    let cols = null
    for (const row of Object.values(x)) {
      const rowArray = [...Object.values(row)]
      if (cols === null) {
        cols = rowArray.length
      } else {
        if (cols !== rowArray.length) throw Error('uneven row length')
      }
      values.push(...rowArray)
    }
    values = values.map(x => x === undefined ? 'NA' : x)
    if (!transpose) {
      return `matrix(c(${values.join(',')}),byrow=TRUE,ncol=${cols})`
    } else {
      return `matrix(c(${values.join(',')}),byrow=FALSE,nrow=${cols})`
    }
  }

  irrR (signal, type = 'interval') {
    const { raterColumns } = this.irrTable(signal)
    return `# signal = ${signal}
library('irr')
library('rjson')
d <- ${this.matrixR(raterColumns)}
k <- kripp.alpha(d, ${JSON.stringify(type)})
cat(toJSON(k))`
  }
  
  XXirrR (signal, filename = 'out-from-R.png') {
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
    cmd.push(`k <- kripp.alpha(t(all), "interval")`)   // ** variable type needed **
    cmd.push(`library('rjson')`)
    cmd.push(`print(toJSON(k))`)
    return cmd.join('\n')
  }

  /**
     I looked at 
  https://www.npmjs.com/package/rstats
  https://www.npmjs.com/package/js-call-r
  https://www.npmjs.com/package/r-script
   */
  async runR (text) {
    debug('running R', text)
    debug('type', typeof text)
    const stdout = await execa.stdout('Rscript', ['--vanilla',
                                             '--slave',
                                             '-'
                                      ], {input:text});
    debug('R output', stdout)
    return JSON.parse(stdout)
  }
}  


const dataset = (...args) => new Dataset(...args)

module.exports = {Dataset, dataset}

