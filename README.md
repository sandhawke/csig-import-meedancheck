# meedancheck-to-rdf
[![NPM version][npm-image]][npm-url]

Convert the CSV output from Meedan's 'check' software to RDF

## Usage

Command line:

```terminal
$ npx meedancheck-to-rdf sample/tiny.csv > out.nq
```

* base url?   (nquads can't be relative)
* name of sample?

## Our Input (the Meedan-Check format)

Very **wide** CSV files.  One row per session per use.  Each signal obtained from the user is recorded in a set of adjacent columns.

Examples:
* <https://data.world/credibilitycoalition/basic-november2018>
* <https://data.world/credibilitycoalition/webconf-2018/> (the CSVs)

The multi-sheet xlsx files (like nov2018) can be converted to csv like this:

```terminal
$ sudo apt install gnumeric
$ ssconvert -S credibility-coalition-study-3a-batch1.xlsx basicnov2018.csv
```

That will write basicnov2018.csv.0, basicnov2018.csv.1, etc.

## Our Output

** NOTES -- NOT Exactly what's implemented right now **

RDF, using one of two Credibility Signal data shapes.  Default
serialization is N-Quads, but others may be available.

### Output Shape 1 (Using Named Graphs)

```trig
_:observation
     cred:observerProfile ?observerProfileURL;
     dc:date ?timeStamp.
_:observation { ?item ?signal ?reading }
```

### Output Shape 2 (Using Custom Reification)

```turtle
_:observation
   cred:observerProfile ?observerProfileURL;
   dc:date ?timeStamp;
   cred:item ?item;
   cred:signal ?signal;
   cred:reading ?reading.
```

### Signal Schema

To support signal schemas that are both ad hoc and trustworthy, in
keeping with credibility industry challenges, we use "movable
schemas", where unique definition text is available to merge and
re-identify resources when URIs change, and also to document the
terms.

This means the software can make up the schema at runtime, using
Questions and Answers in the input data.

If you'd rather use some prior schema, you should provide a mapping
between the two, and we can do the conversion.

#### Schema Variation 1: `?reading` is always xsd:true

```turtle
?signal mov:propdef "Question: ${question}\nAnswer: ${answer}"
```

Pro:
* Very clear semantics
* Easy to extend to degrees of true/false or agree/disagree

Con:
* Many properties
* Doesn't work for fill-in-the-blank questions

#### Schema Variation 2: `?reading` is index into list of possible answers

```turtle
?signal mov:propdef `Question: ${question}
---
Value 1 for answer: ${opt1}
Value 2 for answer: ${opt2}
Value 3 for answer: ${opt3}
`
```

Pro:
* Very clear semantics

Con:
* Very long property definitions
* Perhaps misuse of numeric values.  Looks like an interval value, or at least ordinal, when it's really only nominal. 

#### Schema Variation 3: `?reading` is resource which represents one of the possible answers

```turtle
?signal mov:propdef "Question: ${question}"
?reading mov:itemdef "${answer}"
```




[npm-image]: https://img.shields.io/npm/v/meedancheck-to-rdf.svg?style=flat-square
[npm-url]: https://npmjs.org/package/meedancheck-to-rdf
