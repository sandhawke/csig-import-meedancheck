/*
  Given an observation, fill in more details based on the type of question

  On return, we should have set ONE of these three:

  * obs.answerIndex to be the index into obs.meta.possibleAnswersArray

  * obs.answerSet to be flags for each index into that array

  * obs.value to be the literal value of this answer, if it's not
  something in that array (and that's allowed)

*/
const is = require('@sindresorhus/is');
const debug = require('debug')(__filename.split('/').slice(-1).join())

const applyType = (obs, meta, unexpected) => {
  let type = meta.Type
  if (!type) type = ''

  let plus = type.endsWith('+')
  if (plus) type = type.slice(0, -1)

  let array = meta.possibleAnswersArray
  // these aren't the 4/5 I'd use for a Likert scale, myself.  Sigh.
  //
  if (type === 'agree4') {
    array = ['Strongly disagree', 'Somewhat disagree', 'Somewhat agree', 'Strongly agree']
    type = 'ordinal'
  } else if (type === 'agree5') {
    array = ['Strongly disagree', 'Somewhat disagree', 'Neutral', 'Somewhat agree', 'Strongly agree']
    type = 'ordinal'
  }
  // save for later encoding, I guess
  meta.possibleAnswersArray = array
  
  const index = array.indexOf(obs.answer)
  
  if (type === 'ordinal' || type === 'nominal') {
    if (index >= -1) {
      obs.answerIndex = index
    } else {
      if (!plus) unexpected(obs)
      // if plus, it'll be handled way down at the end
    }
  } else if (type === 'multi') {
    // Can't detect answers we don't know about, because I don't
    // actually how to split the string.
    obs.answerSet = []   // [3]=true means the answer with index 3 was selected
    for (const [i, a] of meta.possibleAnswersArray.entries()) {
      const pos = obs.answer.indexOf(a)
      debug('trying', i, a, pos)
      if (pos >= 0) {
        debug('match at', i, a)
        obs.answerSet[i] = true
      } else {
        obs.answerSet[i] = false
      }
    }
    debug('applyType multi %O', obs)

  } else if (type.startsWith('agree')) {
    throw Error('unhandled type of agree: ' + type)
  } else if (type === 'boolean') {
    if (obs.answer === 'true') {
      obs.value = true
    } else if (obs.answer === 'false') {
      obs.value = false
    } else if (!plus) unexpected(obs)
  } else if (type === 'integer') {
    try {
      obs.value = parseInt(obs.answer)
    } catch (e) {
      if (!plus) unexpected(obs)
    }
  } else if (type === 'decimal') {
    try {
      obs.value = parseFloat(obs.answer)
    } catch (e) {
      if (!plus) unexpected(obs)
    }
  } else if (type === 'string') {
    obs.value = obs.answer
  }

  if (obs.value === undefined && obs.answerIndex === undefined && obs.answerSet === undefined) {
    if (plus) {
      obs.value = obs.answer
    } else {
      console.error('Cant handled type of observation: %O %O', obs, meta)
    }
  }
}

const answerProperty = (obs) => {
  let t
  if (!is.undefined(obs.value)) t = 'value'
  if (!is.undefined(obs.answerIndex)) {
    if (t) throw Error('multiple types: ' + JSON.stringify(obs, null, 2))
    t = 'answerIndex'
  }
  if (!is.undefined(obs.answerSet)) {
    if (t) throw Error('multiple types: ' + JSON.stringify(obs, null, 2))
    t = 'answerSet'
  }
  if (!t) throw Error('no answerProperty: ' + JSON.stringify(obs, null, 2))
  return t
}

module.exports = { applyType, answerProperty }
