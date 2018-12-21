#!/usr/bin/env node
const fs = require('fs')
const yargs = require('yargs')
const debug = require('debug')('cli')
// const read = require('./read-csv')
// const toRDF = require('./to-rdf')
// const {fetchCSV} = require('./remote')
const {Converter} = require('.')
require('completarr')()

yargs
  // .completion()   now handled by completarr
  .help()
  .usage('$0 [options] [input_files...]')
  .example('$0 sample/basicnov2018.csv.1', 'Convert to N-Quads, all default shapes')
  .example('$0 sample/*csv* -g -o out-qmeta.csv', 'Generate qmeta')
  .example('$0 sample/*csv* -o out.nq -rmp', 'Just the "raw" shape, setting m and p to nothing')
  .config('settings')
  .env('MEEDANRDF')
  .epilogue('All values can be set in config file and environment variables. For details see https://sandhawke.github.io/meedancheck-to-rdf')
  .option('out', {
    alias: 'o',
    describe: 'filename where generated data should go, suffix determines format'
  })
  .option('q', {
    string: true,
    alias: 'qmeta',
    default: 'https://docs.google.com/spreadsheets/d/1IF8RsEcwfsBPd85YZw0kBoNOOqOZ0Tc2ksKprIoCjqk',
    describe: 'URL of spreadsheet with question metadata'
  })
  .option('g', {
    boolean: true,
    alias: 'generateQMeta',
    describe: 'Output a CSV file as a new qmeta, based on everything we know'
  })
  .option('jsonDump', {
    default: true,
    boolean: true,
    describe: 'Write intermediate data as JSON files'
  })
  .option('jsonDumpPrefix', {
    describe: 'Prefix for jsonDump',
    default: 'out-'
  })
  .option('raw', {
    boolean: true,
    alias: 'r',
    describe: 'Very basic RDF encoding, doesnt create predicates'
  })
  .group(['r', 'm', 'p', 'e', 'd'], 'Control dataset output shapes:')
  .array(['m', 'p', 'e', 'd'])
  .default('m', ['ng'])
  .default('p', ['tf', 'ag', 'mc'])
  .default('e', ['all', 'one'])
  .default('d', [true])
  .alias('m', 'metadataStyle')
  .alias('p', 'predicateStyle')
  .alias('e', 'encodingDependsOn')
  .alias('d', 'direct')
  // .choices('p', ['tf', 'ag', 'nc'])   doesn't allow multples, so nope.
  .strict()
  .argv

const argv = yargs.argv
debug('argv = %O', argv)

const main = async (sources, argv) => {
  if (sources.length === 0) {
    // should read from stdin?
    console.error('please provide an input file')
    return
  }

  const conv = new Converter(argv)
  conv.sources = sources
  try {
    await conv.convert()
  } catch (e) {
    console.error('Error during conversion')
    throw e
  }
  
  let outStream = process.stdout
  if (argv.out) {
    outStream = fs.createWriteStream(argv.out)
  }

  if (argv.generateQMeta) {
    debug('generateQMmeta')
    await conv.writeQMeta(outStream)
    if (argv.out) {
      console.error(`# Wrote new qmeta to ${argv.out || 'stdout'}`)
    }
  } else {
    // pass the filename too, so it can be used for type guessing
    const opts = {stream: outStream, filename: argv.out}
    if (!argv.out) opts.format = 'application/n-quads'
    conv.kb.writeAll(opts)
  }
}

main(argv._, argv)

