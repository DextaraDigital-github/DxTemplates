// PARITY PoC step 3a: download the attachments of step 2 ('vf *.pdf', 'toPdf *.pdf', 'html *.html') into a folder.
// Usage: SF_TOKEN=... SF_URL=https://<instance> node fetch_results.mjs <outDir>
//   (token and URL: sf org display --target-org <alias> --json -> result.accessToken / result.instanceUrl)
import fs from 'fs';
const [outDir] = process.argv.slice(2);
const { SF_TOKEN, SF_URL } = process.env;
fs.mkdirSync(outDir, { recursive: true });
const q = encodeURIComponent("SELECT Id, Name FROM Attachment WHERE (Name LIKE 'vf %' OR Name LIKE 'toPdf %' OR Name LIKE 'html %') AND CreatedDate = TODAY ORDER BY CreatedDate");
const res = await (await fetch(`${SF_URL}/services/data/v61.0/query?q=${q}`, { headers: { Authorization: `Bearer ${SF_TOKEN}` } })).json();
const newest = new Map(); // newest attachment per name (a template may have been rendered more than once)
for (const r of res.records) newest.set(r.Name, r.Id);
for (const [name, id] of newest) {
  const body = Buffer.from(await (await fetch(`${SF_URL}/services/data/v61.0/sobjects/Attachment/${id}/Body`, { headers: { Authorization: `Bearer ${SF_TOKEN}` } })).arrayBuffer());
  fs.writeFileSync(`${outDir}/${name.replace(/[^\w. ()-]/g, '_')}`, body);
}
console.log('downloaded', newest.size, 'files to', outDir);
