import { CrossbowSuggestion } from "main";
import { Editor, EditorPosition } from "obsidian";
import { stripMarkdown } from "./util";

declare module "obsidian" {
  interface Editor {
    getWordLookup(): { [key: string]: EditorPosition[] }
  }
}

Editor.prototype.getWordLookup = function (): { [key: string]: EditorPosition[] } {
  const plainText = this.getValue();

  // Split the plain text into word-objects, which contain the word and its position in the editor
  const words: { word: string, pos: EditorPosition }[] = []
  for (let i = 0; i < plainText.length; i++) {
    if (plainText[i].match(/\s/)) 
      continue
    else {
      let word = ''
      let pos = this.offsetToPos(i)

      while (plainText[i] && !plainText[i].match(/\s/)) 
        word += plainText[i++]

      words.push({ word, pos })
    }
  }

  // Remove Headings and obsidian links
  const filteredWords = words
    .filter(w => {
      if (w.word.length <= 0)
      return false
      if (w.word.startsWith('[[') && w.word.endsWith(']]'))
      return false
      if (w.word.startsWith('#'))
      return false
      
      return true
    });
  
  // Create a lookup table for the words, where the key is the word and the value is an array of positions (occurrences of the word)
  const wordLookup: { [key: string]: EditorPosition[] } = {}
  for (let i = 0; i < filteredWords.length; i++) {
    const word = stripMarkdown(filteredWords[i].word)

    // Remove obsidian links which are longer than one word
    if (filteredWords[i].word.startsWith('[[')) {
      while (!filteredWords[++i].word.endsWith(']]') || i >= filteredWords.length) { /* nothing */ }
    }

    if (word in wordLookup)
      wordLookup[word].push(filteredWords[i].pos)
    else
      wordLookup[word] = [filteredWords[i].pos]
  }

  return wordLookup
}

export default Editor;