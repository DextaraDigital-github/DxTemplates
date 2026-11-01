// A handler class for tests whose output is larger than the field that keeps a copy of it (Document__c.Token_Data__c, 131,072 characters).
@IsTest
public class PlaceholderBigHandler implements DXHandlerInterface {
    public Map<String, Object> execute(Map<String, Object> input) {
        List<Object> lines = new List<Object>();
        for (Integer i = 1; i <= 3000; i++) { lines.add(new Map<String, Object>{ 'Product' => 'Product number ' + i + ' with some description', 'Qty' => String.valueOf(i) }); }
        return new Map<String, Object>{ 'Lines' => lines };
    }
}
