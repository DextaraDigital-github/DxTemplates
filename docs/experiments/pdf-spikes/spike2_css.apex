// SPIKE 2: which CSS does Blob.toPdf honour beyond CSS 2.1 basics? One A4 page per feature (label on the first line, the feature below it).
// The PDF is stored as Attachment 'spike2 css.pdf' on the Account; analyze_css.mjs reads the drawing operations of every page and compares them with the control page.
Id acc = '001RL00003CoThZYAV';
String img = '/sfc/servlet.shepherd/version/download/068RL00000OXEmMYAX';  // a PNG File in the dev org (the Apex-drawn chart of an earlier experiment)
String box = 'width:200px; height:80px; background-color:#3366cc; color:#ffffff; ';
List<List<String>> f = new List<List<String>>{
  new List<String>{ '01 control: plain box with border', '<div style="' + box + 'border:2px solid #000000;">control</div>' },
  new List<String>{ '02 border-radius', '<div style="' + box + 'border-radius:20px;">radius</div>' },
  new List<String>{ '03 opacity', '<div style="' + box + 'opacity:0.3;">opacity</div>' },
  new List<String>{ '04 rgba background', '<div style="width:200px; height:80px; background-color:rgba(255,0,0,0.3);">rgba</div>' },
  new List<String>{ '05 linear-gradient', '<div style="width:200px; height:80px; background:linear-gradient(#ff0000,#0000ff);">gradient</div>' },
  new List<String>{ '06 box-shadow', '<div style="' + box + 'box-shadow:8px 8px 6px #888888;">shadow</div>' },
  new List<String>{ '07 text-shadow', '<div style="font-size:30px; text-shadow:3px 3px 2px #888888;">shadow text</div>' },
  new List<String>{ '08 transform rotate', '<div style="' + box + 'transform:rotate(15deg);">rotate</div>' },
  new List<String>{ '09 background image (File) no-repeat', '<div style="width:200px; height:100px; background-image:url(' + img + '); background-repeat:no-repeat;">bg image</div>' },
  new List<String>{ '10 background-size', '<div style="width:200px; height:100px; background-image:url(' + img + '); background-repeat:no-repeat; background-size:50px 25px;">bg size</div>' },
  new List<String>{ '11 border styles dashed dotted double', '<div style="border:3px dashed #000; width:150px; margin:6px;">dashed</div><div style="border:3px dotted #000; width:150px; margin:6px;">dotted</div><div style="border:6px double #000; width:150px; margin:6px;">double</div>' },
  new List<String>{ '12 float two columns', '<div style="float:left; width:200px; background:#ccccff;">left float</div><div style="float:left; width:200px; background:#ffcccc;">right float</div><div style="clear:both;"></div>' },
  new List<String>{ '13 inline-block', '<div><span style="display:inline-block; width:120px; height:40px; background:#ccccff;">ib 1</span><span style="display:inline-block; width:120px; height:40px; background:#ffcccc;">ib 2</span></div>' },
  new List<String>{ '14 position absolute', '<div style="position:relative; width:300px; height:120px; background:#eeeeee;"><div style="position:absolute; right:10px; bottom:10px; width:80px; height:30px; background:#3366cc;">abs</div></div>' },
  new List<String>{ '15 overflow hidden', '<div style="width:120px; height:20px; overflow:hidden; background:#eeeeee;">this text is much longer than the box and should be clipped at the right edge of it</div>' },
  new List<String>{ '16 text-decoration, letter-spacing, transform', '<div style="text-decoration:underline; letter-spacing:4px; text-transform:uppercase;">underlined spaced upper</div><div style="text-decoration:line-through;">strike through</div>' },
  new List<String>{ '17 display:table / table-cell divs', '<div style="display:table; width:300px;"><div style="display:table-cell; background:#ccccff; width:100px;">cell 1</div><div style="display:table-cell; background:#ffcccc;">cell 2</div></div>' },
  new List<String>{ '18 nth-child / first-child selectors', '<table width="200"><tr class="x"><td>row 1</td></tr><tr class="x"><td>row 2</td></tr><tr class="x"><td>row 3</td></tr></table>', 'tr.x:nth-child(even) td { background:#ffdddd; } tr.x:first-child td { font-weight:bold; }' },
  new List<String>{ '19 pseudo-element before/after content', '<div class="pe">text</div>', '.pe:before { content:"[before] "; } .pe:after { content:" [after]"; }' },
  new List<String>{ '20 box-sizing border-box', '<div style="box-sizing:border-box; width:200px; padding:20px; border:5px solid #000; background:#eeeeee;">border-box 200px</div><div style="width:200px; background:#cccccc; margin-top:4px;">reference 200px</div>' },
  new List<String>{ '21 calc() and rem units', '<div style="width:calc(100px + 100px); background:#ccccff; font-size:1.5rem;">calc width</div>' },
  new List<String>{ '22 flexbox', '<div style="display:flex;"><div style="background:#ccccff; width:100px;">flex 1</div><div style="background:#ffcccc; width:100px;">flex 2</div></div>' },
  new List<String>{ '23 css columns', '<div style="column-count:2;">one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen eighteen nineteen twenty</div>' },
  new List<String>{ '24 list-style roman', '<ol style="list-style-type:upper-roman;"><li>first</li><li>second</li></ol>' },
  new List<String>{ '25 text-align justify, text-indent, line-height', '<div style="width:200px; text-align:justify; text-indent:20px; line-height:2;">justified text that wraps over several lines so that the justification has something to do here</div>' },
  new List<String>{ '26 text-overflow ellipsis nowrap', '<div style="width:120px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">a very long single line text that will not fit</div>' },
  new List<String>{ '27 page-break-inside avoid', '<div style="page-break-inside:avoid; background:#dddddd;">avoid break block</div>' },
  new List<String>{ '28 border-collapse separate + border-spacing', '<table style="border-collapse:separate; border-spacing:10px;"><tr><td style="border:1px solid #000000;">a</td><td style="border:1px solid #000000;">b</td></tr></table>' },
  new List<String>{ '29 vertical-align middle in cell and hr', '<table style="height:80px;" border="1"><tr><td style="vertical-align:middle;">middle</td></tr></table><hr/>' },
  new List<String>{ '30 image with percent width and object-fit', '<img src="' + img + '" style="width:50%; height:60px; object-fit:contain;"/>' }
};
String extraCss = ''; for (List<String> row : f) { if (row.size() > 2) { extraCss += row[2] + ' '; } }
String html = '<html><head><style>@page { size: A4; margin: 40px; } body { font-family: Courier; font-size: 12px; } ' + extraCss + ' div.pg { page-break-after: always; } p.lbl { font-weight: bold; margin:0 0 10px 0; }</style></head><body>';
for (List<String> row : f) { html += '<div class="pg"><p class="lbl">' + row[0] + '</p>' + row[1] + '</div>'; }
html += '</body></html>';
Blob pdf = Blob.toPdf(html);
insert new Attachment(Name = 'spike2 css.pdf', ParentId = acc, Body = pdf);
System.debug('SPIKE2 ok features=' + f.size() + ' bytes=' + pdf.size());
