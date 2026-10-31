// The values the Page Properties dialog starts with. A function, so that every caller gets its own copy (the dialog edits
// the objects in place) and a template without saved properties can be reset to them.
export function defaultPageProperties() {
    return {
        pageMargins: {
            leftMargin: { value: 10, unit: 'px' },
            rightMargin: { value: 10, unit: 'px' },
            topMargin: { value: 10, unit: 'px' },
            bottomMargin: { value: 10, unit: 'px' },
            lineheight: { value: 1.2, unit: 'px' }
        },
        footerProperties: {
            height: { value: 80, unit: 'px' },
            margins: {
                leftMargin: { value: 10, unit: 'px' },
                rightMargin: { value: 10, unit: 'px' },
                topMargin: { value: 10, unit: 'px' },
                bottomMargin: { value: 10, unit: 'px' },
                lineHeight: { value: 1.2 }
            },
            paddings: {
                topPadding: { value: 10, unit: 'px' },
                bottomPadding: { value: 10, unit: 'px' },
                leftPadding: { value: 10, unit: 'px' },
                rightPadding: { value: 10, unit: 'px' }
            },
            lineHeight: { value: 15, unit: 'px' },
            borderColor: { value: '#000000' },
            borderOpacity: 1,
            borderWeight: { value: 1, unit: 'px' },
            separateBorders: []
        },
        firstHeaderProperties: headerDefaults(),
        secondHeaderProperties: headerDefaults()
    };
}

function headerDefaults() {
    return {
        height: { value: '80', unit: 'px' },
        margins: {
            leftMargin: { value: '10', unit: 'px' },
            rightMargin: { value: '10', unit: 'px' },
            topMargin: { value: '10', unit: 'px' },
            bottomMargin: { value: '10', unit: 'px' }
        },
        paddings: {
            topPadding: { value: 10, unit: 'px' },
            bottomPadding: { value: 10, unit: 'px' },
            leftPadding: { value: 10, unit: 'px' },
            rightPadding: { value: 10, unit: 'px' }
        },
        lineHeight: { value: '1', unit: 'px' },
        borderColor: { value: '#000000' },
        bgColor: { value: '#FFFFFF' },
        borderOpacity: '1',
        borderWeight: { value: '1', unit: 'px' },
        separateBorders: []
    };
}
