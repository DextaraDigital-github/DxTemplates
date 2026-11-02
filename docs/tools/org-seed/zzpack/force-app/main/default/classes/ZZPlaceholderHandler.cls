// Test handler for the DxTemplates "Apex class" process type. It plays the role of a customer's class: it implements the package's
// global interface by its qualified name, so the same file deploys into the dev scratch org (namespace DxCPQ) and into a
// subscriber org that has the package installed.
global with sharing class ZZPlaceholderHandler implements DxCPQ.DXHandlerInterface {
    global Map<String, Object> execute(Map<String, Object> input) {
        Map<String, Object> output = new Map<String, Object>();
        String name = 'Datamatics';
        if (input != null && input.get('recordId') != null) {
            List<Account> accounts = [SELECT Name FROM Account WHERE Id = :String.valueOf(input.get('recordId'))];
            if (!accounts.isEmpty()) { name = accounts[0].Name; }
        }
        output.put('CustomerName', name + ' & Co');                       // the & checks that text is made safe for the PDF page
        output.put('Total', '$1,200.50');                                  // the $ checks that money survives
        output.put('Customer', new Map<String, Object>{ 'Name' => name, 'City' => 'Pune' });
        List<Object> items = new List<Object>();
        for (Integer i = 1; i <= 3; i++) {
            items.add(new Map<String, Object>{ 'Product' => 'Item ' + i, 'Qty' => String.valueOf(i * 2), 'Price' => '$' + (i * 5) + '.00' });
        }
        output.put('Items', items);
        return output;
    }
}
