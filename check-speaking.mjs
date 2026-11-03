import assert from 'node:assert/strict';
import fs from 'node:fs';
const source=fs.readFileSync('dist/speaking.js','utf8');
const {mandarinVoices,recordingIssue,recorderOptions,openSpeaking}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
class Target extends EventTarget { constructor(){super();this.nodes=new Map();} querySelector(s){if(!this.nodes.has(s))this.nodes.set(s,new Target());return this.nodes.get(s)} setAttribute(){} showModal(){} close(){} remove(){} }
const doc=new Target();doc.createElement=()=>new Target();doc.body={append(d){doc.dialog=d}};
globalThis.document=doc;globalThis.window=new Target();globalThis.isSecureContext=true;
let requests=0, stopped=0, resolvePermission, rejectPermission, tracks;
Object.defineProperty(globalThis,'navigator',{value:{mediaDevices:{getUserMedia(){requests++;return new Promise((resolve,reject)=>{resolvePermission=resolve;rejectPermission=reject})}}},configurable:true});
const grant=()=>{tracks=[{stop(){stopped++}}];resolvePermission({getTracks:()=>tracks})};
class Recorder {static isTypeSupported(t){return t==='audio/mp4'} constructor(){this.state='inactive';this.mimeType='audio/mp4';Recorder.last=this} start(){this.state='recording'} stop(){this.state='inactive';queueMicrotask(()=>{this.ondataavailable?.({data:new Blob(['voice'],{type:this.mimeType})});this.onstop?.()})} }
globalThis.MediaRecorder=Recorder;
let played=0;class AudioMock {pause(){}load(){}removeAttribute(){}play(){played++;queueMicrotask(()=>this.onended?.());return Promise.resolve()}}
globalThis.Audio=AudioMock;globalThis.SpeechSynthesisUtterance=class{constructor(text){this.text=text}};
const synth=new Target();let spoken=0;synth.getVoices=()=>[{lang:'zh-CN',localService:true},{lang:'zh-CN',localService:false},{lang:'zh-HK',localService:true}];synth.cancel=()=>{};synth.speak=u=>{spoken++;queueMicrotask(()=>u.onend?.())};globalThis.speechSynthesis=synth;
let created=0,revoked=0;URL.createObjectURL=()=>`blob:test-${++created}`;URL.revokeObjectURL=()=>revoked++;
const word={hanzi:'你好',pinyin:'nǐ hǎo',example:'你好！'};
const button=n=>doc.dialog.querySelector(`[data-${n}]`);const click=n=>button(n).onclick();const tick=()=>new Promise(r=>setImmediate(r));
assert.equal(mandarinVoices(synth).length,1);assert.deepEqual(recorderOptions(Recorder),{mimeType:'audio/mp4'});assert.deepEqual(recorderOptions(class{}),{});
assert.match(recordingIssue({isSecureContext:false}),/HTTPS/);assert.match(recordingIssue({isSecureContext:true}),/지원/);
openSpeaking(word);assert.equal(requests,0);assert.equal(button('play').disabled,true);
let recording=click('record');assert.equal(requests,1);assert.equal(button('record').disabled,true);grant();await recording;assert.equal(Recorder.last.state,'recording');click('stop');await tick();assert.equal(stopped,1);assert.equal(created,1);assert.equal(button('play').disabled,false);
click('compare');await tick();assert.equal(spoken,3);assert.equal(played,3);click('delete');assert.equal(revoked,1);assert.equal(button('play').disabled,true);click('close-speaking');
// Permission resolves after the panel closes: tracks must never remain live.
openSpeaking(word);recording=click('record');click('close-speaking');grant();await recording;assert.equal(stopped,2);
// Denial allows retry without pretending a recording exists.
openSpeaking(word);recording=click('record');rejectPermission({name:'NotAllowedError'});await recording;assert.match(button('status').textContent,/권한이 거부/);assert.equal(button('record').disabled,false);
// Cancel pending request, then grant: no recording starts.
recording=click('record');click('stop');grant();await recording;assert.equal(stopped,3);
// Closing an active recorder releases tracks and discards its final chunk.
recording=click('record');grant();await recording;click('close-speaking');await tick();assert.equal(stopped,4);assert.equal(created,1);
// Missing local voice and unsupported recorder retain a usable panel.
synth.getVoices=()=>[];globalThis.MediaRecorder=undefined;openSpeaking(word,true);assert.equal(button('listen').disabled,true);assert.equal(button('record').disabled,true);click('close-speaking');
assert.doesNotMatch(source,/localStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon/);
console.log('PASS: local Mandarin only, MIME fallback, secure context, unsupported browser, explicit permission, recording/playback/3 comparisons/delete, denial/retry, late permission/cancel/close cleanup, no persistence or upload');
