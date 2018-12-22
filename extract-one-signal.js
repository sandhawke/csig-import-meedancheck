/**
  Just pull out the data about one question from Zhang18 dataset,
  currently hard coded as #19, to double-check something

$ node extract-one-signal.js
$ diff out-one-signal-1.csv out-for-irr-Number-of-links-to-sponsored-content.csv
1c1
< Check-2018-01,Check-2018-02,Check-2018-03,Check-2018-04,Check-2018-05,Check-2018-06
---
> user01,user02,user03,user04,user05,user06
$ tr -d '"' < out-one-signal-2.csv > out-one-signal-2b.csv
$ diff out-one-signal-1.csv out-one-signal-2b.csv 
51c51
< ,0,,0,,0
---
> ,0,,0,,0
\ No newline at end of file

 
*/
// let's switch parsers just in case it makes a difference...
// const parse = require('csv-parse/lib/sync')
const csv = require('csvtojson')
// and use TWO stringifiers
const stringify1 = require('csv-stringify/lib/sync')
const stringify2 = require('json2csv').parse
const fs = require('fs-extra')

const filenames = [
  'sample/zhang18-1.csv',
  'sample/zhang18-2.csv',
  'sample/zhang18-3.csv'
]
const raters = [
  'Check-2018-01',
  'Check-2018-02',
  'Check-2018-03',
  'Check-2018-04',
  'Check-2018-05',
  'Check-2018-06'
]

async function main() {
  const records = []
  for (const filename of filenames) {
    /*
    const text = await fs.readFile(filename)
    const r = parse(text, { columns: true })
    */
    const r = await csv().fromFile(filename)
    records.push(...r)
  }

  const outputByURL = {}

  for (const input of records) {
    if (input.task_question_19 !== 'Number of links to sponsored content') {
      throw Error()
    }
    const url = input.media_url
    const answer = input.task_answer_19
    const user = input.task_user_19
    
    if (user === '') continue
    if (!raters.includes(user)) {
      throw Error('Unexpected rater: ' + JSON.stringify(user))
    }

    if (!outputByURL[url]) outputByURL[url] = {}
    outputByURL[url][user] = answer
  }

  const samples = Object.values(outputByURL)
  const opts = {
    header: true,
    columns: raters,   // for stringify1
    fields: raters     // for stringify2
  }
  await fs.writeFile('out-one-signal-1.csv', stringify1(samples, opts))
  await fs.writeFile('out-one-signal-2.csv', stringify2(samples, opts))
}

main()
