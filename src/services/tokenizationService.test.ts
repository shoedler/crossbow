// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.

/* eslint-disable no-useless-escape */ // Reson: `testFile`

import { Editor } from 'obsidian';
import { CrossbowTokenizationService, WordLookup } from './tokenizationService';

const proto = CrossbowTokenizationService.prototype;

describe(CrossbowTokenizationService.constructor.name, () => {
  describe(`${CrossbowTokenizationService.redactText.name}()`, () => {
    it('should redact code blocks (```) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a ```\ncode block\n``` string';
      const expected = 'This is a    \n          \n    string';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact metadata (---) from a string, leaving spaces in its place', () => {
      const input___ = '---\nThis is metadata\n---\r\n This is not';
      const expected = '   \n                \n   \r\n This is not';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact hashtags (#) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a #hashtag string - can even have multiple ###############hashtags';
      const expected = 'This is a          string - can even have multiple                        ';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact html comments (<!-- -->) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a <!-- html comment --> string';
      const expected = 'This is a                       string';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact html tags (<lol>) from a string, leaving spaces in its place', () => {
      const input___ =
        'A <html> tag </html>. With <a href="https://example.com">attributes</a>. <ul><li class="lol">nested tags</li></ul>';
      const expected =
        'A        tag        . With                               attributes    .                     nested tags          ';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact inline latex ($) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a $latex$ string';
      const expected = 'This is a         string';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact block latex ($$) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a $$\nlatex\r\n block\n$$ string, with inline $latex$';
      const expected = 'This is a   \n     \r\n      \n   string, with inline        ';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact obsidian links ([[ & ]]) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a [[obsidian link]] string';
      const expected = 'This is a                   string';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact markdown links ([]()) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a [markdown link](https://example.com) string';
      const expected = 'This is a                                      string';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });

    it('should redact markdown images (![]()) from a string, leaving spaces in its place', () => {
      const input___ = 'This is a ![markdown image](https://example.com) string';
      const expected = 'This is a                                        string';
      const actual = CrossbowTokenizationService.redactText(input___);
      expect(actual).toEqual(expected);
    });
  });

  describe(`${CrossbowTokenizationService.cleanWord.name}()`, () => {
    it('should remove anything but alphanumeric chars from a word', () => {
      const input = 'Word$¨\'^!"*ç"*ç%&/()=?`*';
      const expected = 'Word';
      const actual = CrossbowTokenizationService.cleanWord(input);
      expect(actual).toEqual(expected);
    });
  });

  describe(`${proto.getWordLookupFromEditor.name}()`, () => {
    const mockEditor = (value: string) => {
      return {
        value,
        getValue: () => value,
        offsetToPos: (offset: number) => {
          return {
            line: 0,
            ch: offset,
          };
        },
      } as Editor & { value: string };
    };

    it('should return a word lookup from a string', () => {
      const editor = mockEditor('This is a string" with multiple words');
      const service = new CrossbowTokenizationService();
      const expected = {
        This: [{ line: 0, ch: 0 }],
        is: [{ line: 0, ch: 5 }],
        a: [{ line: 0, ch: 8 }],
        string: [{ line: 0, ch: 10 }],
        with: [{ line: 0, ch: 18 }],
        multiple: [{ line: 0, ch: 23 }],
        words: [{ line: 0, ch: 32 }],
      } as WordLookup;
      const actual = service.getWordLookupFromEditor(editor);
      expect(actual).toEqual(expected);
    });

    it('should return a word lookup from a testfile', () => {
      const editor = mockEditor(testFile);
      const service = new CrossbowTokenizationService();
      const actual = service.getWordLookupFromEditor(editor);
      expect(actual).toEqual(expectedFromTestFile);
    });
  });
});

const expectedFromTestFile = {
  '0': [{ line: 0, ch: 2268 }],
  '1': [
    { line: 0, ch: 1827 },
    { line: 0, ch: 3327 },
    { line: 0, ch: 4554 },
  ],
  '2': [{ line: 0, ch: 3779 }],
  '3': [{ line: 0, ch: 1849 }],
  '4': [
    { line: 0, ch: 192 },
    { line: 0, ch: 215 },
    { line: 0, ch: 413 },
    { line: 0, ch: 1569 },
  ],
  '5': [
    { line: 0, ch: 3135 },
    { line: 0, ch: 3179 },
    { line: 0, ch: 3223 },
    { line: 0, ch: 3289 },
  ],
  '9': [{ line: 0, ch: 3331 }],
  '51': [{ line: 0, ch: 1916 }],
  '93': [{ line: 0, ch: 3784 }],
  '185': [{ line: 0, ch: 3754 }],
  '1249': [{ line: 0, ch: 3041 }],
  '1851': [{ line: 0, ch: 3769 }],
  '12494': [{ line: 0, ch: 3063 }],
  '12589': [{ line: 0, ch: 3186 }],
  '34567': [{ line: 0, ch: 3142 }],
  '55555': [{ line: 0, ch: 3098 }],
  der: [
    { line: 0, ch: 25 },
    { line: 0, ch: 636 },
    { line: 0, ch: 1200 },
    { line: 0, ch: 1292 },
    { line: 0, ch: 3392 },
    { line: 0, ch: 3527 },
  ],
  Statistische: [{ line: 0, ch: 120 }],
  Einheit: [
    { line: 0, ch: 133 },
    { line: 0, ch: 267 },
    { line: 0, ch: 574 },
  ],
  Beispiel: [
    { line: 0, ch: 141 },
    { line: 0, ch: 403 },
    { line: 0, ch: 496 },
    { line: 0, ch: 621 },
    { line: 0, ch: 1801 },
    { line: 0, ch: 2340 },
    { line: 0, ch: 3021 },
  ],
  Schuhe: [
    { line: 0, ch: 151 },
    { line: 0, ch: 420 },
    { line: 0, ch: 461 },
    { line: 0, ch: 640 },
    { line: 0, ch: 667 },
  ],
  aussuchen: [{ line: 0, ch: 158 }],
  nach: [{ line: 0, ch: 168 }],
  Kriterien: [{ line: 0, ch: 173 }],
  Man: [
    { line: 0, ch: 184 },
    { line: 0, ch: 2103 },
  ],
  hat: [
    { line: 0, ch: 188 },
    { line: 0, ch: 705 },
  ],
  Paare: [{ line: 0, ch: 194 }],
  zur: [{ line: 0, ch: 200 }],
  Auswahl: [{ line: 0, ch: 204 }],
  Objekte: [
    { line: 0, ch: 217 },
    { line: 0, ch: 233 },
  ],
  Die: [
    { line: 0, ch: 229 },
    { line: 0, ch: 308 },
    { line: 0, ch: 1239 },
    { line: 0, ch: 1579 },
    { line: 0, ch: 3226 },
  ],
  werden: [
    { line: 0, ch: 241 },
    { line: 0, ch: 2186 },
    { line: 0, ch: 3299 },
  ],
  als: [
    { line: 0, ch: 248 },
    { line: 0, ch: 1316 },
    { line: 0, ch: 1845 },
  ],
  statistische: [{ line: 0, ch: 252 }],
  bezeichnet: [{ line: 0, ch: 277 }],
  Grundgesamtheit: [{ line: 0, ch: 292 }],
  Menge: [
    { line: 0, ch: 312 },
    { line: 0, ch: 449 },
    { line: 0, ch: 2578 },
  ],
  aller: [
    { line: 0, ch: 318 },
    { line: 0, ch: 455 },
  ],
  statistischer: [{ line: 0, ch: 324 }],
  Einheiten: [{ line: 0, ch: 338 }],
  die: [
    { line: 0, ch: 349 },
    { line: 0, ch: 445 },
    { line: 0, ch: 653 },
    { line: 0, ch: 729 },
    { line: 0, ch: 1079 },
    { line: 0, ch: 1379 },
    { line: 0, ch: 1405 },
    { line: 0, ch: 1599 },
    { line: 0, ch: 1709 },
    { line: 0, ch: 3306 },
    { line: 0, ch: 4641 },
  ],
  für: [
    { line: 0, ch: 353 },
    { line: 0, ch: 1375 },
  ],
  eine: [
    { line: 0, ch: 357 },
    { line: 0, ch: 1492 },
    { line: 0, ch: 1911 },
  ],
  Untersuchung: [{ line: 0, ch: 362 }],
  in: [
    { line: 0, ch: 375 },
    { line: 0, ch: 1197 },
    { line: 0, ch: 1289 },
    { line: 0, ch: 1415 },
    { line: 0, ch: 2609 },
    { line: 0, ch: 4040 },
  ],
  Frage: [{ line: 0, ch: 378 }],
  kommen: [{ line: 0, ch: 384 }],
  Im: [
    { line: 0, ch: 392 },
    { line: 0, ch: 486 },
  ],
  obigen: [
    { line: 0, ch: 396 },
    { line: 0, ch: 489 },
    { line: 0, ch: 3230 },
  ],
  Paar: [
    { line: 0, ch: 415 },
    { line: 0, ch: 662 },
  ],
  Könnte: [{ line: 0, ch: 428 }],
  aber: [
    { line: 0, ch: 435 },
    { line: 0, ch: 1867 },
  ],
  auch: [{ line: 0, ch: 440 }],
  sein: [{ line: 0, ch: 468 }],
  Merkmale: [{ line: 0, ch: 477 }],
  Farbe: [
    { line: 0, ch: 506 },
    { line: 0, ch: 630 },
    { line: 0, ch: 721 },
  ],
  Material: [{ line: 0, ch: 513 }],
  Absatzhöhe: [{ line: 0, ch: 523 }],
  usw: [
    { line: 0, ch: 534 },
    { line: 0, ch: 1851 },
  ],
  Eigenschaften: [{ line: 0, ch: 539 }],
  einer: [
    { line: 0, ch: 554 },
    { line: 0, ch: 1390 },
    { line: 0, ch: 1923 },
    { line: 0, ch: 1948 },
    { line: 0, ch: 2381 },
    { line: 0, ch: 3414 },
  ],
  statistischen: [{ line: 0, ch: 560 }],
  Merkmalsausprägung: [{ line: 0, ch: 587 }],
  Qualitativ: [
    { line: 0, ch: 610 },
    { line: 0, ch: 2811 },
    { line: 0, ch: 2902 },
  ],
  Wenn: [{ line: 0, ch: 648 }],
  vier: [{ line: 0, ch: 657 }],
  rot: [
    { line: 0, ch: 674 },
    { line: 0, ch: 744 },
  ],
  blau: [
    { line: 0, ch: 679 },
    { line: 0, ch: 749 },
  ],
  grün: [
    { line: 0, ch: 685 },
    { line: 0, ch: 754 },
  ],
  und: [
    { line: 0, ch: 690 },
    { line: 0, ch: 759 },
    { line: 0, ch: 814 },
    { line: 0, ch: 2075 },
    { line: 0, ch: 4571 },
  ],
  gelb: [
    { line: 0, ch: 694 },
    { line: 0, ch: 763 },
  ],
  sind: [
    { line: 0, ch: 699 },
    { line: 0, ch: 990 },
    { line: 0, ch: 1810 },
    { line: 0, ch: 2088 },
  ],
  das: [
    { line: 0, ch: 709 },
    { line: 0, ch: 871 },
    { line: 0, ch: 1185 },
  ],
  Merkmal: [
    { line: 0, ch: 713 },
    { line: 0, ch: 846 },
    { line: 0, ch: 862 },
    { line: 0, ch: 1029 },
    { line: 0, ch: 1126 },
    { line: 0, ch: 1189 },
  ],
  Ausprägung: [
    { line: 0, ch: 733 },
    { line: 0, ch: 2396 },
  ],
  Quantitativ: [
    { line: 0, ch: 774 },
    { line: 0, ch: 2629 },
    { line: 0, ch: 2720 },
  ],
  Unterkategorien: [{ line: 0, ch: 788 }],
  diskret: [
    { line: 0, ch: 804 },
    { line: 0, ch: 1001 },
    { line: 0, ch: 1134 },
  ],
  stetig: [
    { line: 0, ch: 818 },
    { line: 0, ch: 1147 },
    { line: 0, ch: 1266 },
  ],
  Ein: [
    { line: 0, ch: 828 },
    { line: 0, ch: 1012 },
    { line: 0, ch: 2250 },
  ],
  diskretes: [{ line: 0, ch: 832 }],
  ist: [
    { line: 0, ch: 854 },
    { line: 0, ch: 1037 },
    { line: 0, ch: 1154 },
    { line: 0, ch: 1256 },
    { line: 0, ch: 1595 },
    { line: 0, ch: 1777 },
    { line: 0, ch: 1830 },
    { line: 0, ch: 1907 },
    { line: 0, ch: 2272 },
    { line: 0, ch: 4022 },
    { line: 0, ch: 4538 },
  ],
  ein: [
    { line: 0, ch: 858 },
    { line: 0, ch: 1096 },
    { line: 0, ch: 1122 },
    { line: 0, ch: 2120 },
    { line: 0, ch: 2143 },
    { line: 0, ch: 2276 },
    { line: 0, ch: 3259 },
  ],
  nur: [{ line: 0, ch: 875 }],
  endlich: [{ line: 0, ch: 879 }],
  viele: [
    { line: 0, ch: 887 },
    { line: 0, ch: 941 },
  ],
  Ausprägungen: [
    { line: 0, ch: 893 },
    { line: 0, ch: 947 },
    { line: 0, ch: 1083 },
  ],
  oder: [
    { line: 0, ch: 906 },
    { line: 0, ch: 1142 },
  ],
  höchstens: [{ line: 0, ch: 911 }],
  abzählbar: [{ line: 0, ch: 921 }],
  unendlich: [{ line: 0, ch: 931 }],
  annehmen: [{ line: 0, ch: 960 }],
  kann: [
    { line: 0, ch: 969 },
    { line: 0, ch: 2138 },
  ],
  Zählvariablen: [{ line: 0, ch: 975 }],
  stets: [{ line: 0, ch: 995 }],
  stetiges: [{ line: 0, ch: 1016 }],
  hingegen: [{ line: 0, ch: 1041 }],
  dadurch: [{ line: 0, ch: 1050 }],
  gekennzeichnet: [{ line: 0, ch: 1058 }],
  dass: [
    { line: 0, ch: 1074 },
    { line: 0, ch: 4549 },
  ],
  Intervall: [
    { line: 0, ch: 1100 },
    { line: 0, ch: 2030 },
    { line: 0, ch: 2744 },
  ],
  bilden: [{ line: 0, ch: 1110 }],
  Ob: [{ line: 0, ch: 1119 }],
  hängt: [{ line: 0, ch: 1159 }],
  nicht: [
    { line: 0, ch: 1165 },
    { line: 0, ch: 1962 },
    { line: 0, ch: 3334 },
  ],
  davon: [{ line: 0, ch: 1171 }],
  ab: [{ line: 0, ch: 1177 }],
  wie: [{ line: 0, ch: 1181 }],
  Praxis: [
    { line: 0, ch: 1204 },
    { line: 0, ch: 1296 },
  ],
  tatsächlich: [{ line: 0, ch: 1211 }],
  angegeben: [
    { line: 0, ch: 1223 },
    { line: 0, ch: 1439 },
  ],
  wird: [
    { line: 0, ch: 1233 },
    { line: 0, ch: 1449 },
    { line: 0, ch: 4565 },
  ],
  Körpergrösse: [{ line: 0, ch: 1243 }],
  z: [{ line: 0, ch: 1260 }],
  B: [{ line: 0, ch: 1263 }],
  obwohl: [{ line: 0, ch: 1274 }],
  man: [
    { line: 0, ch: 1281 },
    { line: 0, ch: 4575 },
  ],
  sie: [{ line: 0, ch: 1285 }],
  kaum: [{ line: 0, ch: 1303 }],
  genauer: [{ line: 0, ch: 1308 }],
  auf: [{ line: 0, ch: 1320 }],
  volle: [{ line: 0, ch: 1324 }],
  Zentimeter: [{ line: 0, ch: 1330 }],
  gerundet: [{ line: 0, ch: 1341 }],
  ausweist: [{ line: 0, ch: 1350 }],
  Ähnliches: [{ line: 0, ch: 1360 }],
  gilt: [{ line: 0, ch: 1370 }],
  Grösse: [{ line: 0, ch: 1383 }],
  Wohnung: [{ line: 0, ch: 1396 }],
  meist: [{ line: 0, ch: 1409 }],
  vollen: [{ line: 0, ch: 1418 }],
  Quadratmetern: [{ line: 0, ch: 1425 }],
  Skalenniveau: [{ line: 0, ch: 1457 }],
  Skalenniveaus: [{ line: 0, ch: 1472 }],
  haben: [
    { line: 0, ch: 1486 },
    { line: 0, ch: 3248 },
  ],
  hierarchische: [{ line: 0, ch: 1497 }],
  Struktur: [
    { line: 0, ch: 1511 },
    { line: 0, ch: 1545 },
  ],
  Schwächste: [{ line: 0, ch: 1523 }],
  bis: [
    { line: 0, ch: 1535 },
    { line: 0, ch: 1565 },
  ],
  Beste: [{ line: 0, ch: 1539 }],
  Bild: [
    { line: 0, ch: 1554 },
    { line: 0, ch: 1741 },
    { line: 0, ch: 2319 },
  ],
  EG: [{ line: 0, ch: 1561 }],
  OG: [{ line: 0, ch: 1572 }],
  Wurzelskala: [{ line: 0, ch: 1583 }],
  Nominalskala: [
    { line: 0, ch: 1603 },
    { line: 0, ch: 1662 },
  ],
  Rangordnung: [
    { line: 0, ch: 1677 },
    { line: 0, ch: 1765 },
    { line: 0, ch: 2063 },
  ],
  fehlt: [{ line: 0, ch: 1689 }],
  Wie: [{ line: 0, ch: 1695 }],
  soll: [{ line: 0, ch: 1700 }],
  ich: [{ line: 0, ch: 1705 }],
  ordnen: [{ line: 0, ch: 1713 }],
  Beispiele: [
    { line: 0, ch: 1724 },
    { line: 0, ch: 1978 },
    { line: 0, ch: 2302 },
    { line: 0, ch: 3808 },
    { line: 0, ch: 4114 },
  ],
  Siehe: [
    { line: 0, ch: 1735 },
    { line: 0, ch: 2313 },
  ],
  Ordinalskala: [{ line: 0, ch: 1750 }],
  vorhanden: [{ line: 0, ch: 1781 }],
  Bestes: [{ line: 0, ch: 1794 }],
  Schulnoten: [{ line: 0, ch: 1815 }],
  schlechter: [{ line: 0, ch: 1834 }],
  Es: [
    { line: 0, ch: 1859 },
    { line: 0, ch: 2196 },
  ],
  gibt: [
    { line: 0, ch: 1862 },
    { line: 0, ch: 2199 },
  ],
  keine: [{ line: 0, ch: 1872 }],
  sinnvollen: [{ line: 0, ch: 1878 }],
  Abstände: [
    { line: 0, ch: 1891 },
    { line: 0, ch: 2079 },
  ],
  zB: [{ line: 0, ch: 1901 }],
  an: [
    { line: 0, ch: 1920 },
    { line: 0, ch: 1945 },
  ],
  Schule: [{ line: 0, ch: 1929 }],
  erlaubt: [{ line: 0, ch: 1936 }],
  anderen: [{ line: 0, ch: 1954 }],
  Andere: [{ line: 0, ch: 1971 }],
  Zufriedenheitsskala: [{ line: 0, ch: 1989 }],
  Metrische: [{ line: 0, ch: 2014 }],
  Skala: [
    { line: 0, ch: 2024 },
    { line: 0, ch: 2471 },
  ],
  Verhältnissskala: [{ line: 0, ch: 2043 }],
  definiert: [{ line: 0, ch: 2093 }],
  stelle: [{ line: 0, ch: 2108 }],
  sich: [{ line: 0, ch: 2115 }],
  Meter: [{ line: 0, ch: 2124 }],
  vor: [{ line: 0, ch: 2130 }],
  es: [
    { line: 0, ch: 2135 },
    { line: 0, ch: 4542 },
  ],
  Abstand: [{ line: 0, ch: 2147 }],
  zw: [{ line: 0, ch: 2159 }],
  zwei: [{ line: 0, ch: 2163 }],
  Punkten: [{ line: 0, ch: 2168 }],
  berechnet: [{ line: 0, ch: 2176 }],
  kein: [{ line: 0, ch: 2204 }],
  inhaltlicher: [{ line: 0, ch: 2209 }],
  Nullpunkt: [{ line: 0, ch: 2222 }],
  lucarrowright: [
    { line: 0, ch: 2232 },
    { line: 0, ch: 3108 },
    { line: 0, ch: 3152 },
    { line: 0, ch: 3196 },
  ],
  Einkommen: [
    { line: 0, ch: 2254 },
    { line: 0, ch: 2289 },
  ],
  von: [
    { line: 0, ch: 2264 },
    { line: 0, ch: 3285 },
    { line: 0, ch: 3750 },
  ],
  gültiges: [{ line: 0, ch: 2280 }],
  Zigarettenkonsum: [{ line: 0, ch: 2364 }],
  Person: [{ line: 0, ch: 2387 }],
  Merkmalsart: [{ line: 0, ch: 2447 }],
  des: [{ line: 0, ch: 2584 }],
  Tabakkonsums: [{ line: 0, ch: 2588 }],
  pro: [
    { line: 0, ch: 2601 },
    { line: 0, ch: 2697 },
  ],
  Tag: [
    { line: 0, ch: 2605 },
    { line: 0, ch: 2701 },
  ],
  Gramm: [{ line: 0, ch: 2612 }],
  Stetig: [{ line: 0, ch: 2643 }],
  Verhältniss: [{ line: 0, ch: 2653 }],
  Anzahl: [{ line: 0, ch: 2669 }],
  gerauchte: [{ line: 0, ch: 2676 }],
  Zigaretten: [{ line: 0, ch: 2686 }],
  Diskret: [{ line: 0, ch: 2734 }],
  Nichtraucher: [
    { line: 0, ch: 2760 },
    { line: 0, ch: 2851 },
  ],
  schwacher: [{ line: 0, ch: 2774 }],
  Raucher: [
    { line: 0, ch: 2784 },
    { line: 0, ch: 2801 },
    { line: 0, ch: 2865 },
  ],
  starker: [{ line: 0, ch: 2793 }],
  Ordinal: [{ line: 0, ch: 2835 }],
  Nominal: [{ line: 0, ch: 2926 }],
  Masse: [{ line: 0, ch: 2944 }],
  Arithmetisches: [{ line: 0, ch: 2953 }],
  Mittel: [
    { line: 0, ch: 2968 },
    { line: 0, ch: 3126 },
    { line: 0, ch: 3170 },
    { line: 0, ch: 3214 },
    { line: 0, ch: 3278 },
    { line: 0, ch: 3350 },
  ],
  D: [{ line: 0, ch: 3037 }],
  xquer0: [{ line: 0, ch: 3051 }],
  Problem: [{ line: 0, ch: 3080 }],
  D1: [
    { line: 0, ch: 3093 },
    { line: 0, ch: 4210 },
  ],
  D2: [
    { line: 0, ch: 3137 },
    { line: 0, ch: 4286 },
  ],
  D3: [
    { line: 0, ch: 3181 },
    { line: 0, ch: 3296 },
    { line: 0, ch: 4386 },
  ],
  Datensätze: [{ line: 0, ch: 3237 }],
  alle: [{ line: 0, ch: 3254 }],
  arithmetisches: [{ line: 0, ch: 3263 }],
  Bei: [{ line: 0, ch: 3292 }],
  grossen: [{ line: 0, ch: 3310 }],
  Spikes: [{ line: 0, ch: 3318 }],
  im: [
    { line: 0, ch: 3340 },
    { line: 0, ch: 3347 },
  ],
  gut: [{ line: 0, ch: 3343 }],
  repräsentiert: [{ line: 0, ch: 3357 }],
  Lagemasse: [{ line: 0, ch: 3376 }],
  Lage: [{ line: 0, ch: 3386 }],
  Daten: [
    { line: 0, ch: 3396 },
    { line: 0, ch: 4043 },
  ],
  Verteilung: [
    { line: 0, ch: 3403 },
    { line: 0, ch: 3531 },
  ],
  Zufallszahl: [{ line: 0, ch: 3420 }],
  eines: [{ line: 0, ch: 3434 }],
  Wahrscheinlichkeitsmasses: [{ line: 0, ch: 3440 }],
  Median: [
    { line: 0, ch: 3509 },
    { line: 0, ch: 3743 },
  ],
  Halbierung: [{ line: 0, ch: 3516 }],
  Biespiel: [{ line: 0, ch: 3718 }],
  Berechne: [{ line: 0, ch: 3730 }],
  den: [{ line: 0, ch: 3739 }],
  Werten: [{ line: 0, ch: 3758 }],
  P: [{ line: 0, ch: 3796 }],
  Quantil: [{ line: 0, ch: 3799 }],
  Immer: [{ line: 0, ch: 3974 }],
  zuerst: [{ line: 0, ch: 3980 }],
  n: [{ line: 0, ch: 3987 }],
  p: [{ line: 0, ch: 3991 }],
  ausrechnen: [{ line: 0, ch: 3993 }],
  egal: [{ line: 0, ch: 4005 }],
  was: [{ line: 0, ch: 4010 }],
  gegeben: [{ line: 0, ch: 4014 }],
  Streuung: [{ line: 0, ch: 4031 }],
  Varianz: [
    { line: 0, ch: 4053 },
    { line: 0, ch: 4202 },
    { line: 0, ch: 4278 },
    { line: 0, ch: 4378 },
  ],
  Oft: [{ line: 0, ch: 4534 }],
  so: [{ line: 0, ch: 4545 }],
  gewählt: [{ line: 0, ch: 4557 }],
  trotzdem: [{ line: 0, ch: 4579 }],
  einen: [{ line: 0, ch: 4588 }],
  Erwartungstreuen: [{ line: 0, ch: 4594 }],
  Schätzer: [{ line: 0, ch: 4611 }],
  brauchen: [{ line: 0, ch: 4620 }],
  Dann: [{ line: 0, ch: 4630 }],
  kommt: [{ line: 0, ch: 4635 }],
  Korrektur: [{ line: 0, ch: 4645 }],
  zum: [{ line: 0, ch: 4655 }],
  Zuge: [{ line: 0, ch: 4659 }],
};

const testFile = `
# [[R#R|Grundbegriffe]] der [[Wahrscheinlichkeitsrechnung#Wahrscheinlichkeitsrechnung|Wahrscheinlichkeitsrechnung]]
## Statistische Einheit
Beispiel: Schuhe aussuchen nach Kriterien.
Man hat 4 Paare zur Auswahl -> 4 **Objekte**
Die Objekte werden als **statistische Einheit** bezeichnet

## Grundgesamtheit
Die Menge aller statistischer Einheiten, die für eine Untersuchung in Frage kommen.
(Im obigen Beispiel: 4 Paar Schuhe)
Könnte aber auch die Menge aller Schuhe sein

## Merkmale
Im obigen Beispiel: Farbe, Material, Absatzhöhe usw.
(Eigenschaften einer statistischen Einheit)

## Merkmalsausprägung
### Qualitativ
Beispiel Farbe der Schuhe: Wenn die vier Paar Schuhe rot, blau, grün und gelb sind, hat das Merkmal "Farbe" die Ausprägung rot, blau grün und gelb.

### Quantitativ
- Unterkategorien "diskret" und "stetig"

Ein **diskretes** Merkmal ist ein Merkmal, das nur endlich viele Ausprägungen oder höchstens abzählbar unendlich viele Ausprägungen annehmen kann. (Zählvariablen sind stets diskret.)

Ein **stetiges** Merkmal ist hingegen dadurch gekennzeichnet, dass die Ausprägungen ein Intervall bilden.

Ob ein Merkmal diskret oder stetig ist, hängt nicht davon ab, wie das Merkmal in der Praxis tatsächlich angegeben wird. Die Körpergrösse ist z. B. stetig, obwohl man sie in der Praxis kaum genauer als auf volle Zentimeter gerundet ausweist. Ähnliches gilt für die Grösse einer Wohnung, die meist in vollen Quadratmetern angegeben wird

# Skalenniveau
- Skalenniveaus haben eine hierarchische Struktur
	- Schwächste, bis Beste Struktur (Bild: EG. bis 4. OG)
	- Die Wurzelskala ist die **Nominalskala**

![[Pasted image 20230204143047.png]]

## Nominalskala
- Rangordnung fehlt (Wie soll ich die ordnen?)
- Beispiele: Siehe Bild

## Ordinalskala
- Rangordnung ist vorhanden.
- Bestes Beispiel sind Schulnoten. (1 ist schlechter als 3 usw.)
- Es gibt aber keine "sinnvollen" Abstände. (z.B. ist eine 5.1 an einer Schule erlaubt, an einer anderen nicht)
- Andere Beispiele: Zufriedenheitsskala.

## Metrische Skala (Intervall-, Verhältnissskala)
- Rangordnung und Abstände sind definiert (Man stelle sich ein Meter vor, es kann ein **Abstand** zw. zwei Punkten berechnet werden)
- Es gibt kein inhaltlicher Nullpunkt :luc_arrow_right: Ein Einkommen von "0" ist ein gültiges Einkommen.
- Beispiele: Siehe Bild
$$$ fvsf $$
### Beispiel
#assessment/ws
Zigarettenkonsum einer Person
| Ausprägung                                       | Merkmalsart           | Skala       |
| ------------------------------------------------ | --------------------- | ----------- |
| Menge des Tabakkonsums pro Tag in Gramm          | Quantitativ & Stetig  | Verhältniss |
| Anzahl gerauchte Zigaretten pro Tag              | Quantitativ & Diskret | Intervall   |
| Nichtraucher, schwacher Raucher, starker Raucher | Qualitativ            | Ordinal     |
| Nichtraucher, Raucher                            | Qualitativ            | Nominal     | 

# Masse
## Arithmetisches Mittel
$$\LARGE
\bar{x} = \frac{1}{n}\sum_{i=1}^n x_i
$$
**Beispiel:**
- D = 1,2,4,9
- x_quer(0) = **(1+2+4+9)/4**

**Problem:**
D1 = 5,5,5,5,5 :luc_arrow_right: Mittel = 5
D2 = 3,4,5,6,7 :luc_arrow_right: Mittel = 5
D3 = 1,2,5,8,9 :luc_arrow_right: Mittel = 5

Die obigen Datensätze haben alle ein arithmetisches Mittel von 5. Bei D3 werden die grossen "Spikes" (1, 9) nicht im gut im Mittel repräsentiert.

## Lagemasse (Lage der Daten)
Verteilung einer Zufallszahl / eines Wahrscheinlichkeitsmasses.

![[Pasted image 20230204152906.png]]
### Median
Halbierung der Verteilung 
$$\LARGE
M_{d}=
\begin{cases}
x_{(\frac{n+1}{2})} \text{ falls n ungerade} \\ 
\frac{x_{(\frac{n}{2})} + x_{(\frac{n}{2} + 1)}}{2} \text{ falls n gerade}
\end{cases}
$$
#assessment/ws 
*Biespiel*: Berechne den Median von 185 Werten. ↪️ (185+1) / 2 ↪️ **93**

### P% Quantil 
**Beispiele**

$$
D = \{9,2,7,8,11\}
$$$$
Q_{25\%} = n * p = 5 * 0.25 = 1.25
$$
$$
Q_{50\%} = Median-Formel ungerade = x_{(\frac{n+1}{2})} = \frac{6}{2} = 3 = D[3] = 7
$$

Immer zuerst n * p ausrechnen, egal was gegeben ist.

## Streuung in Daten
### Varianz
$$\LARGE
x = \frac{1}{n}\sum_{i=1}^n (x_i-\bar{x
})^2
$$
Beispiele
$$
D_{1}= {1,1,1,1} 
$$
$$
D_{2}= {2,4,6,8} 
$$
$$
D_{3}= a, a+1, a+2, a+3
$$
Varianz D1
$$
s^2_{D_{1}} = \frac{(1-1)^2+(1-1)^2+(1-1)^2+(1-1)^2}{4} = 0
$$
Varianz D2
$$
\bar{x}_{D_{2}} = 5
$$
$$
s^2{D_{2}} = \frac{(2-5)^2+(4-5)^2+(6-5)^2+(8-5)^2}{4} = 4
$$
Varianz D3
$$
s^2{D_{3}} = \frac{1}{4}*((a-(a+\frac{3}{2})^2 + (a+1-(a+\frac{3}{2})^2) + ... + (a+3-(a+\frac{3}{2})^2
$$

![[Pasted image 20230401142915.png]]

Oft ist es so, dass 1) gewählt wird, und man trotzdem einen Erwartungstreuen Schätzer brauchen. Dann kommt die Korrektur zum Zuge.
`;
