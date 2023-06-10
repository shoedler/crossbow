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

import { Editor, EditorPosition } from 'obsidian';

export type WordLookup = { [key: string]: EditorPosition[] };

const OBSIDIAN_METADATA_REGEX = /^\n*?---[\s\S]+?---/g;
const OBSIDIAN_TAG_REGEX = /#+([a-zA-Z0-9_/]+)/g;
const OBSIDIAN_LINKS_REGEX = /\[([^\]]+)\]+/g;

const HTML_COMMENT_REGEX = /<!--[\s\S]+?-->/g;
const HTML_TAG_REGEX = /<\/?[\w\s="/.':;#-/?]+>/gm;

const MARKDOWN_LATEX_BLOCK_REGEX = /\$\$([^$]+)\$\$/g;
const MARKDOWN_LATEX_INLINE_REGEX = /\$([^$]+)\$/g;
const MARKDOWN_LINKS_AND_IMAGES_REGEX = /!?\[([^\]]+)\]\((?:<.*>)?\s*([^\s)]+)\s*\)/gm;
const MARKDOWN_CODE_BLOCK_REGEX = /```[\s\S]+?```/g;
const MARKDOWN_ASTERISK_EMPHASIS_REGEX = /([*]+)(\S)(.*?\S)??(\1)/g; // g1 = *, g2 = first char, g3 = middle, g4 = *

// const MARKDOWN_LODASH_EMPHASIS_REGEX =   /(^|\W)([_]+)(\S)(.*?\S)??\2($|\W)/g;
// const MARKDOWN_CODE_INLINE_REGEX =       /`(.+?)`/g;
// const MARKDOWN_STRIKETROUGH_REGEX =      /~(.*?)~/g;

export class CrossbowTokenizationService {
  private readonly SKIP_REGEX = /\s/;

  public getWordLookupFromEditor(targetEditor: Editor): WordLookup {
    if (!targetEditor) return {};

    const wordLookup: WordLookup = {};

    const rawText = targetEditor.getValue();
    const plainText = CrossbowTokenizationService.redactText(rawText);

    for (let i = 0; i < plainText.length; i++) {
      if (plainText[i].match(this.SKIP_REGEX)) continue;
      else {
        let word = '';
        const pos = targetEditor.offsetToPos(i);

        while (plainText[i] && !plainText[i].match(this.SKIP_REGEX)) word += plainText[i++];

        word = CrossbowTokenizationService.cleanWord(word);

        if (word.length <= 0) continue;

        if (word in wordLookup) wordLookup[word].push(pos);
        else wordLookup[word] = [pos];
      }
    }

    return wordLookup;
  }

  public static muteString = (str: string): string => str.replace(/[^\r\n]+/g, (m) => ' '.repeat(m.length));

  public static muteWord = (word: string): string => ' '.repeat(word.length);

  public static redactText(text: string): string {
    // Order matters here
    return text
      .replace(MARKDOWN_ASTERISK_EMPHASIS_REGEX, (m, g1, g2, g3) => this.muteWord(g1) + g2 + g3 + this.muteWord(g1))
      .replace(MARKDOWN_CODE_BLOCK_REGEX, (m) => this.muteString(m))
      .replace(MARKDOWN_LATEX_BLOCK_REGEX, (m) => this.muteString(m))
      .replace(MARKDOWN_LATEX_INLINE_REGEX, (m) => this.muteString(m))
      .replace(MARKDOWN_LINKS_AND_IMAGES_REGEX, (m) => this.muteString(m))
      .replace(OBSIDIAN_METADATA_REGEX, (m) => this.muteString(m))
      .replace(OBSIDIAN_TAG_REGEX, (m) => this.muteString(m))
      .replace(OBSIDIAN_LINKS_REGEX, (m) => this.muteString(m))
      .replace(HTML_COMMENT_REGEX, (m) => this.muteString(m))
      .replace(HTML_TAG_REGEX, (m) => this.muteString(m));
  }

  public static cleanWord(word: string): string {
    return word
      .replace(/[^a-z0-9äöü'-]/gi, '') // Remove all non-alphanumeric characters except hyphens and apostrophes
      .replace(/^[’'-]+|[’'-]+$/gi, ''); // Remove leading and trailing hyphens and apostrophes
  }
}
