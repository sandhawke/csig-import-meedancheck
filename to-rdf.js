const fs = require('fs').promises
const kgx = require('kgx')

function convert (records) {
  let obsCount = 0
  let my

  const ansType = []
  ansType[ 1] = credlevel
  ansType[ 6] = bool
  ansType[10] = numeric
  ansType[12] = lik5
  ansType[15] = numeric
  ansType[16] = lik5
  ansType[17] = numeric
  ansType[18] = numeric
  ansType[19] = numeric
  ansType[20] = numeric
  ansType[22] = lik5
  ansType[23] = lik5
  // ansType[24] = credlevel   also "No change" is an option here.

  return records2rdf(records)

  function records2rdf (records) {
    const kb = kgx.createKB()
    kb.base = 'https://base-placeholder.example/'
    my = kb.ns('', kb.base + '#')
    for (const r of records) {
      describe(r, kb)
    }
    return kb
    // await kb.writeToFile('./out.trig')
  }

  function credlevel (kb, text) {
    const options = {}
    const index = ["Very low credibility", "Somewhat low credibility", "Medium credibility", "Somewhat high credibility", "Very high credibility"].indexOf(text)
    if (index === -1) {
      console.error(`bad value "${text}" for credibility rating`)
      return undefined
    }
    const val = index / 4
    options[kb.ns.rdf.value] = val
    return kb.defined(`The response "${text}", when the possible responses are "Very high credibility", "Somewhat high credibility", "Medium credibility", "Somewhat low credibility", and "Very low credibility".`, {label: text, value: val})
  }

  function lik5 (kb, text) {
    const options = {}
    const index = ["Strongly disagree", "Somewhat disagree", "Neutral", "Somewhat agree", "Strongly agree"].indexOf(text)
    if (index === -1) {
      console.error(`bad value "${text}" for Likert-5 rating`)
      return undefined
    }
    const val = index - 2
    options[kb.ns.rdf.value] = val
    return kb.defined(`The response "${text}", when the possible responses are "Strongly disagree", "Somewhat disagree", "Neutral", "Somewhat agree", and "Strongly agree".`, {label: text, value: val})
  }

  function numeric (kb, text) {
    return kb.literal(parseInt(text))
  }
  function bool (kb, text) {
    if (text === 'true') return kb.literal(true)
    if (text === 'false') return kb.literal(false)
    return undefined
  }

  function describe(r, kb) {

    // the same subject occurs muliple times; hopefully these fields
    // will be the same or things will get a bit weird.
    const subject = kb.named(r.media_url)
    kb.add(subject, kb.ns.dct.title, r.report_title)
    kb.add(subject, kb.ns.dct.abstract, r.media_content)
    if (r.time_original_media_publishing) {
      kb.add(subject, kb.ns.dct.date, new Date(r.time_original_media_publishing))
    }
    // hm, turns out moment can't handle this format
    // kb.add(subject, kb.ns.dct.date, moment.parseZone(r.time_original_media_publishing))
    // and this is the date of the REPORT, whatever that means
    // kb.add(subject, kb.ns.dct.date, moment.parseZone(r.report_date).format())

    // let date = new Date('2018-04-23')
    let startTime
    for (let t = 1; t <= 25; t++) {
      const uid = r[`task_user_${t}`]
      const question = r[`task_question_${t}`]
      const answer = r[`task_answer_${t}`]
      const endTime = new Date(r[`task_date_${t}`])

      if (uid && question && answer) {
        const observer = kb.defined(`Test subject identified as "${uid}" in Zhang18 data release`, {label: 'Subj ' + uid})
        const property = kb.defined(question, {label: 'Question ' + t})

        let handler = ansType[t]
        let value
        if (handler) {
          // console.log('running', t, handler)
          value = handler(kb, answer)
        }
        if (value) {
          // console.log('output', t, value)
          
          const observation = my['n' + obsCount++]
          // const observation = kb.blank() // kb.ns.obs['n' + obsCount++] // obsns['n' + obsCount++]
          
          kb.add(subject, property, value, observation)
          kb.add(observation, kb.ns.cred.observer, observer)
          // valid time
          kb.add(observation, kb.ns.cred.startTime, startTime)
          kb.add(observation, kb.ns.cred.endTime, endTime)
          // transaction time (begins, in original db; when recorded)
          kb.add(observation, kb.ns.dct.date, endTime)
        }
        startTime = endTime // start of the next one is the end of this one
      }
    }
  }
}

module.exports = { convert }
