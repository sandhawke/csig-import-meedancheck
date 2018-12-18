#!/usr/bin/env node
const fs = require('fs')
const yargs = require('yargs')
const debug = require('debug')('cli')
const read = require('./read-csv')
const toRDF = require('./to-rdf')
const {fetchCSV} = require('./remote')

yargs
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
  .option('customize', {
    string: true,
    alias: 'c',
    default: 'https://docs.google.com/spreadsheets/d/1VBr5VXf5UYlQVN-V42QpxHo4kh-4EKNDLU7whuFksSw',
    describe: 'URL of spreadsheet of customization data'
  })
  .option('generate-customize', {
    boolean: true,
    alias: 'g',
    describe: 'Output a CSV file as a starting point for a customization sheet'
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
  .strict()
  .argv

const argv = yargs.argv
debug('argv = %O', argv)

const main = async (inputs, config) => {
  let outStream = process.stdout
  if (config.out) {
    outStream = fs.createWriteStream(config.out)
  }

  const records = []
  if (inputs.length === 0) {
    // should read from stdin!
    console.error('please provide an input file')
    return
  }
  for (const filename of inputs) {
    const nrecs = await read.readCSV(filename)
    records.push(...nrecs)
    debug('Read %d rows from %s, now have %d',
          nrecs.length, filename, records.length)
  }

  if (config.json) {
    await fs.promises.writeFile(config.json, JSON.stringify(records, null, 2))
    console.error(`Wrote JSON copy of CSV to ${config.json}`)
  }

  if (config['generate-config']) {
    debug('generate-config')
    const questions = new Set()
    for (const r of records) {
      for (let i = 0; i < 999; i++) {
        const q = r['task_question_' + i]
        if (q) questions.add(q)
      }
    }
    for (const q of questions) {
      // should wrap this in CSV quoting, and include other columns
      outStream.write(q + '\n')
    }
    console.error(`Wrote config`)
    return
  }

  if (config['customize']) {
    debug('reading sheet', config['customize'])
    const cust = await fetchCSV(config['customize'])
    debug('got %O', cust)
  }
  
  const kb = toRDF.convert(records)

  kb.writeTo(outStream)
  // outStream.write(text)
}

  main(argv._, argv)

