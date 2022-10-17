import { Editor, EditorPosition } from "obsidian";
import { stripMarkdown } from "stripMarkdown";

declare module "obsidian" {
	interface Editor {
		getWordLookup(ignoredWords: string[]): { [key: string]: EditorPosition[] }
	}
}

Editor.prototype.getWordLookup = function (ignoredWords: string[]): { [key: string]: EditorPosition[] } {
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

	// Create a lookup table for the words, where the key is the word and the value is an array of positions (occurrences of the word)
	const wordLookup: { [key: string]: EditorPosition[] } = {}
	words
		.filter(w => {
			if (w.word.length <= 0) return false
			if (w.word.startsWith('[[') && w.word.endsWith(']]')) return false
			if (w.word.startsWith('#')) return false
			if (ignoredWords.includes(w.word)) return false
			
			return true
		})
		.forEach(w => {
			const word = stripMarkdown(w.word)

			if (word in wordLookup)
				wordLookup[word].push(w.pos)
			else
				wordLookup[word] = [w.pos]
		})

	return wordLookup
}

// Export
export default Editor;