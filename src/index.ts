import fs from "fs";
import {unpack} from "./utils/unpack.util";
import {ip2long} from "./utils/ip2long.util";
import {StateInterface} from "./definitions/state.interface";
import {SypexCountryInterface} from "./definitions/country.interface";
import {SypexRegionInterface} from "./definitions/region.interface";
import {SypexCityInterface} from "./definitions/city.interface";
import {SypexResponseInterface, SypexResponseType} from "./definitions/response.interface";

export class SypexGeoClient {

    readonly #state: StateInterface;

    readonly #fileBuffer: Buffer;

    constructor(path: string) {

        if (!fs.existsSync(path)) {
            throw new Error(`Can't open file`);
        }

        const data: number = fs.openSync(path, 'r');
        const stats: fs.Stats = fs.statSync(path);
        this.#fileBuffer = Buffer.alloc(stats.size);

        fs.readSync(data, this.#fileBuffer, 0, this.#fileBuffer.length, 0);
        fs.closeSync(data);

        const headerLength = 40 // in v2.2
        const buff = Buffer.alloc(headerLength);
        this.#fileBuffer.copy(buff, 0, 0, buff.length);
        if (buff.toString('utf8', 0, 3) != "SxG") {
            throw new Error(`Can't open file`);
        }

        const byteIndexLength: number = buff.readUInt8(10);
        const mainIndexLength: number = buff.readUInt16BE(11);
        const dbItems: number = buff.readUInt32BE(15);
        const idLength: number = buff.readUInt8(19);
        const blockLength: number = 3 + idLength;
        const regionSize: number = buff.readUInt32BE(24);
        const packSize: number = buff.readUInt16BE(38);
        const byteIndexOffset = headerLength + packSize;
        const mainIndexOffset = byteIndexOffset + byteIndexLength * 4;
        const dbBegin = mainIndexOffset + mainIndexLength * 4;
        const regionsBegin = dbBegin + dbItems * blockLength;

        const db = Buffer.alloc(dbBegin - headerLength);
        this.#fileBuffer.copy(db, 0, headerLength, dbBegin);
        const formatDescriptions = db.toString('utf8', 0, packSize);
        const descriptions = formatDescriptions.split(String.fromCharCode(0));

        this.#state = {
            version: buff.readUInt8(3),
            time: buff.readUInt32BE(4),
            type: buff.readUInt8(8),
            charset: buff.readUInt8(9),
            byteIndexLength, mainIndexLength,
            range: buff.readUInt16BE(13),
            dbItems, idLength, blockLength,
            maxRegion: buff.readUInt16BE(20),
            regionSize, regionsBegin,
            maxCity: buff.readUInt16BE(22),
            citySize: buff.readUInt32BE(28),
            citiesBegin: regionsBegin + regionSize,
            maxCountry: buff.readUInt16BE(32),
            countrySize: buff.readUInt32BE(34),
            packSize, dbBegin,
            countryDescription: descriptions[0],
            regionDescription: descriptions[1],
            cityDescription: descriptions[2],
            byteIndexArray: [],
            mainIndexArray: [],
        }

        let buffPos = packSize;
        for (let i = 0; i < byteIndexLength; i++) {
            this.#state.byteIndexArray[i] = db.readUInt32BE(buffPos);
            buffPos += 4;
        }

        for (let i = 0; i < mainIndexLength; i++) {
            this.#state.mainIndexArray[i] = db.readUInt32BE(buffPos);
            buffPos += 4;
        }

    }

    private getId(blockOffset: number, offset: number): number {

        const position = this.#state.dbBegin + blockOffset + offset * this.#state.blockLength - this.#state.idLength;
        const buff = Buffer.alloc(3);
        this.#fileBuffer.copy(buff, 0, position, position + buff.length);

        return (buff.readUInt8(0) << 16) + (buff.readUInt8(1) << 8) + buff.readUInt8(2);
    }

    private getRangeIp(blockOffset: number, offset: number): number {
        let position = this.#state.dbBegin + blockOffset + offset * this.#state.blockLength;
        let buff = Buffer.alloc(3);
        this.#fileBuffer.copy(buff, 0, position, position + buff.length);

        return (buff.readUInt8(0) << 16) + (buff.readUInt8(1) << 8) + (buff.readUInt8(2));
    }

    private searchIndex(ipn: number, min: number, max: number): number {

        while (max - min > 8) {
            const offset = (min + max) >> 1;
            ipn > this.#state.mainIndexArray[offset] ? (min = offset) : (max = offset);
        }

        while (ipn > this.#state.mainIndexArray[min] && min++ < max) {
        }

        return min;
    }

    private searchInDB(blockOffset: number, ipn: number, min: number, max: number): number {

        const buff = Buffer.alloc(4);

        buff.writeUInt32BE(ipn, 0);
        buff.writeUInt8(0, 0);

        const ip = buff.readUInt32BE(0);
        if (max - min <= 1) {
            return this.getId(blockOffset, min++);
        }

        while (max - min > 8) {
            const offset = (min + max) >> 1;
            ip >= this.getRangeIp(blockOffset, offset) ? (min = offset) : (max = offset);
        }

        let less;
        let rangeIp = this.getRangeIp(blockOffset, min);
        if (ipn >= rangeIp) {
            min++;
            less = min < max;
        }

        while (ip >= rangeIp && less) {
            rangeIp = this.getRangeIp(blockOffset, min);
            if (ip >= rangeIp) {
                min++;
                less = min < max;
            }
        }

        return this.getId(blockOffset, min);
    }

    private getNum(ip: string): number | null {

        const ip1n: number = +ip.split('.')[0];
        if (ip1n == 0 || ip1n == 10 || ip1n == 127 || ip1n >= this.#state.byteIndexLength) {
            return null;
        }

        const ipn = ip2long(ip);
        if (ipn === false) {
            return null;
        }

        let min = this.#state.byteIndexArray[ip1n - 1];
        let max = this.#state.byteIndexArray[ip1n];

        if (max - min > this.#state.range) {
            // Ищем блок в основном индексе
            const part: number = this.searchIndex(ipn, Math.floor(min / this.#state.range), Math.floor(max / this.#state.range) - 1);
            // Нашли номер блока в котором нужно искать IP, теперь находим нужный блок в БД
            const leftBorder = part > 0 ? part * this.#state.range : 0;
            const rightBorder = part > this.#state.mainIndexLength ? this.#state.dbItems : (part + 1) * this.#state.range;
            // Нужно проверить чтобы блок не выходил за пределы блока первого байта
            min = min > leftBorder ? min : leftBorder;
            max = max > rightBorder ? rightBorder : max;
        }

        const length = max - min;

        return this.searchInDB(min * this.#state.blockLength, ipn, 0, length);
    }

    private readCountry(seek: number): SypexCountryInterface {

        let position = this.#state.citiesBegin + seek;
        let buff = Buffer.alloc(this.#state.maxCountry);
        this.#fileBuffer.copy(buff, 0, position, position + buff.length);

        return unpack(buff, this.#state.countryDescription);
    }

    private readRegion(seek: number): SypexRegionInterface {

        let position = this.#state.regionsBegin + seek;
        let buff = Buffer.alloc(this.#state.maxRegion);
        this.#fileBuffer.copy(buff, 0, position, position + buff.length);

        return unpack(buff, this.#state.regionDescription);
    }

    private readCity(seek: number): SypexCityInterface {
        let position = this.#state.citiesBegin + seek;
        let buff = Buffer.alloc(this.#state.maxCity);
        this.#fileBuffer.copy(buff, 0, position, position + buff.length);

        return unpack(buff, this.#state.cityDescription);
    }

    private parse(ip: string, mode?: SypexResponseType): SypexCityInterface | SypexRegionInterface | SypexCountryInterface | SypexResponseInterface | null {

        const seek = this.getNum(ip);
        if (seek === null) {
            return null;
        }

        const city: SypexCityInterface = this.readCity(seek);
        if (mode === SypexResponseType.CITY) {
            return city;
        }

        const region: SypexRegionInterface = this.readRegion(city.region_seek);
        if (mode === SypexResponseType.REGION) {
            return region;
        }

        const country: SypexCountryInterface = this.readCountry(region.country_seek);

        return mode === SypexResponseType.COUNTRY ? country : {
            city, region, country
        }
    }

    getCity(ip: string): SypexCityInterface | null {
        return <SypexCityInterface | null>this.parse(ip, SypexResponseType.CITY);
    }

    getRegion(ip: string): SypexRegionInterface | null {
        return <SypexRegionInterface | null>this.parse(ip, SypexResponseType.REGION);
    }

    getCountry(ip: string): SypexCountryInterface | null {
        return <SypexCountryInterface | null>this.parse(ip, SypexResponseType.COUNTRY);
    }

    get(ip: string): SypexResponseInterface | null {
        return <SypexResponseInterface | null>this.parse(ip);
    }
}