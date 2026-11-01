/**
 * Decides on the server whether a section is shown for a record, from its visibility rule (the rule's expression and conditions).
 * The Generate PDF screen decides this in the browser (lwc/dxShowSelectedTemplate/visibilityRules.js); generation that runs without
 * the browser (the Flow action, the API, the chained automation) uses this class. The two follow the same rules:
 *  - the expression combines condition names with && and ||, && binds tighter, parentheses group;
 *  - a number is compared as a number, a checkbox as true or false, an empty field as an empty text;
 *  - a rule without expression or without conditions shows the section.
 */
public with sharing class SectionVisibility {
    private static String normalise(String text) {
        return text == null ? '' : text.replaceAll('[^a-zA-Z0-9]', '').toLowerCase();
    }

    private static Object fieldValue(Map<String, Object> record, String field) {
        String wanted = normalise(field);
        for (String key : record.keySet()) {
            if (normalise(key) == wanted) {
                Object value = record.get(key);
                return value == null ? '' : value;
            }
        }
        return '';
    }

    private static Boolean isNumeric(Object value) {
        if (value instanceof Decimal || value instanceof Integer || value instanceof Long || value instanceof Double) { return true; }
        if (value instanceof String && String.isNotBlank((String) value)) {
            try { Decimal.valueOf(((String) value).trim()); return true; } catch (Exception e) { return false; }
        }
        return false;
    }

    private static Boolean compare(Rule_Condition__c condition, Map<String, Object> record) {
        Object left = fieldValue(record, condition.Condition_Field__c);
        String right = condition.Value__c == null ? '' : condition.Value__c;
        Boolean numbers = isNumeric(left) && isNumeric(right);
        Integer order;
        if (numbers) {
            Decimal a = Decimal.valueOf(String.valueOf(left).trim());
            Decimal b = Decimal.valueOf(right.trim());
            order = a < b ? -1 : (a > b ? 1 : 0);
        } else {
            order = String.valueOf(left).compareTo(right);
        }
        String operator = condition.Operator__c;
        if (operator == '==') { return order == 0; }
        if (operator == '!=') { return order != 0; }
        if (operator == '<') { return order < 0; }
        if (operator == '<=') { return order <= 0; }
        if (operator == '>') { return order > 0; }
        if (operator == '>=') { return order >= 0; }
        return true;
    }

    public static Boolean isVisible(String expression, List<Rule_Condition__c> conditions, Map<String, Object> record) {
        if (String.isBlank(expression) || conditions == null || conditions.isEmpty()) { return true; }
        Map<String, Rule_Condition__c> byName = new Map<String, Rule_Condition__c>();
        for (Rule_Condition__c condition : conditions) { byName.put(condition.Name, condition); }

        List<String> tokens = new List<String>();
        Matcher matcher = Pattern.compile('\\(|\\)|&&|\\|\\||[^\\s()&|]+').matcher(expression.replace('"', ''));
        while (matcher.find()) { tokens.add(matcher.group()); }

        Parser parser = new Parser(tokens, byName, record);
        return parser.parseOr();
    }

    // or := and ('||' and)* ; and := term ('&&' term)* ; term := '(' or ')' | condition name
    private class Parser {
        private List<String> tokens;
        private Map<String, Rule_Condition__c> conditions;
        private Map<String, Object> record;
        private Integer position = 0;

        Parser(List<String> tokens, Map<String, Rule_Condition__c> conditions, Map<String, Object> record) {
            this.tokens = tokens;
            this.conditions = conditions;
            this.record = record;
        }

        Boolean parseOr() {
            Boolean result = parseAnd();
            while (position < tokens.size() && tokens[position] == '||') {
                position++;
                Boolean next = parseAnd();
                result = result || next;
            }
            return result;
        }

        Boolean parseAnd() {
            Boolean result = parseTerm();
            while (position < tokens.size() && tokens[position] == '&&') {
                position++;
                Boolean next = parseTerm();
                result = result && next;
            }
            return result;
        }

        Boolean parseTerm() {
            if (position >= tokens.size()) { return true; }
            String token = tokens[position++];
            if (token == '(') {
                Boolean grouped = parseOr();
                position++;
                return grouped;
            }
            // a name the rule does not know shows the section, as a rule without conditions does
            return conditions.containsKey(token) ? compare(conditions.get(token), record) : true;
        }
    }
}
