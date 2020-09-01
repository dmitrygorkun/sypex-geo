export const fromUtf8Array = (data: number[]) => {
    let str = '';

    for (let i = 0; i < data.length; i++) {
        if (data[i] < 0x80) {
            str += String.fromCharCode(data[i]);
        } else if (data[i] > 0xBF && data[i] < 0xE0) {
            str += String.fromCharCode((data[i] & 0x1F) << 6 | data[i + 1] & 0x3F);
            i += 1;
        } else if (data[i] > 0xDF && data[i] < 0xF0) {
            str += String.fromCharCode((data[i] & 0x0F) << 12 | (data[i + 1] & 0x3F) << 6 | data[i + 2] & 0x3F);
            i += 2;
        } else {
            const charCode = ((data[i] & 0x07) << 18 | (data[i + 1] & 0x3F) << 12 | (data[i + 2] & 0x3F) << 6 | data[i + 3] & 0x3F) - 0x010000;
            str += String.fromCharCode(charCode >> 10 | 0xD800, charCode & 0x03FF | 0xDC00);
            i += 3;
        }
    }

    return str;
};