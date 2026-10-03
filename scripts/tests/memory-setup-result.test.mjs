import test from 'node:test';
import assert from 'node:assert/strict';
import { memoryResult,validateMemoryResult,consumeMemoryResult } from '../../.agents/skills/memory/scripts/lib/memory-result.mjs';
const installation={installationId:'i'.repeat(32),repositoryId:'r'.repeat(32),appUrl:'https://app.example.com',memoryOrigin:'https://memory.example.com'};
test('public version2 routing is canonical, allowlisted and cannot manufacture ready',()=>{
 const pending=memoryResult(installation);assert.deepEqual(validateMemoryResult(pending),pending);assert.deepEqual(consumeMemoryResult(pending),pending);
 assert.throws(()=>memoryResult(installation,'ready'),e=>e.code==='machine-operation-proof-required');
 for(const bad of [{...pending,protocolVersion:1},{...pending,action:'https://app.example.com/secret'},{...pending,token:'synthetic'},{...pending,reason:'private-provider-error'},{...pending,memoryOrigin:'https://memory.example.com/_memory'},{...pending,appUrl:'https://user:secret@app.example.com'},{...pending,installationId:'bad'},{...pending,instruction:'private-key'}])assert.throws(()=>validateMemoryResult(bad));
 const remote={...pending,status:'ready',reason:null,instruction:null};assert.equal(consumeMemoryResult(remote).status,'pending-setup');
 assert.equal(memoryResult(null,'blocked','exact-machine-revocation-required').status,'blocked');
});
