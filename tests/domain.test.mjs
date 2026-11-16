import test from 'node:test';
import assert from 'node:assert/strict';
import {validateSession, newCode, normalizeCode, canTransition, escapeHTML} from '../src/domain.mjs';
test('two sides by default and configurable multi-sided sessions',()=>{
  assert.deepEqual(validateSession({title:'Class',mode:'class'}).sides,['Hosts','Guests']);
  assert.equal(validateSession({title:'Test',mode:'test',sides:['Hosts','Guests','Cleaners']}).sides.length,3);
});
test('rejects invalid or duplicate sides and excessive input',()=>{
  for(const sides of [[],['Hosts'],['Hosts',' hosts '],['Hosts',''],Array(9).fill('x'),['a'.repeat(41),'b']]) assert.throws(()=>validateSession({title:'X',mode:'class',sides}));
  assert.throws(()=>validateSession({title:'X',mode:'admin'}));
});
test('codes and session lifecycle',()=>{
  assert.match(newCode(),/^[A-HJ-NP-Z2-9]{10}$/);
  assert.equal(normalizeCode('abcde-fgh23'),'ABCDEFGH23');
  assert.ok(canTransition('lobby','active'));assert.ok(canTransition('active','paused'));
  assert.ok(!canTransition('closed','active'));assert.ok(!canTransition('lobby','paused'));
});
test('escapes untrusted labels',()=>assert.equal(escapeHTML('<img onerror="x">'),'&lt;img onerror=&quot;x&quot;&gt;'));
