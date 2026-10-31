// Section visibility rules: decides, for one record, whether a rule saved by the designer holds.
// A rule is an expression over condition names ("Condition1 && (Condition2 || Condition3)") plus one record per
// condition (field API name, operator, value as text).

const normalise = text => String(text).replace(/[^a-zA-Z0-9]/g, '').toLowerCase();

function fieldValue(record, field) {
    const wanted = normalise(field);
    const key = Object.keys(record || {}).find(k => normalise(k) === wanted);
    const value = key === undefined ? undefined : record[key];
    return value === null || value === undefined ? '' : value;
}

const isNumeric = value => typeof value === 'number' || (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value)));

function compare(condition, record) {
    const left = fieldValue(record, condition.DxCPQ__Condition_Field__c);
    const right = condition.DxCPQ__Value__c === null || condition.DxCPQ__Value__c === undefined ? '' : String(condition.DxCPQ__Value__c);
    const numbers = isNumeric(left) && isNumeric(right);
    const a = numbers ? Number(left) : String(left);
    const b = numbers ? Number(right) : right;
    switch (condition.DxCPQ__Operator__c) {
        case '==': return a === b;
        case '!=': return a !== b;
        case '<': return a < b;
        case '<=': return a <= b;
        case '>': return a > b;
        case '>=': return a >= b;
        default: return true;
    }
}

// Recursive descent over: or := and ('||' and)* ; and := term ('&&' term)* ; term := '(' or ')' | condition name.
function evaluateExpression(expression, truth) {
    const tokens = expression.match(/\(|\)|&&|\|\||[^\s()&|]+/g) || [];
    let position = 0;
    const parseTerm = () => {
        const token = tokens[position++];
        if (token === '(') {
            const inner = parseOr();
            position++; // the closing parenthesis
            return inner;
        }
        return truth(token);
    };
    const parseAnd = () => {
        let result = parseTerm();
        while (tokens[position] === '&&') {
            position++;
            const next = parseTerm();
            result = result && next;
        }
        return result;
    };
    function parseOr() {
        let result = parseAnd();
        while (tokens[position] === '||') {
            position++;
            const next = parseAnd();
            result = result || next;
        }
        return result;
    }
    return parseOr();
}

export function evaluateVisibility(expression, conditions, record) {
    if (!expression || !expression.trim() || !conditions || conditions.length === 0) {
        return true;
    }
    const byName = {};
    conditions.forEach(condition => { byName[condition.Name] = condition; });
    // A name the rule does not know shows the section, as a rule without conditions does.
    return evaluateExpression(expression.replace(/"/g, ''), name => (byName[name] ? compare(byName[name], record) : true));
}
