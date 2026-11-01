@IsTest
private class DisplayPDFFontNeed_Test {

    @IsTest
    static void latinTextNeedsNoSpecialFont() {
        System.assertEquals(false, DisplayPDFController.needsUnicodeFont('Plain English, 100% sure.'));
        System.assertEquals(false, DisplayPDFController.needsUnicodeFont(null));
        System.assertEquals(false, DisplayPDFController.needsUnicodeFont(''));
    }

    @IsTest
    static void accentsAndWesternPunctuationNeedNoSpecialFont() {
        System.assertEquals(false, DisplayPDFController.needsUnicodeFont('Ça va très bien, über, ñandú, ¿qué? « » „ “ ” ‘ ’ – — … € ™ •'));
    }

    @IsTest
    static void cyrillicNeedsTheUnicodeFont() {
        System.assertEquals(true, DisplayPDFController.needsUnicodeFont('Спасибо'));
    }

    @IsTest
    static void japaneseAndChineseNeedTheUnicodeFont() {
        System.assertEquals(true, DisplayPDFController.needsUnicodeFont('ありがとう'));
        System.assertEquals(true, DisplayPDFController.needsUnicodeFont('谢谢'));
    }

    @IsTest
    static void centralEuropeanLettersOutsideWesternEuropeNeedTheUnicodeFont() {
        System.assertEquals(true, DisplayPDFController.needsUnicodeFont('Łódź'));
    }

    @IsTest
    static void oneNonLatinLetterInLongLatinTextIsEnough() {
        System.assertEquals(true, DisplayPDFController.needsUnicodeFont('Hello ' + 'x'.repeat(5000) + ' мир'));
    }

    // The engine breaks lines only at spaces; CJK text has none, so a (tiny) space goes between two characters of those
    // scripts and Latin or Cyrillic text is left alone.
    @IsTest
    static void putsBreakOpportunitiesBetweenCjkCharactersOnly() {
        String brk = '<span class="cs"> </span>';
        System.assertEquals('谢' + brk + '谢', DisplayPDFController.addCjkLineBreaks('谢谢'));
        System.assertEquals('Hello world', DisplayPDFController.addCjkLineBreaks('Hello world'));
        System.assertEquals('Привет мир', DisplayPDFController.addCjkLineBreaks('Привет мир'));
        System.assertEquals('ab谢' + brk + '谢cd', DisplayPDFController.addCjkLineBreaks('ab谢谢cd'));
        System.assertEquals('谢 x 谢', DisplayPDFController.addCjkLineBreaks('谢 x 谢'));
    }

    @IsTest
    static void doesNotTouchHtmlTagsOrAttributes() {
        String brk = '<span class="cs"> </span>';
        System.assertEquals('<p title="谢谢">谢' + brk + '谢</p>', DisplayPDFController.addCjkLineBreaks('<p title="谢谢">谢谢</p>'));
        System.assertEquals(null, DisplayPDFController.addCjkLineBreaks(null));
    }

    // The text of a long document goes through the function: a list with one number per character used up the heap
    // (25 MB for a 1.8 MB document) and the PDF could not be made.
    @IsTest
    static void aLongDocumentWithoutCjkTextIsReturnedUnchangedWithoutHeapProblems() {
        String longHtml = '<p>Line of text</p>'.repeat(110000);
        System.assertEquals(longHtml.length(), DisplayPDFController.addCjkLineBreaks(longHtml).length());
    }

    @IsTest
    static void aLongDocumentWithCjkTextGetsItsBreaksWithoutHeapProblems() {
        String brk = '<span class="cs"> </span>';
        String longHtml = '<p>x</p>'.repeat(100000) + '谢谢' + '<p>y</p>'.repeat(100000);
        String result = DisplayPDFController.addCjkLineBreaks(longHtml);
        System.assertEquals(longHtml.length() + brk.length(), result.length());
        System.assert(result.contains('谢' + brk + '谢'));
    }
}
