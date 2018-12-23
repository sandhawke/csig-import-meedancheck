const test = require('tape')
const fs = require('fs-extra')
const stringify = require('stringify-json')
const { Dataset, mean } = require('./csig-dataset')
const { Converter } = require('.')
const { RDriver } = require('r-driver')
// const debug = require('debug')(__filename.split('/').slice(-1).join())


test(t => {
  t.equal(mean([1,2,3]), 2)
  t.equal(mean([1]), 1)
  t.equal(mean([-10, 10]), 0)
  t.end()
})

test(async (t) => {
  const conv = new Converter({
    sources: [
      'sample/zhang18-1.csv',
      'sample/zhang18-2.csv',
      'sample/zhang18-3.csv'
    ],
    ametaFile: 'other-data/zhang18-experts.csv',
    qmeta: 'https://docs.google.com/spreadsheets/d/1IF8RsEcwfsBPd85YZw0kBoNOOqOZ0Tc2ksKprIoCjqk',
    metadataStyle: ['ng'],
    predicateStyle: ['mc'],
    encodingDependsOn: ['all'],
    direct: [false],
    jsonDump: true
  })
  try {
    await conv.convert()
  } catch (e) {
    console.log('convert() threw:', e)
  }

  await conv.kb.writeAll({filename: 'out.trig'})
  /*
  t.equal(conv.observations.length, 2964)

  t.comment('checking RDF solve')

  const pat = `
?obs 
   x:by ?user;
   dc:date ?date.
?obs { ?subject ?signal ?reading }
`
  t.equal([...conv.kb.solve(pat)].length, 2964)

  */

  t.comment('starting ds creation')
  const ds = new Dataset({ kb: conv.kb })
  t.comment('... done')

  /*
  function map2json (key, value) {
    if (value.entries) {
      value = [...value.entries()]
    }
    return JSON.stringify(value, map2json, 2)
  }
  
  const sm = map2json(null, ds.signalMap, 2)
  */
  const sm = stringify(ds.signalMap, undefined, 2)
  console.log(sm)
  await fs.writeFile('out-signalmap.json', sm)
  t.comment('... wrote signalmap')
                     
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

  const rdr = new RDriver()
  const x = await rdr.krippAlpha(ds.irrTable('Number of links to sponsored content').raterColumns)
  t.equal(x.method, 'Krippendorff\'s alpha')
  t.equal(x.subjects, 50)
  t.equal(x.raters, 6)
  t.equal(x.value, 0.103582697558086)

  const m = ds.corrTable([
    'Accuracy (1-5) according to domain expert',
    'Number of links to sponsored content',
    'Number of calls to join a mailing list',
    'Number of calls to social shares',
    'Number of content recommendation boxes',
    'Number of display ads',
    'If you can find it, paste the impact factor of the journal or conference of Source 1.'
  ])
  console.log('corr: %O', m)
  
  const y = await rdr.rcorr(m)
  t.deepEqual(y,      { r: [ 1, -0.188271593655464, 0.241444891225315, -0.0883032922180496, 0.137265329407769, -0.151892282468087, -0.349778857802127, -0.188271593655464, 1, 0.141585736360699, 0.0751935718429892, 0.133080797188527, 0.268311384286085, 0.686071735693994, 0.241444891225315, 0.141585736360699, 1, 0.0884507316349216, 0.154757200345134, 0.211427788497813, -0.0762261272574892, -0.0883032922180496, 0.0751935718429892, 0.0884507316349216, 1, 0.00570244715832167, 0.503685203722284, -0.997114566340127, 0.137265329407769, 0.133080797188527, 0.154757200345134, 0.00570244715832167, 1, 0.201340881677106, -0.703827899318848, -0.151892282468087, 0.268311384286085, 0.211427788497813, 0.503685203722284, 0.201340881677106, 1, -0.432531515528124, -0.349778857802127, 0.686071735693994, -0.0762261272574892, -0.997114566340127, -0.703827899318848, -0.432531515528124, 1 ], n: [ 43, 43, 43, 43, 43, 43, 3, 43, 50, 50, 50, 50, 50, 3, 43, 50, 50, 50, 50, 50, 3, 43, 50, 50, 50, 50, 50, 3, 43, 50, 50, 50, 50, 50, 3, 43, 50, 50, 50, 50, 50, 3, 3, 3, 3, 3, 3, 3, 3 ], P: [ 'NA', 0.226644437808581, 0.118811155686319, 0.573378680399946, 0.380079092760068, 0.330885692902506, 0.772513448107479, 0.226644437808581, 'NA', 0.326695099152002, 0.603770238759089, 0.356878549392868, 0.0595692546002073, 0.518667205744801, 0.118811155686319, 0.326695099152002, 'NA', 0.541318081222506, 0.283225407418394, 0.140501283538861, 0.951425823129546, 0.573378680399946, 0.603770238759089, 0.541318081222506, 'NA', 0.968648963671319, 0.00019238167257063, 0.0483732370177683, 0.380079092760068, 0.356878549392868, 0.283225407418394, 0.968648963671319, 'NA', 0.160888022088037, 0.502945228527464, 0.330885692902506, 0.0595692546002073, 0.140501283538861, 0.00019238167257063, 0.160888022088037, 'NA', 0.715240843537121, 0.772513448107479, 0.518667205744801, 0.951425823129546, 0.0483732370177683, 0.502945228527464, 0.715240843537121, 'NA' ] }

)
  
  await rdr.ggcorr(m, 'out-my-ggcorr.png')
  
  rdr.stop()
  t.end()
})
