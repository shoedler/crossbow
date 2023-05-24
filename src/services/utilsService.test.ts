// Copyright (C) 2023 - shoedler - github.com/shoedler
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.

import { CrossbowUtilsService } from './utilsService';

const proto = CrossbowUtilsService.prototype;

describe(CrossbowUtilsService.constructor.name, () => {
  describe(`${proto.toArrayOfPaths.name}()`, () => {
    it(`should return an empty array`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toArrayOfPaths('')).toEqual([]);
      expect(service.toArrayOfPaths(' ')).toEqual([]);
    });

    it(`should return an array with one element`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toArrayOfPaths('test')).toEqual(['test/']);
      expect(service.toArrayOfPaths(' test ')).toEqual(['test/']);
      expect(service.toArrayOfPaths('test/')).toEqual(['test/']);
      expect(service.toArrayOfPaths(' test/ ')).toEqual(['test/']);
      expect(service.toArrayOfPaths('/test')).toEqual(['test/']);
      expect(service.toArrayOfPaths('/test/')).toEqual(['test/']);
      expect(service.toArrayOfPaths(' /test/ ')).toEqual(['test/']);
    });

    it(`should treat multiple commas as one`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toArrayOfPaths('test1,,test2')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths(' test1 ,,,,,,, test2 ')).toEqual(['test1/', 'test2/']);
    });

    it(`should return an array with two elements`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toArrayOfPaths('test1,test2')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths(' test1 , test2 ')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths('test1/,test2/')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths(' test1/ , test2/ ')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths('/test1,/test2')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths('/test1/,/test2/')).toEqual(['test1/', 'test2/']);
      expect(service.toArrayOfPaths(' /test1/ , /test2/ ')).toEqual(['test1/', 'test2/']);
    });

    it(`should handle nested paths`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toArrayOfPaths('test1/test2')).toEqual(['test1/test2/']);
      expect(service.toArrayOfPaths(' test1 / test2 ')).toEqual(['test1 / test2/']);
      expect(service.toArrayOfPaths('test1/test2/')).toEqual(['test1/test2/']);
      expect(service.toArrayOfPaths(' test1 / test2/ ')).toEqual(['test1 / test2/']);
      expect(service.toArrayOfPaths('/test1/test2')).toEqual(['test1/test2/']);
      expect(service.toArrayOfPaths('/test1/test2/')).toEqual(['test1/test2/']);
      expect(service.toArrayOfPaths(' /test1/ /test2/ ')).toEqual(['test1/ /test2/']);
    });
  });

  describe(`${proto.toWordList.name}()`, () => {
    it(`should return an empty array`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toWordList('')).toEqual([]);
      expect(service.toWordList(' ')).toEqual([]);
    });

    it(`should return an array with one element`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toWordList('test')).toEqual(['test']);
      expect(service.toWordList(' test ')).toEqual(['test']);
    });

    it(`should treat multiple commas as one`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toWordList('test1,,test2')).toEqual(['test1', 'test2']);
      expect(service.toWordList(' test1 ,,,,,,, test2 ')).toEqual(['test1', 'test2']);
    });

    it(`should return an array with multiple elements`, () => {
      const service = new CrossbowUtilsService();
      expect(service.toWordList('test1,test2')).toEqual(['test1', 'test2']);
      expect(service.toWordList(' test1 , test2 ')).toEqual(['test1', 'test2']);
    });

    it(`should not manipulate the input and not trip on special characters`, () => {
      const service = new CrossbowUtilsService();
      // List with chinese characters
      expect(service.toWordList('test1,测试2')).toEqual(['test1', '测试2']);
      // List with special characters
      expect(service.toWordList('test1,测试2,~!@#$%^&*()_+')).toEqual(['test1', '测试2', '~!@#$%^&*()_+']);
      // List with emojis
      expect(service.toWordList('test1,测试2,😀😁😂🤣😃😄😅😆😉😊')).toEqual([
        'test1',
        '测试2',
        '😀😁😂🤣😃😄😅😆😉😊',
      ]);
    });
  });
});
