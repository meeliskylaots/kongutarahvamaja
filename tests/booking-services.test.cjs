const fs=require('fs'),vm=require('vm'),assert=require('assert/strict'),path=require('path');
const root=path.join(__dirname,'..');
for(const moduleName of ['house-admin.js','konguta-admin.js']){
  const labels={},fields={clientType:{value:'community'},bookRoom:{value:'konguta-saal'},bookDate:{value:'2026-10-03'},bookEndDate:{value:'2026-10-04'},startTime:{value:'18:00'},endTime:{value:'22:00'}};
  for(const id of ['serviceSound','serviceLights','serviceTechnician']){labels[id]={style:{}};fields[id]={checked:true,closest:()=>labels[id]};}
  const c={console,Date,Number,Math,fields,$:id=>fields[id],document:{querySelector:()=>null},rooms:[{id:'konguta-saal',pricing:{community:20,commercial:30}}],kSite:{prices:{community:20,commercial:30,sound:50,lights:0,technicianCommunity:20,technicianCommercial:30,technicianMinimum:2}},kPrimaryRoom:()=>c.rooms[0],kLegacy:{},bookingDuration:()=>({valid:true,hours:28})};vm.createContext(c);
  vm.runInContext(fs.readFileSync(path.join(root,'booking-services.js'),'utf8'),c);
  const source=fs.readFileSync(path.join(root,moduleName),'utf8');const start=source.indexOf('getQuote=function(){'),end=source.indexOf('\n};',start)+3;vm.runInContext(source.slice(start,end),c);
  let q=c.getQuote();assert.equal(q.hours,28);assert.equal(q.roomCost,560);assert.equal(q.servicesTotal,610);assert.equal(q.total,1170);assert.equal(q.selected.length,2);
  c.syncBookingServices(c.kSite.prices);assert.equal(fields.serviceLights.checked,false);assert.equal(fields.serviceLights.disabled,true);assert.equal(labels.serviceLights.style.display,'none');assert.equal(fields.serviceSound.disabled,false);
  fields.clientType.value='commercial';q=c.getQuote();assert.equal(q.servicesTotal,890);assert.equal(q.total,1730);
  c.kSite.prices.sound=undefined;c.kSite.prices.technicianCommercial=null;c.syncBookingServices(c.kSite.prices);q=c.getQuote();assert.equal(q.selected.length,0);assert.equal(q.servicesTotal,0);assert.equal(q.total,840);
  assert.equal(c.pricedBookingServices({sound:Infinity,lights:-5},true).length,0);
  const support=c.pricedBookingServices({technicianCommunity:20,technicianMinimum:2},true,1);assert.equal(support[0].total,40);
  console.log('PASS '+moduleName+': configured services, absent prices, client type, minimum hours and multi-day total');
}
