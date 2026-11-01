import { LightningElement, track, api } from 'lwc';
//import saveImage from '@salesforce/apex/ScreenshotController.saveImage';
import getImageBase64 from '@salesforce/apex/ScreenshotController.getImageBase64';
import saveImageBase64 from '@salesforce/apex/ScreenshotController.saveImageBase64';

export default class Poc_RTA extends LightningElement {
    @api images;
    @track imageLst = [];
    @track base64Data = '';
    @track imageJSON = [];
    isLoaded = true;

    @track cvStyle =  `width:500px; height: 500px; border: 1px solid black;`;
    transformedImages = [];
    imagesJSON = [];
    cvLst = [];
    // @track images = [
    //     {
    //         id: 0,
    //         URL: 'https://data-fun-6960-dev-ed.scratch.my.salesforce.com/sfc/servlet.shepherd/version/download/068O9000004fZ7aIAE',
    //         width: 30,
    //         height: 35
    //     },
    //     {
    //         id: 1,
    //         URL: 'https://data-fun-6960-dev-ed.scratch.my.salesforce.com/sfc/servlet.shepherd/version/download/068O9000004fZxCIAU',
    //         width: 2560,
    //         height: 1662
    //     },
    //     {
    //         id: 2,
    //         URL: 'https://data-fun-6960-dev-ed.scratch.my.salesforce.com/sfc/servlet.shepherd/version/download/068O9000004fWPqIAM',
    //         width: 700,
    //         height: 524
    //     }
    // ];

    selectedImage = null;
    width = 500;
    height = 500;
    connectedCallback() {
        console.log('images inside Poc RTA ---> ', this.images);
        this.imageLst = [...this.images];
        this.imageLst = this.imageLst.map(image => {
            if (image.rwidth && image.rheight) {
                return {
                    ...image,
                    width: image.rwidth,
                    height: image.rheight,
                    oWidth: image.width,
                    oHeight: image.height,
                    style:'border: 1px solid #cbcbcb;',
                    isModified: false
                };
            } else {
                return {
                    ...image,
                    isModified: false,
                    oWidth: image.width,
                    oHeight: image.height,
                    style:'border: 1px solid #cbcbcb;'
                };
            }
        });
        console.log('imageLst inside connectedcallback ---> ', this.imageLst);
        this.imagesJSON = this.imageLst.map(image => {
            return {
                oCVID: image.cvId,
                oWidth: image.oWidth,
                oHeight: image.oHeight,
                rCVID: image.rcvid,
                rWidth: image.width,
                rHeight: image.height,
                prevRWidth: image.width,
                prevRHeight: image.height,
                base64: null,
                isModified: false,
            };
        });
        console.log('imagesJSON lst in Connectedcallback() --> ', this.imagesJSON);
        this.originalImagesLst = JSON.parse(JSON.stringify(this.imageLst));
        console.log('originalimages lst in Connectedcallback() --> ', this.originalImagesLst);
        this.transformedImages = this.imageLst.reduce((acc, image) => {
            acc[image.cvId] = { ...image };
            return acc;
        }, {});

        console.log('transformedImages ---- > ', this.transformedImages);
        if (this.imageLst.length > 0) {
            let firstImage = this.imageLst[0];
            this.selectedImage = firstImage;
            this.prevSelectedImage = this.selectedImage;
            this.width = firstImage.width;
            this.height = firstImage.height;
            //this.drawImageOnCanvas(firstImage.URL, firstImage.width, firstImage.height);
        }
    }

    handleImageClick(event) {
        // Handle the selected image
        const imageId = event.target.dataset.id;
        this.selectedImage = this.imageLst.find(img => img.id == imageId);
        if (this.selectedImage) {
            this.width = this.selectedImage.width;
            this.height = this.selectedImage.height;
            this.adjustCanvasSize(this.selectedImage.width, this.selectedImage.height).then(() => {
                console.log('canvas size adjusted inside image click');
                getImageBase64({ cvId: this.selectedImage.cvId })
                    .then(dataURL => {
                        this.base64Data = dataURL;
                        this.imageUrl = 'data:image/png;base64,' + dataURL;
                        this.drawImageOnCanvas2(this.imageUrl, this.selectedImage.width, this.selectedImage.height);
                    });
            });
        }
    }



    updateImagesJSON(updatedImage) {
        return new Promise((resolve) => {
            this.imagesJSON = this.imagesJSON.map(imgJSON => {
                if (imgJSON.oCVID === updatedImage.cvId) {
                    if (imgJSON.rWidth !== imgJSON.prevRWidth || imgJSON.rHeight !== imgJSON.prevRHeight) {
                        imgJSON.prevRWidth = imgJSON.rWidth;
                        imgJSON.prevRHeight = imgJSON.rHeight;
                    }
                    imgJSON.rWidth = updatedImage.width;
                    imgJSON.rHeight = updatedImage.height;
                    imgJSON.isModified = updatedImage.isModified;
                }
                return imgJSON;
            });
            resolve();
        });
    }

    handleImagePropertiesChange(e) {
        const label = e.target.label;
        const value = parseInt(e.target.value, 10);
        if (!this.selectedImage || !(value > 0)) {
            return;
        }

        let updatedImage = { ...this.selectedImage };

        if (label === 'Width') {
            this.width = value;
        } else if (label === 'Height') {
            this.height = value;
        }

        // An image cannot be made larger than its original (that only blurs it); nothing else limits the size.
        if (this.selectedImage.oWidth && this.width > this.selectedImage.oWidth) {
            this.width = this.selectedImage.oWidth;
        }
        if (this.selectedImage.oHeight && this.height > this.selectedImage.oHeight) {
            this.height = this.selectedImage.oHeight;
        }

        updatedImage.width = this.width;
        updatedImage.height = this.height;
        let cvID = this.selectedImage.cvId;

        if (this.width !== this.transformedImages[cvID].oWidth || this.height !== this.transformedImages[cvID].oHeight || this.width !== this.transformedImages[cvID].rWidth || this.height !== this.transformedImages[cvID].rHeight) {
            updatedImage.isModified = true;
        } else {
            updatedImage.isModified = false;
        }

        this.selectedImage = updatedImage;
        this.imageLst = this.imageLst.map(image => {
            return image.id === updatedImage.id ? updatedImage : image;
        });

        this.updateImagesJSON(this.selectedImage).then(() => {
            this.cvStyle = `width: ${this.selectedImage.width}px; height: ${this.selectedImage.height}px; border: 1px solid black;`;
            this.adjustCanvasSize(this.selectedImage.width, this.selectedImage.height).then(() => {
                this.drawImageOnCanvas2(this.imageUrl, this.selectedImage.width, this.selectedImage.height).then(() => {
                });
            });
        });
    }


    takeScreenshot() {
        return new Promise((resolve, reject) => {
            const canvas = this.template.querySelector('.outputCanvas');
            if (canvas) {
                const dataURL = canvas.toDataURL();
                //console.log('Screenshot dataURL:', dataURL);
                this.updateBase64InImagesJSON(dataURL)
                    .then(() => {
                        console.log('Updated imagesJSON with base64 after takeScreenshot ----> ', this.imagesJSON);
                        resolve();
                    })
                    .catch(error => {
                        console.error('Error updating base64 in imagesJSON:', error);
                        reject(error);
                    });
            } else {
                console.log('Canvas element not found.');
                reject(new Error('Canvas element not found.'));
            }
        });
    }

    updateBase64InImagesJSON(dataURL) {
        return new Promise((resolve, reject) => {
            this.imagesJSON = this.imagesJSON.map(imgJSON => {
                if (imgJSON.oCVID === this.selectedImage.cvId) {
                    imgJSON.base64 = dataURL;
                }
                return imgJSON;
            });
            resolve();
        });
    }

    handleResize() {
        if (this.width > 500 || this.height > 500) {
            alert('Width and height must be less than or equal to 500.');
            return;
        }
        if (this.selectedImage) {
            this.drawImageOnCanvas(this.selectedImage.URL, this.width, this.height);
            // Update the selected image's dimensions
            this.selectedImage.width = this.width;
            this.selectedImage.height = this.height;
            // Refresh the UI to show updated dimensions under the image
            this.imageLst = [...this.imageLst];
        }
    }

    @track canvasWidth = 500; // Default canvas width
    @track canvasHeight = 500; // Default canvas height

    adjustCanvasSize(width, height) {
        return new Promise((resolve) => {
            const canvas = this.template.querySelector('canvas');
            // canvas.width = width;
            // canvas.height = height;
            resolve();
        });
    }



    generateJson(resizedContentVersionId) {
        if (!this.selectedImage) {
            return;
        }

        const originalImage = this.originalImagesLst.find(img => img.cvid === this.selectedImage.cvid);
        if (!originalImage) {
            console.error('Original image not found.');
            return;
        }

        const result = {
            oCVID: originalImage.cvid,
            oWidth: originalImage.width,
            oHeight: originalImage.height,
            rCVID: resizedContentVersionId,
            rWidth: this.width,
            rHeight: this.height
        };
        this.imageJSON.push(result);
        console.log('Generated JSON:', JSON.stringify([result]));
        console.log('this.imageJSON in generatedJSON Fn --- ', this.imageJSON);
    }

  drawImageOnCanvas2(imageURL, width, height) {
    return new Promise((resolve, reject) => {
         this.cvStyle = `width: ${width}px; height: ${height}px; border: 1px solid black;`;

        const canvas = this.template.querySelector('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.src = imageURL;

        img.onload = () => {
            // canvas.width = width;
            // canvas.height = height;
            // ctx.clearRect(0, 0, canvas.width, canvas.height);
            // ctx.drawImage(img, 0, 0, img.width, img.height);

            ctx.clearRect(0, 0, canvas.width, canvas.height);
            // canvas.width = width;
            // canvas.height = height;
            const aspectRatio = img.width / img.height;
            let drawWidth = width;
            let drawHeight = height;

            if (drawWidth / aspectRatio <= drawHeight) {
                drawHeight = drawWidth / aspectRatio;
            } else {
                drawWidth = drawHeight * aspectRatio;
            }
            const x = (canvas.width - drawWidth) / 2;
            const y = (canvas.height - drawHeight) / 2;
            canvas.width = width;
            canvas.height = height;
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            // this.cvStyle = `width: ${this.selectedImage.width}px; height: ${this.selectedImage.height}px; border: 1px solid black;`;

            // this.cvStyle = `width: ${drawWidth}px; height: ${drawHeight}px; border: 1px solid black;`;
            //const picCan = this.template.querySelector('canvas');
            if (canvas) {
                const dataURL = canvas.toDataURL();
                // console.log('Screenshot dataURL inside drawImageOnCanvas2 :', dataURL);
            }
            resolve();
        };

        img.onerror = reject;
    });
}




    drawImageOnCanvas(imageURL, width, height) {
        return new Promise((resolve, reject) => {
            this.cvStyle = `width: ${width}px; height: ${height}px; border: 1px solid black;`;
            const canvas = this.template.querySelector('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            img.src = imageURL;
            img.onload = () => {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                const aspectRatio = img.width / img.height;
                let drawWidth = width;
                let drawHeight = height;

                if (drawWidth / aspectRatio <= drawHeight) {
                    drawHeight = drawWidth / aspectRatio;
                } else {
                    drawWidth = drawHeight * aspectRatio;
                }
                const x = (canvas.width - drawWidth) / 2;
                const y = (canvas.height - drawHeight) / 2;
                //ctx.drawImage(img, x, y, drawWidth, drawHeight);
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                resolve();
            };
            img.onerror = reject;
        });
    }

    renderedCallback() {
        if (this.selectedImage && this.isLoaded) {
            //this.drawImageOnCanvas(this.selectedImage.URL, this.selectedImage.width, this.selectedImage.height);
            getImageBase64({ cvId: this.selectedImage.cvId })
                .then(dataURL => {
                    this.base64Data = dataURL;
                    this.imageUrl = 'data:image/png;base64,' + dataURL;
                     this.cvStyle =  `width: ${this.selectedImage.width}px; height: ${this.selectedImage.height}px; border: 1px solid black;`;
                     let width = this.selectedImage.width;
                     let height = this.selectedImage.height;
                    this.adjustCanvasSize(width, height).then(() => {
                        this.drawImageOnCanvas(this.imageUrl, width, height);
                        this.isLoaded = false;
                    });
                });
        }
    }

    handleSaveClick() {
        let hasModifiedImages = false;
        if(this.imagesJSON.length > 0){
            this.imagesJSON.forEach(image => {
                if (image.isModified) {
                    hasModifiedImages = true;
                    const imageInLst = this.imageLst.find(img => img.cvId === image.oCVID);
                    if (imageInLst) {
                        imageInLst.isModified = true;
                        imageInLst.style = 'border: 3px solid red; border-radius: 10px;';
                    }
                }
            });

            if (!hasModifiedImages) {
                const closeEvent = new CustomEvent('closemodal', {
                    detail: {
                        imagesJSON: this.imagesJSON,
                        cvLst: this.cvLst,
                        process : 'Save'
                    }
                });
                this.resetRTAvalues();
                this.dispatchEvent(closeEvent);
            } else {
                this.imageLst = [...this.imageLst];
                //  const closeEvent = new CustomEvent('closemodal', {
                //     detail: {
                //         imagesJSON: []
                //     }
                // });
                // this.dispatchEvent(closeEvent);
            }
        }
        
    }

    disconnectedCallback() {
        const closeEvent = new CustomEvent('closemodal', {
            detail: {
                imagesJSON: this.imagesJSON,
                cvLst: this.cvLst,
                process : 'Cancel'
            }, 
            bubbles: true, composed: true 
        });
        this.dispatchEvent(closeEvent);
        // this.dispatchEvent(new CustomEvent('closemodal',  { detail: { imagesJSON: this.imagesJSON,
        //                 cvLst: this.cvLst }, bubbles: true, composed: true }));
    }


    handleCancelClick() {
        // let rCVIDs = this.imagesJSON.map(img => img.rCVID);
        // console.log('rCVIDs found inside the RTA CMP ----> ',rCVIDs);
        // console.log('this.cvLst ----> ',this.cvLst);
        // deleteContentVersions({rCVIDs : rCVIDs, allCVs: this.cvLst})
        // .then(result => {
        //     console.log('ContentVersions deleted successfully.');    
        //     const closeEvent = new CustomEvent('closemodal', {
        //         detail: {
        //             imagesJSON: this.imagesJSON,
        //             cvLst: [],
        //             process : 'Cancel'
        //         }
        //     });
        //     this.resetRTAvalues();
        //     this.dispatchEvent(closeEvent);
        // })
        // .catch(error => {
        //     console.error('Error deleting ContentVersions:', error);
        // });

        const closeEvent = new CustomEvent('closemodal', {
                detail: {
                    imagesJSON: this.imagesJSON,
                    cvLst: this.cvLst,
                    process : 'Cancel'
                }
            });
        this.resetRTAvalues();
        this.dispatchEvent(closeEvent);
        
    }

    resetRTAvalues() {
        this.originalImagesLst = [];
        this.base64Data = '';
        //this.imagesJSON = []; // this variables actually carries the data which we need
    }


    //reset functionality is removed
    // handleResetClick(event) {
    //     console.log('handleResetClick clicked');
    //     if (!this.selectedImage) {
    //         return;
    //     }
    //     const selectedCvId = this.selectedImage.cvId;

    //     const originalImage = this.originalImagesLst.find(image => image.cvId === selectedCvId);
    //     if (originalImage) {
    //         const updatedImages = this.imageLst.map(image => {
    //             if (image.cvId === selectedCvId) {
    //                 return {
    //                     ...image,
    //                     width: originalImage.width,
    //                     height: originalImage.height,
    //                     isModified: false
    //                 };
    //             }
    //             return image;
    //         });

    //         this.imageLst = updatedImages;
    //         this.selectedImage.width = originalImage.width;
    //         this.selectedImage.height = originalImage.height;
    //         this.width = this.selectedImage.width;
    //         this.height = this.selectedImage.height;
    //         //redraw image after reseeting the values
    //         this.updateImagesJSON(this.selectedImage).then(() => {
    //             this.adjustCanvasSize(this.selectedImage.width, this.selectedImage.height).then(() => {
    //                 this.drawImageOnCanvas2(this.imageUrl, this.selectedImage.width, this.selectedImage.height).then(() => {
    //                     // this.takeScreenshot();
    //                 });
    //             });
    //         });


    //         console.log('reset clicked and image dimensions reset');
    //     } else {
    //         console.error('Original image not found');
    //     }
    // }


    handleTickClick(event) {
        console.log('tick clicked -> ', event.target.dataset.id);
        const imageId = event.target.dataset.id;
        this.selectedImage = this.imageLst.find(img => img.id == imageId);
        this.adjustCanvasSize(this.selectedImage.width, this.selectedImage.height).then(() => {
            console.log('canvas size adjusted inside tick click');
            getImageBase64({ cvId: this.selectedImage.cvId })
                .then(dataURL => {
                    this.base64Data = dataURL;
                    this.imageUrl = 'data:image/png;base64,' + dataURL;
                    this.drawImageOnCanvas2(this.imageUrl, this.selectedImage.width, this.selectedImage.height).then(() => {
                        this.takeScreenshot().then(() => {
                            // Only after taking the screenshot, update the imagesJSON
                            const imagePromises = this.imagesJSON.map(imgJSON => {
                                if (imgJSON.oCVID === this.selectedImage.cvId) {
                                    const markSaved = () => {
                                        imgJSON.prevRWidth = imgJSON.rWidth;
                                        imgJSON.prevRHeight = imgJSON.rHeight;
                                        imgJSON.base64 = '';
                                        imgJSON.isModified = false;
                                        const imageInLst = this.imageLst.find(img => img.cvId === imgJSON.oCVID);
                                        if (imageInLst) {
                                            imageInLst.isModified = false;
                                            imageInLst.style = 'border: 1px solid #cbcbcb;';
                                        }
                                    };
                                    if (imgJSON.rWidth === imgJSON.oWidth && imgJSON.rHeight === imgJSON.oHeight) {
                                        // full size again: use the original file, no copy needed
                                        imgJSON.rCVID = imgJSON.oCVID;
                                        markSaved();
                                    } else if (imgJSON.rWidth !== imgJSON.prevRWidth || imgJSON.rHeight !== imgJSON.prevRHeight) {
                                        return saveImageBase64({ base64Data: imgJSON.base64, originalCvId: imgJSON.oCVID })
                                            .then(newCVID => {
                                                this.cvLst.push(newCVID);
                                                imgJSON.rCVID = newCVID;
                                                markSaved();
                                                return imgJSON;
                                            })
                                            .catch(error => {
                                                console.error('Error saving base64 data in Apex:', error);
                                                return imgJSON;
                                            });
                                    }
                                }
                                return Promise.resolve(imgJSON);
                            });

                            return Promise.all(imagePromises).then(updatedImagesJSON => {
                                this.imagesJSON = updatedImagesJSON;
                                console.log('printing imagesJSON after adding the new ContentVersion Id in the list 0---> ', this.imagesJSON);
                                this.prevSelectedImage = this.selectedImage;
                            });
                        }).catch(error => {
                            console.error('Error in handleImageClick:', error);
                        });
                    });
                });
        });
    }


    handleCrossClick(event) {
        console.log('Cross clicked  -> ', event.target.dataset.id);
        if (!this.selectedImage) {
            return;
        }
        let selectedCvId = this.selectedImage.cvId;

        let originalImage = this.originalImagesLst.find(image => image.cvId === selectedCvId);
        if (originalImage) {
            let updatedImages = this.imageLst.map(image => {
                if (image.cvId === selectedCvId) {
                    return {
                        ...image,
                        width: originalImage.width,
                        height: originalImage.height,
                        isModified: false
                    };
                }
                return image;
            });

            this.imageLst = updatedImages;
            this.selectedImage.width = originalImage.width;
            this.selectedImage.height = originalImage.height;
            this.width = this.selectedImage.width;
            this.height = this.selectedImage.height;
            //redraw image after reseeting the values
            this.updateImagesJSON(this.selectedImage).then(() => {
                this.cvStyle =  `width: ${this.selectedImage.width}px; height: ${this.selectedImage.height}px; border: 1px solid black;`;
                this.adjustCanvasSize(this.selectedImage.width, this.selectedImage.height).then(() => {
                    getImageBase64({ cvId: this.selectedImage.cvId })
                    .then(dataURL => {
                        this.base64Data = dataURL;
                        this.imageUrl = 'data:image/png;base64,' + dataURL;
                        this.drawImageOnCanvas2(this.imageUrl, this.selectedImage.width, this.selectedImage.height).then(() => {
                           console.log('image is reset on handleCrossClick');
                        });
                    });
                    
                });
            });


            console.log('reset clicked and image dimensions reset');
        } else {
            console.error('Original image not found');
        }





























        const imageId = event.target.dataset.id;
        this.selectedImage = this.imageLst.find(img => img.id == imageId);
        this.adjustCanvasSize(this.selectedImage.width, this.selectedImage.height).then(() => {
            console.log('canvas size adjusted inside tick click');
            getImageBase64({ cvId: this.selectedImage.cvId })
                .then(dataURL => {
                    this.base64Data = dataURL;
                    this.imageUrl = 'data:image/png;base64,' + dataURL;
                    this.drawImageOnCanvas(this.imageUrl, this.selectedImage.width, this.selectedImage.height).then(() => {
                       
                    });
                });
        });
    }


}