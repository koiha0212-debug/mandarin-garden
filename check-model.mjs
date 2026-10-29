import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('./dist/model.js',import.meta.url),'utf8');
const {validate,schedule,summary,weekDays,enrichExisting,addTravelPack}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const raw=JSON.parse(fs.readFileSync(new URL('./dist/data.json',import.meta.url),'utf8'));
const d=validate(raw);assert.equal(d.vocabulary.length,39);assert.equal(d.lessons.length,11);
assert.equal(summary(d,'2026-10-28').weekly,55);assert.equal(summary(d,'2026-10-28').due,20);
assert.deepEqual(weekDays(new Date('2026-11-01T12:00:00')),[ '2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
assert.equal(schedule({...d.vocabulary[0],stage:0},'easy','2026-12-31').due,'2027-01-01');
assert.equal(schedule({...d.vocabulary[0],stage:1},'easy','2026-10-28').due,'2026-10-31');
assert.equal(schedule({...d.vocabulary[0],stage:5},'easy','2026-10-28').stage,5);
assert.equal(schedule(d.vocabulary[0],'again','2026-10-28').stage,0);
assert.equal(schedule(d.vocabulary[0],'good','2026-10-28').due,'2026-10-29');
for(const change of [x=>x.vocabulary[0].due='2026-02-30',x=>x.vocabulary[0].stage=9,x=>x.vocabulary[1].id=x.vocabulary[0].id,x=>x.lessons[0].wordIds=['unknown'],x=>x.settings.dailyGoal=0,x=>x.activity['2026-10-28']=-1,x=>x.results=[{date:'2026-10-28',lessonId:'l01',correct:4,total:2}]]){const x=structuredClone(raw);change(x);assert.throws(()=>validate(x))}
const empty=structuredClone(raw);empty.vocabulary=[];empty.lessons=[];empty.activity={};empty.results=[];assert.equal(summary(validate(empty),'2026-10-28').weekly,0);assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);console.log('PASS: JSON round-trip, empty data, invalid imports, review intervals, year boundary, week aggregation');


const legacy=structuredClone(raw);legacy.vocabulary=legacy.vocabulary.slice(0,24);legacy.lessons=legacy.lessons.slice(0,6);for(const w of legacy.vocabulary)for(const k of ['koreanPronunciation','toneNotes','wordBreakdown'])delete w[k];
const old=validate(legacy);assert.equal(old.vocabulary[0].koreanPronunciation,'');assert.equal(old.vocabulary.length,24);
const enriched=enrichExisting(old,d);assert.equal(enriched.vocabulary[0].koreanPronunciation,'니 하오');enriched.vocabulary[0].meaning='사용자 뜻';enriched.vocabulary[0].stage=5;enriched.vocabulary[0].koreanPronunciation='사용자 발음';
const added=addTravelPack(enriched,d);assert.equal(added.vocabulary.length,39);assert.equal(added.lessons.length,11);assert.equal(added.vocabulary[0].meaning,'사용자 뜻');assert.equal(added.vocabulary[0].stage,5);assert.equal(added.vocabulary[0].koreanPronunciation,'사용자 발음');assert.deepEqual(addTravelPack(added,d),added);assert.deepEqual(validate(JSON.parse(JSON.stringify(added))),added);
for(const k of ['koreanPronunciation','toneNotes','wordBreakdown']){const x=structuredClone(raw);x.vocabulary[0][k]={bad:true};assert.throws(()=>validate(x))}
assert.ok(d.vocabulary.every(w=>w.koreanPronunciation&&w.toneNotes&&w.wordBreakdown));console.log('PASS: legacy JSON, pronunciation round-trip, additive pack, idempotence, preservation, invalid optional fields');
