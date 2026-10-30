// Removes duplicate class-field declarations whose removal cannot change behaviour. Aborts on any mismatch.
const fs = require('fs');
const root = process.argv[2];
const plan = [
    ['templateContentDetails/templateContentDetails.js', [[50, 'showimages = false;'], [52, 'imagesfound = false;'], [117, '@track ruleCondition;']]],
    ['templateRelatedObjects/templateRelatedObjects.js', [[93, 'conditionsArr;'], [97, 'listOfExistingConditions = [];']]],
    ['templateTableDetails/templateTableDetails.js', [[79, 'draggedColumnIndex;']]]
];
for (const [file, edits] of plan) {
    const p = root + '/' + file;
    const raw = fs.readFileSync(p, 'utf8');
    const eol = raw.includes('\r\n') ? '\r\n' : '\n';
    const lines = raw.split(/\r?\n/);
    for (const [lineNo, expected] of edits) {
        if (lines[lineNo - 1].trim() !== expected) { console.error(`ABORT ${file}:${lineNo} is "${lines[lineNo - 1].trim()}", expected "${expected}"`); process.exit(1); }
    }
    // delete from the bottom so earlier line numbers stay valid
    for (const [lineNo] of [...edits].sort((a, b) => b[0] - a[0])) lines.splice(lineNo - 1, 1);
    fs.writeFileSync(p, lines.join(eol));
    console.log(`${file}: removed ${edits.length}`);
}
