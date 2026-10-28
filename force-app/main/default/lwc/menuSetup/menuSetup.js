import { LightningElement, track, api } from 'lwc';



export default class DxCpqMenuSetup extends LightningElement {
    @api gridData;
    @api placeholderText;
    @track gridDataSet;
    @track listArr;
    @track returnedRecords = [];
    mapOfParentToChild;
    mapOfIndexToRow;
    selectedRecordId;
    selectedRecordExpanded;
    subscription = null;
    @track globalSelectedIndex = 0;
    @track masterData;
    @api isTemplate;
    @api isSaved;

    @api templateValue;
    @api relatedTypeOptionData;
    @api filterSelection;


    connectedCallback() {
        this.passOn(); 
    }

    //Changes by Kapil - Fix for Sobj Filtering
    handleFilterSelection(event) {
        
        this.templateValue = event.detail.value;
            const filterObjectEvt = new CustomEvent('filteredvalue', {
            detail: { value: this.templateValue }, bubbles: true
            });
            this.dispatchEvent(filterObjectEvt);
    }
    

    @api 
    passOn(event) {
        this.mapOfParentToChild = new Map();
        this.mapOfIndexToRow = new Map();
        this.searchFilters = new Map();
        this.listArr = [];
        this.gridDataSet = [];
        if (event === 'undefined' || event == null) {
            this.gridDataSet = JSON.parse(JSON.stringify(this.gridData));
        } else {
            this.gridDataSet = JSON.parse(JSON.stringify(event));
        }
        this.getTreeRow(this.gridDataSet);
        this.masterData = this.gridDataSet;
        this.gridData = [...this.gridDataSet];
    }

    getTreeRow(treeWrapper) {
        if (treeWrapper && treeWrapper instanceof Array) {
            let index = 0;
            let first = true;
            treeWrapper.forEach(obj => {
                obj.label = obj.label ? obj.label : obj.Name;
                obj._index = "" + index;
                index++;
                obj.isVisible = true;
                obj.isExpanded = obj.isExpanded ? obj.isExpanded : false;
                if (first) { 
                    obj.selected = 'active';
                    first = false;
                } else { 
                    obj.selected = '';
                }
                obj.ukey = (new Date()).getTime() + "" + index;
                if (obj.groupChildren) {
                    obj._children = obj._children != undefined ? obj._children : [];
                }
                this.mapOfIndexToRow.set(obj._index, obj);
                this.recursiveChild(obj);
            });
        }
    }

    @api getRowWrapper() {
        let listOfArrToBeSelected = this.getDataWrapperRow(this.gridDataSet);
        return listOfArrToBeSelected;
    }

    getDataWrapperRow(gridHierarchy) {
        let selectedArr = [];
        if (gridHierarchy) {
            if (gridHierarchy instanceof Array) {
                gridHierarchy.forEach(row => {
                    if (row._children && row._children.length > 0) {
                        let chldRows = this.getDataWrapperRow(row._children);
                        selectedArr.push(row);
                        selectedArr.push(...chldRows);
                    } else {
                        selectedArr.push(row);
                    }
                });
            } else {
                selectedArr.push(gridHierarchy);
                return selectedArr;
            }
        } else {
            return gridHierarchy;
        }
        return selectedArr;
    }

    recursiveChild(obj) {
        Object.keys(obj).reduce((arr, cur) => {
            this.mapOfIndexToRow.set(obj._index, obj);
            if (obj[cur] && cur === "_children" && obj[cur] instanceof Array) {
                let childIndex = 0;
                obj[cur].forEach(chld => {
                    chld.label = chld.label ? chld.label : chld.Name;
                    chld._index = obj._index + "-" + childIndex;
                    chld.isVisible = false;
                    chld.isExpanded = false;
                    chld.selected = '';
                    chld.ukey = (new Date()).getTime() + "" + chld._index;
                    childIndex++;
                    this.recursiveChild(chld);
                });
            }
        }, []);
    }

    @api setupRow(updatedGridRow) {   
        this.gridDataSet = JSON.parse(JSON.stringify(updatedGridRow));
        this.updateUniqueKey(this.gridDataSet);
    }

    updateUniqueKey(gridData) {
        if (gridData && gridData instanceof Array) {
            gridData.forEach(obj => {
                obj.ukey = (new Date()).getTime() + "" + obj._index;
                if (obj._children && obj._children[obj.Id] instanceof Array) {
                    obj._children = obj._children[obj.Id];
                    this.updateUniqueKey(obj._children);
                }
            });
        }
    }

    hanldleVisibility(event) {
        let index = event.detail._index;
        let obj = this.mapOfIndexToRow.get(index);
        obj.isExpanded = !obj.isExpanded;
        this.selectedRecordId = event.detail.recordId;
        this.toggleVisibility();
    }

    @api
    handleMessage(message) {
        this.returnedRecords = [];
        let obj = new Object();
        let selectedIndex;
        selectedIndex = message.index;
        this.returnedRecords = message.recordList;
        obj = this.mapOfIndexToRow.get(selectedIndex);
        this.returnedRecords.forEach(chld => {
            let childIndex = 0;
            chld._index = obj._index + "-" + childIndex;
            chld.isVisible = false;
            chld.isExpanded = false;
            chld.selectable = '';
            chld.ukey = (new Date()).getTime() + "" + chld._index;
            childIndex++;
        })  
        obj._children = this.returnedRecords;
        this.gridDataSet[obj.Id] = obj;
        this.getTreeRow(this.gridDataSet);
    }

    toggleVisibility(mapOfParentToChild, index) {
        if (!mapOfParentToChild.get(index)) {
            return;
        } else {
            let lstOfChld = mapOfParentToChild.get(index);
            if (lstOfChld && lstOfChld instanceof Array) {
                lstOfChld.forEach(obj => {
                    obj.isVisible = false;
                    this.toggleVisibility(mapOfParentToChild, obj._index);
                });

            } else if (lstOfChld && lstOfChld instanceof Object) {
                lstOfChld.isVisible = false;
            }
        }
    }

    handleSelection(event) {
        let wrapperId = event.detail.id;
        var index = event.detail._index;
        var row = event.detail.row;
        this.gridDataSet.forEach(grid => {
            if (grid._index == index) {
                this.globalSelectedIndex = index;
                grid.selected = 'active';
            } else { 
                grid.selected = '';
            }
        });
        const selectedEvent = new CustomEvent("active",
                    { detail: { id: wrapperId, row: row } }
                    );
        this.dispatchEvent(selectedEvent);
    }

    getHierarchyData(gridData) {
        this.listArr = [];
        if (this.gridData && this.gridData instanceof Array) {
            this.gridData.forEach(obj => {
                obj.selectable = false;
                this.listArr.push(...this.recursiveChild(obj));
            });
            if (this.listArr) {
                this.listArr.sort((a, b) => {
                    if (a._index < b._index) {
                        return -1;
                      }
                      if (a._index > b._index) {
                        return 1;
                      }
                      return 0;
                });
            }
        }
    }

    filterData(event) {
       let searchParam = event.target.value;
       this.gridDataSet = this.masterData;
      searchParam.length > 0 && (this.gridDataSet = this.gridDataSet.filter(data => {
        return (data.label.toLowerCase()).includes(searchParam.toLowerCase());
       }));
       searchParam.length == 0 && (this.gridDataSet.forEach(data => {
        (data._index == this.globalSelectedIndex) && (data.selected = 'active');
        (data._index != this.globalSelectedIndex) && (data.selected = '');
       }));
    }

    //Added below method for template creation - VIVEK
    createNewTemplateHandler() {
        if (this.isSaved == true){
            const newDocTempEvt = new CustomEvent('newtemplate', {
                detail: { newtemplatecreation: true }, bubbles: true
                });
            this.dispatchEvent(newDocTempEvt);
        }
        else{
            if (confirm("Changes not saved. Please click Cancel and save the changes or Ok to continue.") == true){
                this.isSaved = true;
                const saveEvent = new CustomEvent('datasaved', {detail: true });
                this.dispatchEvent(saveEvent);
                this.createNewTemplateHandler(event);
            }
        }
    }

    // handleAllButtonsClicked(event){
    //     if (this.isSaved == true){
    //         if (event.target.label == 'New template'){
    //             this.createNewTemplateHandler(event);
    //         }
    //     }
    //     else{
    //         if (confirm("Changes not saved. Please click Cancel and save the changes or Ok to continue.") == true){
    //             this.isSaved = true;
    //             const saveEvent = new CustomEvent('datasaved', {detail: this.isSaved});
    //             this.dispatchEvent(saveEvent)
    //             this.handleAllButtonsClicked(event);
    //         }
    //     }
    // }

    handleDataSaved(event){
        this.isSaved = event.detail;
        const saveEvent = new CustomEvent('datasaved', {detail: event.detail });
        this.dispatchEvent(saveEvent);
    }

}