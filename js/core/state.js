'use strict';

/* ============================================================
   STATE
   ============================================================ */
var _ids = 0;
function nextId() { _ids++; return 'n' + _ids; }

var STATE = {
    tree: { id: nextId(), type: 'folder', name: 'proiect', expanded: true, children: [] },
    fileContents: {},
    openTabs: [],
    activeFile: null,
    contextNode: null,
    prefs: {
        strict: true, romanian: true, inlineStyle: false,
        highlight: false, autoClose: false, osBanner: true, dark: false,
        antiHang: true, allowTransitional: true,
        startMenuStyle: 'modern'
    },
    os: 'unknown',
    bannerDismissed: false,
    isMobile: false,
    binaryPatches: {
        bypassCurriculum: false, curriculumNonBlocking: false, bypassOSCheck: false,
        effects: { suppressTraceback: false, forceTraceback: false, curriculumNonBlocking: false, visualGlitch: false, hideRegs: false, hideLog: false, programBroken: false }
    },
    patches: {},
    exploit: {
        injected: { fmt: false, memcpy: false, x11: false },
        stage: 0, shellUser: 'student', shellCwd: '/srv', shellHistory: [], x11Ready: false
    },
    appliance: {
        connected: false,
        user: 'student',
        cwd: '/srv',
        env: { SHELL: '/bin/ksh', HOSTNAME: 'qnx-appliance-01' },
        fs: {
            '/': ['srv', 'dev', 'proc', 'etc', 'tmp', 'var'],
            '/srv': ['backend', 'notes.txt'],
            '/srv/backend': ['main.cpp', 'legacy_engine.pas', 'parser.alg', 'README.txt'],
            '/dev': ['console', 'null', 'io-net'],
            '/proc': ['boot', '1', '1337', '2001'],
            '/etc': ['hosts', 'inetd.conf'],
            '/tmp': [],
            '/var': ['log']
        },
        files: {
            '/srv/notes.txt': 'QNX appliance operator notes.\nUse pterm for ksh commands.',
            '/srv/backend/main.cpp': '',
            '/srv/backend/legacy_engine.pas': '',
            '/srv/backend/parser.alg': '',
            '/srv/backend/README.txt': 'Legacy backend bundle. Contains C++, Pascal and Algol sources.'
        },
        processes: [
            { pid: 1, cmd: 'procnto', stat: 'S' },
            { pid: 1337, cmd: 'gdx-debugd', stat: 'S' },
            { pid: 2001, cmd: 'legacy-ide.so', stat: 'R' }
        ],
        sockets: [
            'tcp 0 0 10.0.0.13:4444 10.0.0.22:53192 ESTABLISHED',
            'tcp 0 0 127.0.0.1:22 0.0.0.0:* LISTEN'
        ],
        services: { photon: false, network: true, markdown: false },
        windows: { terminal: false, files: false, processes: false, network: false },
        filePreviewPath: null,
        termHistory: [],
        termHistoryIdx: 0,
        activeWindow: null,
        windowMeta: {
            terminal: { left: 70, top: 60, width: 520, height: 300 },
            files: { left: 160, top: 90, width: 520, height: 300 },
            processes: { left: 220, top: 130, width: 520, height: 300 },
            network: { left: 280, top: 170, width: 520, height: 300 }
        }
    },
    dbgOpen: false, rip: 0, activeFn: 'check_curriculum'
};

var SHELL_FILES = {
    '/srv/backend/main.cpp':
        '#include <iostream>\n' +
        '#include "validator.hpp"\n\n' +
        'int main() {\n' +
        '    LegacyValidator v;\n' +
        '    std::cout << v.runPolicy2001() << std::endl;\n' +
        '    return 0;\n' +
        '}\n',
    '/srv/backend/legacy_engine.pas':
        'program LegacyEngine;\n' +
        'var i: Integer;\n' +
        'begin\n' +
        '  i := 0;\n' +
        '  while i < 3 do\n' +
        '  begin\n' +
        '    writeln(\'Curriculum guard #\', i);\n' +
        '    i := i + 1;\n' +
        '  end;\n' +
        'end.\n',
    '/srv/backend/parser.alg':
        'BEGIN\n' +
        '  INTEGER TOKENS;\n' +
        '  TOKENS := SCAN(RULESET);\n' +
        '  IF TOKENS > 0 THEN TRACEBACK(TOKENS) FI;\n' +
        'END\n'
};
STATE.appliance.files['/srv/backend/main.cpp'] = SHELL_FILES['/srv/backend/main.cpp'];
STATE.appliance.files['/srv/backend/legacy_engine.pas'] = SHELL_FILES['/srv/backend/legacy_engine.pas'];
STATE.appliance.files['/srv/backend/parser.alg'] = SHELL_FILES['/srv/backend/parser.alg'];

var STARTER_HTML =
'<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"\n' +
'    "http://www.w3.org/TR/html4/strict.dtd">\n' +
'<HTML>\n<HEAD>\n    <TITLE>Tema la TIC - clasa a IX-a</TITLE>\n</HEAD>\n' +
'<BODY bgcolor="#CCCCCC" text="#000000">\n' +
'    <CENTER>\n        <FONT face="Arial" size="5" color="#0000AA">\n' +
'            <B>Primul meu site web</B>\n        </FONT>\n    </CENTER>\n    <HR>\n' +
'    <TABLE border="1" cellpadding="5" bgcolor="#FFFFFF" align="center">\n' +
'        <TR bgcolor="#EEEEEE">\n            <TH>Nume</TH><TH>Materie</TH><TH>Nota</TH>\n        </TR>\n' +
'        <TR>\n            <TD>Popescu Ion</TD><TD>TIC</TD><TD>10</TD>\n        </TR>\n    </TABLE>\n' +
'    <MARQUEE>Bine ati venit pe pagina mea!</MARQUEE>\n</BODY>\n</HTML>';

var STARTER_JS =
'// Programa TIC clasa a IX-a - exemplu permis\n\n' +
'function calculeazaMedia(n1, n2, n3) {\n    var suma = n1 + n2 + n3;\n    return suma / 3;\n}\n\n' +
'var nume = prompt("Introduceti numele elevului:");\n' +
'var nota1 = parseFloat(prompt("Nota 1:"));\n' +
'var nota2 = parseFloat(prompt("Nota 2:"));\n' +
'var nota3 = parseFloat(prompt("Nota 3:"));\n\n' +
'var media = calculeazaMedia(nota1, nota2, nota3);\n\n' +
'document.write("<H2>Rezultat</H2>");\n' +
'document.write("<P>Elev: " + nume + "</P>");\n' +
'document.write("<P>Media aritmetica: " + media.toFixed(2) + "</P>");\n\n' +
'if (media >= 5) {\n    alert("Promovat!");\n} else {\n    alert("Corigent la TIC.");\n}';

(function seed() {
    var html = { id: nextId(), type: 'file', name: 'index.html' };
    var js   = { id: nextId(), type: 'file', name: 'script.js' };
    STATE.tree.children.push(html, js);
    STATE.fileContents[html.id] = STARTER_HTML;
    STATE.fileContents[js.id]   = STARTER_JS;
    STATE.openTabs = [html.id, js.id];
    STATE.activeFile = html.id;
})();

/* ============================================================
   LINT RULES
   ============================================================ */
var HTML_RULES = [
    { label: '<!DOCTYPE html>', test: /<!DOCTYPE\s+html\s*>/i, year: 2014, standard: 'HTML5',
      remedy: 'Utilizați doctype-ul standard:\n  <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"\n      "http://www.w3.org/TR/html4/strict.dtd">' },
    { label: '<!DOCTYPE HTML 4.01 Transitional>', test: /<!DOCTYPE[^>]*HTML\s+4\.01\s+Transitional/i, year: 1999, standard: 'HTML 4.01 Transitional (deprecat în 2001)',
      remedy: 'Standardul 2001 este HTML 4.01 Strict. Folosiți:\n  <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"\n      "http://www.w3.org/TR/html4/strict.dtd">' },
    { label: 'atribut style=""', test: /\sstyle\s*=\s*["\']/i, year: 2001, standard: 'CSS inline',
      remedy: 'Atributul style nu este predat la TIC. Utilizați bgcolor, text, color, face, size, border, align.', prefKey: 'inlineStyle' },
    // HTML5 structural and semantic elements
    { label: '<section>', test: /<\s*section\b/i, year: 2014, standard: 'HTML5 semantic', remedy: 'Pentru structura paginii utilizați <TABLE>.' },
    { label: '<article>', test: /<\s*article\b/i, year: 2014, standard: 'HTML5 semantic', remedy: 'Înlocuiți cu <DIV> sau <TABLE>.' },
    { label: '<nav>', test: /<\s*nav\b/i, year: 2014, standard: 'HTML5 semantic', remedy: 'Folosiți tabele sau liste <UL>.' },
    { label: '<header>', test: /<\s*header\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <CENTER><H1>titlu</H1></CENTER>.' },
    { label: '<footer>', test: /<\s*footer\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <HR> + <CENTER><FONT size="1">...</FONT></CENTER>.' },
    { label: '<main>', test: /<\s*main\b/i, year: 2014, standard: 'HTML5', remedy: 'Înlocuiți cu <DIV>.' },
    { label: '<aside>', test: /<\s*aside\b/i, year: 2014, standard: 'HTML5 semantic', remedy: 'Folosiți <TABLE> cu o coloană laterală sau <DIV align="right">.' },
    { label: '<figure>', test: /<\s*figure\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <TABLE> pentru a grupa imaginea și legenda.' },
    { label: '<figcaption>', test: /<\s*figcaption\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți o celulă <TD> cu text descriptiv.' },
    { label: '<details>', test: /<\s*details\b/i, year: 2014, standard: 'HTML5', remedy: 'Simulați cu JavaScript (onclick + style.display).' },
    { label: '<summary>', test: /<\s*summary\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți un <B> sau <H3> ca titlu pentru secțiunea ascunsă.' },
    { label: '<dialog>', test: /<\s*dialog\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți window.open("dialog.html","","width=...").' },
    { label: '<progress>', test: /<\s*progress\b/i, year: 2014, standard: 'HTML5', remedy: 'Simulați cu <TABLE> și celule colorate.' },
    { label: '<meter>', test: /<\s*meter\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <TABLE> cu bgcolor-uri diferite.' },
    { label: '<mark>', test: /<\s*mark\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <B> sau <FONT color="yellow">.' },
    { label: '<time>', test: /<\s*time\b/i, year: 2014, standard: 'HTML5', remedy: 'Scrieți data ca text simplu.' },
    { label: '<picture>', test: /<\s*picture\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <IMG src="..." alt="...">.' },
    { label: '<source>', test: /<\s*source\b/i, year: 2014, standard: 'HTML5', remedy: 'Elementul face parte din <PICTURE>/<VIDEO>. Folosiți <EMBED> sau <IMG>.' },
    { label: '<template>', test: /<\s*template\b/i, year: 2014, standard: 'HTML5', remedy: 'Păstrați HTML-ul într-un string JS și inserați cu innerHTML (nepredat).' },
    { label: '<slot>', test: /<\s*slot\b/i, year: 2014, standard: 'Web Components', remedy: 'Componentele web nu sunt în programă.' },
    { label: '<bdi>', test: /<\s*bdi\b/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <BDO dir="...">.' },
    { label: '<wbr>', test: /<\s*wbr\b/i, year: 2014, standard: 'HTML5', remedy: 'Rupeți manual cuvintele cu &shy; (soft hyphen).' },
    { label: '<ruby>', test: /<\s*ruby\b/i, year: 2014, standard: 'HTML5', remedy: 'Neaplicabil în programa 2001.' },
    // HTML5 media
    { label: '<video>', test: /<\s*video\b/i, year: 2014, standard: 'HTML5 multimedia', remedy: 'Folosiți <EMBED src="film.swf"> cu Macromedia Flash.' },
    { label: '<audio>', test: /<\s*audio\b/i, year: 2014, standard: 'HTML5 multimedia', remedy: 'Folosiți <BGSOUND src="melodie.mid" loop="infinite">.' },
    { label: '<track>', test: /<\s*track\b/i, year: 2014, standard: 'HTML5', remedy: 'Elementul ține de <VIDEO>/<AUDIO>, care nu sunt în programă.' },
    { label: '<canvas>', test: /<\s*canvas\b/i, year: 2014, standard: 'HTML5', remedy: 'Grafica se realizează cu <IMG> sau applet Java.' },
    { label: '<svg>', test: /<\s*svg\b/i, year: 2011, standard: 'SVG 1.1 / HTML5 integration', remedy: 'Folosiți <IMG src="grafic.gif">.' },
    // HTML5 form types
    { label: 'input type="email"', test: /type\s*=\s*["\']email["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text" și verificați în JavaScript.' },
    { label: 'input type="date"', test: /type\s*=\s*["\']date["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text" cu format "zz/ll/aaaa".' },
    { label: 'input type="number"', test: /type\s*=\s*["\']number["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text" și parseInt().' },
    { label: 'input type="range"', test: /type\s*=\s*["\']range["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text" și validați manual.' },
    { label: 'input type="color"', test: /type\s*=\s*["\']color["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți <SELECT> cu opțiuni de culori.' },
    { label: 'input type="search"', test: /type\s*=\s*["\']search["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text".' },
    { label: 'input type="tel"', test: /type\s*=\s*["\']tel["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text" și verificați cu o expresie regulată.' },
    { label: 'input type="url"', test: /type\s*=\s*["\']url["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text".' },
    { label: 'input type="time"', test: /type\s*=\s*["\']time["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text" cu format "hh:mm".' },
    { label: 'input type="datetime-local"', test: /type\s*=\s*["\']datetime-local["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți două <INPUT type="text">.' },
    { label: 'input type="month"', test: /type\s*=\s*["\']month["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți <SELECT> cu 12 opțiuni.' },
    { label: 'input type="week"', test: /type\s*=\s*["\']week["\']/i, year: 2014, standard: 'HTML5 forms', remedy: 'Folosiți type="text".' },
    { label: 'atribut placeholder', test: /\splaceholder\s*=/i, year: 2014, standard: 'HTML5 forms', remedy: 'Setați value="..." și ștergeți la onfocus.' },
    { label: 'atribut required', test: /\srequired(\s|=|>)/i, year: 2014, standard: 'HTML5 forms', remedy: 'Validați manual în onsubmit.' },
    { label: 'atribut autofocus', test: /\sautofocus(\s|=|>)/i, year: 2014, standard: 'HTML5 forms', remedy: 'Apelați field.focus() din onload.' },
    { label: 'atribut autocomplete', test: /\sautocomplete\s*=/i, year: 2005, standard: 'Non-standard / HTML5', remedy: 'Nu face parte din HTML 4.01 Strict. Ștergeți-l.' },
    { label: 'atribut novalidate', test: /\snovalidate(\s|=|>)/i, year: 2014, standard: 'HTML5 forms', remedy: 'Nu este prevăzut în programă.' },
    { label: 'atribut pattern', test: /\spattern\s*=/i, year: 2014, standard: 'HTML5 forms', remedy: 'Validați în JavaScript cu new RegExp().' },
    { label: 'atribut contenteditable', test: /\scontenteditable\s*=/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <TEXTAREA>.' },
    { label: 'atribut draggable', test: /\sdraggable\s*=/i, year: 2014, standard: 'HTML5 Drag&Drop', remedy: 'Nu este predat.' },
    { label: 'atribut hidden', test: /\shidden(\s|=|>)/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți JS: el.style.visibility="hidden" (sau nepredat).' },
    { label: 'atribut spellcheck', test: /\sspellcheck\s*=/i, year: 2014, standard: 'HTML5', remedy: 'Nu există în programă.' },
    { label: 'atribut translate', test: /\stranslate\s*=/i, year: 2014, standard: 'HTML5', remedy: 'Nu este predat.' },
    { label: 'atribut data-*', test: /\sdata-[a-z]+\s*=/i, year: 2014, standard: 'HTML5', remedy: 'Nu este prevăzut în programă.' },
    { label: 'atribut role (ARIA)', test: /\srole\s*=\s*["\']/i, year: 2014, standard: 'WAI-ARIA', remedy: 'Accesibilitatea ARIA nu este predată la TIC 2001.' },
    { label: 'atribut aria-*', test: /\saria-[a-z]+\s*=/i, year: 2014, standard: 'WAI-ARIA', remedy: 'Nu este prevăzut în programă.' },
    { label: 'atribut download', test: /\sdownload(\s|=|>)/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți <A href="fisier.zip"> simplu.' },
    { label: 'atribut srcset', test: /\ssrcset\s*=/i, year: 2014, standard: 'HTML5 responsive', remedy: 'Folosiți <IMG src="..." width="..." height="...">.' },
    { label: 'atribut sizes', test: /\ssizes\s*=/i, year: 2014, standard: 'HTML5 responsive', remedy: 'Ștergeți. Folosiți width/height.' },
    { label: 'atribut loading', test: /\sloading\s*=/i, year: 2019, standard: 'HTML living standard', remedy: 'Nu este în programă.' },
    { label: 'atribut crossorigin', test: /\scrossorigin\s*=/i, year: 2014, standard: 'HTML5', remedy: 'Nu este predat.' },
    { label: 'atribut integrity (SRI)', test: /\sintegrity\s*=/i, year: 2016, standard: 'Subresource Integrity', remedy: 'Nu este în programă.' },
    { label: '<meta charset="UTF-8">', test: /<\s*meta\s+charset\s*=/i, year: 2014, standard: 'HTML5', remedy: 'Folosiți forma 4.01: <META http-equiv="Content-Type" content="text/html; charset=ISO-8859-2">.' },
    // Deprecated-in-Strict-but-OK-in-Transitional elements commonly misused
    { label: '<iframe>', test: /<\s*iframe\b/i, year: 1997, standard: 'HTML 4.01 Transitional', remedy: 'Nu există în HTML 4.01 Strict. Folosiți <OBJECT data="pagina.html"> sau activați "Acceptă HTML 4.01 Transitional" în Preferințe.', prefKey: 'allowTransitional' },
    { label: 'atribut target="_blank"', test: /\starget\s*=\s*["\']_blank["\']/i, year: 1997, standard: 'HTML 4.01 Transitional', remedy: 'Nu este în Strict. Deschideți cu window.open("...") sau activați "Acceptă HTML 4.01 Transitional" în Preferințe.', prefKey: 'allowTransitional' }
];

var JS_RULES = [
    // ES5 strict/syntax
    { label: '"use strict"', test: /["']use strict["']/, year: 2009, standard: 'ES5', remedy: 'Nu există în ES Ed.3. Ștergeți directiva.' },
    // ES6+ syntax
    { label: 'let', test: /\blet\s+[a-zA-Z_$]/, year: 2015, standard: 'ES6', remedy: 'Utilizați var.' },
    { label: 'const', test: /\bconst\s+[a-zA-Z_$]/, year: 2015, standard: 'ES6', remedy: 'Utilizați var.' },
    { label: 'funcție săgeată =>', test: /=>/, year: 2015, standard: 'ES6 Arrow Functions', remedy: 'Utilizați function(...) { ... }.' },
    { label: 'template literal (backtick)', test: /`[^`]*`/, year: 2015, standard: 'ES6', remedy: 'Utilizați concatenare cu "+".' },
    { label: 'keyword class', test: /\bclass\s+[a-zA-Z_$][\w$]*/, year: 2015, standard: 'ES6 Classes', remedy: 'Utilizați function Constructor() și prototype.' },
    { label: 'extends', test: /\bextends\s+[a-zA-Z_$]/, year: 2015, standard: 'ES6 Classes', remedy: 'Realizați moștenirea prin prototype chain.' },
    { label: 'super', test: /\bsuper\s*[.\(]/, year: 2015, standard: 'ES6 Classes', remedy: 'Apelați constructorul părinte cu Parent.call(this, ...).' },
    { label: 'async function', test: /\basync\s+function/, year: 2017, standard: 'ES2017', remedy: 'Utilizați funcții sincrone sau callback-uri.' },
    { label: 'await', test: /\bawait\s+/, year: 2017, standard: 'ES2017', remedy: 'Utilizați callback-uri.' },
    { label: 'function* (generator)', test: /function\s*\*/, year: 2015, standard: 'ES6 Generators', remedy: 'Nu este în programă. Folosiți funcții normale.' },
    { label: 'yield', test: /\byield\s/, year: 2015, standard: 'ES6 Generators', remedy: 'Nu există în ES Ed.3.' },
    { label: 'import', test: /^\s*import\s+/m, year: 2015, standard: 'ES6 Modules', remedy: 'Utilizați <SCRIPT src="...">.' },
    { label: 'export', test: /^\s*export\s+/m, year: 2015, standard: 'ES6 Modules', remedy: 'Declarați funcții globale.' },
    { label: 'for...of', test: /\bfor\s*\(\s*(?:var\s+|let\s+|const\s+)?[a-zA-Z_$][\w$]*\s+of\s+/, year: 2015, standard: 'ES6', remedy: 'Utilizați for(var i=0; i<a.length; i++).' },
    { label: 'spread/rest ...', test: /\.\.\.[a-zA-Z_$\[{]/, year: 2015, standard: 'ES6', remedy: 'Utilizați .apply() sau copiere manuală.' },
    { label: 'destructuring { a } =', test: /(?:var|let|const)\s*\{[^}]+\}\s*=/, year: 2015, standard: 'ES6', remedy: 'Scrieți: var a = obj.a;' },
    { label: 'destructuring [ a ] =', test: /(?:var|let|const)\s*\[[^\]]+\]\s*=/, year: 2015, standard: 'ES6', remedy: 'Scrieți: var a = arr[0];' },
    { label: 'default params', test: /function\s*[a-zA-Z_$]*\s*\([^)]*=\s*[^,)]+/, year: 2015, standard: 'ES6', remedy: 'if (typeof x === "undefined") x = 0;' },
    { label: 'operator ** (exponent)', test: /[^*]\*\*[^*=]/, year: 2016, standard: 'ES2016', remedy: 'Folosiți Math.pow(a, b).' },
    { label: 'optional chaining ?.', test: /\?\./, year: 2020, standard: 'ES2020', remedy: 'Verificați explicit: obj && obj.prop.' },
    { label: 'nullish coalescing ??', test: /\?\?[^=]/, year: 2020, standard: 'ES2020', remedy: 'Folosiți: (a != null) ? a : b.' },
    { label: 'BigInt (123n)', test: /\b\d+n\b/, year: 2020, standard: 'ES2020', remedy: 'Nu există în ES Ed.3.' },
    // ES5/ES6+ built-ins
    { label: 'Promise', test: /\bnew\s+Promise\b|\bPromise\s*\./, year: 2015, standard: 'ES6', remedy: 'Utilizați funcții callback.' },
    { label: 'Symbol', test: /\bSymbol\s*\(/, year: 2015, standard: 'ES6', remedy: 'Nu există în ES Ed.3.' },
    { label: 'Map()', test: /\bnew\s+Map\s*\(/, year: 2015, standard: 'ES6', remedy: 'Utilizați var m = {};' },
    { label: 'Set()', test: /\bnew\s+Set\s*\(/, year: 2015, standard: 'ES6', remedy: 'Utilizați Array cu indexOf().' },
    { label: 'WeakMap/WeakSet', test: /\bnew\s+Weak(Map|Set)\s*\(/, year: 2015, standard: 'ES6', remedy: 'Nu este în programă.' },
    { label: 'Proxy', test: /\bnew\s+Proxy\s*\(/, year: 2015, standard: 'ES6', remedy: 'Nu există în ES Ed.3.' },
    { label: 'Reflect', test: /\bReflect\s*\./, year: 2015, standard: 'ES6', remedy: 'Folosiți accesori obișnuiți.' },
    { label: 'Object.keys()', test: /\bObject\s*\.\s*keys\s*\(/, year: 2009, standard: 'ES5', remedy: 'for (var k in obj) { ... }.' },
    { label: 'Object.values()', test: /\bObject\s*\.\s*values\s*\(/, year: 2017, standard: 'ES2017', remedy: 'Iterați cu for...in și colectați valorile.' },
    { label: 'Object.entries()', test: /\bObject\s*\.\s*entries\s*\(/, year: 2017, standard: 'ES2017', remedy: 'Iterați cu for...in.' },
    { label: 'Object.assign()', test: /\bObject\s*\.\s*assign\s*\(/, year: 2015, standard: 'ES6', remedy: 'Copiați proprietățile cu un for...in.' },
    { label: 'Object.freeze()', test: /\bObject\s*\.\s*freeze\s*\(/, year: 2009, standard: 'ES5', remedy: 'Nu este în programă.' },
    { label: 'Object.create()', test: /\bObject\s*\.\s*create\s*\(/, year: 2009, standard: 'ES5', remedy: 'Folosiți funcție constructor cu prototype.' },
    { label: 'Object.defineProperty()', test: /\bObject\s*\.\s*defineProperty\s*\(/, year: 2009, standard: 'ES5', remedy: 'Atribuiți direct: obj.prop = val.' },
    { label: 'JSON.parse / stringify', test: /\bJSON\s*\.\s*(parse|stringify)\s*\(/, year: 2009, standard: 'ES5', remedy: 'Construiți manual sau utilizați eval().' },
    { label: '.forEach()', test: /\.\s*forEach\s*\(/, year: 2009, standard: 'ES5', remedy: 'for (var i=0; i<a.length; i++).' },
    { label: '.map() / .filter() / .reduce()', test: /\.\s*(map|filter|reduce|reduceRight)\s*\(\s*function|\.\s*(map|filter|reduce|reduceRight)\s*\(\s*[a-zA-Z_$]/, year: 2009, standard: 'ES5', remedy: 'Iterați manual cu for.' },
    { label: '.some() / .every() / .find()', test: /\.\s*(some|every|find|findIndex|findLast|findLastIndex)\s*\(/, year: 2009, standard: 'ES5/ES6', remedy: 'Căutați manual cu for + break.' },
    { label: '.includes()', test: /\.\s*includes\s*\(/, year: 2015, standard: 'ES6', remedy: 'Utilizați .indexOf(x) !== -1.' },
    { label: '.startsWith() / .endsWith()', test: /\.\s*(startsWith|endsWith)\s*\(/, year: 2015, standard: 'ES6', remedy: 'Folosiți .indexOf() === 0 sau .substring().' },
    { label: '.repeat()', test: /\.\s*repeat\s*\(/, year: 2015, standard: 'ES6', remedy: 'Folosiți Array(n+1).join(sir).' },
    { label: '.padStart() / .padEnd()', test: /\.\s*(padStart|padEnd)\s*\(/, year: 2017, standard: 'ES2017', remedy: 'Concatenați manual spațiile.' },
    { label: '.trimStart() / .trimEnd()', test: /\.\s*(trimStart|trimEnd|trimLeft|trimRight)\s*\(/, year: 2019, standard: 'ES2019', remedy: 'Folosiți expresii regulate cu replace.' },
    { label: '.at()', test: /\.\s*at\s*\(\s*-?\d/, year: 2022, standard: 'ES2022', remedy: 'Folosiți a[a.length-1] pentru ultimul element.' },
    { label: '.flat() / .flatMap()', test: /\.\s*(flat|flatMap)\s*\(/, year: 2019, standard: 'ES2019', remedy: 'Concatenați cu concat().apply().' },
    { label: '.fill()', test: /\.\s*fill\s*\(/, year: 2015, standard: 'ES6', remedy: 'Asignați într-o buclă for.' },
    { label: 'Array.from()', test: /\bArray\s*\.\s*from\s*\(/, year: 2015, standard: 'ES6', remedy: 'Folosiți for + push.' },
    { label: 'Array.of()', test: /\bArray\s*\.\s*of\s*\(/, year: 2015, standard: 'ES6', remedy: 'Folosiți [a, b, c].' },
    { label: 'Array.isArray()', test: /\bArray\s*\.\s*isArray\s*\(/, year: 2009, standard: 'ES5', remedy: 'Folosiți (x instanceof Array).' },
    { label: 'String.raw', test: /\bString\s*\.\s*raw\s*[`(]/, year: 2015, standard: 'ES6', remedy: 'Nu există în ES Ed.3.' },
    { label: 'Number.isNaN()', test: /\bNumber\s*\.\s*isNaN\s*\(/, year: 2015, standard: 'ES6', remedy: 'Folosiți isNaN() global.' },
    { label: 'Number.isInteger()', test: /\bNumber\s*\.\s*isInteger\s*\(/, year: 2015, standard: 'ES6', remedy: 'Verificați: x === Math.floor(x).' },
    { label: 'Math.log2 / Math.log10 / Math.cbrt', test: /\bMath\s*\.\s*(log2|log10|cbrt|hypot|trunc|sign|clz32|fround|sinh|cosh|tanh|asinh|acosh|atanh)\b/, year: 2015, standard: 'ES6', remedy: 'Folosiți formula matematică echivalentă cu Math.log / Math.pow.' },
    // DOM and Web APIs
    { label: 'fetch()', test: /\bfetch\s*\(/, year: 2015, standard: 'Fetch API', remedy: 'AJAX nu este în programa 2001.' },
    { label: 'XMLHttpRequest', test: /\bXMLHttpRequest\b/, year: 2006, standard: 'AJAX', remedy: 'AJAX nu este predat în programa 2001.' },
    { label: 'querySelector()', test: /\.\s*querySelector(All)?\s*\(/, year: 2008, standard: 'DOM Selectors API', remedy: 'Utilizați document.getElementById("id").' },
    { label: 'getElementsByClassName()', test: /\.\s*getElementsByClassName\s*\(/, year: 2008, standard: 'DOM Level 2 HTML', remedy: 'Utilizați document.getElementById("id").' },
    { label: 'addEventListener()', test: /\.\s*addEventListener\s*\(/, year: 2000, standard: 'DOM Level 2 (nepredat)', remedy: 'Utilizați onclick="functie()" în HTML.' },
    { label: 'removeEventListener()', test: /\.\s*removeEventListener\s*\(/, year: 2000, standard: 'DOM Level 2 (nepredat)', remedy: 'Resetați atributul onclick la null.' },
    { label: 'dispatchEvent()', test: /\.\s*dispatchEvent\s*\(/, year: 2000, standard: 'DOM Level 2 (nepredat)', remedy: 'Apelați direct handler-ul (functie()).' },
    { label: '.classList', test: /\.\s*classList\b/, year: 2010, standard: 'DOM Level 4', remedy: 'Modificați manual el.className.' },
    { label: '.dataset', test: /\.\s*dataset\b/, year: 2011, standard: 'HTML5 DOM', remedy: 'Citit cu el.getAttribute("name").' },
    { label: '.textContent', test: /\.\s*textContent\b/, year: 2005, standard: 'DOM Level 3', remedy: 'Folosiți el.innerText (IE) sau innerHTML cu text simplu.' },
    { label: 'MutationObserver', test: /\bMutationObserver\b/, year: 2012, standard: 'DOM Level 4', remedy: 'Verificați periodic cu setInterval().' },
    { label: 'IntersectionObserver', test: /\bIntersectionObserver\b/, year: 2016, standard: 'Web API', remedy: 'Verificați manual cu onscroll + offsetTop.' },
    { label: 'ResizeObserver', test: /\bResizeObserver\b/, year: 2019, standard: 'Web API', remedy: 'Folosiți window.onresize.' },
    { label: 'CustomEvent', test: /\bnew\s+CustomEvent\b/, year: 2011, standard: 'DOM Level 4', remedy: 'Apelați funcția handler direct.' },
    { label: 'EventSource', test: /\bEventSource\b/, year: 2012, standard: 'Server-Sent Events', remedy: 'Nu este predat.' },
    { label: 'WebSocket', test: /\bWebSocket\b/, year: 2011, standard: 'WebSockets', remedy: 'Nu este predat.' },
    // Storage / workers / other
    { label: 'localStorage', test: /\blocalStorage\b/, year: 2011, standard: 'Web Storage', remedy: 'Utilizați document.cookie.' },
    { label: 'sessionStorage', test: /\bsessionStorage\b/, year: 2011, standard: 'Web Storage', remedy: 'Utilizați document.cookie.' },
    { label: 'indexedDB', test: /\bindexedDB\b/, year: 2015, standard: 'IndexedDB', remedy: 'Stocați în document.cookie sau pe server.' },
    { label: 'Worker / SharedWorker', test: /\bnew\s+(Shared)?Worker\s*\(/, year: 2010, standard: 'Web Workers', remedy: 'Nu este predat.' },
    { label: 'Service Worker', test: /\bnavigator\s*\.\s*serviceWorker\b/, year: 2014, standard: 'Service Workers', remedy: 'Nu există în 2001.' },
    { label: 'Notification API', test: /\bnew\s+Notification\s*\(/, year: 2012, standard: 'Web Notifications', remedy: 'Folosiți alert().' },
    { label: 'Geolocation', test: /\bnavigator\s*\.\s*geolocation\b/, year: 2008, standard: 'Geolocation API', remedy: 'Nu era disponibil în 2001.' },
    { label: 'navigator.clipboard', test: /\bnavigator\s*\.\s*clipboard\b/, year: 2018, standard: 'Clipboard API', remedy: 'Folosiți document.execCommand("copy") (deprecat).' },
    { label: 'Clipboard API', test: /\bClipboardEvent\b/, year: 2018, standard: 'Clipboard API', remedy: 'Nu există în programă.' },
    { label: 'history.pushState()', test: /\bhistory\s*\.\s*(pushState|replaceState)\s*\(/, year: 2010, standard: 'HTML5 History API', remedy: 'Folosiți window.location.href.' },
    { label: 'requestAnimationFrame()', test: /\brequestAnimationFrame\s*\(/, year: 2011, standard: 'HTML5 timing', remedy: 'Folosiți setInterval(f, 16).' },
    { label: 'performance.now()', test: /\bperformance\s*\.\s*now\s*\(/, year: 2012, standard: 'High Resolution Time', remedy: 'Folosiți (new Date()).getTime().' },
    { label: 'console.log()', test: /\bconsole\s*\.\s*(log|info|warn|error|debug|trace|dir|table|group|groupEnd|time|timeEnd|count|assert)\s*\(/, year: 2009, standard: 'ES5 host object', remedy: 'Utilizați document.write() sau alert().' },
    // Networking / crypto
    { label: 'URL constructor', test: /\bnew\s+URL\s*\(/, year: 2012, standard: 'URL Standard', remedy: 'Analizați manual stringul.' },
    { label: 'URLSearchParams', test: /\bURLSearchParams\b/, year: 2015, standard: 'URL Standard', remedy: 'Analizați location.search manual.' },
    { label: 'crypto.subtle', test: /\bcrypto\s*\.\s*subtle\b/, year: 2014, standard: 'Web Crypto', remedy: 'Nu este predat.' },
    { label: 'TextEncoder / TextDecoder', test: /\bnew\s+Text(Encoder|Decoder)\s*\(/, year: 2014, standard: 'Encoding', remedy: 'Nu este predat.' },
    { label: 'FormData', test: /\bnew\s+FormData\s*\(/, year: 2008, standard: 'XHR2', remedy: 'Construiți query-string manual.' },
    { label: 'Blob / File / FileReader', test: /\bnew\s+(Blob|File|FileReader)\s*\(/, year: 2011, standard: 'File API', remedy: 'Nu este predat.' },
    // jQuery-era shortcuts
    { label: '$( ... ) (jQuery)', test: /(^|[^a-zA-Z_$])\$\s*\(\s*["\']/, year: 2006, standard: 'jQuery', remedy: 'jQuery nu este în programă. Folosiți DOM-ul direct cu document.getElementById.' }
];

/* ============================================================
   ALLOWLISTS: HTML 4.01 Strict elements/attrs and ES Ed.3 (1999)
   identifiers. A final unknown-identifier pass in lint.js flags
   any tag or bareword that isn't in one of these sets and isn't
   already caught by a specific rule above, using a generic
   "not in the 2001 curriculum" traceback.
   ============================================================ */

// HTML 4.01 Strict element names (W3C Recommendation, 24 December 1999).
// Transitional-only elements live in HTML401_TRANSITIONAL_ELEMENTS below.
// Frameset-only elements (FRAMESET, FRAME, NOFRAMES) are not supported.
var HTML401_STRICT_ELEMENTS = {
    'a':1,'abbr':1,'acronym':1,'address':1,'area':1,'b':1,'base':1,'bdo':1,
    'big':1,'blockquote':1,'body':1,'br':1,'button':1,'caption':1,'cite':1,
    'code':1,'col':1,'colgroup':1,'dd':1,'del':1,'dfn':1,'div':1,'dl':1,
    'dt':1,'em':1,'fieldset':1,'form':1,'h1':1,'h2':1,'h3':1,'h4':1,'h5':1,
    'h6':1,'head':1,'hr':1,'html':1,'i':1,'img':1,'input':1,'ins':1,'kbd':1,
    'label':1,'legend':1,'li':1,'link':1,'map':1,'meta':1,'noscript':1,
    'object':1,'ol':1,'optgroup':1,'option':1,'p':1,'param':1,'pre':1,'q':1,
    'samp':1,'script':1,'select':1,'small':1,'span':1,'strong':1,'style':1,
    'sub':1,'sup':1,'table':1,'tbody':1,'td':1,'textarea':1,'tfoot':1,'th':1,
    'thead':1,'title':1,'tr':1,'tt':1,'ul':1,'var':1
};

// Additional elements valid in HTML 4.01 Transitional but not Strict.
// Only consulted when STATE.prefs.allowTransitional is true.
var HTML401_TRANSITIONAL_ELEMENTS = {
    'center':1,'font':1,'u':1,'s':1,'strike':1,'basefont':1,'dir':1,'menu':1,
    'isindex':1,'applet':1,'iframe':1,
    'embed':1,'bgsound':1,'marquee':1,'blink':1
};

// HTML 4.01 Strict attribute names plus a few widely-taught presentational
// attributes that the curriculum explicitly recommends.
var HTML401_STRICT_ATTRS = {
    // Core
    'id':1,'class':1,'style':1,'title':1,'lang':1,'xml:lang':1,'dir':1,
    // Events (DOM Level 0 intrinsic)
    'onclick':1,'ondblclick':1,'onmousedown':1,'onmouseup':1,'onmouseover':1,
    'onmousemove':1,'onmouseout':1,'onkeypress':1,'onkeydown':1,'onkeyup':1,
    'onfocus':1,'onblur':1,'onsubmit':1,'onreset':1,'onselect':1,'onchange':1,
    'onload':1,'onunload':1,
    // Link / anchor / form / media / table / script
    'href':1,'hreflang':1,'type':1,'rel':1,'rev':1,'src':1,'alt':1,'name':1,
    'value':1,'action':1,'method':1,'enctype':1,'accept':1,'accept-charset':1,
    'checked':1,'disabled':1,'readonly':1,'selected':1,'multiple':1,'size':1,
    'maxlength':1,'cols':1,'rows':1,'colspan':1,'rowspan':1,'summary':1,
    'width':1,'height':1,'border':1,'cellpadding':1,'cellspacing':1,'align':1,
    'valign':1,'nowrap':1,'charoff':1,'char':1,'frame':1,'rules':1,'scope':1,
    'headers':1,'axis':1,'abbr':1,'datetime':1,'cite':1,'media':1,'content':1,
    'http-equiv':1,'scheme':1,'profile':1,'for':1,'tabindex':1,'accesskey':1,
    'usemap':1,'ismap':1,'shape':1,'coords':1,'longdesc':1,'standby':1,
    'classid':1,'codebase':1,'codetype':1,'data':1,'declare':1,'archive':1,
    'defer':1,'language':1,'charset':1,
    // Widely taught color/font attrs (deprecated but curriculum-endorsed)
    'bgcolor':1,'text':1,'link':1,'vlink':1,'alink':1,'color':1,'face':1,
    'background':1,'hspace':1,'vspace':1,'clear':1,'compact':1,'noshade':1,
    'start':1,'reversed':1,'loop':1,'balance':1,'volume':1
};

// Additional attributes valid in HTML 4.01 Transitional but not Strict.
// Only consulted when STATE.prefs.allowTransitional is true.
var HTML401_TRANSITIONAL_ATTRS = {
    'target':1,
    'leftmargin':1,'topmargin':1,'marginwidth':1,'marginheight':1,
    'bordercolor':1
};

// ECMAScript Edition 3 (December 1999) reserved words and host identifiers
// used by the curriculum. This is the strict allowlist: anything not in
// this set and not in the blocklist is treated as "not in the 2001
// curriculum" by the unknown-identifier pass.
var ES3_RESERVED = {
    // Reserved words (ES3 spec, sections 7.5.2 and 7.5.3)
    'break':1,'case':1,'catch':1,'continue':1,'default':1,'delete':1,'do':1,
    'else':1,'false':1,'finally':1,'for':1,'function':1,'if':1,'in':1,
    'instanceof':1,'new':1,'null':1,'return':1,'switch':1,'this':1,'throw':1,
    'true':1,'try':1,'typeof':1,'var':1,'void':1,'while':1,'with':1,
    // Future reserved (ES3 section 7.5.3), keywords but not constructs
    'abstract':1,'boolean':1,'byte':1,'char':1,'class':1,'const':1,'debugger':1,
    'double':1,'enum':1,'export':1,'extends':1,'final':1,'float':1,'goto':1,
    'implements':1,'import':1,'int':1,'interface':1,'long':1,'native':1,
    'package':1,'private':1,'protected':1,'public':1,'short':1,'static':1,
    'super':1,'synchronized':1,'throws':1,'transient':1,'volatile':1
};

var ES3_GLOBALS = {
    // Global value properties (ES3 15.1.1)
    'NaN':1,'Infinity':1,'undefined':1,
    // Global function properties (15.1.2)
    'eval':1,'parseInt':1,'parseFloat':1,'isNaN':1,'isFinite':1,
    'decodeURI':1,'decodeURIComponent':1,'encodeURI':1,'encodeURIComponent':1,
    'escape':1,'unescape':1,
    // Constructors (15.3-15.11)
    'Object':1,'Function':1,'Array':1,'String':1,'Boolean':1,'Number':1,
    'Date':1,'RegExp':1,'Error':1,'EvalError':1,'RangeError':1,'ReferenceError':1,
    'SyntaxError':1,'TypeError':1,'URIError':1,
    // Namespace object
    'Math':1,
    // Browser host objects present in 2001-era JS (DOM Level 0 / BOM)
    'window':1,'document':1,'navigator':1,'location':1,'history':1,'screen':1,
    'alert':1,'confirm':1,'prompt':1,'setTimeout':1,'setInterval':1,
    'clearTimeout':1,'clearInterval':1,'open':1,'close':1,'focus':1,'blur':1,
    'moveTo':1,'moveBy':1,'resizeTo':1,'resizeBy':1,'scrollTo':1,'scrollBy':1,
    'print':1,'find':1,'stop':1,'back':1,'forward':1,'home':1,
    'Image':1,'Option':1,'Array':1,'Packages':1,'java':1,'netscape':1,'sun':1,
    'arguments':1,'self':1,'top':1,'parent':1,'frames':1,'name':1,'status':1,
    'defaultStatus':1,'opener':1,'closed':1,'event':1
};

// Post-2001 identifier names flagged by the allowlist pass when they
// appear as a free (non-member) identifier. Each value names the
// standard the identifier belongs to.
var POST2001_IDENT_HINTS = {
    'Promise':'ES6', 'Symbol':'ES6', 'Map':'ES6', 'Set':'ES6',
    'WeakMap':'ES6', 'WeakSet':'ES6', 'Proxy':'ES6', 'Reflect':'ES6',
    'BigInt':'ES2020', 'Intl':'ES Intl API',
    'fetch':'Fetch API', 'XMLHttpRequest':'AJAX',
    'localStorage':'Web Storage', 'sessionStorage':'Web Storage',
    'indexedDB':'IndexedDB',
    'Worker':'Web Workers', 'SharedWorker':'Web Workers',
    'ServiceWorker':'Service Workers',
    'WebSocket':'WebSockets', 'EventSource':'Server-Sent Events',
    'Notification':'Web Notifications',
    'MutationObserver':'DOM Level 4',
    'IntersectionObserver':'Web API',
    'ResizeObserver':'Web API',
    'PerformanceObserver':'Web API',
    'AbortController':'DOM Abort API',
    'CustomEvent':'DOM Level 4',
    'FormData':'XHR2', 'Blob':'File API', 'File':'File API',
    'FileReader':'File API', 'FileList':'File API',
    'URL':'URL Standard', 'URLSearchParams':'URL Standard',
    'TextEncoder':'Encoding API', 'TextDecoder':'Encoding API',
    'Headers':'Fetch API', 'Request':'Fetch API', 'Response':'Fetch API',
    'globalThis':'ES2020',
    'queueMicrotask':'HTML Living Standard',
    'structuredClone':'HTML Living Standard',
    'reportError':'HTML Living Standard'
};

// Methods that appear on prototypes in ES3 and are safe in any member
// position. Used by the unknown-method pass to avoid false positives on
// legitimate .length, .toString, etc.
var ES3_PROTOTYPE_METHODS = {
    // Object.prototype (15.2.4)
    'toString':1,'toLocaleString':1,'valueOf':1,'hasOwnProperty':1,
    'isPrototypeOf':1,'propertyIsEnumerable':1,'constructor':1,
    // Array.prototype (15.4.4), ES3 only, no forEach/map/filter/reduce
    'length':1,'concat':1,'join':1,'pop':1,'push':1,'reverse':1,'shift':1,
    'slice':1,'sort':1,'splice':1,'unshift':1,
    // String.prototype (15.5.4)
    'charAt':1,'charCodeAt':1,'fromCharCode':1,'indexOf':1,'lastIndexOf':1,
    'localeCompare':1,'match':1,'replace':1,'search':1,'split':1,'substr':1,
    'substring':1,'toLowerCase':1,'toLocaleLowerCase':1,'toUpperCase':1,
    'toLocaleUpperCase':1,'anchor':1,'big':1,'blink':1,'bold':1,'fixed':1,
    'fontcolor':1,'fontsize':1,'italics':1,'link':1,'small':1,'strike':1,
    'sub':1,'sup':1,
    // Number.prototype (15.7.4)
    'toFixed':1,'toExponential':1,'toPrecision':1,
    // Math (15.8)
    'E':1,'LN10':1,'LN2':1,'LOG2E':1,'LOG10E':1,'PI':1,'SQRT1_2':1,'SQRT2':1,
    'abs':1,'acos':1,'asin':1,'atan':1,'atan2':1,'ceil':1,'cos':1,'exp':1,
    'floor':1,'log':1,'max':1,'min':1,'pow':1,'random':1,'round':1,'sin':1,
    'sqrt':1,'tan':1,
    // Date.prototype (15.9.5)
    'getDate':1,'getDay':1,'getFullYear':1,'getHours':1,'getMilliseconds':1,
    'getMinutes':1,'getMonth':1,'getSeconds':1,'getTime':1,'getTimezoneOffset':1,
    'getUTCDate':1,'getUTCDay':1,'getUTCFullYear':1,'getUTCHours':1,
    'getUTCMilliseconds':1,'getUTCMinutes':1,'getUTCMonth':1,'getUTCSeconds':1,
    'getYear':1,'setDate':1,'setFullYear':1,'setHours':1,'setMilliseconds':1,
    'setMinutes':1,'setMonth':1,'setSeconds':1,'setTime':1,'setUTCDate':1,
    'setUTCFullYear':1,'setUTCHours':1,'setUTCMilliseconds':1,'setUTCMinutes':1,
    'setUTCMonth':1,'setUTCSeconds':1,'setYear':1,'toDateString':1,
    'toGMTString':1,'toLocaleDateString':1,'toLocaleTimeString':1,
    'toTimeString':1,'toUTCString':1,'UTC':1,'parse':1,'now':1,
    // RegExp.prototype (15.10.6)
    'exec':1,'test':1,'source':1,'global':1,'ignoreCase':1,'multiline':1,
    'lastIndex':1,
    // Function.prototype (15.3.4)
    'apply':1,'call':1,
    // Error.prototype (15.11.4)
    'message':1,'name':1,
    // DOM Level 0/1 methods and properties used by the curriculum
    'getElementById':1,'getElementsByTagName':1,'getElementsByName':1,
    'createElement':1,'createTextNode':1,'appendChild':1,'removeChild':1,
    'replaceChild':1,'insertBefore':1,'cloneNode':1,'hasChildNodes':1,
    'childNodes':1,'firstChild':1,'lastChild':1,'nextSibling':1,
    'previousSibling':1,'parentNode':1,'nodeName':1,'nodeType':1,'nodeValue':1,
    'ownerDocument':1,'attributes':1,'getAttribute':1,'setAttribute':1,
    'removeAttribute':1,'innerHTML':1,'innerText':1,'outerHTML':1,'write':1,
    'writeln':1,'open':1,'close':1,'images':1,'forms':1,'links':1,'anchors':1,
    'applets':1,'cookie':1,'domain':1,'lastModified':1,'referrer':1,
    'URL':1,'title':1,'body':1,'head':1,'all':1,'activeElement':1,
    'style':1,'className':1,'tagName':1,'offsetLeft':1,'offsetTop':1,
    'offsetWidth':1,'offsetHeight':1,'offsetParent':1,'clientLeft':1,
    'clientTop':1,'clientWidth':1,'clientHeight':1,'scrollLeft':1,
    'scrollTop':1,'scrollWidth':1,'scrollHeight':1,
    'submit':1,'reset':1,'elements':1,'action':1,'method':1,'enctype':1,
    'target':1,'encoding':1,'length':1,'options':1,'selectedIndex':1,
    'selected':1,'checked':1,'defaultChecked':1,'defaultValue':1,
    'defaultSelected':1,'value':1,'text':1,'form':1,'disabled':1,
    'readOnly':1,'tabIndex':1,'size':1,'maxLength':1,'rows':1,'cols':1,
    'type':1,'src':1,'href':1,'hash':1,'host':1,'hostname':1,'pathname':1,
    'port':1,'protocol':1,'search':1,'reload':1,'replace':1,'assign':1,
    'go':1,'userAgent':1,'appName':1,'appVersion':1,'appCodeName':1,
    'platform':1,'language':1,'cookieEnabled':1,'plugins':1,'mimeTypes':1,
    'availWidth':1,'availHeight':1,'colorDepth':1,'pixelDepth':1,
    // Event model (DOM Level 0)
    'target':1,'srcElement':1,'keyCode':1,'charCode':1,'which':1,'button':1,
    'clientX':1,'clientY':1,'screenX':1,'screenY':1,'pageX':1,'pageY':1,
    'altKey':1,'ctrlKey':1,'shiftKey':1,'metaKey':1,'returnValue':1,
    'cancelBubble':1
};

// Hydrate persisted UI prefs early so the visual state matches the
// user's last choice before any UI renders.
(function() {
    // Start menu style: 'modern' (real Server 2003 default, two-column
    // with username banner) or 'classic' (single-column, looks more
    // like Windows 2000). Mountainbar in srv2003-desktop.js reads this
    // before rendering. Persisted under ide.srv2k3.startMenuStyle.v1.
    try {
        var sms = sessionStorage.getItem('ide.srv2k3.startMenuStyle.v1');
        if (sms === 'classic' || sms === 'modern') {
            STATE.prefs.startMenuStyle = sms;
        }
    } catch (e) {}
})();
