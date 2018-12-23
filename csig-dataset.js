// eventually make this its own module, probably
//
// and maybe split out the stats part

const fs = require('fs-extra')
const kgx = require('kgx')
const is = require('@sindresorhus/is');
const setdefault = require('setdefault')
const pad = require('pad')
const csvStringify = require('csv-stringify/lib/sync')
const execa = require('execa')
const lineJSONParser = require('ldjson-stream')
const { spawn } = require('child_process')
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
cat(toJSON(k)); cat('\n')
`
  }

  corrR (matrix, imageFileName) {
    let s = `# corr
library('Hmisc')
library('GGally')
library('rjson')
d <- ${this.matrixR(matrix)}
res <- rcorr(d)
cat(toJSON(res)); cat('\n')
`
    if (imageFileName) {
      s += `ggcorr(d,label=TRUE); ggsave(${JSON.stringify(imageFileName)})\n`
    }
    return s
  }


  /**
     I looked at 
     https://www.npmjs.com/package/rstats
     https://www.npmjs.com/package/js-call-r
     https://www.npmjs.com/package/r-script
     and they all ... have problems.

     If we're going to be running many things, it would be good
     to make this streaming, using some kind of 
   */
  async runR1 (text) {
    debug('running R', text)
    await fs.writeFile('out-script.R', text) // just for debugging
    const stdout = await execa.stdout('Rscript', ['--vanilla',
                                                  '--slave',
                                                  '-'
                                                 ], {input:text});
    debug('R output', stdout)
    return JSON.parse(stdout)
  }

  /* async */
  runR (text) {
    return new Promise(resolve => {
      debug('long running R', text)

      if (this.waiting) {
        throw new Error('longRunR called before previous one had resolved')
      }
      this.waiting = resolve

      fs.writeFileSync('out-script.R', text) // just for debugging

      if (!this.child) {
        console.error('Spawning Rscript sub-process; it may produce some messages')
        debug('spawning new R')
        this.child = spawn('Rscript', ['--vanilla', '--slave', '--silent', '-'])
        // we could send these to a file, or ... something.
        this.child.stderr.pipe(process.stderr)
        this.child.stdout.pipe(lineJSONParser.parse())
          .on('data', obj => {
            debug('got from R: %o', obj)
            const w = this.waiting
            this.waiting = null
            if (w) {
              w(obj)
            } else {
              console.error('extra output from R: ' + JSON.stringify(obj))
            }
          })
      }

      this.child.stdin.write(text)
      debug('sent to R: %o', text)
    })
  }

  stop () {
    if (this.child) {
      this.child.stdin.write('quit()\n')
      debug('telling R to quit')
      this.child.stdin.end()
      this.child = null
    }
  }
}  


const dataset = (...args) => new Dataset(...args)

module.exports = {Dataset, dataset}

