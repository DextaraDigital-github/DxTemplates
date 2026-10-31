import { evaluateVisibility } from '../visibilityRules';

// What the designer saves: a rule expression such as "Condition1 && (Condition2 || Condition3)" and one record per
// condition (Name, field API name, operator, value as text).
const cond = (Name, field, op, value) => ({
    Name,
    DxCPQ__Condition_Field__c: field,
    DxCPQ__Operator__c: op,
    DxCPQ__Value__c: value
});

describe('evaluateVisibility', () => {
    const record = { Type: 'Customer - Direct', Industry: 'Technology', AnnualRevenue: 5000000, NumberOfEmployees: 10, IsPartner: true, Description: null };

    it('shows a section when the single condition matches, hides it when it does not', () => {
        const c = [cond('Condition1', 'type', '==', 'Customer - Direct')];
        expect(evaluateVisibility('Condition1', c, record)).toBe(true);
        expect(evaluateVisibility('Condition1', c, { ...record, Type: 'Prospect' })).toBe(false);
    });

    // Before: every condition had to hold, whatever the operator between them.
    it('shows the section when either side of an OR holds', () => {
        const c = [cond('Condition1', 'type', '==', 'Prospect'), cond('Condition2', 'industry', '==', 'Technology')];
        expect(evaluateVisibility('Condition1 || Condition2', c, record)).toBe(true);
        expect(evaluateVisibility('Condition1 && Condition2', c, record)).toBe(false);
    });

    it('lets AND bind tighter than OR', () => {
        const c = [cond('Condition1', 'industry', '==', 'Technology'), cond('Condition2', 'type', '==', 'Prospect'), cond('Condition3', 'type', '==', 'Prospect')];
        // true || (false && false) => true; (true || false) && false would be false
        expect(evaluateVisibility('Condition1 || Condition2 && Condition3', c, record)).toBe(true);
    });

    it('honours parentheses', () => {
        const c = [cond('Condition1', 'industry', '==', 'Technology'), cond('Condition2', 'type', '==', 'Prospect'), cond('Condition3', 'type', '==', 'Prospect')];
        expect(evaluateVisibility('(Condition1 || Condition2) && Condition3', c, record)).toBe(false);
        expect(evaluateVisibility('(Condition1 || Condition2) && Condition1', c, record)).toBe(true);
    });

    // Before: a number from the record never equalled the text from the rule, and "9" > "10" as text.
    it('compares numbers as numbers', () => {
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'annualrevenue', '==', '5000000')], record)).toBe(true);
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'numberofemployees', '>', '9')], record)).toBe(true);
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'numberofemployees', '<=', '9')], record)).toBe(false);
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'numberofemployees', '>=', '10')], record)).toBe(true);
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'numberofemployees', '<', '10')], record)).toBe(false);
    });

    it('compares checkboxes with true and false', () => {
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'ispartner', '==', 'true')], record)).toBe(true);
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'ispartner', '!=', 'true')], record)).toBe(false);
    });

    it('treats an empty field as an empty text', () => {
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'description', '!=', 'x')], record)).toBe(true);
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'description', '==', 'x')], record)).toBe(false);
    });

    it('finds the condition behind Condition10 and Condition1 separately', () => {
        const c = [cond('Condition1', 'type', '==', 'Prospect'), cond('Condition10', 'industry', '==', 'Technology')];
        expect(evaluateVisibility('Condition1 || Condition10', c, record)).toBe(true);
        expect(evaluateVisibility('Condition1 && Condition10', c, record)).toBe(false);
    });

    it('matches the field name whatever its case or punctuation', () => {
        expect(evaluateVisibility('Condition1', [cond('Condition1', 'Type', '==', 'Customer - Direct')], record)).toBe(true);
    });

    it('shows the section when the rule has no expression or no conditions', () => {
        expect(evaluateVisibility('', [], record)).toBe(true);
        expect(evaluateVisibility(undefined, undefined, record)).toBe(true);
        expect(evaluateVisibility('Condition1', [], record)).toBe(true);
    });
});
