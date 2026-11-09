// Experiment: does Blob.toPdf resolve a relative Salesforce file URL when it runs asynchronously (no browser session)?
public with sharing class ZZToPdfProbe implements Queueable {
    private Id versionId; private Id parentId; private String name;
    public ZZToPdfProbe(Id versionId, Id parentId, String name) { this.versionId = versionId; this.parentId = parentId; this.name = name; }
    public void execute(QueueableContext context) {
        String html = '<html><head><style>@page { size: A4; margin: 40px; }</style></head><body><p>async probe</p>'
            + '<img src="/sfc/servlet.shepherd/version/download/' + versionId + '" width="80" height="60"/></body></html>';
        insert new Attachment(ParentId = parentId, Name = name, Body = Blob.toPdf(html));
    }
}
