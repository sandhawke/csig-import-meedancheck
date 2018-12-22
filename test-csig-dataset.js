const test = require('tape')
const {Dataset} = require('./csig-dataset')
const {Converter} = require('.')
const debug = require('debug')(__filename.split('/').slice(-1).join())

test(async (t) => {
  const conv = new Converter({
    sources: [
      'sample/zhang18-1.csv',
      'sample/zhang18-2.csv',
      'sample/zhang18-3.csv'
    ],
    metadataStyle: ['ng'],
    predicateStyle: ['mc'],
    encodingDependsOn: ['all'],
    direct: [false]
  })
  try {
    await conv.convert()
  } catch(e) {
    console.log('convert() threw:', e)
  }
  t.equal(conv.observations.length, 2964)

  /*
  const pat = `
?obs 
   x:by ?user;
   dc:date ?date.
?obs { ?subject ?signal ?reading }
`
  let count = 0
  for (const b of conv.kb.solve(pat)) {
    count++
  }
  t.equal(count, 2964)
*/
  
  const ds = new Dataset({kb:conv.kb})
  // console.log('ds.sm=%o', ds.signalMap)

  // let signal = 'If you can find it, paste the impact factor of the journal or conference of Source 1.'
  // const tables = ds.irrTable(signal)

  // console.log('tables.raterColumns = %O', tables.raterColumns)
  // console.log('tables.raterRows = %O', tables.raterRows)

  /*
  for (const signal of ds.signals()) {
    console.log('signal = %o', signal)
    for (const rater of ds.raters(signal)) {
      console.log('  rater = %o', rater)
    }
    // console.log('irrTable: %O', ds.irrTable(signal))
    console.log(ds.irrR(signal))
  }
  */

  console.log(ds.irrR('Number of links to sponsored content'))

  console.log(ds.irrCSV('Number of links to sponsored content'))
  
  t.end()
})
