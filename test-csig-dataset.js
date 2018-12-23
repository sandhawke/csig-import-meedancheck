const test = require('tape')
const {Dataset} = require('./csig-dataset')
const {Converter} = require('.')
const debug = require('debug')(__filename.split('/').slice(-1).join())

test(t => {
  const d = new Dataset()
  t.equal(d.matrixR([[1,2],[3,4]]),'matrix(c(1,2,3,4),byrow=TRUE,ncol=2)')
  t.equal(d.matrixR([[1,2],[3,4]],true),'matrix(c(1,2,3,4),byrow=FALSE,nrow=2)')
  t.equal(d.matrixR([{a:1,b:2},[3,4]]),'matrix(c(1,2,3,4),byrow=TRUE,ncol=2)')
  t.equal(d.matrixR({a:[1,2],b:[3,4]},true),'matrix(c(1,2,3,4),byrow=FALSE,nrow=2)')

  try {
    t.equal(d.matrixR([[1,2,3],[3,4]]),'')
    t.fail()
  } catch (e) {
    t.equal(e.message, 'uneven row length')
  }

  t.end()
})

test.only(async (t) => {
  const d = new Dataset()
  let m, x

  m = [[10,11],[11,10],[10,11],[11,10],[11,10]]
  x = await d.runR(d.corrR(m))
  t.deepEqual(x, { r: [ 1, -1, -1, 1 ], n: [ 5, 5, 5, 5 ], P: [ 'NA', 0, 0, 'NA' ] })

  m = [[1,0],[1,0],[1,0],[1,0],[1,0]]
  x = await d.runR(d.corrR(m))
  t.deepEqual(x, { r: [ 1, 'NaN', 'NaN', 1 ], n: [ 5, 5, 5, 5 ], P: [ 'NA', 'NaN', 'NaN', 'NA' ] })

  m = [[1,1],[1,1],[1,1],[2,1],[1,0],[0,0],[0,1],[1,1]]
  x = await d.runR(d.corrR(m))
  t.deepEqual(x, {
    r: [ 1, 0.361157559257308, 0.361157559257308, 1 ],
    n: [ 8, 8, 8, 8 ],
    P: [ 'NA', 0.379409789480354, 0.379409789480354, 'NA' ]
  })

  d.stop()
  t.end()
})

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

  t.comment('checking RDF solve')
  
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


  t.comment('starting ds creation')
  const ds = new Dataset({kb:conv.kb})
  t.comment('... done')
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

  // console.log(ds.irrR('Number of links to sponsored content'), '\n\n')

  // console.log(ds.irrCSV('Number of links to sponsored content'))

  const x = await ds.runR(ds.irrR('Number of links to sponsored content'))
  t.equal(x.method, 'Krippendorff\'s alpha')
  t.equal(x.subjects, 50)
  t.equal(x.raters, 6)
  t.equal(x.value, 0.103582697558086)
  
  t.end()
})

