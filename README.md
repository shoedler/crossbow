# 🏹 Crossbow

![image](https://user-images.githubusercontent.com/38029550/229279990-f10723bc-380e-4e29-b4f2-47f9b8a5beb9.png)

Crossbow is a plugin for [Obsidian](https://obsidian.md).

Boost your Obsidian note-taking workflow with this plugin that offers handy suggestions for links to headings, tags, and files, helping you effortlessly weave a web of interconnected notes and supercharge your note graph. 

## How to use

Just open the crossbow sidebar by clicking on the crossbow icon. All the suggestions will appear within the sidebar.

### Applying suggestions

Clicking on a suggestion in the sidebar will show you a list of occurrences of the word in the current note.
Clicking on one of the occurences will scroll to it and show you a list of matched cache items that you can link to. These matches are ranked, based on the quality of the match.

You can apply a match by clicking the appropriate icon next to the match:

![image](https://user-images.githubusercontent.com/38029550/229280015-6dfd5747-c445-420c-b75d-9637690ca089.png)

which will insert the following link:

![image](https://user-images.githubusercontent.com/38029550/229280048-fe7a8e31-8cbf-4090-a7f0-4bf0b83814d7.png)

> In Obsidian a pipe (`|`) inside a link denotes the "display text" of the link. This means that the text after the pipe will be shown instead of the link.

## Under the hood

### What is a suggestion?

A suggestion is a word in your active editor (current note) that can be linked to a **heading**, a **tag**, or a **file** in your vault:

```mermaid
mindmap
  root((Suggestion))
    Word in your current note
    Obsidian Vault Cache Item
      Heading
      File
      Tag
```

Crossbow leverages Obsidian's internal cache and does not manually parse your vault.
To find matches in your current note, it strips the active editors content of any markdown syntax and then searches for suggestion in the stripped content.

### A word about how suggestions are matched

Crossbow is opinionated, but also configurable about how it creates suggestions. 
As of 1.1.1 the process of filtering looks like this:

Initially, it gathers all the **word**s in the active editor (current note) and all the cache items (Identified by their **cache key**) in the vault. 
Then, it follows a simple process for each **word** and **cache key** to create a suggestion:

1. If the **cache key** stems from the active editor (current note), skip. Configurable, see setting *Make suggestions to items in the same file*.
2. If we have an exact match (case sensitive) between **word** and **cache key**, add it as a very good suggestion (ranked as "🏆"). End of process.
3. If the **word** is on the ignore list, skip. Configurable, see setting *Ignored words*.
4. If the **word** is too short (Currently meaning less than 3 chars), skip.
5. If the **cache key** is too short, skip. Configurable, see setting *Minimum word length of suggestions*.
6. If the **word** is not a substring of the **cache key** or vice versa, skip
7. If the **word** does not start with an uppercase letter, skip. Configurable, see setting *Ignore suggestions which start with a lowercase letter*.
8. If the **cache key** does not start with an uppercase letter, skip. Configurable, see setting *Ignore suggestions which start with a lowercase letter*.
9. If we have an exact match (case insensitive) between **word** and **cache key**, add it as a good suggestion (ranked as "🥇"). End of process.
10. If we have a similarity of less than 20% length-wise between **word** and **cache key**, add it as a 'not-very-good' suggestion (ranked as "🥉"). End of process.
11. Else, add it as a mediocre suggestion (ranked as "🥈"). End of process.

Keep in mind that these steps are processed in order. For example, take a look at the length filter in step 10. At this point, the **word** and **cache key** are already a substring of each other (step 6), meaning that this step adds things like "donut" and "donut hole punching machine manual". Not things that are in general vastly different to each other, which would create a lot of false positives.

## How to install manually

1. Clone this repo.
2. `npm i` or `yarn` to install dependencies
3. `npm run build` to build crossbow.
4. Copy `main.js`, `styles.css`, `manifest.json` into a folder called `crossbow` in your vault's `.obsidian/plugins/` folder.

<hr/>
If you like this plugin, please consider:
<br/>
<br/>
<a href="https://www.buymeacoffee.com/shoedler"><img src="https://img.buymeacoffee.com/button-api/?text=Buy me a beer&emoji=🍺&slug=shoedler&button_colour=ffffff&font_colour=000000&font_family=Lato&outline_colour=000000&coffee_colour=FFDD00" /></a>
