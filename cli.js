#!/usr/bin/env node
const fs = require('fs').promises
const meow = require('meow')
const debug = require('debug')('cli')
const read = require('./read-csv')
const toRDF = require('./to-rdf')
const cli = meow(`
    Usage
        $ meedancheck-to-rdf [options] [csv files...] 

   Options
        --out, -o      Where to send generated html
        TODO --format, -f   Which RDF syntax to output
        TODO --shape        1 or 2 (see readme)
        TODO --var          schema variation
        
       

    Examples
        $ meedancheck-to-rdf example/basicnov2018.csv* > out.nq

`, {
  flags: {
    out: {
      type: 'string',
      alias: 'o'
    }
  }
})

const main = async () => {
  const records = []
  for (const filename of cli.input) {
    const nrecs = await read.readCSV(filename)
    records.push(...nrecs)
    debug('Read %d rows from %s, now have %d',
          nrecs.length, filename, records.length)
  }
  await fs.writeFile('./out-records.json', JSON.stringify(records, null, 2))
  debug('saved JSON copy of CSV to out-records.json')
  
  const kb = toRDF.convert(records)

  let outStream = process.stdout
  if (cli.flags.out) {
    outStream = fs.createWriteStream(cli.flags.out)
  }
  kb.writeTo(outStream)
  // outStream.write(text)
}

if (cli.input.length === 0) cli.showHelp()
main()
