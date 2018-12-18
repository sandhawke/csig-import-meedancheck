#!/usr/bin/env node
const fs = require('fs')
const yargs = require('yargs')
const debug = require('debug')('cli')
const read = require('./read-csv')
const toRDF = require('./to-rdf')
const {fetchCSV} = require('./remote')
const {Converter} = require('.')
require('completarr')()

yargs
  // .completion()   now handled by completarr
  .usage('$0 [options] [input_files...]')
  .example('$0 sample/basicnov2018.csv.1 -d > out.nq')
  .example('$0 sample/*csv* -g -o questions.csv')
  .config('settings')
  .env('MEEDANRDF')
  .epilogue('For details see https://sandhawke.github.io/meedancheck-to-rdf')
  .option('out', {
    alias: 'o',
    describe: 'filename where generated data should go, suffix determines format'
  })
  .option('qmeta', {
    string: true,
    alias: 'q',
    default: 'https://docs.google.com/spreadsheets/d/1VBr5VXf5UYlQVN-V42QpxHo4kh-4EKNDLU7whuFksSw',
    describe: 'URL of spreadsheet with question metadata'
  })
  .option('generate-qmeta', {
    boolean: true,
    alias: 'g',
    describe: 'Output a CSV file as a new qmeta, based on everything we know'
  })
  .option('json', {
    describe: 'filename in which to save a copy of the intermediate JSON data, "" to skip',
    default: 'out-records.json'
  })
  /*
  .option('named-graphs-direct', {
    boolean: true,
    group: 'Response location:',
    alias: 'd',
    describe: 'responses go in named graph whose label is the response id'
  })
  */
  .help()
  .array(['m', 'p', 'e', 'd'])
  .default('m', ['ng'])
  .default('p', ['tf', 'ag', 'mc'])
  .default('e', ['all', 'one'])
  .default('d', [true])
  .alias('m', 'metadata-style')
  .alias('p', 'predicate-style')
  .alias('e', 'encoding-depends-on')
  .alias('d', 'direct')
  // .choices('p', ['tf', 'ag', 'nc'])   doesn't allow multples, so nope.
  .strict()
  .argv

const argv = yargs.argv
debug('argv = %O', argv)

const main = async (inputs, argv) => {
  const conv = new Converter(argv)
  
  let outStream = process.stdout
  if (argv.out) {
    outStream = fs.createWriteStream(argv.out)
  }

  if (inputs.length === 0) {
    // should read from stdin!
    console.error('please provide an input file')
    return
  }
  for (const filename of inputs) await conv.load(filename)

  await conv.loadQMeta()
  conv.toObservations()
  
  if (argv.json) {
    await fs.promises.writeFile(argv.json, JSON.stringify(
      { records: conv.records,
        observations: conv.observations,
        qmeta: conv.meta
      }, null, 2))
    console.error(`# Wrote JSON dump to ${argv.json}`)
  }

  if (argv['generate-qmeta']) {
    debug('generate-qmeta')
    await conv.writeQMeta(outStream)
    if (argv.out) {
      console.error(`# Wrote new qmeta to ${argv.out || 'stdout'}`)
    }
    return
  }

  for (const mstyle of argv.m) {  // --metadata-style
    for (const pstyle of argv.p) { // --predicate-style
      for (const estyle of argv.e) { // --encoding-depends-on
        for (const dstyle of argv.d) { // --direct
          const flags = {mstyle, pstyle, estyle, dstyle}
          debug('shredding as: %o', flags)
          conv.run(flags)
        }
      }
    }
  }
  
  // pass the filename too, so it can be used for type guessing
  conv.kb.writeAll({stream: outStream, filename: argv.out})
}

main(argv._, argv)

