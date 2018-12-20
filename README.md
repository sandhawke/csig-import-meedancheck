# csig-import-meedancheck
[![NPM version][npm-image]][npm-url]

Convert the CSV output from Meedan's 'check' software to Credibility-Signals RDF

**STATUS: Still slightly aspirational.  Don't try using it yet.**

## Install

**Step 1**.  [Install Node.JS](https://nodejs.org/en/)

**Step 2**.  (Optional, but good if you're going to run this more than
  once. This step is optional because the "npx" command does a
  temporary auto-install.)

```terminal
$ npm install -g csig-import-meedancheck
```

## Command-Line Usage

Convert one or more [Check](https://meedan.com/en/check/) CSV files to
an RDF file like this:

```terminal
$ npx [options] csig-import-meedancheck [input filenames...] --out [output filename]
```

The output filename suffix is used to determine the output RDF syntax,
like .trig for [Trig](https://www.w3.org/TR/trig/) and .nq for
[N-Quads](https://www.w3.org/TR/n-quads/)

## Library Usage

The converter can be used as an imported module taking exactly same (long-form)
arguments as the command line (thanks to
[yargs](https://yargs.js.org/)), except:
* it doesn't do any output. Instead, you query or serialize its .kb field.  This field holds an iterable of [standard quads](http://rdf.js.org/#quad-interface).
* you name the inputs with a `sources` array argument

Example:

```js
const { Converter } = require('csig-import-meedancheck')

const conv = new Converter({
  qmeta: 'https://docs.google.com/spreadsheets/d/1IF8RsEcwfsBPd85YZw0kBoNOOqOZ0Tc2ksKprIoCjqk',
  jsonDumpPrefix: 'saved-',
  metadataStyle: ['ng', 'rr'],
  sources: ['file1.csv', 'file2.csv']
})

conv.convert()
    .then(() => {
        console.log('Got %d quads', [...conv.kb].length)
    })
```

You can, of course, subclass Converter to change elements of what it does.

### Settings

All the command line options can also be specified as environment
variables with the prefix "MEEDANRDF_" or in a JSON file called
settings.json (which you can override with the --settings option).

### QMeta

The converter can do a much better job with some extra information
about each question (some **q**uestion **meta**data).  You can provide
this in a "qmeta" file, which this program can read directly from a
public Google Spreadsheet. You can start by asking the program to make
its best guess with the --generateQMeta option, then load that CSV
into a new sheet, make the sheet public, and specify it in the future
with --qmeta.  Then edit the sheet as necessary to get the results you
want.

### Options for Controlling Output Mapping

There are many different proposals for how map this data to RDF. We
implement several of them, via different switches.  Use --help to see
the options and defaults, and for details see [Mapping Credibility Signal Questionnaire Data to RDF](https://sandhawke.github.io/csig-import-meedancheck/about-the-schema.html).

### Other Options

The other options should be self-explanitory from --help.

## Our Input (the Meedan-Check format)

For now, this software only understands the data export from
[Check](https://meedan.com/en/check/). It shouldn't be too hard to
adapt it to similar formats like SurveyMonkey's output, if the need
arises.

This format is CSV (or XLSX, see below) with one row per article
considered by the user.  The row starts with several fields about the
study being done, the user, and the article being considered.  For each question answered, there is a set of five adjacent columns (task_question_N, task_user_N, task_date_N, task_answer_N, task_note_N), so for 20 signals we'll have 100 "task" columns.

Examples:
* <https://data.world/credibilitycoalition/basic-november2018> (one xlsx file with 8 sheets)
* <https://data.world/credibilitycoalition/webconf-2018/> (three csv files)

On debian-derived Linux, the multi-sheet xlsx files (like nov2018) can
be converted to csv like this:

```terminal
$ sudo apt install gnumeric
$ ssconvert -S credibility-coalition-study-3a-batch1.xlsx basicnov2018.csv
```

That will write basicnov2018.csv.0, basicnov2018.csv.1, etc.

These two converted datasets are also available in this repo under /sample/

## Our Output

See [Mapping Credibility Signal Questionnaire Data to RDF](https://sandhawke.github.io/csig-import-meedancheck/about-the-schema.html).

[npm-image]: https://img.shields.io/npm/v/csig-import-meedancheck.svg?style=flat-square
[npm-url]: https://npmjs.org/package/csig-import-meedancheck


