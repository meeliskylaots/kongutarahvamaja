const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
(async()=>{
for(const page of ['index.html','test.html','rongu.html','valguta.html']){
 const source=fs.readFileSync(page,'utf8');
 for(const match of source.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/g))new vm.Script(match[1]);
 const adjust=source.match(/const adjustEventCalendar=\(\)=>\{[^\n]*?\};/)?.[0];assert.ok(adjust,page);
 const disclosure={open:false},context=vm.createContext({mobileCalendar:{matches:false},$:()=>null});
 vm.runInContext(adjust+'adjustEventCalendar();',context);
 context.$=()=>disclosure;vm.runInContext('adjustEventCalendar()',context);assert.equal(disclosure.open,true);
 context.mobileCalendar.matches=true;vm.runInContext('adjustEventCalendar()',context);assert.equal(disclosure.open,false);
 const start=source.indexOf('    function loadCalendarAvailability('),end=source.indexOf('\n    async function getCachedPublicDay',start);
 assert.ok(start>=0&&end>start,page);
 const pending=[],button={disabled:false};
 const calendar=vm.createContext({Date,CALENDAR_CACHE_MS:30000,calendarGeneration:0,calendarRequest:null,calendarSnapshot:null,calendarLoadedAt:0,calendarLoadState:'idle',bookingScheduleReady:false,$:()=>button,paintAvailabilityCalendars(){},publicCalendarUsages:x=>x,jsonp:()=>new Promise(resolve=>pending.push(resolve))});
 vm.runInContext(source.slice(start,end),calendar);
 const first=vm.runInContext('loadCalendarAvailability()',calendar);
 vm.runInContext('calendarGeneration++;calendarRequest=null',calendar);
 pending[0]({ok:true,usages:['old']});
 await Promise.resolve();await Promise.resolve();
 assert.equal(pending.length,2,'Invalidated request starts a fresh request: '+page);
 pending[1]({ok:true,usages:['fresh']});assert.deepEqual(await first,['fresh']);
 console.log('PASS '+page+' startup, script parsing and invalidated calendar response');
}
})().catch(e=>{console.error(e);process.exitCode=1});
