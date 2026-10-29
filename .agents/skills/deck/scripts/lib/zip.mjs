// A zip writer on Node's own zlib: each entry is deflated, or stored when deflating does not make it smaller.
import { crc32, deflateRawSync } from 'node:zlib';

/** The MS-DOS time and date fields for `date`, which a zip entry holds in place of a timestamp. */
function dosTime(date) {
  const time = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const day = ((Math.max(date.getFullYear(), 1980) - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { time, day };
}

/** One zip file holding `entries` ({name, data}) in order, each dated `date`. */
export function zip(entries, date = new Date()) {
  const { time, day } = dosTime(date);
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const { name, data } of entries) {
    const raw = Buffer.from(data);
    const deflated = deflateRawSync(raw);
    const stored = deflated.length >= raw.length;
    const body = stored ? raw : deflated;
    const fileName = Buffer.from(name, 'utf8');
    // The local header and the central record share these fields; they start 2 bytes later in the central one.
    const fields = (header, at) => {
      header.writeUInt16LE(20, at - 2);
      header.writeUInt16LE(0x0800, at);
      header.writeUInt16LE(stored ? 0 : 8, at + 2);
      header.writeUInt16LE(time, at + 4);
      header.writeUInt16LE(day, at + 6);
      header.writeUInt32LE(crc32(raw), at + 8);
      header.writeUInt32LE(body.length, at + 12);
      header.writeUInt32LE(raw.length, at + 16);
      header.writeUInt16LE(fileName.length, at + 20);
      return header;
    };
    const local = fields(Buffer.alloc(30), 6);
    local.writeUInt32LE(0x04034b50, 0);
    const central = fields(Buffer.alloc(46), 8);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt32LE(offset, 42);
    locals.push(local, fileName, body);
    centrals.push(central, fileName);
    offset += local.length + fileName.length + body.length;
  }
  const directory = Buffer.concat(centrals);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(directory.length, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, directory, end]);
}
