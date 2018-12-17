# meedancheck-to-rdf
[![NPM version][npm-image]][npm-url]

Convert the CSV output from Meedan's 'check' software to RDF

**NOT REALLY IMPLEMENTED YET**

## Usage

Installation isn't needed if you have node.js installed.  Modern version of node.js include the *npx* command for executing any npmjs module, so you can just do this:

```terminal
$ npx [options] meedancheck-to-rdf yourdata.csv > out.nq  
```

### Options

* --name=NAME some of the conversions embed a name for this dataset

* --base in N-Quads, metadata needs to be written knowing the eventual permanent location of the data, which is essentially the base IRI

* --predicates=((tf|ag|mc)(o|a)|all)  See [Mapping Credibility Signal Questionnaire Data to RDF](https://sandhawke.github.io/meedancheck-to-rdf/about-the-schema.html)

* --meta=(ng | customrei | drei | irei | wikidata)  See [Mapping Credibility Signal Questionnaire Data to RDF](https://sandhawke.github.io/meedancheck-to-rdf/about-the-schema.html)

* --config=(spreadsheet url)  This config maps "task_question" strings to information about that question needed for some options:
    * Signal Label, should correspond exactly to Signals spec
    * Agreement Statement, a rephrasing of the question to have a generic agreement level as its answer (for aga and ago style predicates)
    * Allowed Answers, list of allowed answers, separated by newline or //

## Our Input (the Meedan-Check format)

Very **wide** CSV files.  One row per item considered per user.  Each signal obtained from the user about that item is recorded in a set of five adjacent columns (task_question_N, task_user_N, task_date_N, task_answer_N, task_note_N), so for 20 signals we'll have 100 "task" columns, plus some general stuff for the row.

Examples:
* <https://data.world/credibilitycoalition/basic-november2018> (one xlsx file with 8 sheets)
* <https://data.world/credibilitycoalition/webconf-2018/> (three csv files)

The multi-sheet xlsx files (like nov2018) can be converted to csv like this:

```terminal
$ sudo apt install gnumeric
$ ssconvert -S credibility-coalition-study-3a-batch1.xlsx basicnov2018.csv
```

That will write basicnov2018.csv.0, basicnov2018.csv.1, etc.

## Our Output

See [Mapping Credibility Signal Questionnaire Data to RDF](https://sandhawke.github.io/meedancheck-to-rdf/about-the-schema.html).

[npm-image]: https://img.shields.io/npm/v/meedancheck-to-rdf.svg?style=flat-square
[npm-url]: https://npmjs.org/package/meedancheck-to-rdf


