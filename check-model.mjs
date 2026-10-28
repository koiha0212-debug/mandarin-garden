import assert from 'node:assert/strict';
import fs from 'node:fs';
const src=fs.readFileSync(new URL('./dist/model.js',import.meta.url),'utf8');
const {validate,schedule,summary,weekDays}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const raw=JSON.parse(fs.readFileSync(new URL('./dist/data.json',import.meta.url),'utf8'));
const d=validate(raw);assert.equal(d.vocabulary.length,24);assert.equal(d.lessons.length,6);
assert.equal(summary(d,'2026-10-28').weekly,55);assert.equal(summary(d,'2026-10-28').due,20);
assert.deepEqual(weekDays(new Date('2026-11-01T12:00:00')),[ '2026-10-26','2026-10-27','2026-10-28','2026-10-29','2026-10-30','2026-10-31','2026-11-01']);
assert.equal(schedule({...d.vocabulary[0],stage:0},'easy','2026-12-31').due,'2027-01-01');
assert.equal(schedule({...d.vocabulary[0],stage:1},'easy','2026-10-28').due,'2026-10-31');
assert.equal(schedule({...d.vocabulary[0],stage:5},'easy','2026-10-28').stage,5);
assert.equal(schedule(d.vocabulary[0],'again','2026-10-28').stage,0);
assert.equal(schedule(d.vocabulary[0],'good','2026-10-28').due,'2026-10-29');
for(const change of [x=>x.vocabulary[0].due='2026-02-30',x=>x.vocabulary[0].stage=9,x=>x.vocabulary[1].id=x.vocabulary[0].id,x=>x.lessons[0].wordIds=['unknown'],x=>x.settings.dailyGoal=0,x=>x.activity['2026-10-28']=-1,x=>x.results=[{date:'2026-10-28',lessonId:'l01',correct:4,total:2}]]){const x=structuredClone(raw);change(x);assert.throws(()=>validate(x))}
const empty=structuredClone(raw);empty.vocabulary=[];empty.lessons=[];empty.activity={};empty.results=[];assert.equal(summary(validate(empty),'2026-10-28').weekly,0);assert.deepEqual(validate(JSON.parse(JSON.stringify(d))),d);console.log('PASS: JSON round-trip, empty data, invalid imports, review intervals, year boundary, week aggregation');
