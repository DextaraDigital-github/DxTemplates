// Heavy-data test handler: 300 line items, long text with special characters, for the "ZZ Heavy Combined" template.
public with sharing class ZZHeavyHandlerBig implements DxCPQ.DXHandlerInterface {
    public Map<String, Object> execute(Map<String, Object> input) {
        Map<String, Object> output = new Map<String, Object>();
        List<Object> lines = new List<Object>();
        for (Integer i = 1; i <= 12000; i++) {
            lines.add(new Map<String, Object>{
                'No' => String.valueOf(i),
                'Product' => 'Product ' + i + ' <special> & "quoted" ' + (Math.mod(i, 7) == 0 ? 'with a much longer description that has to wrap inside the cell without breaking the table layout' : ''),
                'Qty' => String.valueOf(Math.mod(i, 9) + 1),
                'Price' => '$' + String.valueOf(i * 3 + 0.5)
            });
        }
        output.put('Lines', lines);
        output.put('Headline', 'Heavy run for ' + lines.size() + ' lines');
        return output;
    }
}
