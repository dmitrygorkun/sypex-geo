export interface StateInterface {
    version: number;
    time: number;
    type: number;
    charset: number;
    byteIndexLength: number; // first_byte_index_count:
    mainIndexLength: number; // main_index_count:
    range: number; // blocks_per_index_element:
    dbItems: number; // range_count:
    idLength: number; // block_id_size
    blockLength: number;
    maxCountry: number;
    maxRegion: number;
    maxCity: number;
    countrySize: number;
    regionSize: number;
    citySize: number;
    regionsBegin: number;
    citiesBegin: number;
    packSize: number;
    dbBegin: number; // ranges_offset
    countryDescription: string;
    regionDescription: string;
    cityDescription: string;
    byteIndexArray: number[];
    mainIndexArray: number[];
}