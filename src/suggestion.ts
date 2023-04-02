import { EditorPosition } from "obsidian";
import { CacheMatch } from "../main";
import { TreeItem, TreeItemBase } from "./view/treeItem";

export class Suggestion extends TreeItem<string> {
  public constructor(word: string, editorPositions: EditorPosition[], public readonly cacheMatches: CacheMatch[]) {
    super(word);
    this.addChildren(editorPositions.map(position => new Occurrence(position, this.cacheMatches)));
  }

  public static register = (): void => customElements.define('crossbow-suggestion', Suggestion);

  public get hash(): string { return this.value; }

  public get text(): string { return this.value; }

  public getChildren = () => 
     Array.from(this.childrenWrapper.children) as Occurrence[];

  public sortChildren(): void {
    this.getChildren()
      .sort((a, b) => a.value.line - b.value.line)
      .forEach(child => {
        this.appendChild(child);
        child.sortChildren()
      });
  }

  public addChildren(children: Occurrence[]): void {
      children.forEach(child => this.appendChild(child));
  }

  public attach = (parent: HTMLElement, insertBeforeIndex: number): void => {
    super.attach(parent, insertBeforeIndex);

    const ranks = new Set<CacheMatch['rank']>();
    this.cacheMatches.forEach(match => ranks.add(match.rank));

    const availableMatchRanks = Array.from(ranks).sort((a, b) => a.codePointAt(0)! - b.codePointAt(0)!).join('');

    this.addFlair(availableMatchRanks);
    this.addTextSuffix(`(${this.children.length.toString()})`);
  }
}

export class Occurrence extends TreeItem<EditorPosition> {
  public constructor(value: EditorPosition, cacheMatches: CacheMatch[]) {
    super(value);
    this.addChildren(cacheMatches.map(match => new Match(match)));
  }

  public static register = (): void => customElements.define('crossbow-occurrence', Occurrence);

  public get hash(): string { return `${this.value.line}:${this.value.ch}`; }

  public get text(): string { return `On line ${this.value.line}:${this.value.ch}` }

  public getChildren = () =>
    Array.from(this.childrenWrapper.children) as Match[];

  public sortChildren(): void {
    this.getChildren()
      .sort((a, b) => a.value.rank.codePointAt(0)! - b.value.rank.codePointAt(0)!)
  }

  public addChildren(children: Match[]): void {
    children.forEach(child => this.appendChild(child));
  }
}

export class Match extends TreeItemBase<CacheMatch> {
  public constructor(value: CacheMatch) {
    super(value);
  }

  public static register = (): void => customElements.define('crossbow-match', Match);

  public get hash(): string { return `${this.value.text}|${this.value.file.path}`; }

  public get text(): string { return `${this.value.rank} ${this.value.text}` }

  public sortChildren(): void { }
}
