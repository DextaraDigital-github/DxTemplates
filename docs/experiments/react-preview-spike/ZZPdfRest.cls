// EXPERIMENT (spike for the canvas designer): turns HTML into a PDF on the server and returns the raw PDF bytes.
// A React UI bundle cannot call @AuraEnabled methods, only REST, so this is the Apex REST door the preview spike uses:
//   POST /services/apexrest/zzpdf   body {"html": "<html>...</html>"}   ->   application/pdf, header X-Server-Ms
// Not part of the managed package. See docs/roadmap/product-vision-and-architecture.md (section 5.6 and the preview spike).
@RestResource(urlMapping='/zzpdf')
global with sharing class ZZPdfRest {
    @HttpPost
    global static void render() {
        Long started = System.currentTimeMillis();
        RestResponse response = RestContext.response;
        try {
            Map<String, Object> body = (Map<String, Object>) JSON.deserializeUntyped(RestContext.request.requestBody.toString());
            Blob pdf = Blob.toPdf((String) body.get('html'));
            response.addHeader('Content-Type', 'application/pdf');
            response.addHeader('X-Server-Ms', String.valueOf(System.currentTimeMillis() - started));
            response.responseBody = pdf;
        } catch (Exception ex) {
            response.statusCode = 500;
            response.addHeader('Content-Type', 'text/plain');
            response.responseBody = Blob.valueOf(ex.getMessage());
        }
    }
}
