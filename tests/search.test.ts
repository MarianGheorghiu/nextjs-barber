import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesSearch } from '../src/lib/search.ts';
test('căutarea ignoră diacriticele și literele mari și acceptă cuvinte în orice ordine',()=>{
  assert.ok(matchesSearch('Sfânta Parascheva · 14 octombrie','SFANTA octombrie'));
  assert.ok(matchesSearch('Tuns + aranjat barbă','barba tuns'));
  assert.ok(matchesSearch('Andrei Popescu 0700000001','popescu 0700'));
  assert.equal(matchesSearch('Tuns clasic','barba'),false);
  assert.ok(matchesSearch('orice','   '));
});
