import {SypexCityInterface} from "./city.interface";
import {SypexRegionInterface} from "./region.interface";
import {SypexCountryInterface} from "./country.interface";

export enum SypexResponseType {
    CITY,
    REGION,
    COUNTRY,
}

export interface SypexResponseInterface {
    city: SypexCityInterface,
    region: SypexRegionInterface,
    country: SypexCountryInterface
}