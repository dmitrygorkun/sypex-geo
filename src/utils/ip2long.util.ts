export const ip2long = (ip: string): number | false => {

    const pattern = new RegExp('^([1-9]\\d*|0[0-7]*|0x[\\da-f]+)(?:\\.([1-9]\\d*|0[0-7]*|0x[\\da-f]+))?(?:\\.([1-9]\\d*|0[0-7]*|0x[\\da-f]+))?(?:\\.([1-9]\\d*|0[0-7]*|0x[\\da-f]+))?$', 'i');
    const argIP = ip.match(pattern); // Verify argIP format.
    if (argIP === null) {
        return false
    }

    const ipn: number[] = [0];
    for (let i = 1; i < 5; i += 1) {
        ipn[0] += (argIP[i] || '').length === 0 ? 0 : 1;
        ipn[i] = parseInt(argIP[i]) || 0;
    }

    ipn.push(256, 256, 256, 256);
    ipn[4 + ipn[0]] *= Math.pow(256, 4 - ipn[0]);
    if (ipn[1] >= ipn[5] || ipn[2] >= ipn[6] || ipn[3] >= ipn[7] || ipn[4] >= ipn[8]) {
        return false;
    }

    return ipn[1] * (ipn[0] === 1 ? 1 : 16777216) + ipn[2] * (ipn[0] <= 2 ? 1 : 65536) + ipn[3] * (ipn[0] <= 3 ? 1 : 256) + ipn[4];
};