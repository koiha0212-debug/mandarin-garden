export function dateKey(d=new Date()){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`}
export function dayAfter(n,from=new Date()){const d=new Date(from);d.setDate(d.getDate()+n);return dateKey(d)}
export function weekDays(now=new Date()){const d=new Date(now);d.setHours(12,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return Array.from({length:7},(_,i)=>{const t=new Date(d);t.setDate(d.getDate()+i);return dateKey(t)})}
export function validate(raw){
 const fail=m=>{throw new Error(m)};if(!raw||raw.schemaVersion!==1)fail('schemaVersion은 1이어야 합니다.');
 const str=(v,label,max=300)=>{if(typeof v!=='string'||!v.trim()||v.length>max)fail(`${label}: 1~${max}자 문자열이 필요합니다.`);return v.trim()};
 const num=(v,label,min,max)=>{if(!Number.isInteger(v)||v<min||v>max)fail(`${label}: ${min}~${max} 사이 정수가 필요합니다.`);return v};
 const date=v=>{if(typeof v!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v+'T12:00:00'))||dateKey(new Date(v+'T12:00:00'))!==v)fail('유효한 날짜(YYYY-MM-DD)가 필요합니다.');return v};
 const arr=(v,label,max)=>{if(!Array.isArray(v)||v.length>max)fail(`${label}: 최대 ${max}개 배열이 필요합니다.`);return v};
 const s=raw.settings;if(!s)fail('settings가 필요합니다.');const settings={name:str(s.name,'이름',30),dailyGoal:num(s.dailyGoal,'일일 목표',1,180)};
 const seen=new Set();const uid=(v)=>{const id=str(v,'ID',70);if(!/^[a-zA-Z0-9_-]+$/.test(id)||seen.has(id))fail('ID는 고유한 영문·숫자·하이픈·밑줄이어야 합니다.');seen.add(id);return id};
 const vocabulary=arr(raw.vocabulary,'vocabulary',2000).map(v=>({id:uid(v.id),hanzi:str(v.hanzi,'한자',30),pinyin:str(v.pinyin,'병음',100),meaning:str(v.meaning,'뜻',150),category:str(v.category,'분류',30),example:typeof v.example==='string'&&v.example.length<=300?v.example:'',translation:typeof v.translation==='string'&&v.translation.length<=300?v.translation:'',stage:num(v.stage,'기억 단계',0,5),due:date(v.due)}));const ids=new Set(vocabulary.map(v=>v.id));
 const lessons=arr(raw.lessons,'lessons',100).map(l=>{if(!['입문','초급','중급'].includes(l.level))fail('수업 레벨은 입문·초급·중급 중 하나입니다.');let words=arr(l.wordIds,'wordIds',200).map(id=>{if(!ids.has(id))fail('수업에서 존재하지 않는 단어를 참조합니다.');return id});if(new Set(words).size!==words.length)fail('수업의 단어 ID가 중복됩니다.');return {id:uid(l.id),title:str(l.title,'수업명',60),description:str(l.description,'설명',250),level:l.level,topic:str(l.topic,'주제',30),minutes:num(l.minutes,'수업 시간',1,120),progress:num(l.progress,'진도',0,100),symbol:str(l.symbol,'아이콘 한자',2),wordIds:words}});
 const activity={};if(!raw.activity||Array.isArray(raw.activity)||typeof raw.activity!=='object')fail('activity 객체가 필요합니다.');Object.entries(raw.activity).forEach(([k,v])=>activity[date(k)]=num(v,'학습 시간',0,1440));
 const results=arr(raw.results,'results',10000).map(r=>({date:date(r.date),lessonId:typeof r.lessonId==='string'?r.lessonId.slice(0,70):'',correct:num(r.correct,'정답 수',0,200),total:num(r.total,'문항 수',1,200)}));if(results.some(r=>r.correct>r.total))fail('정답 수는 문항 수보다 클 수 없습니다.');return {schemaVersion:1,settings,vocabulary,lessons,activity,results};
}
export function summary(data,today=dateKey()){
 const dates=weekDays(new Date(today+'T12:00:00'));const weekly=dates.reduce((n,d)=>n+(data.activity[d]||0),0);const learned=data.vocabulary.filter(v=>v.stage>0).length;const due=data.vocabulary.filter(v=>v.due<=today).length;let streak=0;let d=data.activity[today]>0?today:dayAfter(-1,new Date(today+'T12:00:00'));while(data.activity[d]>0&&streak<10000){streak++;d=dayAfter(-1,new Date(d+'T12:00:00'))}return {weekly,learned,due,streak,todayMinutes:data.activity[today]||0,dates};
}
export function schedule(word,rating,today=dateKey()){
 if(!['again','good','easy'].includes(rating))throw new Error('잘못된 복습 평가');const steps=[1,3,7,14,30];if(rating==='again')return {...word,stage:0,due:today};if(rating==='good')return {...word,due:dayAfter(1,new Date(today+'T12:00:00'))};return {...word,stage:Math.min(5,word.stage+1),due:dayAfter(steps[Math.min(word.stage,4)],new Date(today+'T12:00:00'))};
}
