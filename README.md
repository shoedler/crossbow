# 🏹 Crossbow

![image](https://user-images.githubusercontent.com/38029550/229279990-f10723bc-380e-4e29-b4f2-47f9b8a5beb9.png)

Crossbow is a plugin for [Obsidian](https://obsidian.md).
Its purpose is to improve the interconnectedness of your notes by providing suggestions for backlinks based on the notes in your vault.

## How to use

Just open the crossbow sidebar by clicking on the crossbow icon. All the suggestions will appear within the sidebar.

### Applying suggestions

Clicking on a suggestion in the sidebar will show you a list of occurences of the word in the current note.
Clicking on one of the occurences will show you a list of links (matches) that you can apply to the word. These matches
are ranked, based on the quality of the match.

You can apply a match by clicking the appropriate icon next to the match:

![image](https://user-images.githubusercontent.com/38029550/229280015-6dfd5747-c445-420c-b75d-9637690ca089.png)

which will insert the following link:

![image](https://user-images.githubusercontent.com/38029550/229280048-fe7a8e31-8cbf-4090-a7f0-4bf0b83814d7.png)


## How to install manually

1. Clone this repo.
2. `npm i` or `yarn` to install dependencies
3. `npm run build` to build crossbow.
4. Copy `main.js`, `styles.css`, `manifest.json` into a folder called `crossbow` in your vault's `.obsidian/plugins/` folder.
