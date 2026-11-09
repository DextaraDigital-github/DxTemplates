// Experiment: server-side PDF for the browser preview. The designer would send the model, the server returns the real PDF.
public with sharing class ZZPdfPreview {
    @AuraEnabled
    public static Map<String, Object> renderPdf(String html) {
        Long started = System.currentTimeMillis();
        Blob pdf = Blob.toPdf(html);
        return new Map<String, Object>{ 'pdf' => EncodingUtil.base64Encode(pdf), 'bytes' => pdf.size(), 'serverMs' => System.currentTimeMillis() - started };
    }
}
