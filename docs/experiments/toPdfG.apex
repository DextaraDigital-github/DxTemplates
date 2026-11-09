// Experiment G: which image sources does Blob.toPdf accept? (placeholder = grey 48x48 broken image)
ContentVersion cv = [SELECT Id, ContentDocumentId, Title FROM ContentVersion WHERE FileType IN ('PNG', 'JPG') AND IsLatest = true LIMIT 1];
ContentDistribution cd = new ContentDistribution(Name = 'ZZ toPdf experiment', ContentVersionId = cv.Id, PreferencesAllowViewInBrowser = true, PreferencesLinkLatestVersion = true, PreferencesNotifyOnVisit = false, PreferencesAllowOriginalDownload = true);
insert cd;
cd = [SELECT DistributionPublicUrl, ContentDownloadUrl FROM ContentDistribution WHERE Id = :cd.Id];
System.debug('FILE ' + cv.Title + ' dl=' + cd.ContentDownloadUrl);
String body = '<p>1 salesforce public download url</p><img src="' + cd.ContentDownloadUrl.replace('&', '&amp;') + '" width="80" height="60"/>'
  + '<p>2 shepherd relative (needs session)</p><img src="/sfc/servlet.shepherd/version/download/' + cv.Id + '" width="80" height="60"/>'
  + '<p>3 w3.org png</p><img src="https://www.w3.org/Icons/w3c_home.png" width="72" height="48"/>'
  + '<p>4 wikipedia png</p><img src="https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png" width="80" height="60"/>';
Blob pdf = Blob.toPdf('<html><head><style>@page { size: A4; margin: 40px; }</style></head><body>' + body + '</body></html>');
String b64 = EncodingUtil.base64Encode(pdf);
for (Integer i = 0; i * 12000 < b64.length(); i++) { System.debug('PDFB64 ' + i + ' ' + b64.substring(i * 12000, Math.min(b64.length(), (i + 1) * 12000))); }
