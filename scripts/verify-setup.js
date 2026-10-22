import assert from 'node:assert/strict';
import { open, stat } from 'node:fs/promises';
import { resolve } from 'node:path';

const setupPath = resolve(process.argv[2] || 'dist/Mod-Studio-Setup.exe');
const file = await open(setupPath, 'r');
try {
  const { size } = await stat(setupPath);
  assert(size > 8, 'Setup-Datei ist zu klein.');
  const header = Buffer.alloc(2);
  await file.read(header, 0, header.length, 0);
  assert.equal(header.toString('ascii'), 'MZ', 'Setup hat keinen Windows-PE-Header.');

  const footer = Buffer.alloc(8);
  await file.read(footer, 0, footer.length, size - footer.length);
  const archiveLength = Number(footer.readBigInt64LE());
  assert(Number.isSafeInteger(archiveLength) && archiveLength > 0 && archiveLength < size - 8, 'Eingebettete ZIP-Größe ist ungültig.');
  const archiveStart = size - 8 - archiveLength;
  const tailLength = Math.min(archiveLength, 65_557);
  const tail = Buffer.alloc(tailLength);
  await file.read(tail, 0, tail.length, size - 8 - tailLength);

  let endRecord = -1;
  for (let index = tail.length - 22; index >= 0; index--) {
    if (tail.readUInt32LE(index) !== 0x06054b50) continue;
    if (index + 22 + tail.readUInt16LE(index + 20) === tail.length) { endRecord = index; break; }
  }
  assert(endRecord >= 0, 'Das eingebettete Paket hat keinen gültigen ZIP-Abschluss.');
  const entryCount = tail.readUInt16LE(endRecord + 10);
  const directorySize = tail.readUInt32LE(endRecord + 12);
  const directoryOffset = tail.readUInt32LE(endRecord + 16);
  assert(directorySize < 32 * 1024 * 1024 && directoryOffset + directorySize <= archiveLength, 'ZIP-Dateiverzeichnis ist ungültig.');
  const directory = Buffer.alloc(directorySize);
  await file.read(directory, 0, directory.length, archiveStart + directoryOffset);

  const names = [];
  let offset = 0;
  while (offset < directory.length) {
    assert.equal(directory.readUInt32LE(offset), 0x02014b50, 'Ungültiger ZIP-Dateieintrag.');
    const flags = directory.readUInt16LE(offset + 8);
    const nameLength = directory.readUInt16LE(offset + 28);
    const extraLength = directory.readUInt16LE(offset + 30);
    const commentLength = directory.readUInt16LE(offset + 32);
    const encoding = flags & 0x0800 ? 'utf8' : 'latin1';
    names.push(directory.toString(encoding, offset + 46, offset + 46 + nameLength));
    offset += 46 + nameLength + extraLength + commentLength;
  }
  assert.equal(names.length, entryCount, 'ZIP-Einträge und Verzeichnis stimmen nicht überein.');
  for (const expected of ['Mod-Studio.exe', 'server/index.js', 'public/index.html', 'scripts/start-mod-studio.ps1']) {
    assert(names.some((name) => name.endsWith(expected)), `Paketdatei fehlt: ${expected}`);
  }
  console.log(`Setup-Prüfung bestanden: PE-Datei, eingebettetes ZIP (${(archiveLength / 1024 / 1024).toFixed(1)} MiB) und ${entryCount} Dateieinträge.`);
} finally {
  await file.close();
}
