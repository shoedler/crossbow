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

export type Trie<T> = {
  value?: T;
  next: { [key: string]: Trie<T> };
};

const createTrie = <T>(items: T[], keySelector: (item: T) => string): Trie<T> => {
  const root: Trie<T> = { next: {} };

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    addOrUpdate(root, item, keySelector, (o, n) => {
      throw new Error(`Duplicate entry: ${JSON.stringify(n)}`);
    });
  }

  return root;
};

const addOrUpdate = <T>(
  root: Trie<T>,
  item: T,
  keySelector: (item: T) => string,
  update: (oldItem: T, newItem: T) => T
): void => {
  const key = keySelector(item).toLocaleLowerCase();

  let trie = root;

  for (let i = 0; i < key.length; i++) {
    const c = key[i];

    trie.next[c] = trie.next[c] || { next: {} };

    if (i === key.length - 1) {
      if (trie.next[c].value) {
        trie.next[c].value = update(trie.next[c].value as T, item);
      } else {
        trie.next[c].value = item;
      }

      break;
    }

    trie = trie.next[c] as Trie<T>;
  }
};

const tryGet = <T>(root: Trie<T>, key: string): T | undefined => {
  let trie = root;
  let i = 0;

  while (i < key.length && trie) {
    trie = trie.next[key[i++]] as Trie<T>;
  }

  return trie.value as T | undefined;
};

const toArray = <T>(root: Trie<T>): T[] => {
  const result: T[] = [];

  for (const value of traverse(root)) {
    result.push(value);
  }

  return result;
};

const length = <T>(root: Trie<T>): number => {
  let result = 0;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  for (const _ of traverse(root)) {
    result++;
  }

  return result;
};

function* traverse<T>(trie: Trie<T>): Generator<T> {
  if (trie.value) {
    yield trie.value;
  }

  for (const key in trie.next) {
    yield* traverse(trie.next[key]);
  }
}

export const TrieTools = {
  createTrie,
  addOrUpdate,
  tryGet,
  toArray,
  length,
  traverse,
};
