const execa = require('execa');

const alice = {}
const bob = {}
const obss = [
  { subject: 1, by: alice, value: 1 },
  { subject: 2, by: alice, value: 1 },
  { subject: 3, by: alice, value: 1 },
  { subject: 1, by: bob, value: 0.5 },
  { subject: 2, by: bob, value: 0 },
  { subject: 3, by: bob, value: 0 }
]

// build these dynamically,
// along with value index
const subjects = [1, 2, 3]
const raters = [alice, bob]

function value (rater, subject) {
  for (const obs of obss) {
    if (obs.by === rater && obs.subject === subject) return obs.value
  }
  return 'NA'
}

async function main () {
  const data = []

  for (const subject of subjects) {
    for (const rater of raters) {
      data.push(value(rater, subject))
    }
  }
  // console.log('data = %o', data)
  const input = `library('irr')
nmm<-matrix(c(${data.join(',')}),byrow=FALSE,nrow=${raters.length},ncol=${subjects.length})
nmm
kripp.alpha(nmm)
`
  console.log('======input:\n' + input + '\n=========')
	const {stdout} = await execa('R', ['--vanilla',
                                     '--slave',
                                    ], {input});
	console.log('stdout:', stdout);
  const m = stdout.match(/Krippendorff's alpha\s+Subjects = (\d+)\s+Raters = (\d+)\s+alpha = (.*)/)
  console.log(m)
  const [nSubjects, nRaters, alpha] = m.slice(1,4)
  console.log({nSubjects, nRaters, alpha})

	//=> 'unicorns'
}


main()
