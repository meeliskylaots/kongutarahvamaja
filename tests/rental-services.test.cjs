const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
const front=fs.readFileSync('rental-services.js','utf8'),backend=fs.readFileSync('Kultuuripesa_AppsScript_v17.0.gs','utf8');
new vm.Script(backend);
const c=vm.createContext({console,Date,Number,Math,Set});vm.runInContext(backend,c);
const sample=[
 {id:'sound',name:'Heli',mode:'hourly',price:10,commercialPrice:15,minimumHours:2,roomIds:['konguta-saal'],active:true,description:''},
 {id:'chairs',name:'Toolid',mode:'included',price:0,commercialPrice:0,minimumHours:0,roomIds:[],active:true,description:''},
 {id:'lunch',name:'Lõuna',mode:'agreement',price:0,commercialPrice:0,minimumHours:0,roomIds:[],active:true,description:''},
 {id:'projector',name:'Projektor',mode:'once',price:5,commercialPrice:8,minimumHours:0,roomIds:[],active:false,description:''}];
const f=vm.createContext({console,Date,Number,Math,Set});vm.runInContext(front,f);
for(const context of [c,f]){
 const services=context.rentalLegacyServices({sound:50,technicianCommunity:20,technicianCommercial:30,technicianMinimum:2},'konguta');
 assert.equal(context.rentalSelection(services,'konguta-saal',['sound','technician'],true,28).reduce((a,x)=>a+x.total,0),610);
 assert.equal(context.rentalSelection(sample,'konguta-saal',['sound','lunch'],true,1)[0].total,20);
 assert.equal(context.rentalSelection(sample,'konguta-saal',['sound'],false,3)[0].total,45);
 assert.equal(context.rentalSelection(sample,'konguta-saal',['lunch'],true,4)[0].mode,'agreement');
 assert.throws(()=>context.rentalSelection(sample,'konguta-valiala',['sound'],true,4));
 assert.throws(()=>context.rentalSelection(sample,'konguta-saal',['projector'],true,4));
 assert.throws(()=>context.rentalSelection(sample,'konguta-saal',['chairs'],true,4));
 assert.equal(context.rentalSelection(sample,'konguta-saal',['sound','sound'],true,4).length,1);
 const rongu=context.rentalLegacyServices({},'rongu');assert.equal(context.rentalAvailable(rongu,'rongu-vaike-saal').some(x=>x.id==='presentation'),false);
 assert.equal(context.rentalAvailable(rongu,'rongu-suur-saal').some(x=>x.mode==='included'),true);
}
assert.equal(c.houseCleanServices_(sample,'konguta').length,4);
assert.throws(()=>c.houseCleanServices_([...sample,sample[0]],'konguta'),/ID/);
assert.throws(()=>c.houseCleanServices_([{...sample[0],roomIds:['rongu-suur-saal']}],'konguta'),/maja/);
for(const price of [-1,NaN,Infinity,10001])assert.throws(()=>c.houseCleanServices_([{...sample[0],price}],'konguta'),/hind/);
assert.throws(()=>c.houseCleanServices_([{...sample[0],name:'x'}],'konguta'),/nimi/);
assert.throws(()=>c.houseCleanServices_([{...sample[0],active:'true'}],'konguta'),/nähtavus/);
assert.throws(()=>c.houseCleanServices_([{...sample[0],minimumHours:169}],'konguta'),/miinimum/);
// Exercise the actual save endpoint with persisted site + actual permission check.
let site={revision:'old',prices:{community:20,commercial:30,minimumHours:2},rentalServices:sample,texts:{}},written=0;
c.houseSite_=()=>structuredClone(site);c.houseWriteSite_=(_,value)=>{site=structuredClone(value);site.revision='new';written++;};c.houseAudit_=()=>{};
c.requireManager_=token=>{if(token==='leader')throw new Error('Juhataja õigus puudub');return {role:'admin',allowedHouseIds:token==='other'?['rongu']:['konguta']};};
assert.throws(()=>c.houseSaveServices_({houseId:'konguta',sessionToken:'leader',revision:'old',rentalServices:sample}),/õigus/);
assert.throws(()=>c.houseSaveServices_({houseId:'konguta',sessionToken:'other',revision:'old',rentalServices:sample}),/õigus/);
assert.throws(()=>c.houseSaveServices_({houseId:'konguta',sessionToken:'manager',revision:'stale',rentalServices:sample}),/vahepeal/);
assert.equal(written,0);
const result=c.houseSaveServices_({houseId:'konguta',sessionToken:'manager',revision:'old',rentalServices:sample});assert.equal(result.ok,true);assert.equal(written,1);assert.equal(site.rentalServices.length,4);
// Server ignores any supplied total and recalculates from the stored catalogue.
c.dateTimeMinutes_=(date,time)=>new Date(date+'T'+time+'Z').getTime()/60000;
const q=c.houseQuote_('konguta',{roomId:'konguta-saal',date:'2026-10-03',endDate:'2026-10-04',startTime:'18:00',endTime:'22:00',selectedServiceIds:['sound','lunch'],servicesTotal:1,estimatedTotal:1});
assert.equal(q.hours,28);assert.equal(q.roomCost,560);assert.equal(q.servicesTotal,280);assert.equal(q.estimatedTotal,840);
assert.match(c.formatSelectedServicesForSheet_(q.selectedServices),/Lõuna \(kokkuleppel\)/);assert.doesNotMatch(c.formatSelectedServicesForSheet_(q.selectedServices),/Lõuna.*0,00/);
assert.equal(c.houseWithServices_({prices:{sound:50}},'konguta').rentalServices[0].price,50);
assert.equal(c.houseWithServices_({prices:{sound:50},rentalServices:[]},'konguta').rentalServices.length,0);
// UI remains usable on an older backend and escapes manager-entered names.
f.kSite={};assert.match(f.rentalServicesHTML(),/Apps Script/);
f.esc=x=>String(x).replaceAll('<','&lt;').replaceAll('>','&gt;');f.rooms=[{id:'konguta-saal',name:'Saal'}];f.kSite={rentalServicesVersion:1,rentalServices:[{...sample[0],name:'<script>'}]};assert.match(f.rentalServicesHTML(),/&lt;script&gt;/);assert.doesNotMatch(f.rentalServicesHTML(),/<script>/);
const copy=fs.readFileSync('Kultuuripesa_v17.0_kopeeri.html','utf8');const code=copy.match(/<textarea[^>]*>([\s\S]*?)<\/textarea>/)[1].replaceAll('&lt;','<').replaceAll('&gt;','>').replaceAll('&amp;','&');assert.equal(code,backend);
console.log('PASS rental services: migration, scopes, four pricing modes, client/server parity, validation, permissions, revision conflict, server quote and copy page');
