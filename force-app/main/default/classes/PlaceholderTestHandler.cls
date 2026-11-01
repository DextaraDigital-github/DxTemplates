// A handler class for tests: what a customer's class does for the "Apex class" process type of a template, and for the chained
// generation (the class named in the custom metadata record DXTemplates_HandlerClass).
@IsTest
public class PlaceholderTestHandler implements DXHandlerInterface {
    public static Map<String, Object> lastInput;

    public Map<String, Object> execute(Map<String, Object> input) {
        lastInput = input;
        return new Map<String, Object>{ 'Greeting' => 'Hello from the class', 'Seen' => input == null ? 'no input' : String.valueOf(input.get('recordId')) };
    }
}
