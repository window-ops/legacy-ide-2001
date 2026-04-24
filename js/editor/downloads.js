/* ============================================================
   USER FILE DOWNLOADS
   Handlers for downloading the user's own files from the IDE:
   - downloadActiveFile()  / download a single file by node id
   - downloadProjectZip()  / download the whole workspace as zip
   Uses a small self-contained ZIP writer (store / no compression)
   so the IDE has no external dependencies.
   ============================================================ */

/* ---------- Download helpers ---------- */

function saveBlobAs(blob, filename) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function() { URL.revokeObjectURL(url); }, 1500);
}

function mimeForName(name) {
    var ext = (name.split('.').pop() || '').toLowerCase();
    if (ext === 'html' || ext === 'htm') return 'text/html;charset=utf-8';
    if (ext === 'js') return 'application/javascript;charset=utf-8';
    if (ext === 'css') return 'text/css;charset=utf-8';
    if (ext === 'md') return 'text/markdown;charset=utf-8';
    if (ext === 'txt') return 'text/plain;charset=utf-8';
    if (ext === 'json') return 'application/json;charset=utf-8';
    return 'application/octet-stream';
}

function downloadFileByNodeId(nodeId) {
    var node = findNode(STATE.tree, nodeId);
    if (!node || node.type !== 'file') {
        showToast('Descărcare: fișier invalid.');
        return;
    }
    var content = STATE.fileContents[node.id] || '';
    var blob = new Blob([content], { type: mimeForName(node.name) });
    saveBlobAs(blob, node.name);
}

function downloadActiveFile() {
    if (!STATE.activeFile) { showToast('Deschideți un fișier întâi.'); return; }
    downloadFileByNodeId(STATE.activeFile);
}

/* ---------- Project zip ---------- */

// Walk the tree and collect every file leaf along with its relative
// path. The top-level folder name (typically "proiect") is included so
// the zip extracts into a single folder.
function collectProjectFiles() {
    var out = [];
    function walk(node, prefix) {
        var path = prefix ? prefix + '/' + node.name : node.name;
        if (node.type === 'file') {
            out.push({ path: path, content: STATE.fileContents[node.id] || '' });
            return;
        }
        if (node.children) {
            for (var i = 0; i < node.children.length; i++) walk(node.children[i], path);
        }
    }
    walk(STATE.tree, '');
    return out;
}

function downloadProjectZip() {
    var files = collectProjectFiles();
    if (files.length === 0) { showToast('Proiectul nu conține fișiere.'); return; }
    try {
        var blob = buildStoredZip(files);
        var base = (STATE.tree && STATE.tree.name) ? STATE.tree.name : 'proiect';
        saveBlobAs(blob, base + '.zip');
        showToast('Arhivă generată (' + files.length + ' fișiere).');
    } catch (err) {
        showToast('Eroare la arhivare: ' + (err && err.message ? err.message : err));
    }
}

/* ---------- Minimal ZIP writer (method 0 = STORE, no compression) ----------
   Writes a valid PKZIP archive by emitting:
     [ local file header | file data ] × N
     [ central dir entry ] × N
     end-of-central-directory record
   Implements CRC-32 (IEEE 802.3 polynomial) in a 256-entry lookup table.
   Handles UTF-8 file names via bit 11 of the general-purpose flag.
   ------------------------------------------------------------------------ */

var _CRC32_TABLE = null;
function _crc32Table() {
    if (_CRC32_TABLE) return _CRC32_TABLE;
    var t = new Uint32Array(256);
    for (var n = 0; n < 256; n++) {
        var c = n;
        for (var k = 0; k < 8; k++) {
            c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
        }
        t[n] = c >>> 0;
    }
    _CRC32_TABLE = t;
    return t;
}
function _crc32(bytes) {
    var t = _crc32Table();
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) {
        c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    }
    return (c ^ 0xFFFFFFFF) >>> 0;
}
function _encUtf8(s) {
    if (typeof TextEncoder !== 'undefined') return new TextEncoder().encode(s);
    // Fallback path for extremely old browsers that lack TextEncoder.
    var out = [];
    for (var i = 0; i < s.length; i++) {
        var c = s.charCodeAt(i);
        if (c < 0x80) { out.push(c); }
        else if (c < 0x800) { out.push(0xC0 | (c >> 6), 0x80 | (c & 0x3F)); }
        else if (c < 0xD800 || c >= 0xE000) { out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 0x3F), 0x80 | (c & 0x3F)); }
        else {
            // Surrogate pair -> 4-byte UTF-8
            i++;
            var u = 0x10000 + (((c & 0x3FF) << 10) | (s.charCodeAt(i) & 0x3FF));
            out.push(0xF0 | (u >> 18), 0x80 | ((u >> 12) & 0x3F), 0x80 | ((u >> 6) & 0x3F), 0x80 | (u & 0x3F));
        }
    }
    return new Uint8Array(out);
}
// MS-DOS format for zip timestamp fields.
function _dosDateTime(d) {
    var date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    var time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    return { date: date & 0xFFFF, time: time & 0xFFFF };
}

function buildStoredZip(files) {
    var now = _dosDateTime(new Date());
    var parts = [];
    var central = [];
    var offset = 0;

    for (var i = 0; i < files.length; i++) {
        var f = files[i];
        var nameBytes = _encUtf8(f.path);
        var dataBytes = _encUtf8(String(f.content == null ? '' : f.content));
        var crc = _crc32(dataBytes);
        var size = dataBytes.length;

        // Local file header
        var local = new ArrayBuffer(30 + nameBytes.length);
        var lv = new DataView(local);
        lv.setUint32(0,  0x04034b50, true);       // signature
        lv.setUint16(4,  20,          true);      // version needed
        lv.setUint16(6,  0x0800,      true);      // gp flag: UTF-8 name
        lv.setUint16(8,  0,           true);      // method 0 = stored
        lv.setUint16(10, now.time,    true);
        lv.setUint16(12, now.date,    true);
        lv.setUint32(14, crc,         true);
        lv.setUint32(18, size,        true);      // compressed size
        lv.setUint32(22, size,        true);      // uncompressed size
        lv.setUint16(26, nameBytes.length, true);
        lv.setUint16(28, 0, true);                // extra field length
        var localArr = new Uint8Array(local);
        localArr.set(nameBytes, 30);
        parts.push(localArr);
        parts.push(dataBytes);

        // Central directory entry (built now, flushed after all data)
        var ce = new ArrayBuffer(46 + nameBytes.length);
        var cv = new DataView(ce);
        cv.setUint32(0,  0x02014b50, true);
        cv.setUint16(4,  0x031E,      true);      // version made by: Unix/2.0
        cv.setUint16(6,  20,          true);
        cv.setUint16(8,  0x0800,      true);
        cv.setUint16(10, 0,           true);
        cv.setUint16(12, now.time,    true);
        cv.setUint16(14, now.date,    true);
        cv.setUint32(16, crc,         true);
        cv.setUint32(20, size,        true);
        cv.setUint32(24, size,        true);
        cv.setUint16(28, nameBytes.length, true);
        cv.setUint16(30, 0, true);
        cv.setUint16(32, 0, true);
        cv.setUint16(34, 0, true);                // disk number start
        cv.setUint16(36, 0, true);                // internal attrs
        cv.setUint32(38, 0, true);                // external attrs
        cv.setUint32(42, offset, true);           // local header offset
        var ceArr = new Uint8Array(ce);
        ceArr.set(nameBytes, 46);
        central.push(ceArr);

        offset += localArr.length + dataBytes.length;
    }

    // Flush central directory
    var centralStart = offset;
    var centralSize = 0;
    for (var j = 0; j < central.length; j++) {
        parts.push(central[j]);
        centralSize += central[j].length;
    }

    // End of central directory record
    var eocd = new ArrayBuffer(22);
    var ev = new DataView(eocd);
    ev.setUint32(0,  0x06054b50, true);
    ev.setUint16(4,  0, true);
    ev.setUint16(6,  0, true);
    ev.setUint16(8,  files.length, true);
    ev.setUint16(10, files.length, true);
    ev.setUint32(12, centralSize, true);
    ev.setUint32(16, centralStart, true);
    ev.setUint16(20, 0, true);
    parts.push(new Uint8Array(eocd));

    return new Blob(parts, { type: 'application/zip' });
}
