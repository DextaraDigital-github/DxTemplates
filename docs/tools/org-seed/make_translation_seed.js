// Writes docs/tools/org-seed/seed_translations.apex: a template "ZZ Translation Test" (Header, Context, Footer) whose texts are
// <<tokens>>, and Translator__c records for seven languages: single words, a sentence, a greeting that contains a merge field,
// a long paragraph, special characters (& < > quotes % currency) and translations of merge-field VALUES (Type, Industry).
// The Apex file is written with \u escapes so that the encoding of the terminal cannot damage the texts.
// Run: node docs/tools/org-seed/make_translation_seed.js, then: sf apex run -o <org> -f docs/tools/org-seed/seed_translations.apex
const fs = require('fs');
const path = require('path');

const languages = {
    en_US: {
        WordTitle: 'Translation test', Word1: 'Welcome', Word2: 'Thanks', Word3: 'Invoice',
        Sentence: 'Thank you for your order, we will ship it very soon.',
        GreetName: 'Hello {!Account.Name}, welcome back!',
        Paragraph: 'This agreement describes how we handle your data, your orders and your payments. If an item is damaged on arrival (or does not match the description), tell us within 30 days, and we will repair it, replace it or refund the full price, whichever you prefer. Questions about this text? Write to the address on the first page, quoting the number of this document.',
        Special: 'Terms & Conditions <apply> "quoted" 50% $100',
        HeaderLeft: 'Example Company', HeaderRight: 'Confidential', FooterNote: 'All rights reserved, document generated automatically',
        Type: 'Customer - Direct', Industry: 'Technology'
    },
    fr: {
        WordTitle: 'Test de traduction', Word1: 'Bienvenue', Word2: 'Merci', Word3: 'Facture',
        Sentence: 'Merci pour votre commande, nous l\'expédierons très bientôt.',
        GreetName: 'Bonjour {!Account.Name}, bon retour parmi nous !',
        Paragraph: 'Cet accord décrit la façon dont nous traitons vos données, vos commandes et vos paiements. Si un article est endommagé à l\'arrivée (ou ne correspond pas à la description), dites-le-nous dans un délai de 30 jours, et nous le réparerons, le remplacerons ou rembourserons le prix total, selon votre préférence. Des questions sur ce texte ? Écrivez à l\'adresse de la première page en indiquant le numéro de ce document.',
        Special: 'Conditions générales & <applicables> « citées » 50 % 100 €',
        HeaderLeft: 'Entreprise Exemple', HeaderRight: 'Confidentiel', FooterNote: 'Tous droits réservés, document généré automatiquement',
        Type: 'Client - Direct', Industry: 'Technologie'
    },
    de: {
        WordTitle: 'Übersetzungstest', Word1: 'Willkommen', Word2: 'Danke', Word3: 'Rechnung',
        Sentence: 'Vielen Dank für Ihre Bestellung, wir versenden sie in Kürze.',
        GreetName: 'Hallo {!Account.Name}, schön, Sie wieder zu sehen!',
        Paragraph: 'Diese Vereinbarung beschreibt, wie wir mit Ihren Daten, Ihren Bestellungen und Ihren Zahlungen umgehen. Wenn ein Artikel beschädigt ankommt (oder nicht der Beschreibung entspricht), teilen Sie uns das innerhalb von 30 Tagen mit, und wir reparieren, ersetzen oder erstatten den vollen Preis, ganz wie Sie möchten. Fragen zu diesem Text? Schreiben Sie an die Adresse auf der ersten Seite und nennen Sie die Nummer dieses Dokuments.',
        Special: 'Allgemeine Geschäftsbedingungen & <gelten> „zitiert“ 50 % 100 €',
        HeaderLeft: 'Beispielfirma', HeaderRight: 'Vertraulich', FooterNote: 'Alle Rechte vorbehalten, Dokument automatisch erstellt',
        Type: 'Kunde - Direkt', Industry: 'Technologie'
    },
    es: {
        WordTitle: 'Prueba de traducción', Word1: 'Bienvenido', Word2: 'Gracias', Word3: 'Factura',
        Sentence: 'Gracias por su pedido, lo enviaremos muy pronto.',
        GreetName: '¡Hola {!Account.Name}, bienvenido de nuevo!',
        Paragraph: 'Este acuerdo describe cómo tratamos sus datos, sus pedidos y sus pagos. Si un artículo llega dañado (o no coincide con la descripción), avísenos en un plazo de 30 días y lo repararemos, lo sustituiremos o le devolveremos el precio completo, lo que usted prefiera. ¿Preguntas sobre este texto? Escriba a la dirección de la primera página indicando el número de este documento.',
        Special: 'Términos y condiciones & <aplican> «citado» 50 % 100 €',
        HeaderLeft: 'Empresa Ejemplo', HeaderRight: 'Confidencial', FooterNote: 'Todos los derechos reservados, documento generado automáticamente',
        Type: 'Cliente - Directo', Industry: 'Tecnología'
    },
    ru: {
        WordTitle: 'Тест перевода', Word1: 'Добро пожаловать', Word2: 'Спасибо', Word3: 'Счёт',
        Sentence: 'Спасибо за ваш заказ, мы отправим его очень скоро.',
        GreetName: 'Здравствуйте, {!Account.Name}, с возвращением!',
        Paragraph: 'Это соглашение описывает, как мы обращаемся с вашими данными, заказами и платежами. Если товар прибыл повреждённым (или не соответствует описанию), сообщите нам в течение 30 дней, и мы отремонтируем его, заменим или вернём полную стоимость, как вам удобнее. Есть вопросы по этому тексту? Напишите по адресу на первой странице, указав номер этого документа.',
        Special: 'Условия & <действуют> «в кавычках» 50 % 100 €',
        HeaderLeft: 'Компания Пример', HeaderRight: 'Конфиденциально', FooterNote: 'Все права защищены, документ создан автоматически',
        Type: 'Клиент - Прямой', Industry: 'Технологии'
    },
    ja: {
        WordTitle: '翻訳テスト', Word1: 'ようこそ', Word2: 'ありがとう', Word3: '請求書',
        Sentence: 'ご注文ありがとうございます。まもなく発送いたします。',
        GreetName: '{!Account.Name} 様、おかえりなさい！',
        Paragraph: '本契約は、お客様のデータ、ご注文、お支払いの取り扱い方法について説明するものです。商品が破損して届いた場合（または説明と異なる場合）は、30日以内にご連絡ください。ご希望に応じて、修理、交換、または全額返金いたします。この文書についてご質問がありましたら、最初のページに記載の住所まで、文書番号を添えてご連絡ください。',
        Special: '利用規約 & <適用> 「引用」 50％ ¥100',
        HeaderLeft: 'サンプル株式会社', HeaderRight: '社外秘', FooterNote: '無断転載禁止、この文書は自動生成されました',
        Type: '顧客 - 直接', Industry: 'テクノロジー'
    },
    zh_CN: {
        WordTitle: '翻译测试', Word1: '欢迎', Word2: '谢谢', Word3: '发票',
        Sentence: '感谢您的订单，我们将尽快发货。',
        GreetName: '您好 {!Account.Name}，欢迎回来！',
        Paragraph: '本协议说明了我们如何处理您的数据、订单和付款。如果商品到货时已损坏（或与描述不符），请在30天内告知我们，我们将根据您的选择维修、更换或全额退款。对本文有疑问？请按第一页上的地址写信给我们，并注明本文件的编号。',
        Special: '条款和条件 & <适用> “引用” 50% ¥100',
        HeaderLeft: '示例公司', HeaderRight: '机密', FooterNote: '版权所有，本文件由系统自动生成',
        Type: '客户 - 直接', Industry: '科技'
    }
};

const esc = s => s.replace(/\\/g, '\\\\').replace(/'/g, '\\\'').replace(/[^\x20-\x7e]/g, c => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));
const token = name => '&lt;&lt;' + name + '&gt;&gt;';

const context = [
    '<h2>' + token('WordTitle') + '</h2>',
    '<p>Single words: <b>' + token('Word1') + '</b> | <b>' + token('Word2') + '</b> | <b>' + token('Word3') + '</b></p>',
    '<p>Sentence: ' + token('Sentence') + '</p>',
    '<p>Greeting with a merge field inside the translation: ' + token('GreetName') + '</p>',
    '<p>Long text: ' + token('Paragraph') + '</p>',
    '<p>Special characters: ' + token('Special') + '</p>',
    '<p>Values of the record: {!Account.Type} / {!Account.Industry}</p>',
    '<p>Token without translation: ' + token('NoTranslation') + '</p>'
].join('');
const header = { sectionsCount: '3', sectionsFirstCount: null, sectionsContent: [
    { value: '<p>' + token('HeaderLeft') + '</p>', indexvar: 0, key: 'h0' },
    { value: '<p>{!Account.Name}</p>', indexvar: 1, key: 'h1' },
    { value: '<p>' + token('HeaderRight') + '</p>', indexvar: 2, key: 'h2' }
] };
const footer = { sectionsCount: '1', displaypagesequence: true, sectionsContent: [{ value: '<p>' + token('FooterNote') + '</p>', indexvar: 0, key: 'f0' }] };

const lines = [];
lines.push("// GENERATED by make_translation_seed.js, do not edit by hand.");
lines.push("String templateName = 'ZZ Translation Test';");
lines.push("List<DxCPQ__Document_Template__c> existing = [SELECT Id FROM DxCPQ__Document_Template__c WHERE Name = :templateName LIMIT 1];");
lines.push("DxCPQ__Document_Template__c tmpl;");
lines.push("if (existing.isEmpty()) {");
lines.push("    DxCPQ__Document_Template__c basis = [SELECT DxCPQ__PDF_Page_Properties__c FROM DxCPQ__Document_Template__c WHERE Name = 'ZZ Clip Test' LIMIT 1];");
lines.push("    tmpl = new DxCPQ__Document_Template__c(Name = templateName, DxCPQ__Related_To_Type__c = 'Account', DxCPQ__PDF_Page_Properties__c = basis.DxCPQ__PDF_Page_Properties__c);");
lines.push("    insert tmpl;");
lines.push("    insert new List<DxCPQ__Document_Template_Section__c>{");
lines.push("        new DxCPQ__Document_Template_Section__c(Name = 'Header', DxCPQ__Type__c = 'Header', DxCPQ__Sequence__c = -1, DxCPQ__Document_Template__c = tmpl.Id, DxCPQ__Section_Content__c = '" + esc(JSON.stringify(header)) + "'),");
lines.push("        new DxCPQ__Document_Template_Section__c(Name = 'Translated text', DxCPQ__Type__c = 'Context', DxCPQ__Sequence__c = 0, DxCPQ__Document_Template__c = tmpl.Id, DxCPQ__Section_Content__c = '" + esc(context) + "'),");
lines.push("        new DxCPQ__Document_Template_Section__c(Name = 'Footer', DxCPQ__Type__c = 'Footer', DxCPQ__Sequence__c = 1, DxCPQ__Document_Template__c = tmpl.Id, DxCPQ__Section_Content__c = '" + esc(JSON.stringify(footer)) + "')");
lines.push("    };");
lines.push("} else { tmpl = existing[0]; }");
lines.push("Integer already = [SELECT COUNT() FROM DxCPQ__Translator__c WHERE DxCPQ__DocumentTemplate__c = :tmpl.Id];");
lines.push("if (already == 0) {");
lines.push("    List<DxCPQ__Translator__c> rows = new List<DxCPQ__Translator__c>();");
for (const [lang, texts] of Object.entries(languages)) {
    const add = (name, field, value) => lines.push("    rows.add(new DxCPQ__Translator__c(Name = '" + esc(name) + "', DxCPQ__FieldValue__c = '" + esc(field) + "', DxCPQ__Translated_Value__c = '" + esc(value) + "', DxCPQ__Language__c = '" + lang + "', DxCPQ__DocumentTemplate__c = tmpl.Id));");
    ['WordTitle', 'Word1', 'Word2', 'Word3', 'Sentence', 'GreetName', 'Paragraph', 'Special', 'HeaderLeft', 'HeaderRight', 'FooterNote'].forEach(n => add(n, n, texts[n]));
    // Values of the record: the English value is what the Account holds.
    add('Type value', languages.en_US.Type, texts.Type);
    add('Industry value', languages.en_US.Industry, texts.Industry);
}
lines.push("    insert rows;");
lines.push("}");
lines.push("System.debug('SEEDED ' + tmpl.Id + ' translations ' + [SELECT COUNT() FROM DxCPQ__Translator__c WHERE DxCPQ__DocumentTemplate__c = :tmpl.Id]);");

const out = path.join(__dirname, 'seed_translations.apex');
fs.writeFileSync(out, lines.join('\n') + '\n');
console.log('written ' + out + ' (' + lines.length + ' lines)');
