import { LightningElement, wire, api, track } from 'lwc';
import getContentVersions from '@salesforce/apex/FooterClass.getContentVersions';
import getSearchedContentVersions from '@salesforce/apex/FooterClass.getSearchedContentVersions';

export default class TemplateHeaderType extends LightningElement {
    imageUrls = [];
    mainimageUrls = [];
    combovalue;
    showImage = false;
    showText = true;
    imagebuttonlabel = 'Select Image';
    showimages = false;
    isModalOpen = false;
    imageselected = false;
    selectedimageurl;
    richtextVal = '';
    imagesfound = false;
    showmergefield = false;
    @api headerAlign;
    @api isDisabled = false;
    @api indexvar;
    @api documenttemplaterecord;
    @api editorcontent;
    @api objectName;
    @track mergefieldname;

    options = [{ label: 'Image', value: 'Image' },{ label: 'Text', value: 'Text' }];

    formats = [
        'font',
        'size',
        'bold',
        'italic',
        'underline',
        'strike',
        'list',
        'indent',
        'align',
        'link',
        'table',
        'header',
        'color',
        'image',
        'code-block',
        'script', 'direction'
    ];
    @track selectedMergefields = [];

    connectedCallback() {
        this.richtextVal = this.editorcontent;       
    }

    @api
    handleActivateTemplate(isActive) {
        this.isDisabled = isActive;
    }

    handleRichTextArea(event) {
        this.richtextVal = event.detail.value;
        var rtdetails = { value: this.richtextVal, indexvar: this.indexvar, key: (new Date()).getTime() + ":" + this.indexvar };    
        this.richtextVal = this.handleWhiteSpacesinText(this.richtextVal);
        var firecustomevent = new CustomEvent('saverichtextheader', { detail: rtdetails });
        this.dispatchEvent(firecustomevent);
    }

    //code added by Bhavya for preserving multiple spaces in Context region
    handleWhiteSpacesinText(str){
        str = str.replace(/  /g, '&nbsp;&nbsp;');
        console.log('preserving whitespaces in header ---> ', str);
        return str;
    }

    handleRichTextAreaSave() {
        var rtdetails = { value: this.richtextVal, indexvar: this.indexvar };
        var firecustomevent = new CustomEvent('saverichtextheader', { detail: rtdetails });
        this.dispatchEvent(firecustomevent);
    }

    handleAddImage() {
        this.template.querySelector('c-modal').show();
        this.isModalOpen = true;
        this.showmergefield = false;
        this.showimages = true;
    }

    handlecomboChange(event) {
        this.combovalue = event.detail.value;
        if (this.combovalue == 'Text') {
            this.showImage = false;
            this.showText = true;
        } else if (this.combovalue == 'Image') {
            this.showImage = true;
            this.showText = false;
        }
    }

    handlemergefieldadd() {
        this.showimages = false;
        this.template.querySelector('c-modal').show();
        this.showmergefield = true;
        this.isModalOpen = false;
    }

    getMergeFieldCopy() {
        const mergeField = this.template.querySelector('c-dx-lookup-fields-displaycmp').getMergeField();
        if (mergeField != undefined) {

            // Changes by Kapil - Merge field first time fix
            //this.mergefieldname = '{!' + this.documenttemplaterecord.DxCPQ__Related_To_Type__c + '.' + mergeField + '}';
            this.mergefieldname = '{!' + this.objectName + '.' + mergeField + '}';         

            let tag = document.createElement('textarea');
            tag.setAttribute('id', 'input_test_id');
            tag.value = this.mergefieldname;
            document.getElementsByTagName('body')[0].appendChild(tag);
            document.getElementById('input_test_id').select();
            document.execCommand('copy');
            document.getElementById('input_test_id').remove();
            this.selectedMergefields.push(this.mergefieldname);
        }
        this.template.querySelector('c-modal').hide();
        this.showmergefield = false;
    }

    getMergeField() {
        const mergeField = this.template.querySelector('c-dx-lookup-fields-displaycmp').getMergeField();
        if (mergeField != undefined) {
           // this.mergefieldname = '{!' + this.documenttemplaterecord.DxCPQ__Related_To_Type__c + '.' + mergeField + '}';
            this.mergefieldname = '{!' + this.objectName + '.' + mergeField + '}'

            this.richtextVal += this.mergefieldname;
            this.selectedMergefields.push(this.mergefieldname);
        }
        this.template.querySelector('c-modal').hide();
        this.showmergefield = false;
    }

    handleImage() {
        this.template.querySelector('c-modal').show();
        this.isModalOpen = true;
    }

    closeModal() {
        this.isModalOpen = false;
    }

    // handleObjectNameSelection(objName) {
    //     this.objectName = objName;
    // }

    handleselectedImage(event) {
        this.selectedimageid = event.currentTarget.dataset.id;
        this.isModalOpen = false;
        this.imageselected = true;
        this.selectedimageurl = '/sfc/servlet.shepherd/version/download/' + this.selectedimageid;
        this.imagebuttonlabel = 'Change Image';
        this.showImage = true;
        this.richtextVal = '<img src="' + this.selectedimageurl + '"/>';
        this.template.querySelector('c-modal').hide();
        this.isModalOpen = false;
    }

    @wire(getContentVersions) wiredcontentversions({ error, data }) {
        if (data) {
            if (data != null) {
                data.forEach((val) => {
                    this.imageUrls.push({ Id: val.Id, URL: '/sfc/servlet.shepherd/version/download/' + val.Id, title: val.Title });
                });
                this.showimages = true;
                this.mainimageUrls = this.imageUrls;
                if (this.imageUrls.length > 0) {
                    this.imagesfound = true;
                }
            }
        } else if (error) {
            console.log('error in Content Versions Fetch' + JSON.stringify(error));
        }
    }

    handleSearch(event) {
        var searchlabel = event.currentTarget.value;
        if (searchlabel !== '') {
            getSearchedContentVersions({ searchlabel: searchlabel })
                .then(result => {
                    this.searchData = result;
                    this.imageUrls = [];
                    result.forEach((val) => {
                        this.imageUrls.push({ Id: val.Id, URL: '/sfc/servlet.shepherd/version/download/' + val.Id, title: val.Title });
                    });
                    this.showimages = true;
                })
                .catch(error => {
                    this.searchData = undefined;
                    if (error) {
                        console.log('templateheadertype handleSearch' + JSON.stringify(error));
                    }
                })
        } else {
            this.imageUrls = this.mainimageUrls;
        }
    }

    //code added by Bhavya for Custom Font Family in Rich Text Area
    get fontFamilies() {
        return [
            { label: 'Times New Roman', value: 'serif' },
            { label: 'Arial', value: 'sans-serif' },
            { label: 'serif', value: 'serif' },
            { label: 'Courier', value: 'courier' },
        ];
    }
    
    handleFontFamilySelection(event){
        let applySelectedFormats = {
            font: event.target.value,
        };
        let selection = window.getSelection().toString();
        let editor = this.template.querySelector('lightning-input-rich-text');
        editor.setFormat(applySelectedFormats);
    }
}