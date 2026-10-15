import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

test('profile cache isolates logged-out visitors and different accounts', async () => {
  const source = await readFile(new URL('../src/lib/user-profile.ts', import.meta.url), 'utf8');
  const cache = new Map([
    ['library_user_avatar', 'old-private-photo'],
    ['library_user_nickname', 'Old account'],
  ]);
  const exports = {};
  const context = {
    exports, require: () => ({}), console,
    CustomEvent: class { constructor(type, options) { this.type = type; this.detail = options.detail; } },
    window: {
      localStorage: { getItem: key => cache.get(key) ?? null, setItem: (key, value) => cache.set(key, value) },
      dispatchEvent() {},
    },
  };
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText, context);
  const { getStoredProfile, saveStoredProfile, DEFAULT_AVATAR } = exports;
  assert.equal(getStoredProfile(null).avatar, DEFAULT_AVATAR);
  assert.equal(getStoredProfile(null).nickname, 'Читатель');
  const alice = { id: 'alice', username: 'Alice', imageUrl: 'alice-clerk' };
  const bob = { id: 'bob', username: 'Bob', imageUrl: 'bob-clerk' };
  saveStoredProfile({ nickname: 'Alice custom', avatar: 'alice-photo' }, alice.id);
  assert.equal(getStoredProfile(alice).avatar, 'alice-photo');
  assert.equal(getStoredProfile(null).avatar, DEFAULT_AVATAR, 'logout hides the account avatar');
  assert.equal(getStoredProfile(bob).avatar, 'bob-clerk', 'another account uses its own defaults');
  assert.equal(getStoredProfile(bob).nickname, 'Bob');
  saveStoredProfile({ avatar: 'guest-photo' });
  assert.equal(getStoredProfile(null).avatar, 'guest-photo');
  assert.equal(getStoredProfile(alice).avatar, 'alice-photo', 'guest changes preserve account data');
  assert.equal(cache.get('library_user_avatar'), 'old-private-photo', 'legacy shared keys are no longer written');
});
