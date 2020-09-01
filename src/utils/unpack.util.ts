import {fromUtf8Array} from "./from-utf8-array.util";

export const unpack = (buff: Buffer, description: string) => {

    const result: any = {};
    let offset = 0;

    description
        .split('/')
        .forEach(field => {

            const [kind, name] = field.split(':');

            switch (kind) {
                case 't':
                    result[name] = buff.readUInt8(offset) - 128;
                    offset++;
                    break;
                case 'T':
                    result[name] = buff.readUInt8(offset);
                    offset++;
                    break;
                case 's':
                    result[name] = buff.readUInt16LE(offset);
                    offset += 2;
                    break;
                case 'S':
                    result[name] = buff.readUInt16LE(offset);
                    offset += 2;
                    break;
                case 'm':
                    result[name] = buff.readUInt8(offset) + (buff.readUInt8(offset + 1) << 8) + (buff.readUInt8(offset + 2) << 16) - 8388608;
                    offset += 3;
                    break;
                case 'M':
                    result[name] = buff.readUInt8(offset) + (buff.readUInt8(offset + 1) << 8) + (buff.readUInt8(offset + 2) << 16);
                    offset += 3;
                    break;
                case 'd':
                    result[name] = buff.readFloatLE(offset);
                    offset += 8;
                    break;
                case 'b':
                    const str = [];
                    let sz = 0;
                    let byte = 255;
                    while (byte > 0) {
                        byte = buff.readUInt8(offset + sz);
                        if (byte > 0) {
                            str.push(byte);
                        }
                        sz++;
                    }
                    offset += sz;
                    result[name] = fromUtf8Array(str);
                    break;
                default:

                    if (kind.indexOf('n') === 0) {
                        offset += 2
                        // TODO
                        // result[name] = buff.readUInt16(offset);
                    } else if (kind.indexOf('N') === 0) {
                        const sz = parseInt(kind.split('N')[1]);
                        result[name] = buff.readUInt32LE(offset) / Math.pow(10, sz);
                        offset += 4;
                    } else if (kind.indexOf('c') === 0) {

                        const str = [];
                        const sz = parseInt(kind.split('c')[1]);
                        for (let i = 0; i < sz; i++) {
                            str.push(buff.readUInt8(offset + i));
                        }

                        result[name] = fromUtf8Array(str);
                        offset += sz;
                    } else {
                        offset += 4;
                    }

                    break;
            }
        });

    return result;
}