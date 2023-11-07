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

import { TFile } from 'obsidian';
import { Suggestion } from 'src/model/suggestion';
import { CacheMatch, CrossbowIndexingService } from './indexingService';
import { CrossbowSettingsService } from './settingsService';
import { WordLookup } from './tokenizationService';

export class CrossbowSuggestionsService {
  public constructor(
    private readonly settingsService: CrossbowSettingsService,
    private readonly indexingService: CrossbowIndexingService
  ) {}

  public getSuggestionsFromWordlookup(wordLookup: WordLookup, currentFile: TFile): Suggestion[] {
    if (!wordLookup) return [];

    const result: Suggestion[] = [];
    const cache = this.indexingService.getCache();
    const settings = this.settingsService.getSettings();

    const wordEntries = Object.entries(wordLookup);

    for (let i = 0; i < wordEntries.length; i++) {
      const [word, editorPositions] = wordEntries[i];
      const lowercaseWord = word.toLowerCase();

      const matches: CacheMatch[] = [];

      // Find matches in the cache
      const cacheValues = Object.values(cache);

      for (let j = 0; j < cacheValues.length; j++) {
        const cacheLookup = cacheValues[j];
        const cacheEntries = Object.entries(cacheLookup);

        for (let k = 0; k < cacheEntries.length; k++) {
          const [cacheKey, cacheValue] = cacheEntries[k];
          const lowercaseCacheKey = cacheKey.toLowerCase();

          if (matches.length >= 300) continue;

          // If reference is in the same file, and we don't want to suggest references in the same file, skip
          if (!settings.suggestInSameFile && cacheValue.file === currentFile) continue;

          // If we have a case-sensitive exact match, we always add it, even if it does not satisfy the other filters. Say we have a chapter with a heading 'C' (eg. the programming language)
          // We want to match a word 'C' in the current editor, even if it is too short or is on the ignore list.
          if (cacheKey === word) {
            matches.push({ ...cacheValue, rank: '🏆' });
            continue;
          }

          // If the word is too short, skip
          if (word.length <= 3) continue;

          // If the cache key is too short, skip
          if (cacheKey.length <= settings.minimumSuggestionWordLength) continue;

          // If the word is not a substring of the key or the key is not a substring of the word, skip
          if ((lowercaseCacheKey.includes(lowercaseWord) || lowercaseWord.includes(lowercaseCacheKey)) === false)
            continue;

          // If the word does not start with an uppercase letter, skip
          if (settings.ignoreOccurrencesWhichStartWithLowercaseLetter && cacheKey[0] === lowercaseCacheKey[0]) continue;

          // If the cache key does not start with an uppercase letter, skip
          if (settings.ignoreSuggestionsWhichStartWithLowercaseLetter && word[0] === lowercaseWord[0]) continue;

          // If the word is a case-insensitive exact match, add as a very good suggestion
          if (lowercaseCacheKey === lowercaseWord) {
            matches.push({ ...cacheValue, rank: '🥇' });
            continue;
          }

          // If the lengths differ too much, add as not-very-good suggestion
          if ((1 / cacheKey.length) * word.length <= 0.2) {
            matches.push({ ...cacheValue, rank: '🥉' });
            continue;
          }

          // Else, add as a mediocre suggestion
          matches.push({ ...cacheValue, rank: '🥈' });
        }
      }

      if (matches.length > 0) {
        result.push(new Suggestion(word, matches, editorPositions));
      }
    }

    // Sort the result
    result.sort((a, b) => a.uid.localeCompare(b.uid)).forEach((suggestion) => suggestion.sortChildren());

    // Remove ignored words from the result
    return this.removeIgnoredWords(result);
  }

  private removeIgnoredWords(suggestions: Suggestion[]): Suggestion[] {
    const ignoredWordsCaseSensisitve = this.settingsService.getSettings().ignoredWordsCaseSensisitve;
    const ignoredWordsCache: { [key: string]: boolean } = {};

    const result = suggestions.filter((suggestion) => {
      if (ignoredWordsCache[suggestion.word] === undefined) {
        ignoredWordsCache[suggestion.word] = !ignoredWordsCaseSensisitve.includes(suggestion.word);
      }

      return ignoredWordsCache[suggestion.word];
    });

    return result;
  }
}
