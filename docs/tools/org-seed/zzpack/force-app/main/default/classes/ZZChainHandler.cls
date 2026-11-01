// Test handler for the chained generation (documentAutomationController, then the Queueable sendEmailAutomation, then the handler
// class named in the custom metadata record DXTemplates_HandlerClass "HandlerClass"). It leaves a Task so that a run can be seen.
public with sharing class ZZChainHandler implements DxCPQ.DXHandlerInterface {
    public Map<String, Object> execute(Map<String, Object> input) {
        String keys = input == null ? 'NULL INPUT' : String.join(new List<String>(input.keySet()), ',');
        insert new Task(Subject = 'ZZ chain handler ran with: ' + keys, Status = 'Completed');
        return new Map<String, Object>();
    }
}
