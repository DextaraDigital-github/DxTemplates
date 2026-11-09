// Proof of concept: a bar chart PNG drawn by Apex alone (indexed colour, stored deflate), embedded into Blob.toPdf as a data URI.
Long[] crcTable = new Long[256];
for (Integer n = 0; n < 256; n++) { Long c = n; for (Integer k = 0; k < 8; k++) { c = ((c & 1) == 1) ? (3988292384L ^ (c >>> 1)) : (c >>> 1); } crcTable[n] = c; }

String hex8(Long v) { String h = EncodingUtil.convertToHex(Blob.valueOf('')); return ''; }
String toHex(Long v, Integer bytes) {
    String out = '';
    for (Integer i = bytes - 1; i >= 0; i--) { Integer b = (Integer) ((v >>> (8 * i)) & 255); out += ('0123456789abcdef'.substring(b >>> 4, (b >>> 4) + 1)) + ('0123456789abcdef'.substring(b & 15, (b & 15) + 1)); }
    return out;
}
Long crcOf(List<Integer> bytes) {
    Long crc = 4294967295L;
    for (Integer b : bytes) { crc = crcTable[(Integer) ((crc ^ b) & 255)] ^ (crc >>> 8); }
    return crc ^ 4294967295L;
}
List<Integer> hexToBytes(String hex) {
    List<Integer> r = new List<Integer>();
    for (Integer i = 0; i < hex.length(); i += 2) { r.add(Integer.valueOf(Decimal.valueOf(0))); }
    return r;
}
String chunk(String type, String dataHex) {
    // crc over type + data: compute from bytes
    Blob b = EncodingUtil.convertFromHex(EncodingUtil.convertToHex(Blob.valueOf(type)) + dataHex);
    String all = EncodingUtil.convertToHex(b);
    List<Integer> bytes = new List<Integer>();
    for (Integer i = 0; i < all.length(); i += 2) { bytes.add(hexVal(all.substring(i, i + 2))); }
    return toHex(dataHex.length() / 2, 4) + EncodingUtil.convertToHex(Blob.valueOf(type)) + dataHex + toHex(crcOf(bytes), 4);
}
Integer hexVal(String two) { return ('0123456789abcdef'.indexOf(two.substring(0, 1)) * 16) + '0123456789abcdef'.indexOf(two.substring(1, 2)); }

Integer W = 400; Integer H = 200; Integer base = 180;
Integer[] heights = new Integer[]{ 40, 90, 60, 150, 120 };
Integer[] colours = new Integer[]{ 2, 3, 4, 2, 5 };
Integer c0 = Limits.getCpuTime();
// raw scanlines as bytes (filter 0 + palette indexes), built from runs
List<Integer> raw = new List<Integer>();
for (Integer y = 0; y < H; y++) {
    raw.add(0);
    for (Integer x = 0; x < W; x++) {
        Integer colour = 0;
        if (y >= base && y < base + 2) { colour = 1; }
        else if (x >= 35 && x < 37 && y < base) { colour = 1; }
        else {
            for (Integer i = 0; i < heights.size(); i++) { Integer x0 = 50 + i * 70; if (x >= x0 && x < x0 + 50 && y >= base - heights[i] && y < base) { colour = colours[i]; } }
        }
        raw.add(colour);
    }
}
// zlib: header + stored blocks + adler32
Long a = 1; Long b2 = 0;
String z = '7801';
Integer pos = 0;
while (pos < raw.size()) {
    Integer len = Math.min(65535, raw.size() - pos);
    Boolean last = (pos + len >= raw.size());
    z += (last ? '01' : '00') + toHex(len & 255, 1) + toHex((len >>> 8) & 255, 1) + toHex((~len) & 255, 1) + toHex(((~len) >>> 8) & 255, 1);
    List<String> hexParts = new List<String>();
    for (Integer i = pos; i < pos + len; i++) { Integer v = raw[i]; a = Math.mod(a + v, 65521); b2 = Math.mod(b2 + a, 65521); hexParts.add(v == 0 ? '00' : toHex(v, 1)); }
    z += String.join(hexParts, '');
    pos += len;
}
z += toHex((b2 << 16) | a, 4);
String palette = 'ffffff' + '888888' + '007cba' + 'cc0000' + 'ffcc00' + '2e844a';
String png = '89504e470d0a1a0a' + chunk('IHDR', toHex(W, 4) + toHex(H, 4) + '0803000000') + chunk('PLTE', palette) + chunk('IDAT', z) + chunk('IEND', '');
Blob pngBlob = EncodingUtil.convertFromHex(png);
Integer cpuPng = Limits.getCpuTime() - c0;
String html = '<html><head><style>@page { size: A4; margin: 40px; }</style></head><body><p>Bar chart drawn by Apex:</p><img src="data:image/png;base64,' + EncodingUtil.base64Encode(pngBlob) + '" width="400" height="200"/><p>after chart</p></body></html>';
Blob pdf = Blob.toPdf(html);
System.debug('POC png bytes ' + pngBlob.size() + ' cpu for png ' + cpuPng + ' total cpu ' + (Limits.getCpuTime() - c0) + ' pdf ' + pdf.size());
String b64 = EncodingUtil.base64Encode(pdf);
Integer size = 12000; Integer n = (Integer) Math.ceil(b64.length() / (Decimal) size);
for (Integer i = 0; i < n; i++) { System.debug('PDFB64 ' + i + ' ' + b64.substring(i * size, Math.min(b64.length(), (i + 1) * size))); }
