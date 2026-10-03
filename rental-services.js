/* Shared rental catalogue and price calculations. */
function rentalLegacyServices(prices,houseId){
  const p=prices||{},out=[];
  for(const [id,name,key] of [['sound','Helitehnika','sound'],['lights','Valgustus','lights']])if(Number(p[key])>0)out.push({id,name,mode:'once',price:Number(p[key]),commercialPrice:Number(p[key]),minimumHours:0,roomIds:[],active:true,description:''});
  if(Number(p.technicianCommunity)>0||Number(p.technicianCommercial)>0)out.push({id:'technician',name:'Tehniline tugi',mode:'hourly',price:Number(p.technicianCommunity)||0,commercialPrice:Number(p.technicianCommercial)||0,minimumHours:Number(p.technicianMinimum)||0,roomIds:[],active:true,description:''});
  if(houseId==='rongu')out.push(
    {id:'presentation',name:'Esitlustehnika',mode:'included',price:0,commercialPrice:0,minimumHours:0,roomIds:['rongu-suur-saal'],active:true,description:'Sisaldub suure saali rendihinnas.'},
    {id:'sound-light',name:'Heli- ja valguslahendus',mode:'agreement',price:0,commercialPrice:0,minimumHours:0,roomIds:[],active:true,description:'Rahvamaja saab soovitada koostööpartnereid.'},
    {id:'catering',name:'Kohvi- ja lõunapaus',mode:'agreement',price:0,commercialPrice:0,minimumHours:0,roomIds:[],active:true,description:''});
  return out;
}
function rentalAvailable(services,roomId){return (services||[]).filter(s=>s.active&&(!s.roomIds.length||s.roomIds.includes(roomId)));}
function rentalSelection(services,roomId,ids,community,hours){
  const available=rentalAvailable(services,roomId),unique=[...new Set(ids||[])];
  return unique.map(id=>{const s=available.find(x=>x.id===id&&x.mode!=='included');if(!s)throw new Error('Teenuse valik on muutunud. Värskenda hinnakirja ja vali teenused uuesti.');
    const rate=Number(community?s.price:s.commercialPrice),total=s.mode==='hourly'?rate*Math.max(hours,Number(s.minimumHours)||0):s.mode==='once'?rate:0;
    return {id:s.id,label:s.name+(s.mode==='agreement'?' (kokkuleppel)':''),mode:s.mode,total};
  });
}

function rentalCatalogue(){return Array.isArray(kSite?.rentalServices)?kSite.rentalServices:null;}
function rentalSelectedIds(){
  if(rentalCatalogue())return [...document.querySelectorAll('#rentalBookingOptions input:checked')].map(x=>x.value);
  return [['serviceSound','sound'],['serviceLights','lights'],['serviceTechnician','technician']].filter(([id])=>$(id)?.checked).map(([,id])=>id);
}
function selectedBookingServices(prices,community,hours){
  const services=rentalCatalogue();
  if(services)return rentalSelection(services,$('bookRoom').value,rentalSelectedIds(),community,hours);
  return pricedBookingServices(prices,community,hours).filter(s=>$(s.inputId)?.checked).map(s=>({id:s.id,label:s.label,total:s.total}));
}
function rentalRateLabel(s,community){
  if(s.mode==='included')return 'Sisaldub rendis';if(s.mode==='agreement')return 'Kokkuleppel';
  const rate=Number(community?s.price:s.commercialPrice).toLocaleString('et-EE');
  return rate+' € / '+(s.mode==='hourly'?'h'+(s.minimumHours?' · vähemalt '+s.minimumHours+' h':''):'kord');
}
function syncRentalBooking(){
  const services=rentalCatalogue(),old=document.querySelector('#bookingForm .service-options');if(!services||!old)return;
  const ids=rentalSelectedIds(),roomId=$('bookRoom').value,community=$('clientType').value!=='commercial',available=rentalAvailable(services,roomId);
  old.style.display='none';for(const id of ['serviceSound','serviceLights','serviceTechnician'])if($(id))$(id).checked=false;
  let box=$('rentalBookingOptions');if(!box){box=document.createElement('div');box.id='rentalBookingOptions';old.after(box);}
  box.innerHTML=available.map(s=>`<label class="service-option">${s.mode==='included'?'':`<input type="checkbox" value="${esc(s.id)}" ${ids.includes(s.id)?'checked':''} onchange="updateQuote()">`}<span>${esc(s.name)}${s.description?`<small style="display:block">${esc(s.description)}</small>`:''}</span><b>${esc(rentalRateLabel(s,community))}</b></label>`).join('')||'<p class="hint">Lisavajadused saad kirjutada sündmuse kirjeldusse.</p>';
  const disclosure=old.closest('details');if(disclosure)disclosure.querySelector('summary').textContent='Tehnika ja lisateenused';
  const hint=old.previousElementSibling;if(hint)hint.textContent='Hinnaga valikud lisanduvad summale. Kokkuleppel teenuste hinna täpsustab rahvamaja.';
  const heading=hint?.previousElementSibling;if(heading?.tagName==='H2')heading.textContent='Tehnika ja lisateenused';
}
function rentalServicesHTML(){
  if(kSite?.rentalServicesVersion!==1)return '<section class="panel"><h2>Renditeenused</h2><p>Teenuste halduse kasutamiseks tuleb uuendada Apps Scripti. Senine hinnakiri töötab edasi.</p></section>';
  const services=rentalCatalogue()||[];
  return `<section class="panel"><div class="panel-header"><h2>Renditeenused</h2><button class="button small" onclick="rentalEdit()">Lisa teenus</button></div><p class="hint">Siin muudad oma maja pakkumist. Hinnamuutused kehtivad uutele broneeringutele.</p><div class="content-list">${services.map(s=>`<article class="booking-row"><div class="panel-header"><div><h3>${esc(s.name)}</h3><p>${esc(rentalRateLabel(s,true))} · ${s.active?'Avalikult pakutav':'Peidetud'} · ${s.roomIds.length?esc(s.roomIds.map(id=>rooms.find(r=>r.id===id)?.name||id).join(', ')):'Kõik ruumid'}</p></div><button class="button outline small" onclick="rentalEdit('${esc(s.id)}')">Muuda</button></div></article>`).join('')||'<p>Teenuseid pole veel lisatud.</p>'}</div><div id="rentalEditor"></div><div id="rentalMessage" class="status-msg" aria-live="polite"></div></section>`;
}
function rentalEdit(id=''){
  const s=(rentalCatalogue()||[]).find(x=>x.id===id)||{id:'service_'+Date.now().toString(36),name:'',mode:'once',price:0,commercialPrice:0,minimumHours:0,roomIds:[],active:true,description:''};
  $('rentalEditor').innerHTML=`<form id="rentalEditForm" onsubmit="rentalSave(event,'${esc(s.id)}')"><h3>${id?'Muuda teenust':'Lisa teenus'}</h3><div class="field-grid">${kField('Teenuse nimi','rentalName',s.name,'text','required maxlength="100"')}<label class="field"><span>Hinnastamine</span><select id="rentalMode" onchange="rentalTogglePrice()">${[['hourly','Tunnis'],['once','Korra eest'],['included','Sisaldub rendis'],['agreement','Kokkuleppel']].map(([v,n])=>`<option value="${v}" ${s.mode===v?'selected':''}>${n}</option>`).join('')}</select></label></div><div id="rentalPriceFields" class="field-grid">${kField('Hind €','rentalPrice',s.price,'number','required min="0" max="10000" step="0.01"')}</div><details class="k-activity"><summary>Lisaseaded</summary><div class="field-grid">${kField('Kommertskasutuse hind € (soovi korral)','rentalCommercial',s.commercialPrice===s.price?'':s.commercialPrice,'number','min="0" max="10000" step="0.01"')}${kField('Miinimum tundides','rentalMinimum',s.minimumHours,'number','min="0" max="168" step="0.25"')}${kText('Lühikirjeldus','rentalDescription',s.description,'maxlength="400"')}</div></details><fieldset><legend>Milliste ruumidega saadaval</legend><p class="hint">Kui ühtegi ruumi ei märgi, pakutakse teenust kõigi ruumidega.</p>${rooms.map(r=>`<label class="service-option"><input class="rentalRoom" type="checkbox" value="${esc(r.id)}" ${s.roomIds.includes(r.id)?'checked':''}><span>${esc(r.name)}</span></label>`).join('')}</fieldset><label class="service-option"><input id="rentalActive" type="checkbox" ${s.active?'checked':''}><span>Avalikult pakutav</span></label><div class="row-actions"><button type="submit" class="button">Salvesta teenus</button><button type="button" class="button outline" onclick="$('rentalEditor').innerHTML=''">Sulge</button></div><div id="rentalEditMessage" class="status-msg" aria-live="polite"></div></form>`;
  rentalTogglePrice();$('rentalName').focus();
}
function rentalTogglePrice(){const mode=$('rentalMode').value,paid=['hourly','once'].includes(mode);$('rentalPriceFields').style.display=paid?'':'none';$('rentalPrice').disabled=!paid;$('rentalCommercial').disabled=!paid;$('rentalMinimum').disabled=mode!=='hourly';}
async function rentalSave(ev,id){
  ev.preventDefault();const button=ev.submitter;button.disabled=true;
  try{
    const mode=$('rentalMode').value,paid=['hourly','once'].includes(mode),price=paid?Number($('rentalPrice').value):0;
    const item={id,name:$('rentalName').value.trim(),mode,price,commercialPrice:paid&&$('rentalCommercial').value!==''?Number($('rentalCommercial').value):price,minimumHours:mode==='hourly'?Number($('rentalMinimum').value):0,description:$('rentalDescription').value.trim(),active:$('rentalActive').checked,roomIds:[...document.querySelectorAll('.rentalRoom:checked')].map(x=>x.value)};
    const services=(rentalCatalogue()||[]).slice(),index=services.findIndex(s=>s.id===id);if(index<0)services.push(item);else services[index]=item;
    const houseId=typeof HOUSE!=='undefined'?HOUSE.id:'konguta';
    const result=await post({action:'houseSaveServices',houseId,revision:kSite.revision,rentalServices:services});
    kSite=result.site;kWorkspace=null;await kLoadWorkspace(true);kApplyPublic();kRenderStaff();kNotice('rentalMessage','Teenus on salvestatud. Uued valikud kehtivad uutele broneeringutele.');
  }catch(e){kNotice('rentalEditMessage',e.message,true);}finally{button.disabled=false;}
}
