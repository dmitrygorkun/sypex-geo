# Sypex Geo 

Unofficial Sypex Geo Client for NodeJS.

## Install

```
$ yarn add @gorkun/sypex-geo
```

## Usage

```js
import {SypexGeoClient} from "@gorkun/sypex-geo";

const client = new SypexGeoClient('./SxGeoCity.dat');
const city = client.get('178.162.122.146');
```