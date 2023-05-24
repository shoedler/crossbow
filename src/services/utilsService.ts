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

export class CrossbowUtilsService {
  constructor() {}

  // folders names (or paths, separated by "/"). (Whitepaces around commas will be trimmed)
  public toArrayOfPaths(pathArrayLike: string): string[] {
    return pathArrayLike
      .replace(/,*\s*$/, '') // Remove trailing comma
      .replace(/,{2,}/g, ',') // Remove n > 1 chained commas
      .split(',')
      .map((folderOrPath) => folderOrPath.trim())
      .filter((folderOrPath) => folderOrPath.length > 0) // Remove empty strings
      .map((folderOrPath) => folderOrPath.replace(/^\/+/, '')) // Remove leading slashes
      .map((folderOrPath) => folderOrPath.replace(/\/{2,}/g, '/')) // Remove n > 1 chained slashes
      .map((folderOrPath) => (folderOrPath.endsWith('/') ? folderOrPath : `${folderOrPath}/`)); // Add trailing slash
  }

  // case-sensitive, comma separated list of word. (Whitepaces around commas will be trimmed
  public toWordList(wordArrayLike: string): string[] {
    return wordArrayLike
      .replace(/,*\s*$/, '') // Remove trailing comma
      .replace(/,{2,}/g, ',') // Remove n > 1 chained commas
      .split(',')
      .map((word) => word.trim())
      .filter((folderOrPath) => folderOrPath.length > 0); // Remove empty strings
  }
}
