import saveTemplateData from '@salesforce/apex/SaveDocumentTemplatesection.saveTemplateData';


function sanitizeCss(cssString) {
    return cssString.replace(/\s\s+/g, ' ').replace(/(\r\n|\n|\r)/gm, '').trim();
}


export function savingPageProperties(thisObj) {
    let tempThisObj;
    if (typeof thisObj !== 'undefined') {
        tempThisObj = thisObj;
    }

    let transformedHeaderProperties = {
        firstPageHeaders:{
          height: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.height),
          marginleft: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.margins.leftMargin),
          marginright: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.margins.rightMargin),
          margintop: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.margins.topMargin),
          marginbottom: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.margins.bottomMargin),
          paddingleft: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.paddings.leftPadding),
          paddingright: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.paddings.rightPadding),
          paddingtop: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.paddings.topPadding),
          paddingbottom: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.paddings.bottomPadding),
          lineHeight: tempThisObj.firstHeaderProperties.lineHeight.value + 'px',
          borderColor: tempThisObj.firstHeaderProperties.borderColor,
          borderOpacity: tempThisObj.firstHeaderProperties.borderOpacity,
          borderWeight: tempThisObj.combineValueAndUnit(tempThisObj.firstHeaderProperties.borderWeight),
          separateBorders: tempThisObj.firstHeaderProperties.separateBorders,
          borderBottom: `${tempThisObj.firstHeaderProperties.borderWeight.value}px solid ${tempThisObj.firstHeaderProperties.borderColor.value}`,
          bgColor: tempThisObj.firstHeaderProperties.bgColor.value,
        },
        normalHeaders:{
          height: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.height),
          marginleft: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.margins.leftMargin),
          marginright: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.margins.rightMargin),
          margintop: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.margins.topMargin),
          marginbottom: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.margins.bottomMargin),
          paddingleft: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.paddings.leftPadding),
          paddingright: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.paddings.rightPadding),
          paddingtop: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.paddings.topPadding),
          paddingbottom: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.paddings.bottomPadding),
          lineHeight: tempThisObj.secondHeaderProperties.lineHeight.value,
          borderColor: tempThisObj.secondHeaderProperties.borderColor,
          borderOpacity: tempThisObj.secondHeaderProperties.borderOpacity,
          borderWeight: tempThisObj.combineValueAndUnit(tempThisObj.secondHeaderProperties.borderWeight),
          separateBorders: tempThisObj.secondHeaderProperties.separateBorders,
          borderBottom: `${tempThisObj.secondHeaderProperties.borderWeight.value}px solid ${tempThisObj.secondHeaderProperties.borderColor.value}`,
          bgColor: tempThisObj.secondHeaderProperties.bgColor.value,
        }
    };
    console.log('transformedHeaderProperties --> ', transformedHeaderProperties);
    let headerJSON = {
      first_header_left: sanitizeCss(`div.first_header_left {
          position: running(first_header_left);
          top: 0;
          left: 0;
          width: 100%;
          border-bottom:${transformedHeaderProperties.firstPageHeaders.borderBottom};
          padding-bottom: ${transformedHeaderProperties.firstPageHeaders.paddingbottom}; 
          padding-left: ${transformedHeaderProperties.firstPageHeaders.paddingleft};
          padding-right: ${transformedHeaderProperties.firstPageHeaders.paddingright};
          padding-top: ${transformedHeaderProperties.firstPageHeaders.paddingtop};
          margin-bottom: ${transformedHeaderProperties.firstPageHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.firstPageHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.firstPageHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.firstPageHeaders.margintop};
          background-color:${transformedHeaderProperties.firstPageHeaders.bgColor};
      }`),
      first_header_center: sanitizeCss(`div.first_header_center {
          position: running(first_header_center);
          top: 0;
          left: 0;
          width: 100%;
          border-bottom:${transformedHeaderProperties.firstPageHeaders.borderBottom};
          padding-bottom: ${transformedHeaderProperties.firstPageHeaders.paddingbottom}; 
          padding-left: ${transformedHeaderProperties.firstPageHeaders.paddingleft};
          padding-right: ${transformedHeaderProperties.firstPageHeaders.paddingright};
          padding-top: ${transformedHeaderProperties.firstPageHeaders.paddingtop};
          margin-bottom: ${transformedHeaderProperties.firstPageHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.firstPageHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.firstPageHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.firstPageHeaders.margintop};
          background-color:${transformedHeaderProperties.firstPageHeaders.bgColor};
      }`),
      first_header_right: sanitizeCss(`div.first_header_right {
          position: running(first_header_right);
          top: 0;
          left: 0;
          width: 100%;
          border-bottom:${transformedHeaderProperties.firstPageHeaders.borderBottom};
          padding-bottom: ${transformedHeaderProperties.firstPageHeaders.paddingbottom}; 
          padding-left: ${transformedHeaderProperties.firstPageHeaders.paddingleft};
          padding-right: ${transformedHeaderProperties.firstPageHeaders.paddingright};
          padding-top: ${transformedHeaderProperties.firstPageHeaders.paddingtop}; 
          margin-bottom: ${transformedHeaderProperties.firstPageHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.firstPageHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.firstPageHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.firstPageHeaders.margintop};
          background-color:${transformedHeaderProperties.firstPageHeaders.bgColor};
      }`),
      first_header_left_landscape: sanitizeCss(`div.first_header_left {
          position: running(first_header_left);
          top: 0;
          left: 0;
          width: 100%;
          border-bottom:${transformedHeaderProperties.firstPageHeaders.borderBottom};
          padding-bottom: ${transformedHeaderProperties.firstPageHeaders.paddingbottom}; 
          padding-left: ${transformedHeaderProperties.firstPageHeaders.paddingleft};
          padding-right: ${transformedHeaderProperties.firstPageHeaders.paddingright};
          padding-top: ${transformedHeaderProperties.firstPageHeaders.paddingtop}; 
          margin-bottom: ${transformedHeaderProperties.firstPageHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.firstPageHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.firstPageHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.firstPageHeaders.margintop};
          background-color:${transformedHeaderProperties.firstPageHeaders.bgColor};
      }`),
      first_header_center_landscape: sanitizeCss(`div.first_header_center {
          position: running(first_header_center);
          top: 0;
          left: 0;
          width: 100%;
          border-bottom:${transformedHeaderProperties.firstPageHeaders.borderBottom};
          padding-bottom: ${transformedHeaderProperties.firstPageHeaders.paddingbottom}; 
          padding-left: ${transformedHeaderProperties.firstPageHeaders.paddingleft};
          padding-right: ${transformedHeaderProperties.firstPageHeaders.paddingright};
          padding-top: ${transformedHeaderProperties.firstPageHeaders.paddingtop}; 
          margin-bottom: ${transformedHeaderProperties.firstPageHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.firstPageHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.firstPageHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.firstPageHeaders.margintop};
          background-color:${transformedHeaderProperties.firstPageHeaders.bgColor};
      }`),
      first_header_right_landscape: sanitizeCss(`div.first_header_right {
          position: running(first_header_right);
          top: 0;
          left: 0;
          width: 100%;
          border-bottom:${transformedHeaderProperties.firstPageHeaders.borderBottom};
          padding-bottom: ${transformedHeaderProperties.firstPageHeaders.paddingbottom}; 
          padding-left: ${transformedHeaderProperties.firstPageHeaders.paddingleft};
          padding-right: ${transformedHeaderProperties.firstPageHeaders.paddingright};
          padding-top: ${transformedHeaderProperties.firstPageHeaders.paddingtop};
          margin-bottom: ${transformedHeaderProperties.firstPageHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.firstPageHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.firstPageHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.firstPageHeaders.margintop};
          background-color:${transformedHeaderProperties.firstPageHeaders.bgColor};
      }`),
      header_left_landscape:sanitizeCss(`div.header_left {
        position: running(header_left);
        top: 0;
        left: 0;
        width: 100%;
        border-bottom:${transformedHeaderProperties.normalHeaders.borderBottom};
        padding-bottom: ${transformedHeaderProperties.normalHeaders.paddingbottom}; 
        padding-top: ${transformedHeaderProperties.normalHeaders.paddingtop}; 
        padding-right: ${transformedHeaderProperties.normalHeaders.paddingright}; 
        padding-left: ${transformedHeaderProperties.normalHeaders.paddingleft}; 
        margin-bottom: ${transformedHeaderProperties.normalHeaders.marginbottom}; 
        margin-right: ${transformedHeaderProperties.normalHeaders.marginright}; 
        margin-left: ${transformedHeaderProperties.normalHeaders.marginleft}; 
        margin-top: ${transformedHeaderProperties.normalHeaders.margintop};
        background-color:${transformedHeaderProperties.normalHeaders.bgColor};
    }`),
    header_center_landscape:sanitizeCss(`div.header_center {
        position: running(header_center);
        top: 0;
        left: 0;
        width: 100%;
        border-bottom:${transformedHeaderProperties.normalHeaders.borderBottom};
        padding-bottom: ${transformedHeaderProperties.normalHeaders.paddingbottom}; 
        padding-top: ${transformedHeaderProperties.normalHeaders.paddingtop}; 
        padding-right: ${transformedHeaderProperties.normalHeaders.paddingright}; 
        padding-left: ${transformedHeaderProperties.normalHeaders.paddingleft}; 
        margin-bottom: ${transformedHeaderProperties.normalHeaders.marginbottom}; 
        margin-right: ${transformedHeaderProperties.normalHeaders.marginright}; 
        margin-left: ${transformedHeaderProperties.normalHeaders.marginleft}; 
        margin-top: ${transformedHeaderProperties.normalHeaders.margintop};
        background-color:${transformedHeaderProperties.normalHeaders.bgColor};
    }`),
    header_right_landscape:sanitizeCss(`div.header_right {
        position: running(header_right);
        top: 0;
        left: 0;
        padding-bottom: ${transformedHeaderProperties.normalHeaders.paddingbottom}; 
        padding-top: ${transformedHeaderProperties.normalHeaders.paddingtop}; 
        padding-right: ${transformedHeaderProperties.normalHeaders.paddingright}; 
        padding-left: ${transformedHeaderProperties.normalHeaders.paddingleft}; 
        margin-bottom: ${transformedHeaderProperties.normalHeaders.marginbottom};
        margin-right: ${transformedHeaderProperties.normalHeaders.marginright}; 
        margin-left: ${transformedHeaderProperties.normalHeaders.marginleft};
        margin-top: ${transformedHeaderProperties.normalHeaders.margintop};
        width: 100%;
        border-bottom:${transformedHeaderProperties.normalHeaders.borderBottom};
        background-color:${transformedHeaderProperties.normalHeaders.bgColor};
    }`),
      header_center: sanitizeCss(`div.header_center {
          position: running(header_center);
          top: 0;
          left: 0;
          padding-bottom: ${transformedHeaderProperties.normalHeaders.paddingbottom}; 
          padding-top: ${transformedHeaderProperties.normalHeaders.paddingtop}; 
          padding-right: ${transformedHeaderProperties.normalHeaders.paddingright}; 
          padding-left: ${transformedHeaderProperties.normalHeaders.paddingleft}; 
          margin-bottom: ${transformedHeaderProperties.normalHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.normalHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.normalHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.normalHeaders.margintop};
          width: 100%;
          border-bottom:${transformedHeaderProperties.normalHeaders.borderBottom};
          background-color:${transformedHeaderProperties.normalHeaders.bgColor};
      }`),
      header_left: sanitizeCss(`div.header_left {
          position: running(header_left);
          top: 0;
          left: 0;
          padding-bottom: ${transformedHeaderProperties.normalHeaders.paddingbottom}; 
          padding-top: ${transformedHeaderProperties.normalHeaders.paddingtop}; 
          padding-right: ${transformedHeaderProperties.normalHeaders.paddingright}; 
          padding-left: ${transformedHeaderProperties.normalHeaders.paddingleft}; 
          margin-bottom: ${transformedHeaderProperties.normalHeaders.marginbottom}; 
          margin-right: ${transformedHeaderProperties.normalHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.normalHeaders.marginleft}; 
          margin-top: ${transformedHeaderProperties.normalHeaders.margintop};
          width: 100%;
          border-bottom:${transformedHeaderProperties.normalHeaders.borderBottom};
          background-color:${transformedHeaderProperties.normalHeaders.bgColor};
      }`),
      header_right: sanitizeCss(`div.header_right {
          position: running(header_right);
          top: 0;
          left: 0;
          padding-bottom: ${transformedHeaderProperties.normalHeaders.paddingbottom}; 
          padding-top: ${transformedHeaderProperties.normalHeaders.paddingtop}; 
          padding-right: ${transformedHeaderProperties.normalHeaders.paddingright}; 
          padding-left: ${transformedHeaderProperties.normalHeaders.paddingleft}; 
          margin-bottom: ${transformedHeaderProperties.normalHeaders.marginbottom};
          margin-right: ${transformedHeaderProperties.normalHeaders.marginright}; 
          margin-left: ${transformedHeaderProperties.normalHeaders.marginleft};
          margin-top: ${transformedHeaderProperties.normalHeaders.margintop};
          width: 100%;
          border-bottom:${transformedHeaderProperties.normalHeaders.borderBottom};
          background-color:${transformedHeaderProperties.normalHeaders.bgColor};
      }`)
    };

      console.log('headerJSON --> ', headerJSON);

      const transformedFooterProperties = {
          height: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.height),
          marginleft: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.margins.leftMargin),
          marginright: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.margins.rightMargin),
          margintop: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.margins.topMargin),
          marginbottom: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.margins.bottomMargin),
          paddingleft: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.paddings.leftPadding),
          paddingright: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.paddings.rightPadding),
          paddingtop: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.paddings.topPadding),
          paddingbottom: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.paddings.bottomPadding),
          lineHeight: tempThisObj.footerProperties.lineHeight.value,
          borderColor: tempThisObj.footerProperties.borderColor,
          borderOpacity: tempThisObj.footerProperties.borderOpacity,
          borderWeight: tempThisObj.combineValueAndUnit(tempThisObj.footerProperties.borderWeight),
          separateBorders: tempThisObj.footerProperties.separateBorders,
          borderTop : `${tempThisObj.footerProperties.borderWeight.value}px solid ${tempThisObj.footerProperties.borderColor.value}`,
      };
      console.log('transformedFooterProperties --> ', transformedFooterProperties);
      let footerJSON = {
        footer_left:sanitizeCss(`div.footer_left { 
            position:running(footer_left); 
            top: 0; 
            left: 0; 
            padding-bottom: ${transformedFooterProperties.paddingbottom};
            padding-left: ${transformedFooterProperties.paddingleft};
            padding-right: ${transformedFooterProperties.paddingright};
            padding-top: ${transformedFooterProperties.paddingtop};
            maring-left: ${transformedFooterProperties.marginleft};
            margin-right: ${transformedFooterProperties.marginright};
            margin-top: ${transformedFooterProperties.margintop};
            margin-bottom: ${transformedFooterProperties.marginbottom};
            width: 100%;
            border-top: ${transformedFooterProperties.borderTop};
            }`),
          footer_center:sanitizeCss(`div.footer_center { 
            position:running(footer_center); 
            top: 0; 
            left: 0; 
            padding-bottom: ${transformedFooterProperties.paddingbottom};
            padding-left: ${transformedFooterProperties.paddingleft};
            padding-right: ${transformedFooterProperties.paddingright};
            padding-top: ${transformedFooterProperties.paddingtop};
            maring-left: ${transformedFooterProperties.marginleft};
            margin-right: ${transformedFooterProperties.marginright};
            margin-top: ${transformedFooterProperties.margintop};
            margin-bottom: ${transformedFooterProperties.marginbottom};
            width: 100%; 
            border-top: ${transformedFooterProperties.borderTop};
          }`),
          footer_right:sanitizeCss(`div.footer_right { 
            position:running(footer_right); 
            top: 0; 
            left: 0; 
            padding-bottom: ${transformedFooterProperties.paddingbottom};
            padding-left: ${transformedFooterProperties.paddingleft};
            padding-right: ${transformedFooterProperties.paddingright};
            padding-top: ${transformedFooterProperties.paddingtop};
            maring-left: ${transformedFooterProperties.marginleft};
            margin-right: ${transformedFooterProperties.marginright};
            margin-top: ${transformedFooterProperties.margintop};
            margin-bottom: ${transformedFooterProperties.marginbottom};
            width: 100%; 
            border-top: ${transformedFooterProperties.borderTop};
          }`),
      }

      console.log('footerJSON --> ', footerJSON);
      const transformedPageMargins = {
          'margin-left': tempThisObj.combineValueAndUnit(tempThisObj.pageMargins.leftMargin),
          'margin-right': tempThisObj.combineValueAndUnit(tempThisObj.pageMargins.rightMargin),
          'margin-top': tempThisObj.combineValueAndUnit(tempThisObj.pageMargins.topMargin),
          'margin-bottom': tempThisObj.combineValueAndUnit(tempThisObj.pageMargins.bottomMargin),
          'line-height': tempThisObj.pageMargins.lineheight.value + 'px',
      };

      const pageCSS = {
        defaultPageCSS : sanitizeCss(`@page {
            size: A4; 
            margin-left: 0px; 
            margin-right: 0px;  
            margin-top: 90px; 
            margin-bottom: 80px;
            <apex:outputText rendered="{!if(headersectionsCount== 1,true,false)}">
                @top-left { content:element(header_left);  width:100%;}
            </apex:outputText>
            <apex:outputText rendered="{!if(headersectionsCount== 2,true,false)}">
                @top-left { content:element(header_left);width:50%;}
                @top-right { content:element(header_center);width:50%;}
            </apex:outputText>
            <apex:outputText rendered="{!if(headersectionsCount== 3,true,false)}">
                @top-left { content:element(header_left);}
                @top-center { content:element(header_center);}
                @top-right { content:element(header_right);}
            </apex:outputText>

            <apex:outputText rendered="{!if(footersectionsCount== 1,true,false)}">
                @bottom-left { content:element(footer_left); width:100%; }
            </apex:outputText>
            <apex:outputText rendered="{!if(footersectionsCount== 2,true,false)}">
                @bottom-left { content:element(footer_left); width:50%;}
                @bottom-right { content:element(footer_center);width:50%; }
            </apex:outputText>
            <apex:outputText rendered="{!if(footersectionsCount== 3,true,false)}">
                @bottom-left { content:element(footer_left);}
                @bottom-center { content:element(footer_center);}
                @bottom-right { content:element(footer_right);}
            </apex:outputText>           
      }`)
      }

     // Save the properties as needed
     const templateData = {
        pageMargins: transformedPageMargins,
        headerProperties: transformedHeaderProperties,
        footerProperties: transformedFooterProperties,
        pagePropCSS : pageCSS,
        headerJSONVal : headerJSON,
        footerJSONVal : footerJSON
    };
    console.log('templateData --> ', templateData); 
    saveTemplateData({ templateId: tempThisObj.recordId, jsonData: JSON.stringify(templateData) })
    .then(result => {
        if (result.startsWith('Success')) {
            tempThisObj.showToast('Success', 'Page Configurations are saved successfully!', 'success');
            tempThisObj.showPageProperties = false;
            tempThisObj.template.querySelector('c-modal').hide();
            tempThisObj.jsonStr = JSON.stringify(templateData);
        } else {
            tempThisObj.showToast('Error', 'An error occurred - ' + result, 'error');
            tempThisObj.showPageProperties = false;
            tempThisObj.template.querySelector('c-modal').hide();
        }
    })
    .catch(error => {
        tempThisObj.showToast('Error', 'An error occurred while saving the template data.', 'error');
        tempThisObj.showPageProperties = false;
        tempThisObj.template.querySelector('c-modal').hide();
        console.error(error);
    });
}

export function updatePropertiesFromJSON(thisObj, jsonString) {
    try {
        let tempThisObj;
        if (typeof thisObj !== 'undefined') {
            tempThisObj = thisObj;
        }
        const data = JSON.parse(jsonString);
        const keyMap = {
            borderTop: 'borderTop',
            borderWeight: 'borderWeight',
            borderOpacity: 'borderOpacity',
            borderColor: 'borderColor',
            paddingbottom: 'paddings.bottomPadding',
            paddingtop: 'paddings.topPadding',
            paddingright: 'paddings.rightPadding',
            paddingleft: 'paddings.leftPadding', 
            marginbottom: 'margins.bottomMargin',
            margintop: 'margins.topMargin',
            marginright: 'margins.rightMargin',
            marginleft: 'margins.leftMargin',
            height: 'height'
        };

        const pageMarginsKeyMap = {
            "line-height": "lineheight",
            "margin-bottom": "bottomMargin",
            "margin-top": "topMargin",
            "margin-right": "rightMargin",
            "margin-left": "leftMargin" 
        }; 

        updateMappedProperties(data.pageMargins, tempThisObj.pageMargins, pageMarginsKeyMap);
        updateMappedProperties(data.footerProperties, tempThisObj.footerProperties, keyMap);
        updateMappedProperties(data.headerProperties.firstPageHeaders, tempThisObj.firstHeaderProperties, keyMap);
        updateMappedProperties(data.headerProperties.normalHeaders, tempThisObj.secondHeaderProperties, keyMap);

        // Update each map with the corresponding properties
        //updateFooterProperties(data.pageMargins, tempThisObj.pageMargins);
        // updateFooterProperties(data.footerProperties, tempThisObj.footerProperties );
        // updateFooterProperties(data.headerProperties.firstPageHeaders, tempThisObj.firstHeaderProperties);
        // updateFooterProperties(data.headerProperties.normalHeaders, tempThisObj.secondHeaderProperties);

        console.log('Updated PageMargins -->  ',tempThisObj.pageMargins);
        console.log('Updated footer properties -->  ',tempThisObj.footerProperties);
        console.log('Updated first header properties -->  ',tempThisObj.firstHeaderProperties);
        console.log('Updated Normal header properties -->  ',tempThisObj.secondHeaderProperties);
        
    } catch (error) {
        console.error('Error parsing JSON:', error); 
    }
}

    function updateMappedProperties(data, target, keyMap) {
        for (let key in data) {
            if (data.hasOwnProperty(key) && keyMap[key]) {
                const targetKey = keyMap[key];
                const valueWithUnit = data[key];

                // Split targetKey if it's nested (e.g., 'paddings.topPadding')
                const keyParts = targetKey.split('.');
                let currentTarget = target;

                // Traverse the target to the correct nested object
                for (let i = 0; i < keyParts.length - 1; i++) {
                    currentTarget = currentTarget[keyParts[i]];
                }

                const finalKey = keyParts[keyParts.length - 1];

                // Parse value and unit if it's a string
                if (typeof valueWithUnit === 'string') {
                    const { value, unit } = splitValueAndUnit(valueWithUnit);
                    currentTarget[finalKey] = { value, unit };
                } else {
                    currentTarget[finalKey] = valueWithUnit;
                }
            }
        }
    }

    

    function splitValueAndUnit(valueWithUnit) {
        const match = valueWithUnit.match(/^(\d+)(.*)$/);
        return {
            value: match ? match[1] : valueWithUnit,
            unit: match ? match[2] : ''
        };
    }

    function splitingFunctionValueAndUnit(valueWithUnit) {
        const match = valueWithUnit.match(/^(\d+(\.\d+)?)([a-zA-Z%]*)$/);
        return {
            value: match ? parseFloat(match[1]) : valueWithUnit,
            unit: match ? match[3].trim() : ''
        };
    }
    
    function updateFooterProperties(updates, targetMap) {
        for (let key in updates) {
            if (updates.hasOwnProperty(key)) {
                let valueWithUnit = updates[key];
                if (typeof valueWithUnit === 'object' && valueWithUnit !== null) {
                    if (targetMap.hasOwnProperty(key)) {
                        updateFooterProperties(valueWithUnit, targetMap[key]);
                    } else {
                        targetMap[key] = valueWithUnit;
                    }
                } else if (typeof valueWithUnit === 'string') {
                    const { value, unit } = splitingFunctionValueAndUnit(valueWithUnit);
                    if (targetMap.hasOwnProperty(key)) {
                        targetMap[key] = { value, unit };
                    } else {
                        targetMap[key] = { value, unit };
                    }
                } else {
                    if (targetMap.hasOwnProperty(key)) {
                        targetMap[key] = valueWithUnit;
                    }
                }
            }
        }
    }

    function updateProperties(properties, targetMap) {
        if (!(targetMap instanceof Map)) {
            targetMap = new Map();
        }
        Object.keys(properties).forEach((key) => {
            const valueWithUnit = properties[key];
            const { value, unit } = splitValueAndUnit(valueWithUnit);
            targetMap.set(key, { value, unit });
        });
    }