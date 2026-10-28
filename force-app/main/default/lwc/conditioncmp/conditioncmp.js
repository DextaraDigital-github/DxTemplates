import { LightningElement, api, track } from 'lwc';
export default class DxCpqConditioncmp extends LightningElement {
   

    //variables
    @api fieldWrapper;
    @api listOfExistingConditions;
    @api existingGlobalValue;
    @api existingExpression;
    @api readOnly = false;


    lblobjectName;
    fieldSetApiFields=[];
    labelHidden='label-hidden'
    showLabel=""
    selectedGlobalValue="allConditionsAreMet";
    conditionExpression;
    deleteIds;
    globalExpressionOptions=[{label: "All Conditions Are Met", value: "allConditionsAreMet"},
                                     {label: "Any Condition Is Met", value: "anyConditionIsMet"}];

    @track sObjectList;
    @track lstOfCondition;
    @track inputFieldAPIs;

    
    
    
    

    @api getConditionDetails(){
        let condition = {};
        condition.listOfConditions = this.lstOfCondition;
        let andReplace = this.conditionExpression.replaceAll("AND", " && ");
        let orReplace = andReplace.replaceAll("OR", " || ")
        condition.expression = orReplace;
        condition.deleteIds= this.deleteIds;
        return condition;
    }

    
    
    connectedCallback() {
        let index = 0;
        this.sObjectList=[];
        this.lstOfCondition = [];
        this.deleteIds=[];
        let tempSObjList = [];
        this.fieldWrapper.forEach(wp=>{
            let jsonObj = {};
            jsonObj['label'] = wp.objectLabelName;
            jsonObj['value']=wp.objectAPIName;
            tempSObjList.push(jsonObj);
        })
        this.sObjectList = [...tempSObjList];
        if(this.listOfExistingConditions && this.listOfExistingConditions.length>0){
         this.lstOfCondition=JSON.parse(JSON.stringify(this.listOfExistingConditions));
         let tempExpr = this.existingExpression;
         let andReplace = tempExpr.replaceAll("&&","AND");
         let orReplace = andReplace.replaceAll("||", "OR");
         this.conditionExpression=orReplace;
         this.selectedGlobalValue=this.existingGlobalValue;
        } else {

            this.insertNewRow(index, index, "AND", true);

        } 
    }


    insertNewRow(index,insertIndex, action, disableAction) {
        let tempObj = {};
        let childArr = this.lstOfCondition;
        let groupToUpdate=[];
        let groupIndex=0;
        if(isNaN(insertIndex)){
            let arrIndex = index.split("-");
            for(let i=0;i<arrIndex.length;i++){
                let av = arrIndex[i];
                if(childArr[av].children){
                    groupIndex = childArr[av].children.length;
                    childArr = childArr[av].children;
                }else if((i+1)%2==0){
                    childArr = childArr[av].group;
                    groupToUpdate = childArr;
                }else{
                    groupIndex = 0;
                    childArr = childArr[av];
                }
            }
        }else{
            childArr = this.lstOfCondition[index]?(this.lstOfCondition[index].children?this.lstOfCondition[index].children:this.lstOfCondition[index]):this.lstOfCondition;
        }
        tempObj._index=insertIndex;
        tempObj.Id = null;
        tempObj.objectName = this.sObjectList;
        tempObj.fieldName = [];
        tempObj.action = action;
        tempObj.childAction="AND";
        tempObj.disableActionValue=disableAction;
        tempObj.operator = "==";
        tempObj.dataType="STRING";
        tempObj.isText = true;
        tempObj.isCurrency = false;
        tempObj.isCheckbox = false;
        tempObj.isDate = false;
        tempObj.ispicklist = false;
        tempObj.isLongText = false;
        tempObj.isNumber = false;
        tempObj.isPercent = false;
        tempObj.isLookup = false;
        tempObj.selectedObject = "";
        tempObj.selectedField = "";
        tempObj.picklistValues=[];
        tempObj.uKey = (new Date()).getTime() + ":" + index;
        tempObj.actionOptions = this.globalExpressionOptions;
        tempObj.selectedGlobalValue = 'allConditionsAreMet';        
        if(isNaN(tempObj._index)){
            if(groupToUpdate && groupToUpdate instanceof Array){
                let conditionIndex = parseInt(tempObj._index.charAt(tempObj._index.length - 1));
                groupToUpdate.splice(conditionIndex, 0, tempObj);               
            }
        }
        else{
            this.lstOfCondition.splice(insertIndex, 0, tempObj);
        }        
        this.setUpdatedIndex(this.lstOfCondition,0,false);
        this.getRuleExpression(this.lstOfCondition);
    }


    /**
     * The below function addNewConditionHandler is used for creating a new condition on the UI
     */
    addNewConditionHandler(event) {
        let index = event.detail.index;
        let action;
        let disableAction;
        let globalAction;
        let insertIndex;
        let childArr = this.lstOfCondition;
        let childToUpdate;
        if(isNaN(index)){
            let indexArr = [];
            indexArr = index.split("-");            
            indexArr[indexArr.length-1]=parseInt(indexArr[indexArr.length-1])+1;
            indexArr.forEach(element=>{
                if(insertIndex){
                    insertIndex=insertIndex+'-'+element;
                }else{
                    insertIndex=element;
                }
            })
            for(let i=0;i<indexArr.length-1;i++){
                let av = indexArr[i];
                if(childArr[av].children){
                    childArr = childArr[av].children;
                }else if((i+1)%2==0){
                    childToUpdate = childArr[av];
                    childArr = childArr[av].group;
                }
            }            
            globalAction = childToUpdate.selectedGlobalValue;
            if (globalAction === 'allConditionsAreMet') {
                action = "AND";
                disableAction = true;
            } else if (globalAction === 'anyConditionIsMet') {
                action = "OR";
                disableAction = true;
            }

            this.insertNewRow(index,insertIndex, action, disableAction);
        }else{
            insertIndex=parseInt(index)+1;
            globalAction = this.selectedGlobalValue;
            if (globalAction === 'allConditionsAreMet') {
                action = "AND";
                disableAction = true;
            } else if (globalAction === 'anyConditionIsMet') {
                action = "OR";
                disableAction = true;
            } 
            this.insertNewRow(index, insertIndex, action, disableAction);
        }
        
    }


    /**
     * The below function deleteCondition is used for deleting the existing condition on the UI
     */
    deleteCondition(event) {
        let index = event.detail.index;
        let child;
        let childToUpdate;
        let childArr = this.lstOfCondition;
        let groupToUpdate=[];
        let rowToUpdate;
        if(isNaN(index)){
            let arrIndex = index.split("-");
            for(let i=0;i<arrIndex.length-1;i++){
                let av = arrIndex[i];
                
                    if (childArr[av].children) {
                        rowToUpdate=childArr[av];  
                        childArr = childArr[av].children;
                        childToUpdate = childArr;
                    } else if ((i + 1) % 2 == 0) {
                        groupToUpdate = childArr[av];
                        childArr = childArr[av].group;  
                    }
            }
            let lastIndex = parseInt(arrIndex[arrIndex.length-1]);
            childArr.splice(lastIndex,1);
            if(childArr.length===0){
                let deleteIndex = parseInt(arrIndex[arrIndex.length-2]);
                childToUpdate.splice(deleteIndex, 1);
                if(childToUpdate.length===0){
                delete rowToUpdate.children;   
                }
            }           
        }else{
            this.lstOfCondition.splice(index, 1);
        }
        if(this.lstOfCondition.length==0){
            this.insertNewRow(0, 0, "AND", true);
        }
        this.setUpdatedIndex(this.lstOfCondition,0,false);
        this.getRuleExpression(this.lstOfCondition);

    }


    getdeleteIds(conditionObject){
        this.deleteIds.push(conditionObject.Id);
        if(conditionObject.children && conditionObject.children.length>0){
            conditionObject.children.forEach(groupObj=>{
                groupObj.group.forEach(condition=>{
                    this.getdeleteIds(condition);
                })
            })
        }
    }

    setUpdatedIndex(rowList, predefinedIndex, isChild) {
        if (isChild === true) {
            {
                for (let i = 0; i < rowList.length; i++) {
                    let group = rowList[i].group;
                    rowList[i].uKey = (new Date()).getTime() + ":" + i;
                    for (let j = 0; j < group.length; j++) {
                        let condition = group[j];
                        let index = predefinedIndex + "-" + i + "-" + j
                        condition._index = index;
                        if (condition.children) {
                            this.setUpdatedIndex(condition.children, condition._index, true);
                        }
                    }
                }
            }
        } else {
            for (let i = 0; i < rowList.length; i++) {
                rowList[i]._index = i;
                rowList[i].uKey = (new Date()).getTime() + ":" + rowList[i]._index;
                if (rowList[i].children) {
                    this.setUpdatedIndex(rowList[i].children, i, true);
                }
            }
        }
    }



    rowDataChangeHandler(event) {
        event.detail.forEach(element => {
            let childArr=this.lstOfCondition;
            let groupIndex=0;
            let index = element.index;
            let fieldName = element.fieldName;
            let value = element.value;
            let groupToUpdate=[];
            if (isNaN(index)) {
                let arrIndex = index.split("-");
                for (let i = 0; i < arrIndex.length; i++) {
                    let av = arrIndex[i];
                    if (childArr[av].children && i!==arrIndex.length-1) {
                        groupIndex = childArr[av].children.length;
                        childArr = childArr[av].children;
                    } else if ((i + 1) % 2 == 0) {
                        childArr = childArr[av].group;
                        groupToUpdate = childArr;
                    } else {
                        groupIndex = 0;
                        childArr = childArr[av];
                        childArr[fieldName]=value;
                    }
                }                
            } else {
                this.lstOfCondition[index][fieldName] = value;
            }
        });  
        this.getRuleExpression(this.lstOfCondition);
    }


    addNewGroupHandler(event){        
        let index = event.detail.index;
        let action = event.detail.action;
        let disableAction = event.detail.disableAction;      
        let groupIndex = 0;
        let rowIndex = 0;
        let tempObj = {};
        let childArr = this.lstOfCondition;
        let rowToUpdate;
        if(isNaN(index)){
            let arrIndex = index.split("-");
            for(let i=0;i<arrIndex.length;i++){
                let av = arrIndex[i];
                if(childArr[av].children){
                    rowToUpdate = childArr[av];
                    groupIndex = childArr[av].children.length;
                    childArr = childArr[av].children;
                }else if((i+1)%2==0){
                    childArr = childArr[av].group;
                }else{
                    groupIndex = 0;
                    childArr = childArr[av];
                }
            }
        }else{            
            rowToUpdate = childArr[index];
            childArr = this.lstOfCondition[index].children?this.lstOfCondition[index].children:this.lstOfCondition[index];
            groupIndex = childArr instanceof Array?childArr.length:0;
        }       
        tempObj._index = index+"-"+groupIndex+"-"+rowIndex;
        let insertIndex = parseInt(tempObj._index.charAt(tempObj._index.length-1));       
        tempObj.Id = null;
        tempObj.objectName = this.sObjectList;
        tempObj.fieldName = [];
        tempObj.action = "AND";
        tempObj.childAction="AND";
        tempObj.disableActionValue=true;
        tempObj.operator = "==";
        tempObj.action = "AND";
        tempObj.dataType="STRING";
        tempObj.isText = true;
        tempObj.isCurrency = false;
        tempObj.isCheckbox = false;
        tempObj.isDate = false;
        tempObj.ispicklist = false;
        tempObj.isLongText = false;
        tempObj.isNumber = false;
        tempObj.isPercent = false;
        tempObj.isLookup = false;
        tempObj.selectedObject = "";
        tempObj.selectedField = "";
        tempObj.picklistValues=[];
        tempObj.uKey = (new Date()).getTime() + ":" + index;
        tempObj.actionOptions = this.globalExpressionOptions;      
        tempObj.selectedGlobalValue = 'allConditionsAreMet';                                                       
        if(isNaN(tempObj._index)){              
            if(childArr instanceof Array && childArr.length > 0){
                childArr.push({"group":[tempObj], "uKey":((new Date()).getTime() + ":" + groupIndex), "selectedGlobalValue" :'allConditionsAreMet', "actionOptions": this.globalExpressionOptions, "action": action, "disableActionValue": disableAction});
            }else if(childArr instanceof Object){
                console.log('this is child arr'+JSON.stringify(childArr));
                childArr["children"] = [{"group":[tempObj], "uKey":((new Date()).getTime() + ":" + groupIndex), "selectedGlobalValue" :'allConditionsAreMet', "actionOptions": this.globalExpressionOptions, "action": action, "disableActionValue" : disableAction}];
            }            
        }       
        this.setUpdatedIndex(this.lstOfCondition,0,false);
        this.getRuleExpression(this.lstOfCondition);        
    }


    getRuleExpression(rowList) {
        let index = 0;       
        let finalCondition;        
        for (let i = 0; i < rowList.length; i++) {
            let con = rowList[i];
            let singleCondition;
            index=index+1;
            let condition = " "+"Condition" + index+" ";
            con.conditionName = condition;
            let action;
            if(i===rowList.length-1){
                action="";
            }else{
                action = con.action;
            }
            let groupAction = con.childAction;
            if (con.children) {               
                let groupStatement;
                let tempIndex=0;
                for (let j = 0; j < con.children.length; j++) {
                    let child = con.children[j];
                    let childAction = child.action;
                    let expression;
                    if (child.group) {
                        let childGroup = child.group;
                        expression = this.getRuleExpressionForGroup(childGroup, index);
                    }
                    index = expression.index;
                    if (groupStatement) {
                        groupStatement = groupStatement+  childAction +expression.statement;
                        tempIndex++;
                    } else {
                        groupStatement = expression.statement;
                    }
                }
                singleCondition = "(" + condition +  groupAction +"("+ groupStatement+")" + ")"+ action;
                if(finalCondition){
                    finalCondition = finalCondition+singleCondition;
                }
                else{
                    finalCondition = singleCondition;
                }

            } else {
                if (finalCondition) {
                    finalCondition =  finalCondition +  condition +  action;
                } else {
                    finalCondition = condition +  action;
                }
            }
        }
        this.conditionExpression = finalCondition;
    }

    getRuleExpressionForGroup(rowList,index){
        let currentIndex = index;       
        let finalCondition;
        let groupExpression;
        let singleCondition;
        for (let i = 0; i < rowList.length; i++) {
            let con = rowList[i];           
            currentIndex = currentIndex+1;
            let tempCondition  = " "+"Condition"+currentIndex+" ";
            con.conditionName = tempCondition;
            let action;
            if(i===rowList.length-1){
                action="";
            }else{
                action = con.action;
            }
            let groupAction = con.childAction;
            let groupStatement;
            if (con.children) {
                for (let j = 0; j < con.children.length; j++) {
                    let child = con.children[j];
                    let expression;                  
                    if(child.group){
                    let childGroup = child.group;
                    expression = this.getRuleExpressionForGroup(childGroup, currentIndex);
                    }                    
                    currentIndex = expression.index;
                    index = expression.index;
                    if(groupStatement){
                        groupStatement = groupStatement+ child.action+ expression.statement;                        
                    }else{
                        groupStatement = expression.statement;
                    }                   
                }                
                singleCondition = "("+tempCondition+  groupAction+"("+groupStatement+")"+")"+ action;
                if(finalCondition){
                    finalCondition = finalCondition+singleCondition;
                }
                else{
                    finalCondition = singleCondition;
                }
            } else {
                if (finalCondition) {
                    finalCondition = finalCondition +  tempCondition +  action;
                } else {
                    finalCondition = tempCondition +  action;
                }               
            }
        }
        groupExpression = "("+finalCondition+")";
        var groupCondition={statement: groupExpression, index: currentIndex};
        return groupCondition;
    }

    handleGlobalExpressionOptions(event){
        this.selectedGlobalValue = event.detail.value;
        if (this.selectedGlobalValue === 'allConditionsAreMet') {
            this.lstOfCondition.forEach(condition => {
                condition.action = "AND";
                condition.disableActionValue = true;
            })
        } else if (this.selectedGlobalValue === 'anyConditionIsMet') {
            this.lstOfCondition.forEach(condition => {
                condition.action = "OR";
                condition.disableActionValue = true;
            })
        }
        this.getRuleExpression(this.lstOfCondition);
    }

    updateActionHandler(event){
        let index = event.detail.index;
        let selectedExpression = event.detail.expression;
        let groupToUpdate;
        let childToUpdate;
        let childArr = this.lstOfCondition;
        let itemToUpdate;
        let rowToUpdate;
        if (isNaN(index)) {
            let arrIndex = index.split("-");
            for (let i = 0; i < arrIndex.length; i++) {
                let av = arrIndex[i];
                if (childArr[av].children) {
                    rowToUpdate = childArr[av];
                    
                    childArr = childArr[av].children;
                } else if ((i + 1) % 2 == 0) {
                    childToUpdate = childArr[av];
                    groupToUpdate = childArr[av].group;
                    childArr = childArr[av].group;
                }
            }
            if ((arrIndex.length) % 2 == 0) {
                childToUpdate.selectedGlobalValue = selectedExpression;
                itemToUpdate = groupToUpdate;
            } else {
                rowToUpdate.selectedGlobalValue = selectedExpression;
                itemToUpdate = rowToUpdate.children;
            }
        }else{
            childArr[index].selectedGlobalValue = selectedExpression;
            itemToUpdate = childArr[index].children;
        }
        
        

        if (selectedExpression === 'allConditionsAreMet') {
            itemToUpdate.forEach(condition => {
                condition.action = "AND";
                condition.disableActionValue = true;
            })
        } else if (selectedExpression === 'anyConditionIsMet') {
            itemToUpdate.forEach(condition => {
                condition.action = "OR";
                condition.disableActionValue = true;
            })
        }
        this.getRuleExpression(this.lstOfCondition);
    }

    updateActionForGroup(event){
        let index = event.detail.index;
        let action = event.detail.action;
        let childArr = this.lstOfCondition;
        let childToUpdate;
        if(isNaN(index)){
            let arrIndex = index.split("-");
            for(let i=0;i<arrIndex.length;i++){
                let av = arrIndex[i];
                if(childArr[av].children){
                    childArr = childArr[av].children;
                }else if((i+1)%2==0){
                    childToUpdate = childArr[av];
                    childArr = childArr[av].group;
                }
            }
        }
        childToUpdate.action = action;
        this.getRuleExpression(this.lstOfCondition);
    }
    

    


}