import { LightningElement, wire, api, track } from 'lwc';
import getsectionData from '@salesforce/apex/DisplayRelatedObjects.getsectionData';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import createLog from '@salesforce/apex/LogHandler.createLog';

export default class DisplayRelatedObjectsData extends LightningElement {

    @api parentrecordid;
    @api templatesectionid;
    @api index;
    @track showSpinner = true;
    recordDataFontFamily = 'Sans-Serif';

    showtablecontent = false;
    tableheaders = [];
    tablerows = [];
    tablefooter = [];
    subfooter = [];
    subtotalVal = [];
    grandTotalVals = [];
    subtotalLabel = [];
    chartList = [];
    grandTotal;
    showslno = false;
    slno = 1;
    selGraphvalue;
    className = 'tableMainClass';
    monthLstHalf = ["","Jan", "Feb", "Mar", "Apr", "May", "June","July", "Aug", "Sept", "Oct", "Nov", "Dec"];
    monthLstFull = ["","January", "February", "March", "April", "May", "June","July", "August", "September", "October", "November", "December"];
    currencySymbols = {"INR":"","USD":""};
    currencyLabel;
    currencyIndexCounter = [];

     // Chart Params
    chartLabel = 'Quote Chart';
    chartClass = 'page-break';
    dateFormatStr = '';
    timeFormatStr = '';
    numberFormat;
    currencyFormat;
    displayChart = false;
    HeadStyle = "border: 1px solid black; text-align: center";
    styleRowNum = 1;
    barChartColor;
   

    /**
     * In ConnectedCallback function, 
     */
    connectedCallback() {
        getsectionData({ recordid: this.parentrecordid, templatesectionid: this.templatesectionid })
            .then(result => {
                if (result != null) {
                    var parsedjson = JSON.parse(result);
                    this.showslno = parsedjson.showSlNo;
                    this.dateFormatStr = parsedjson.dateFormat;
                    this.timeFormatStr = parsedjson.timeFormat;
                    this.numberFormat = Number(parsedjson.numberFormat);
                    this.currencyFormat = Number(parsedjson.currencyFormat);
                    this.selGraphvalue = parsedjson.selGraphvalue;
                    this.chartLabel = parsedjson.chartLabel;
                    this.displayChart = parsedjson.displayChart;
                    this.barChartColor = parsedjson.barChartColor;
                    this.currencyLabel = "USD";
                    this.recordDataFontFamily = parsedjson.catFontFam;
                    
                    parsedjson.headers.forEach((element) => {
                        this.tableheaders.push(element);
                    });
                    if (this.showslno) {
                        this.tableheaders.unshift('Sl No');
                    }
                    this.HeadStyle = 'width:10px; border: 1px solid black ; background-color:' + parsedjson.headBgClr + ' ; color:' + parsedjson.headFontClr + '; font-size:' + parsedjson.headFontSize + '; font-family:' + parsedjson.headFontFam + '; text-align: center;';
                    parsedjson.rowWrapperList.forEach((element, index) => {
                        const rowData = new Object();
                        rowData.rownumber = 'row' + index;
                        if (element.type == "Record") {
                            rowData.rowType = 'Record';
                            var records = element.values;
                            if (this.showslno) {
                                records.unshift(this.slno);
                                this.slno = this.slno + 1;
                            }
                            var cellList = [];
                            for (let i in records) {
                                if (this.showslno == true && i % 2 == 0) {
                                    let cellData = this.handleCellCreation(records, i, index);
                                    cellList.push(cellData);
                                } else if (this.showslno == false && (i % 2) != 0) {
                                    let cellData = this.handleCellCreation(records, i, index);
                                    cellList.push(cellData);
                                }
                            }
                            rowData.columns = cellList;
                            this.tablerows.push(rowData);
                        } else if (element.type == "Category") {
                            rowData.rowType = 'Category';

                            var records = element.values;
                            var cellList = [];
                            const cellData = new Object();
                            this.slno = 1;
                            cellData.colspan = this.tableheaders.length;
                            cellData.value = records[0].toUpperCase();
                            cellData.width = 'auto';
                            cellData.style = 'border: 1px solid black ; background-color:' + parsedjson.catBgClr + ' ; color:' + parsedjson.catFontClr + '; font-size:'+ parsedjson.catFontSize + '; font-family:' + parsedjson.catFontFam + ';';
                            cellList.push(cellData);
                            rowData.columns = cellList;
                            this.tablerows.push(rowData);
                            this.subtotalLabel.push(cellData.value);
                        } else if (element.type == "Total" || element.type == "SubTotal") {
                            rowData.rowType = 'Totals';
                            var records = element.values;
                            this.subtotalVal.push(records);
                            var cellList = [];
                            var countEmpty = 0;
                            var span = 0;

                            for (let j = 0; j < this.tableheaders.length - 2; j++) {
                                if (records[j] == 'Empty') {
                                    countEmpty = j + 1;
                                }
                                if (records[j + 1] != 'Empty') {
                                    break;
                                }
                            }

                            if (this.showslno) {
                                span = countEmpty;
                                records.unshift('Empty');
                            }

                            if (element.type == 'Total') {
                                this.grandTotalVals = records;
                            }
                            var find = true;
                            for (let i = span; i < records.length; i++) {
                                const cellData = new Object();
                                cellData.colspan = 1;
                                if (records[i] == 'Empty') {
                                    if (find) {
                                        if (element.type == 'SubTotal') {
                                            cellData.value = 'Sub Total';
                                            cellData.style = `border: 1px solid black; background-color: #0077b6 ; color: white; border-right-style: none; font-size: 12px; font-family: ${this.recordDataFontFamily}`;
                                        } else {
                                            cellData.value = 'Grand Total';
                                            cellData.style = `border: 1px solid black; background-color:#03045e ; color: white; border-right-style: none; font-size: 12px; font-family: ${this.recordDataFontFamily}`;
                                        }
                                        cellData.colspan = span + 1;
                                        find = false;
                                        cellList.push(cellData);
                                        continue;
                                    }
                                    if (element.type == 'SubTotal') {
                                        cellData.value = '';
                                        cellData.style = 'border: 1px solid black; background-color: #0077b6 ; color: white; border-left-style: none; border-right-style: none;';
                                    } else {
                                        cellData.value = '';
                                        cellData.style = 'border: 1px solid black; background-color:#03045e ; color: white; border-left-style: none; border-right-style: none;';
                                    }
                                }  else {
                                    if (element.type == 'SubTotal') {
                                        if(this.currencyIndexCounter.includes(i)) {cellData.value = this.currencySymbols[this.currencyLabel] + '' + Number(records[i]).toFixed(this.currencyFormat);}
                                        else{cellData.value = Number(records[i]).toFixed(this.currencyFormat);}
                                        cellData.style = `border: 1px solid black; background-color: #0077b6 ; color: white; font-size: 12px; text-align: center; font-family: ${this.recordDataFontFamily}`;
                                    } else {
                                        if(this.currencyIndexCounter.includes(i)) {cellData.value = this.currencySymbols[this.currencyLabel] + '' + Number(records[i]).toFixed(this.currencyFormat);}
                                        else{cellData.value = Number(records[i]).toFixed(this.currencyFormat);}
                                        cellData.style = `border: 1px solid black; background-color:#03045e ; color: white; font-size: 12px; text-align: center; font-family: ${this.recordDataFontFamily}`;
                                    }
                                }
                                cellList.push(cellData);
                            }
                            rowData.columns = cellList;
                            this.tablerows.push(rowData);
                        }
                    });
                    this.showSpinner = false;
                    this.showtablecontent = true;

                    if (this.displayChart) {
                        if(!parsedjson.chartNewPage) { this.chartClass = 'no-page-break';}
                        this.handleChart();
                    }

                    if(parsedjson.newPage) {
                        setTimeout(()=> {this.className = 'newPagetableMainClass';});
                    }
                }
            })
            .catch(error => {
                console.log('error-', (error));
                this.showSpinner = false;               
                let tempError = error.toString();
                createLog({recordId:this.templatesectionid, className:'displayRelatedObjectsData LWC Component', exceptionMessage:error.message, LogData:tempError, logType:'Exception'})
                .then(result => {console.log('Log is generated');})
                .catch(error => {console.log('Log is not generated ' + JSON.stringify(error));})

                if (error.exceptionType == "System.NullPointerException" && error.message.includes('Cannot read values of null')) {
                    const errEvt = new ShowToastEvent({
                        title: 'Error',
                        message: 'Selected Product Data contains Null Values, PDF preview can\'t be generated. Please contact the System Administrator.',
                        variant: 'error',
                    });
                    this.dispatchEvent(errEvt);
                }
                else {
                    const errEvt = new ShowToastEvent({
                        title: 'Error',
                        message: error.message + '. The PDF preview can\'t be generated. Please contact the System Administrator.',
                        variant: 'error',
                    });
                    this.dispatchEvent(errEvt);
                }
            })      
    }


    handleCellCreation(records, i, index) {
        const cellData = new Object();
        cellData.attr = false;

        if ((records[i] + '').includes('servlet.shepherd/version/download/')) {
            cellData.value = records[i];
            cellData.style = 'border: 1px solid black; text-align: center; background-color:transparent;';
            cellData.imgcell = true;
            cellData.width = '100px';
        } else {
            if (records[i] == null) {
                cellData.value = '';
            } else if (records[i - 1] == 'DATETIME') {
                let dateList = records[i].split('T')[0].split('-');
                let timeStr = records[i].split('T')[1].split('.');
                cellData.value = this.handleDateTime(dateList, this.dateFormatStr, timeStr[0], this.timeFormatStr, -1);

            } else if (records[i - 1] == 'TIME') {
                let timeStr = records[i].split('T')[0].split('.');
                cellData.value = this.handleDateTime(null, null, timeStr[0], this.timeFormatStr, 1);
            } else if (records[i - 1] == 'DATE') {
                let dateList = records[i].split('T')[0].split('-');
                cellData.value = this.handleDateTime(dateList, this.dateFormatStr, null, null, 0);
            } else if (records[i - 1] == 'CURRENCY') {
                this.currencyIndexCounter.push(Math.floor(i/2));
                cellData.value = this.currencySymbols[this.currencyLabel]+ '' + Number(records[i]).toFixed(this.currencyFormat);
            } else if (records[i - 1] == 'NUMBER') {
                cellData.value = Number(records[i]).toFixed(this.numberFormat);
            } else { 
                cellData.value = records[i]; 
            }
            cellData.style = (index%2 == 0) ? `border: 1px solid black; text-align: center; background-color:transparent;font-family:${this.recordDataFontFamily}` : `border: 1px solid black; text-align: center; background-color:#d9d9d9; font-family:${this.recordDataFontFamily}`;                                    
            cellData.imgcell = false;
            if (records[i - 1] == 'CURRENCY' || records[i - 1] == 'NUMBER' || records[i - 1] == 'BOOLEAN') {
                cellData.width = '30px';
            }
            else if (records[i - 1] == 'ID') {
                cellData.width = '60px';
            }
            else {
                cellData.width = '100px';
            }
        }
        return cellData;
    }

    /**
     * handleChart(): In the following function, we are creating a data for the chart to display on UI
     */
    handleChart() {
        let index = this.tableheaders.indexOf(this.selGraphvalue);
        for (let i = 0; i < this.subtotalLabel.length; i++) {
            let percent = (Number(this.subtotalVal[i][index]) / this.grandTotalVals[index]) * 100;
            let chartVal = { 'label': this.subtotalLabel[i], 'percent': Math.round(percent, 2) + '%', 'height': 'height :' + Number(Number(Math.round(percent, 2)) + Number(6)) + `%; background : ${this.barChartColor}`, 'width': 'width : ' + (95) / this.subtotalLabel.length + '%;', 'value': Math.round(Number(this.subtotalVal[i][index])) };
            this.chartList.push(chartVal);
        }
    }

    /**
     * handleDateTime takes the following paremters:
     *  1. dateList : This dateList is the obtained after splitting the date values (for example: 2023-08-11 will be converted into a list [2023,08,11]). However, the order may change based on the input parameter and also other factors like dateFormatStr
     *  2. dateFormatStr : This is a String which specifies the format of the date at the final step (for exmaple: 01/08/2023 or 01-08-2023)
     *  3. timeStr : This is a list containing Time values (for example: 04:52:08.000+0000 will be converted to a list [04:52:08,000+0000])
     *  4. timeFormatStr : This string specifies the format of the time in the output text (for example: HH:MM:SS or HH:MM)
     *  5. valKey : value  = -1
     */
    handleDateTime(dateList, dateFormatStr, timeStr, timeFormatStr, valKey) {
        if (dateList != null && dateFormatStr != null) {
            var dateIndex = [];
            var dateFormatted = '';
            var timeFormatted = '';
            var time;

            if(dateFormatStr.includes('*')){
                var numDateFormat = Number(dateFormatStr.substring(0, dateFormatStr.length - 2));
                var dateFormatSep = dateFormatStr.charAt(dateFormatStr.length - 2);
            }
            else{
                var numDateFormat = Number(dateFormatStr.substring(0, dateFormatStr.length - 1));
                var dateFormatSep = dateFormatStr.charAt(dateFormatStr.length - 1);
            }  

            while (numDateFormat > 0) {
                let rem = Number(numDateFormat % 10);
                if ((Number(rem - 4)) < 0) {
                    dateIndex.unshift(0);
                }
                else {
                    let key = Number(rem) - 4;
                    dateIndex.unshift(key);
                }
                numDateFormat = Math.floor(Number(numDateFormat) / 10);
            }

            if (dateFormatStr.includes('4') && !dateFormatStr.includes('*')) {
                dateFormatted = dateList[dateIndex[0]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[2]];
            }
            else if (dateFormatStr.includes('2') && !dateFormatStr.includes('*')) {
                dateFormatted = dateList[dateIndex[0]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[2]].substring(2);
            }
            else if (dateFormatStr.includes('4') && dateFormatStr.includes('*')) {
                let mnthIndex = dateIndex.indexOf(1);
                dateList[dateIndex[mnthIndex]] = this.monthLstHalf[Number(dateList[1])];
                dateFormatted = dateList[dateIndex[0]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[2]];
            }
            else if (dateFormatStr.includes('2') && dateFormatStr.includes('*')) {
                    let mnthIndex = dateIndex.indexOf(1);
                    dateList[dateIndex[mnthIndex]] = this.monthLstHalf[Number(dateList[1])];
               dateFormatted = dateList[dateIndex[0]] + dateFormatSep + dateList[dateIndex[1]] + dateFormatSep + dateList[dateIndex[2]].substring(2);
            }
        }

        if (timeStr != null && timeFormatStr != null) {
            if (timeFormatStr.includes('4')) {

                time = String(timeStr).split(':');
                let hr = Number(String(timeStr).split(':')[0]);

                if (hr <= 12) {
                    if (timeFormatStr.includes('3'))
                        timeFormatted = timeStr + ' AM';
                    else
                        timeFormatted = time[0] + ':' + time[1] + ' AM';
                }
                else {

                    if (timeFormatStr.includes('3'))
                        timeFormatted = (Number(String(timeStr).split(':')[0])-12) + ':' + String(timeStr).split(':')[1] + ':' + String(timeStr).split(':')[2] + ' PM';
                    else
                        timeFormatted = (Number(String(timeStr).split(':')[0])-12) + ':' + String(timeStr).split(':')[1]  + ' PM';
                }
            }
            else {
                if (timeFormatStr.includes('3'))
                    timeFormatted = timeStr;
                else
                    timeFormatted = String(timeStr).split(':')[0] + ':' + String(timeStr).split(':')[1];
            }
        }

        if (valKey == 0) {
            return dateFormatted + ' ' + timeFormatted;
        }
        else if (valKey < 0) {
            return dateFormatted;
        }
        else if (valKey > 0) {
            return timeFormatted;
        }
    }

    renderedCallback() {
        let elementDiv = this.template.querySelector(`[data-id="${this.index}"]`);
        if (elementDiv) {
            const childContent = new CustomEvent('childcontent', { detail: { content: elementDiv, index: this.index } });
            this.dispatchEvent(childContent);
            this.dispatchEvent(new CustomEvent('showgenerate', { bubbles: true , composed : true, detail: 'loaded' }));
        }
    }
}