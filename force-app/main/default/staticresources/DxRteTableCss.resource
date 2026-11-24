html { scroll-behavior:smooth;}

.dxqt * { scrollbar-width:thin; scrollbar-color:rgba(0,0,0,0.4) rgba(0,0,0,0.05); }
.dxqt *::-webkit-scrollbar { width:6px; height:6px; z-index:7; line-height:0; }
.dxqt *::-webkit-scrollbar-track { background:rgba(0,0,0,0.05); z-index:8; font-size:0; line-height:0; }
.dxqt *::-webkit-scrollbar-thumb { background:rgba(0,0,0,0.4); border-radius:5px; border:1px solid rgba(0,0,0,0.4); z-index:9; font-size:0; line-height:0; height:6px; }

@media screen, print {
    /*.dxqt table, .dxqt th, .dxqt td, .dxqt p { font-family:Arial,Helvetica,sans-serif !important; font-size:10px; }*/
    .dx-rte_toolbar .slds-color-picker__summary-input { display:none!important; }
    .btn_active .slds-button_icon-border-filled { background-color:#007CBA; color:white; }
    .dx-alignleft {text-align:left;}
    .dx-aligncenter {text-align:center;}
    .dx-alignright {text-align:right;}
    .dxqt table, .dxqt td, .dxqt th { border:1px solid #dddddd; padding:5px 3px; font-size:9px; }
    .dxqt table { width:100%; border-collapse:collapse; border-radius:3px; }
    .dxqt table tr th { background:#efefef; color:#333333e6; line-height:1.2rem; }
    .dxqt table tr td { background:#f8f8f8; }

    .dxqt table {position:relative;}
    .dxqt table tr td .slds-rich-text-editor,
    .dxqt table tr th .slds-rich-text-editor {
        position:relative; border:0px solid transparent!important; min-height:auto; border-radius:0px;
    }
    .dxqt table tr td .slds-rich-text-editor .slds-rich-text-editor__toolbar,
    .dxqt table tr th .slds-rich-text-editor .slds-rich-text-editor__toolbar {
        display:none; position:absolute; top:0px; z-index:-1; opacity:0; transition:all .3s;
    }
    .dxqt table tr td .slds-rich-text-editor__toolbar,
    .dxqt table tr th .slds-rich-text-editor__toolbar {
        padding:8px 8px 3px 8px;
        border-radius:3px;
        border-top-left-radius:3px;
        border-top-right-radius:3px;
        border:1px solid #bac5d3;
        border-bottom:1px solid #9fabbb;
        background-color:#e3e7ec;
        margin-left:-10px;
        box-shadow:0px 0px 3px rgba(0,0,0,0.3);
    }
    /*table tr td .slds-rich-text-editor:hover .slds-rich-text-editor__toolbar, */
    .dxqt table tr td .slds-rich-text-editor:focus .slds-rich-text-editor__toolbar,
    .dxqt table tr td .slds-rich-text-editor:focus-within .slds-rich-text-editor__toolbar,
    .dxqt table tr td .slds-rich-text-editor:active .slds-rich-text-editor__toolbar,
    .dxqt table tr td .slds-rich-text-editor:target .slds-rich-text-editor__toolbar,
    .dxqt table tr th .slds-rich-text-editor:focus .slds-rich-text-editor__toolbar,
    .dxqt table tr th .slds-rich-text-editor:focus-within .slds-rich-text-editor__toolbar,
    .dxqt table tr th .slds-rich-text-editor:active .slds-rich-text-editor__toolbar,
    .dxqt table tr th .slds-rich-text-editor:target .slds-rich-text-editor__toolbar {
        top:-49px; z-index:66; opacity:1; display:block; transition:all .3s;
    }
    .dxqt table tr td .slds-rich-text-editor__textarea .slds-rich-text-area__content,
    .dxqt table tr th .slds-rich-text-editor__textarea .slds-rich-text-area__content {
        border:0px solid transparent!important; background:transparent; overflow:hidden; resize:none; min-height:auto;
    }
    .dxqt table tr td .slds-rich-text-editor__textarea.editor,
    .dxqt table tr th .slds-rich-text-editor__textarea.editor {
        position:relative; top:0px; left:0px; width:100%; min-height:22px; line-height:21px;
    }
    .dxqt table tr td .slds-rich-text-editor__textarea,
    .dxqt table tr th .slds-rich-text-editor__textarea {
        position:absolute; top:0px; left:0px; width:100%; min-height:auto;
    }

    .dxqt table tr td .slds-rich-text-area__content,
    .dxqt table tr th .slds-rich-text-area__content {
        overflow-y:auto; min-height:30px; max-height:auto; padding:0px; background-color:transparent;
    }
        /* table tr td .slds-rich-text-editor__textarea.slds-grid.editor {position:absolute; top:1px;} */
}
body {
    counter-reset: section;
  }
.dx-step_count::before {
    counter-increment:section;
    content: "Step " counter(section) "";
    font-weight:600;
    color:var(--lwc-brandPrimaryActive);
  }

/* .maindiv {position:relative; width:100%; overflow:hidden;}
.maindiv .anchoredit {position:absolute; width:32px; height:22px; top:-25px;right:-25px; opacity:0;  border-radius:0px 3px 0px 5px; content:'Edit'; background:red; transition:all .3s; z-index:0; text-align:center; cursor:pointer; background:#ff1c1c url(icon_edit.svg) center no-repeat; background-size:contain;}
.maindiv:hover .anchoredit { top:1px; right:1px; opacity:1;   background:#c90a0a url(icon_edit.svg) center no-repeat; transition:all .3s; z-index:9;} */


@media screen, print { 
	body, table, input, select, textarea { }
	.dxqt table.graph { margin-bottom:1em; font:normal 100%/150% arial, helvetica, sans-serif; }
	.dxqt table.graph caption { font:bold 150%/120% arial, helvetica, sans-serif; padding-bottom:0.33em; }
	.dxqt table.graph tbody th { text-align:right; }
	.dxqt table.graph { display:block; width:600px; height:300px; }
	.dxqt table.graph caption { display:block; }
	.dxqt table.graph thead { display:none; }
	.dxqt table.graph tbody { position:relative; display:flex; /*grid-template-columns:repeat(auto-fit, minmax(2em, 1fr)); column-gap:2.5%;*/ align-items:end; height:100%; margin:3em 0 1em 2.8em; padding:0 1em; border-bottom:2px solid rgba(0,0,0,0.5); background:repeating-linear-gradient( 180deg, #cccccc 0, #cccccc 1px, transparent 1px, transparent 20% ); }
	.dxqt table.graph tbody:before, .dxqt table.graph tbody:after { position:absolute; left:-3.2em; width:2.8em; text-align:right; font:bold 80%/120% arial, helvetica, sans-serif; }
	.dxqt table.graph tbody:before { content:"100%"; top:-0.6em; }
	.dxqt table.graph tbody:after { content:"0%"; bottom:-0.6em; }
	.dxqt table.graph tr { /* position:relative; display:block; */ background: #F63;}
	.dxqt table.graph tr:hover { z-index:999; }
	.dxqt table.graph th, .dxqt table.graph td { display:table; text-align:center; }
	.dxqt table.graph tbody th { top:-3em; left:0; width:100%; font-weight:normal; text-align:center; white-space:nowrap; text-indent:0; transform:rotate(-45deg); }
	.dxqt table.graph tbody th:after { content:""; }
	.dxqt table.graph td { width:100%; height:100%; background:none; border:0px; border-radius:0.5em 0.5em 0 0; transition:background 0.5s; }
	.dxqt table.graph tr:hover td { opacity:0.7; }
	.dxqt table.graph td span { overflow:hidden; position:absolute; left:50%; top:50%; width:0; padding:0.5em 0; margin:-1em 0 0; font:normal 85%/120% arial, helvetica, sans-serif; 
		/*background:white;*/ /*box-shadow:0 0 0.25em rgba(0,0,0,0.6);*/ font-weight:bold; opacity:0; transition:opacity 0.5s; color:white; }
	.toggleGraph:checked + table.graph td span, .dxqt table.graph tr:hover td span { width:4em; margin-left:-2em; /* 1/2 the declared width */ opacity:1; }


	.chart_vbar { border:1px solid #666666; width:100%; height:300px; }
	.chart_vbar .innerbase {width:calc(100% - 20px); height:280px; margin:10px; padding:0px 5px 0px 5px; border-bottom:2px solid #666666;
		background: repeating-linear-gradient( 180deg, #cccccc 0, #cccccc 1px, transparent 1px, transparent 20% );
	 }
	/* hr.hline {size:1px; position:relative; width:100%; margin:0px 0px 9% 0px; } */
	.chart_vbar .innerbase tr { border-bottom:2px solid #666666; background: repeating-linear-gradient( 180deg, #cccccc 0, #cccccc 1px, transparent 1px, transparent 20% ); }
	.chart_vbar .itembase { width:auto; height:280px; padding:0px 5px 0px 5px; border:0px; background: transparent; text-align: center; margin: 3px auto; }
	.chart_vbar .itembase .itembar { width:100%; height:100%; border-radius: 3px 3px 0px 0px; background: #007CBA; bottom:0; }
	.chart_vbar .itembase .itemtitle { font-style: italic;font-size:8px; }
	.chart_vbar .itembase .itemvaluein { font-style: italic;font-size:8px; font-weight: bold; top:50%; left: 50%; transform: translate(-50% -50%); }
	.chart_vbar .itembase .itemvalueout { font-style: italic;font-size:8px; font-weight: bold; }


}

/* grid only */


.pdfbook { background: #f5f5f5; border-radius: 5px; border:1px solid #e5e5e5;}
.page {
    width: 21cm;
    min-height: 29.7cm;
    padding: 0.75cm;
    margin: 0.5cm auto;
    border: 1px solid #ffffff;
    border-radius: 5px;
    background: white;
    box-shadow: 0 0 5px rgba(0, 0, 0, 0.1);
    page-break-after: always;
}
.subpage {
    padding:0;
    border: 1px solid lightgray;
    /* height: 237mm;
    outline: 0.2cm solid #FFEAEA; */
    /* page-break-after: always; */
}
/* 
page {
    background: white;
    display: block;
    margin: 0 auto;
    margin-bottom: 0.5cm;
    box-shadow: 0 0 0.5cm rgba(0,0,0,0.5);
  }
page[size="A4"] {  
    width: 21cm;
    height: 29.7cm; 
    word-wrap: break-word;
    page-break-after: always;
  } 
  */
@page {
    size: A4;
    margin: 0;
}
@media print {
    .page {
        margin: 0;
        border: initial;
        border-radius: initial;
        width: initial;
        min-height: initial;
        box-shadow: initial;
        background: initial;
        height: 29.7cm;
        page-break-after: always;
    }
    page {
        height: 29.7cm;
    }
}

