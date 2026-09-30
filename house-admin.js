/* Kultuuripesa house workspace. Availability and permissions are always enforced by the API. */
let kSite = null, kWorkspace = null, kPublicRequest = null, kWorkspaceRequest = null;
let kStaffTab = 'calendar', kSchedulePending = null, kEditPending = null, kEditing = null, kImportDraft = null;
const kStaffCachePrefix = `culturehub_staff_workspace_v2:${ORG.id}:`;
const kStaffCacheKey = kStaffCachePrefix + HOUSE.id;
const kStaffTabKey = `culturehub_staff_tab_v1:${ORG.id}:${HOUSE.id}`;
try{const savedTab=sessionStorage.getItem(kStaffTabKey);if(savedTab)kStaffTab=savedTab;}catch(e){}
function kClearWorkspaceCache(allOrg=false){
  try{
    if(allOrg){for(let i=sessionStorage.length-1;i>=0;i--){const key=sessionStorage.key(i);if(key&&key.startsWith(kStaffCachePrefix))sessionStorage.removeItem(key);}}
    else sessionStorage.removeItem(kStaffCacheKey);
  }catch(e){}
}
function kSaveWorkspaceCache(){
  if(!staffToken||!staffUser||!kWorkspace)return;
  try{
    const workspace={...kWorkspace,bookingsAll:[]};
    if(workspace._loadedSections)workspace._loadedSections={...workspace._loadedSections,bookingsAll:false};
    sessionStorage.setItem(kStaffCacheKey,JSON.stringify({savedAt:Date.now(),token:staffToken,user:staffUser,workspace}));
  }catch(e){}
}
function kRestoreWorkspaceCache(token){
  try{
    const cached=JSON.parse(sessionStorage.getItem(kStaffCacheKey)||'null');
    if(!cached||cached.token!==token||!cached.workspace||!cached.user)return false;
    if(Date.now()-Number(cached.savedAt||0)>15*60*1000){sessionStorage.removeItem(kStaffCacheKey);return false;}
    staffUser=cached.user;kWorkspace=cached.workspace;kSite=kWorkspace.site||kSite;
    if(kSite){siteSettings={homeDescription:kSite.texts.homeDescription,activities:kSite.activities};calendarCollectiveRecords=kWorkspace.collectives||[];calendarCollectivesLoaded=true;syncCalendarCollectives();kApplyPublic();}
    return true;
  }catch(e){return false;}
}
const kLegacy = {renderStaff,loadCollectives,loadPublicHouse,showCalendarEntryForDate,loadCalendarCollectives,getQuote,updateQuote,renderBookingRoomInfo,submitBooking,post,logout};
if(!document.getElementById('kDialogUxStyles')){
  const style=document.createElement('style');style.id='kDialogUxStyles';style.textContent='.k-dialog-sticky{position:sticky;top:-24px;z-index:5;background:var(--paper);padding:14px 0 12px;border-bottom:1px solid var(--line)}.k-dialog-close{width:44px;height:44px;flex:0 0 44px;border:1px solid var(--line);border-radius:999px;background:#fff;color:var(--ink);font-size:28px;line-height:1;cursor:pointer}.k-dialog-close:hover{background:var(--mint)}@media(max-width:720px){.k-dialog-sticky{top:-18px}.k-dialog-close{width:46px;height:46px;flex-basis:46px}.k-dialog .row-actions>.button{min-height:46px}}';document.head.appendChild(style);
}
const kPrimaryRoom = () => rooms.find(r=>r.id===HOUSE?.primaryRoomId) || rooms[0] || null;
const kRoomIsUnpriced = roomId => { const room=rooms.find(r=>r.id===roomId); return !!room && !Number.isFinite(room?.pricing?.community) && !Number.isFinite(room?.pricing?.commercial); };
const kLegacyActionMap = {houseSaveSchedule:'kongutaSaveSchedule',houseEditUsage:'kongutaEditUsage',houseSaveActivities:'kongutaSaveActivities',houseSaveSettings:'kongutaSaveSettings',houseAssist:'kongutaAssist'};
const kDayNames = ['Esmaspäev','Teisipäev','Kolmapäev','Neljapäev','Reede','Laupäev','Pühapäev'];
const kField = (label,id,value='',type='text',extra='') => `<label class="field"><span>${esc(label)}</span><input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
const kText = (label,id,value='',extra='') => `<label class="field"><span>${esc(label)}</span><textarea id="${id}" ${extra}>${esc(value)}</textarea></label>`;
const kNotice = (id,text,error=false) => setMessage(id,text,error);
const kDateLabel = value => /^\d{4}-\d{2}-\d{2}$/.test(value||'') ? new Intl.DateTimeFormat('et-EE',{dateStyle:'medium'}).format(new Date(value+'T12:00:00')) : value;
const kMoney = value => Number(value).toLocaleString('et-EE',{maximumFractionDigits:2});
const kRoomOptions = selected => '<option value="">Vali ruum</option>'+rooms.filter(r=>manager()||staffUser?.allowedRoomIds?.includes(r.id)).map(r=>`<option value="${r.id}" ${r.id===selected?'selected':''}>${esc(r.name)}</option>`).join('');
const kNotify = id => `<label class="service-option"><input id="${id}" type="checkbox"><span>Saada juhatajale üks kokkuvõte meilile</span></label><p class="hint">Vaikimisi meili ei saadeta. Kalendri muudatus jääb töölauda nähtavaks.</p>`;
const kImageControl=(label,url,targetType,targetId,options={})=>{
  const current=String(url||''),idAttr=options.id?` id="${options.id}"`:'',keyAttr=options.dataKey?` data-key="${options.dataKey}"`:'';
  return `<div class="field k-image-control"><span>${esc(label)}</span><input type="hidden"${idAttr}${keyAttr} data-image-url value="${esc(current)}"><div class="k-image-preview" style="min-height:110px;border:1px solid var(--line);border-radius:12px;background:#f5f8f4;display:flex;align-items:center;justify-content:center;overflow:hidden;margin-bottom:9px">${current?`<img src="${esc(current)}" alt="" style="width:100%;max-height:220px;object-fit:cover">`:'<span class="muted" style="font-size:12px">Pilti pole lisatud</span>'}</div><div class="row-actions"><label class="button outline small" style="cursor:pointer">Lisa või vaheta pilti<input type="file" accept="image/jpeg,image/png,image/webp" hidden onchange="kUploadImage(this,'${esc(targetType)}','${esc(targetId)}')"></label><button class="button outline small" type="button" onclick="kRemoveUploadedImage(this)" ${current?'':'disabled'}>Eemalda</button></div><p class="hint">JPG, PNG või WebP. Pilt tehakse enne üleslaadimist automaatselt veebile sobivaks.</p><div class="status-msg k-image-message" aria-live="polite"></div></div>`;
};
function kRemoveUploadedImage(button){const box=button.closest('.k-image-control');box.querySelector('[data-image-url]').value='';box.querySelector('.k-image-preview').innerHTML='<span class="muted" style="font-size:12px">Pilti pole lisatud</span>';button.disabled=true;}
async function kPrepareImage(file){
  if(!file||!/^image\/(jpeg|png|webp)$/i.test(file.type))throw new Error('Vali JPG, PNG või WebP pilt.');
  if(file.size>12*1024*1024)throw new Error('Algne pildifail on liiga suur. Vali kuni 12 MB pilt.');
  const bitmap=await createImageBitmap(file),max=1600,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d');ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close?.();
  const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Pildi töötlemine ebaõnnestus.')),'image/webp',0.86));
  const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]||'');reader.onerror=()=>reject(new Error('Pildifaili lugemine ebaõnnestus.'));reader.readAsDataURL(blob);});
  if(blob.size>4*1024*1024)throw new Error('Pilt jäi pärast vähendamist liiga suureks.');
  return {base64,mimeType:blob.type||'image/webp',fileName:(file.name||'pilt').replace(/\.[^.]+$/,'')+'.webp'};
}
async function kUploadImage(input,targetType,targetId){
  const box=input.closest('.k-image-control'),message=box.querySelector('.k-image-message'),hidden=box.querySelector('[data-image-url]'),remove=box.querySelector('button');
  input.disabled=true;message.classList.remove('error');message.textContent='Valmistan pilti ette…';
  try{
    const prepared=await kPrepareImage(input.files?.[0]);message.textContent='Laadin pilti üles…';
    const result=await post({action:'uploadPublicImage',targetType,targetId,...prepared});
    hidden.value=result.imageUrl;box.querySelector('.k-image-preview').innerHTML=`<img src="${esc(result.imageUrl)}" alt="" style="width:100%;max-height:220px;object-fit:cover">`;remove.disabled=false;message.textContent='Pilt on üles laaditud. Salvesta vorm, et see avalikul lehel kasutusele võtta.';
  }catch(e){message.textContent=e.message||'Pildi üleslaadimine ebaõnnestus.';message.classList.add('error');}
  finally{input.value='';input.disabled=false;}
}
const kMinimumHours = () => kSite?.prices?.minimumHours || 2;
minimumUsageMinutes = roomId => rooms.find(r=>r.id===roomId)?.minimumMinutes || (roomId===kPrimaryRoom()?.id ? kMinimumHours()*60 : 1);

post = async function(payload) {
  let result;
  try { result = await kLegacy.post(payload); }
  catch(error) {
    const legacyAction = kLegacyActionMap[payload.action];
    if(!legacyAction || !/Tundmatu toiming/i.test(String(error?.message||''))) throw error;
    result = await kLegacy.post({...payload,action:legacyAction});
  }
  if(!payload.dryRun && ['houseSaveSchedule','houseEditUsage','houseSaveActivities','houseSaveSettings','kongutaSaveSchedule','kongutaEditUsage','kongutaSaveActivities','kongutaSaveSettings'].includes(payload.action)) {
    invalidateCalendarAvailability(); kWorkspace=null; kClearWorkspaceCache();
  }
  return result;
};
async function kLoadPublic(force=false) {
  if(kPublicRequest)return kPublicRequest;
  if(kSite&&!force)return kSite;
  kPublicRequest=(async()=>{
    let result=await jsonp({action:'housePublic'});
    if(!result?.apiVersion && result?.message==='Kultuuripesa Apps Script töötab.') result=await jsonp({action:'kongutaPublic'});
    if(!result.apiVersion||result.apiVersion<3||!result.site)return null;
    kSite=result.site;siteSettings={homeDescription:kSite.texts.homeDescription,activities:kSite.activities};syncCalendarCollectives();kApplyPublic();return kSite;
  })();
  try{return await kPublicRequest}catch(e){return kSite}finally{kPublicRequest=null}
}
loadPublicHouse=async function(){await kLegacy.loadPublicHouse();await kLoadPublic();if(kSite){siteSettings={homeDescription:kSite.texts.homeDescription,activities:kSite.activities};kApplyPublic();}};
loadCollectives=async function(){await kLegacy.loadCollectives();await kLoadPublic(true);if(kSite)kRenderActivities();};
function kRenderActivities(){
  $('collectiveList').innerHTML=kSite.activities.map(c=>{
    const joinUrl=/^https:\/\/[^\s<>"']+$/i.test(String(c.joinUrl||''))?c.joinUrl:'';
    const joinLabel=c.joinLabel|| (joinUrl?'Liitu / registreeru':c.email?'Küsi liitumise kohta':'');
    const joinAction=joinLabel?(joinUrl?`<a class="button small" href="${esc(joinUrl)}" target="_blank" rel="noopener">${esc(joinLabel)} ↗</a>`:(c.email?`<a class="button small" href="mailto:${esc(c.email)}?subject=${encodeURIComponent('Soovin liituda: '+c.name)}">${esc(joinLabel)}</a>`:'')):'';
    return `<article class="collective-card"><div class="card-photo" ${c.imageUrl?`role="img" aria-label="${esc(c.imageAlt||c.name)}" style="background-image:url('${esc(c.imageUrl)}')"`:''}>${c.imageUrl?'':'✳'}</div><div class="card-body"><h3>${esc(c.name)}</h3>${c.description?`<p>${esc(c.description)}</p>`:''}<div class="collective-details"><div class="collective-detail"><strong>Proov:</strong> ${esc(c.schedule||'Kokkuleppel')}</div><div class="collective-detail"><strong>Koht:</strong> ${esc(c.location)}</div><div class="collective-detail"><strong>Juhendaja:</strong> ${esc(c.instructor||'Täpsustamisel')}</div>${c.audience?`<div class="collective-detail"><strong>Sihtrühm:</strong> ${esc(c.audience)}</div>`:''}${c.fee?`<div class="collective-detail"><strong>Osalustasu:</strong> ${esc(c.fee)}</div>`:''}<div class="collective-contact">${c.email?`<a href="mailto:${esc(c.email)}">${esc(c.email)}</a>`:''}${c.phone?`<a href="tel:+372${c.phone.replace(/\D/g,'')}">${esc(c.phone)}</a>`:''}</div></div><div class="row-actions">${joinAction}${c.linkUrl?`<a class="text-link" href="${esc(c.linkUrl)}" target="_blank" rel="noopener">Rohkem infot ↗</a>`:''}</div></div></article>`;
  }).join('')||'<p>Kollektiive pole veel lisatud.</p>';
}
function kApplyPublic(){
  if(!kSite)return;
  const t=kSite.texts;if(rooms[0]){rooms[0].text=t.hallDescription;rooms[0].capacity=t.hallCapacity;}
  for(const key of ['homeTitle','homeDescription','homeNote','communityTitle','communityDescription','activitiesDescription'])if($(key)){if(key!=='homeTitle'||$(key).textContent!==t[key])$(key).textContent=t[key]};
  if($('contactAddress'))$('contactAddress').textContent=t.address;
  if($('contactPhone')){$('contactPhone').textContent=t.phone;$('contactPhone').href='tel:'+t.phone.replace(/[^\d+]/g,'');}
  if($('contactEmail')){$('contactEmail').textContent=t.email;$('contactEmail').href='mailto:'+t.email;}
  const instant=HOUSE.publicBookingMode==='instant';
  $('submitBookingBtn').textContent=instant?'Broneeri ruum':'Saada broneeringusoov →';
  $('bookingConfirmationHint').textContent=instant?'Vaba aeg kinnitatakse kohe pärast kalendri ja puhvri kontrolli. Kinnituse saad e-postile. Kontaktandmed jäävad rahvamajale.':HOUSE.contractMode==='required'?'Päring saadetakse rahvamajale ülevaatamiseks. Rahvamaja koostab ruumi kasutamise lepingu ja saadab selle e-postile kinnitamiseks. Broneering kinnitub pärast lepingu kinnitamist.':'Päring saadetakse rahvamajale kinnitamiseks. Avalikus kalendris näidatakse menetluses aega neutraalselt, ilma sinu kontaktandmeteta.';
  if($('wantsContract'))$('wantsContract').closest('label')?.remove();
  if(HOUSE.contractMode==='required'&&$('bookingConfirmationHint')&&!$('contractRequiredNotice')){
    $('bookingConfirmationHint').insertAdjacentHTML('beforebegin','<div id="contractRequiredNotice" class="status-msg" style="margin-top:14px"><strong>Ruumi kasutamiseks sõlmitakse leping.</strong><br>Leping koostatakse sinu broneeringu andmete, rahvamaja hinnakirja ja ruumikasutuse eeskirjade alusel ning saadetakse e-postile kinnitamiseks.</div>');
  }
  if($('eventBookingHint'))$('eventBookingHint').textContent=instant?'Vali sobiv aeg ja broneeri ruum. Süsteem kontrollib vaba aega ning kasutuste vahele jäävat puhvrit.':'Vali sobiv aeg ja saada ruumi kasutamise soov. Rahvamaja kinnitab broneeringu eraldi.';
  if(HOUSE.pricingMode==='room'){
    const typeField=$('clientType')?.closest('.field');if(typeField)typeField.style.display='none';
    const rateCard=$('communityRateCard')?.closest('.rate-card');if(rateCard){const grid=rateCard.querySelector('.rate-grid');if(grid)grid.style.display='none';const h=rateCard.querySelector('h3');if(h)h.textContent='Ruumirendi hind';const note=rateCard.querySelector('.quote-note');if(note)note.textContent=HOUSE.feeNote||'Hind sõltub valitud ruumist.';}
  }
  if(HOUSE.servicesMode==='request'){
    document.querySelectorAll('.service-options input').forEach(i=>{i.checked=false;i.disabled=true;});
    const options=document.querySelector('.service-options');if(options)options.style.display='none';
    const heading=[...document.querySelectorAll('#bookingForm h2')].find(x=>x.textContent.includes('Lisateenused'));if(heading)heading.textContent='Tehnika ja lisavajadused';
    const hint=heading?.nextElementSibling;if(hint?.classList.contains('hint'))hint.textContent='Heli-, valgus- ja muud tehnilised vajadused kirjelda allpool. Rahvamaja täpsustab lahenduse ja hinna eraldi.';
  }
  updateQuote();renderBookingRoomInfo();renderBookingCalendar();
  document.querySelectorAll('.calendar-explanation').forEach(el=>{if(el.closest('.booking-calendar-panel')){const room=rooms.find(r=>r.id===$('bookRoom').value)||kPrimaryRoom();const minHours=(room?.minimumMinutes||kMinimumHours()*60)/60;el.textContent=`${room?.name||'Ruumi'} saadavus kell ${HOUSE.calendar.dayStart}–${HOUSE.calendar.dayEnd} koos puhvriga.${minHours>0?' Vaba vahemik peab olema vähemalt '+minHours+' tundi.':''}`;}});
}
getQuote=function(){
  if(!kSite)return kLegacy.getQuote();
  const p=kSite.prices,community=$('clientType').value==='community',room=rooms.find(r=>r.id===$('bookRoom').value)||kPrimaryRoom(),start=$('startTime').value,end=$('endTime').value;
  const configuredHourly=community?room?.pricing?.community:room?.pricing?.commercial;
  const fallbackHourly=community?p.community:p.commercial;
  const hourly=Number.isFinite(configuredHourly)?configuredHourly:(room?.id===kPrimaryRoom()?.id?fallbackHourly:null);
  const outdoor=!Number.isFinite(hourly);
  const valid=!!(start&&end&&min(end)>min(start)),hours=valid?Math.ceil((min(end)-min(start))/60):0;
  const roomCost=outdoor?0:hours*hourly,selected=[];
  if($('serviceSound').checked)selected.push({label:'Helitehnika',total:p.sound});
  if($('serviceLights').checked)selected.push({label:'Valgustus',total:p.lights});
  if($('serviceTechnician').checked)selected.push({label:'Tehniline tugi',total:Math.max(p.technicianMinimum,hours)*(community?p.technicianCommunity:p.technicianCommercial)});
  const servicesTotal=selected.reduce((a,x)=>a+x.total,0);return{valid,hours,hourly,community,outdoor,room,roomCost,selected,servicesTotal,total:roomCost+servicesTotal};
};
updateQuote=function(){
  if(!kSite)return kLegacy.updateQuote();const p=kSite.prices,q=getQuote(),room=q.room||rooms.find(r=>r.id===$('bookRoom').value)||kPrimaryRoom();
  const communityRate=Number.isFinite(room?.pricing?.community)?room.pricing.community:(room?.id===kPrimaryRoom()?.id?p.community:null);
  const commercialRate=Number.isFinite(room?.pricing?.commercial)?room.pricing.commercial:(room?.id===kPrimaryRoom()?.id?p.commercial:null);
  $('communityRateCard').querySelector('strong').textContent=`Kogukonnasõbralik kasutus ${Number.isFinite(communityRate)?kMoney(communityRate)+' €/h':'kokkuleppel'}`;
  $('commercialRateCard').querySelector('strong').textContent=`Kommertskasutus ${Number.isFinite(commercialRate)?kMoney(commercialRate)+' €/h':'kokkuleppel'}`;
  $('communityRateCard').classList.toggle('selected',q.community);$('commercialRateCard').classList.toggle('selected',!q.community);
  $('serviceSound').closest('label').querySelector('b').textContent=kMoney(p.sound)+' € / üritus';
  $('serviceLights').closest('label').querySelector('b').textContent=kMoney(p.lights)+' € / üritus';
  $('technicianRate').textContent=`${kMoney(q.community?p.technicianCommunity:p.technicianCommercial)} € / h, vähemalt ${p.technicianMinimum} h`;
  $('quoteBox').innerHTML=`<h3>Hinna arvestus</h3><div class="quote-row"><span>Ruumirent ${q.outdoor?'':`${kMoney(q.hourly)} €/h × ${q.hours} h`}</span><strong>${q.outdoor?'Kokkuleppel':q.valid?euro(q.roomCost):'—'}</strong></div>${q.selected.map(x=>`<div class="quote-row"><span>${esc(x.label)}</span><strong>${euro(x.total)}</strong></div>`).join('')}<div class="quote-row quote-total"><span>${HOUSE.publicBookingMode==='instant'?'Kokku':'Hinnanguline ruumirent'}</span><strong>${q.valid?euro(q.total):'—'}</strong></div><p class="quote-note">${q.outdoor?'Valitud ruumi hind lepitakse eraldi kokku. ':''}${HOUSE.servicesMode==='request'?'Tehnika ja muud lisavajadused hinnastab rahvamaja eraldi. ':''}Arvestus kehtiva hinnakirja järgi; erandid ja lõpliku summa kinnitab rahvamaja.</p>`;
};
renderBookingRoomInfo=function(){
  if(!kSite)return kLegacy.renderBookingRoomInfo();
  const room=rooms.find(r=>r.id===$('bookRoom').value)||kPrimaryRoom();if(!room)return;
  const t=kSite.texts,p=kSite.prices,isPrimary=room.id===kPrimaryRoom()?.id,community=$('clientType').value==='community';
  const configuredRate=community?room?.pricing?.community:room?.pricing?.commercial;
  const rate=Number.isFinite(configuredRate)?configuredRate:(isPrimary?(community?p.community:p.commercial):null);
  const description=isPrimary?(t.hallDescription||room.text):room.text;
  const capacity=isPrimary?(t.hallCapacity||room.capacity):room.capacity;
  const minimum=(room.minimumMinutes||Math.round((isPrimary?p.minimumHours:1)*60))/60;
  const included=isPrimary?t.included.split('\n').filter(Boolean):(room.included||[]);
  const extra=isPrimary?t.extra:(room.extra||'');
  const dayPackage=Number.isFinite(room?.dayPrice)?`<div class="status-msg" style="margin-top:14px"><strong>Päevapakett ${kMoney(room.dayPrice)} €</strong><br>${esc(room.dayLabel||'Päevapaketi tingimused täpsustab rahvamaja.')} Päevapaketi soovi korral märgi see sündmuse kirjeldusse; juhataja kinnitab üle südaöö aja eraldi.</div>`:'';
  $('bookingRoomInfo').innerHTML=`<h2>${esc(room.name)}</h2><p class="muted">${esc(description||'')}</p><div class="booking-data-grid">${[['Mahutavus',capacity||'—'],['Hind',Number.isFinite(rate)?kMoney(rate)+' € / h':'Kokkuleppel'],['Miinimum',minimum+' h'],['Puhver',(room.buffer||60)+' min']].map(([label,value])=>`<div class="booking-data"><small>${label}</small><strong>${esc(value)}</strong></div>`).join('')}</div>${dayPackage}${HOUSE.feeNote?`<p class="hint">${esc(HOUSE.feeNote)}</p>`:''}${included.length?'<h3>Rendi hinna sees</h3><ul class="booking-include-list">'+included.map(x=>`<li>${esc(x)}</li>`).join('')+'</ul>':''}${extra?'<h3>Eraldi kokkuleppel / lisainfo</h3><p>'+esc(extra)+'</p>':''}`;
};
submitBooking=async function(ev){
  if(!kSite)return kLegacy.submitBooking(ev);ev.preventDefault();const button=$('submitBookingBtn');if(button.disabled)return;button.disabled=true;kNotice('bookingMessage',HOUSE.publicBookingMode==='instant'?'Kontrollin ja kinnitan broneeringut…':'Kontrollin aega ja saadan broneeringusoovi…');
  try{
    const q=getQuote();
    const result=await post({
      action:'submitSiteBooking',
      roomId:$('bookRoom').value,date:$('bookDate').value,startTime:$('startTime').value,endTime:$('endTime').value,
      clientType:$('clientType').value,clientName:$('clientName').value.trim(),clientEmail:$('clientEmail').value.trim(),clientPhone:$('clientPhone').value.trim(),
      eventDescription:$('eventDescription').value.trim(),
      selectedServiceIds:[['serviceSound','sound'],['serviceLights','lights'],['serviceTechnician','technician']].filter(([id])=>$(id).checked).map(([,id])=>id),
      selectedServices:(q.selected||[]).map(x=>({label:x.label,total:Number(x.total)||0})),
      roomCost:Number(q.roomCost)||0,servicesTotal:Number(q.servicesTotal)||0,estimatedTotal:Number(q.total)||0,
      quoteNote:[q.outdoor?'Valitud ruumi hind täpsustatakse eraldi.':'',HOUSE.servicesMode==='request'?'Tehnika ja muud lisavajadused hinnastab rahvamaja eraldi.':'','Broneerimisel kuvatud hinnainfo on esialgne; lõpliku hinna kinnitab rahvamaja.'].filter(Boolean).join(' ')
    });
    kNotice('bookingMessage',`${result.message} Broneeringu number: ${result.bookingId}. ${result.warning||''}`);
    $('bookingForm').reset();$('bookDate').value=etDate();bookingCalendarMonth=etDate().slice(0,7);await loadBookingSchedule(true)
  }catch(e){kNotice('bookingMessage',e.message,true);button.disabled=false;}
};

const kSectionRequests={};
function kSectionLoaded(section){return !!kWorkspace?._loadedSections?.[section]}
async function kLoadWorkspaceSection(section,force=false){
  if(!kWorkspace)await kLoadWorkspace();
  if(kSectionLoaded(section)&&!force)return kWorkspace;
  if(kSectionRequests[section])return kSectionRequests[section];
  const token=staffToken;
  kSectionRequests[section]=(async()=>{
    const result=await jsonp({action:'houseWorkspaceSection',section,session:token});
    if(token!==staffToken)throw new Error('Seanss muutus. Ava töölaud uuesti.');
    if(!result?.ok)throw new Error(result?.error||'Töölauda ei saanud laadida.');
    kWorkspace._loadedSections=kWorkspace._loadedSections||{};
    if(result.section!==section){
      if(Object.prototype.hasOwnProperty.call(kWorkspace,section)){kWorkspace._loadedSections[section]=true;return kWorkspace;}
      throw new Error('SERVER_UPDATE_REQUIRED');
    }
    if(section==='bookings'){
      kWorkspace.bookings=result.bookings||[];kWorkspace.bookingSeries=result.series||[];kWorkspace.organizationSummary=result.organizationSummary||null;
      kWorkspace.bookingsAll=[];if(kWorkspace._loadedSections)delete kWorkspace._loadedSections.bookingsAll;
      Object.keys(kSeriesOccurrenceCache).forEach(key=>delete kSeriesOccurrenceCache[key]);
    }
    if(section==='bookingsAll'){kWorkspace.bookingsAll=result.bookingsAll||[];kWorkspace.organizationSummary=result.organizationSummary||kWorkspace.organizationSummary||null;}
    if(section==='ideas')kWorkspace.ideas=result.ideas||[];
    if(section==='contracts')kWorkspace.contracts=result.contracts||[];
    if(section==='users')kWorkspace.users=result.users||[];
    if(section==='activity')kWorkspace.activity=result.activity||[];
    kWorkspace._loadedSections[section]=true;kSaveWorkspaceCache();return kWorkspace;
  })();
  try{return await kSectionRequests[section]}finally{delete kSectionRequests[section]}
}
async function kEnsureWorkspaceSection(section,force=false){
  try{
    await kLoadWorkspaceSection(section,force);
    if(!$('view-login')?.classList.contains('active'))return;
    if(section==='contracts'&&kStaffTab==='calendar'&&$('kBookingList'))kRenderBookings();
    else if(kStaffTab===section)kRenderStaff();
  }catch(e){
    if(section==='contracts'&&kStaffTab==='calendar'&&$('kBookingList')){
      const count=$('kBookingCount');if(count)count.textContent='Lepingu olekut ei saanud praegu laadida. Broneeringute andmed on siiski nähtavad.';
    }else if(kStaffTab===section&&$('kStaffSection')){
      $('kStaffSection').innerHTML=`<p class="status-msg error">${esc(e.message||'Andmeid ei saanud laadida.')}</p><button class="button small" onclick="kEnsureWorkspaceSection('${section}',true)">Proovi uuesti</button>`;
    }
  }
}
async function kLoadWorkspace(force=false){
  if(kWorkspace&&!force)return kWorkspace;if(kWorkspaceRequest)return kWorkspaceRequest;
  const token=staffToken;kWorkspaceRequest=(async()=>{
    let result=await jsonp({action:'houseWorkspace',session:token});
    if(!result?.apiVersion&&result?.message==='Kultuuripesa Apps Script töötab.')result=await jsonp({action:'kongutaWorkspace',session:token});
    if(token!==staffToken)throw new Error('Seanss muutus. Ava töölaud uuesti.');
    if(!result.ok)throw new Error(result.error||'Töölauda ei saanud laadida.');
    if(!result.apiVersion||result.apiVersion<3||!result.site)throw new Error('SERVER_UPDATE_REQUIRED');
    const previous=kWorkspace||{},loaded={...(previous._loadedSections||{})};
    for(const key of ['bookings','contracts','ideas','users','activity'])if(Object.prototype.hasOwnProperty.call(result,key))loaded[key]=true;
    kWorkspace={...previous,...result,
      bookings:Object.prototype.hasOwnProperty.call(result,'bookings')?(result.bookings||[]):(previous.bookings||[]),
      bookingSeries:Object.prototype.hasOwnProperty.call(result,'series')?(result.series||[]):(previous.bookingSeries||[]),
      bookingsAll:previous.bookingsAll||[],
      contracts:Object.prototype.hasOwnProperty.call(result,'contracts')?(result.contracts||[]):(previous.contracts||[]),
      ideas:Object.prototype.hasOwnProperty.call(result,'ideas')?(result.ideas||[]):(previous.ideas||[]),
      users:Object.prototype.hasOwnProperty.call(result,'users')?(result.users||[]):(previous.users||[]),
      activity:Object.prototype.hasOwnProperty.call(result,'activity')?(result.activity||[]):(previous.activity||[]),
      _loadedSections:loaded};
    staffUser=result.user||staffUser;kSite=result.site;
    siteSettings={homeDescription:kSite.texts.homeDescription,activities:kSite.activities};
    calendarCollectiveRecords=result.collectives||[];calendarCollectivesLoaded=true;syncCalendarCollectives();kApplyPublic();kSaveWorkspaceCache();
    return kWorkspace;
  })();
  try{return await kWorkspaceRequest}finally{kWorkspaceRequest=null}
}
renderStaff=async function(){
  if(!staffUser)return;
  $('loginForm').classList.add('hidden');$('staffPanel').classList.remove('hidden');$('staffPanel').parentElement.style.maxWidth='none';$('staffWelcome').textContent=`Tere, ${staffUser.name}`;
  if(kWorkspace){kRenderStaff();return;}
  $('staffContent').innerHTML='<p class="loading">Laadin töölauda…</p>';
  try{
    await kLoadWorkspace();kRenderStaff();
  }catch(e){
    const msg=String(e?.message||'');
    if(e.message==='SERVER_UPDATE_REQUIRED'||/aegus|timeout|Andmete laadimine ebaõnnestus/i.test(msg)){
      $('staffContent').innerHTML='<p class="loading">Avan kergema töövaate…</p>';
      try{
        await kLegacy.renderStaff();
        $('staffPanel').parentElement.style.maxWidth='none';
        $('staffContent').insertAdjacentHTML('afterbegin','<div class="status-msg"><strong>Siseveeb on avatud varurežiimis.</strong> Serveri uuem versioon pole veel kasutusel või vastas liiga aeglaselt. Põhitoiminguid saad kasutada; täisvaade taastub pärast serveriuuendust.</div>');
        return;
      }catch(fallbackError){
        $('staffContent').innerHTML=`<p class="status-msg error">${esc(fallbackError.message||msg||'Töölauda ei saanud laadida.')}</p><button class="button small" onclick="renderStaff()">Proovi uuesti</button>`;
        return;
      }
    }
    $('staffContent').innerHTML=`<p class="status-msg error">${esc(msg||'Töölauda ei saanud laadida.')}</p><button class="button small" onclick="renderStaff()">Proovi uuesti</button>`;
  }
};
async function kReloadStaff(){
  if(!staffUser)return;
  const root=$('staffContent');root.innerHTML='<p class="loading">Uuendan andmeid…</p>';
  try{
    await kLoadWorkspace(true);
    const lazy={calendar:'bookings',ideas:'ideas',users:'users',activity:'activity'}[kStaffTab];
    if(lazy)await kLoadWorkspaceSection(lazy,true);
    if(kStaffTab==='calendar'&&manager())await kLoadWorkspaceSection('contracts',true);
    kRenderStaff();
  }catch(e){root.innerHTML=`<p class="status-msg error">${esc(e.message)}</p><button class="button small" onclick="kReloadStaff()">Proovi uuesti</button>`;}
}
logout=async function(){kWorkspace=null;kWorkspaceRequest=null;kSchedulePending=null;kEditPending=null;kClearWorkspaceCache(true);$('adminCalendarEntryPanel').classList.add('hidden');await kLegacy.logout();};
function kRenderStaff(){
  const tabs=[['calendar','Kalender'],['collectives',manager()?'Kollektiivid':'Minu kollektiivid'],...(manager()?[['ideas','Ideed'],['import','AI import'],['settings','Sisu ja hinnad'],['users',staffUser?.role==='platform_admin'?'Kasutajad':'Juhendajate kontod']]:[]),['activity','Muudatused']];
  if(!tabs.some(([id])=>id===kStaffTab))kStaffTab='calendar';
  $('staffContent').innerHTML=`<div class="panel-header"><p class="hint" style="margin:0">${manager()?`Juhataja töölaud · ${esc(HOUSE.name)}`:'Kollektiivijuhi töölaud · enda kollektiivid ja proovid'}</p><button class="button outline small" type="button" onclick="kReloadStaff()">Uuenda andmeid</button></div>${manager()?kOrganizationSummaryHTML():kLeaderQuickHTML()}<nav class="k-tabs" aria-label="Siseveebi vaated">${tabs.map(([id,label])=>`<button class="button ${id===kStaffTab?'':'outline'} small" aria-current="${id===kStaffTab?'page':'false'}" onclick="kSwitchStaff('${id}')">${label}</button>`).join('')}</nav><div id="kStaffSection"></div>`;
  const content={calendar:kBookingsHTML,collectives:kActivitiesHTML,ideas:kIdeasHTML,import:kImportHTML,settings:kSettingsHTML,users:kUsersHTML,activity:kActivityHTML}[kStaffTab];
  const lazy={calendar:'bookings',ideas:'ideas',users:'users',activity:'activity'}[kStaffTab];
  $('kStaffSection').innerHTML=lazy&&!kSectionLoaded(lazy)?'<p class="loading">Laadin selle vaate andmeid…</p>':content();
  if(kStaffTab==='calendar'&&kSectionLoaded('bookings')){kRenderBookings();if(manager()&&!kSectionLoaded('contracts'))kEnsureWorkspaceSection('contracts');}
  else if(lazy&&!kSectionLoaded(lazy))kEnsureWorkspaceSection(lazy);
}
function kSwitchStaff(tab){kStaffTab=tab;try{sessionStorage.setItem(kStaffTabKey,tab);}catch(e){}kRenderStaff();}

function kHouseUrl(id){
  const configured=APP_CONFIG?.organization?.houses?.find?.(h=>h.id===id)?.url;
  return configured|| (id==='rongu'?'rongu.html':id==='valguta'?'valguta.html':'#login');
}
function kOrganizationSummaryHTML(){
  const summary=kWorkspace?.organizationSummary;if(!summary?.houses?.length)return '';
  return `<section class="panel" style="margin:14px 0"><div class="panel-header"><div><span class="eyebrow">Kõik majad</span><h2 style="margin:6px 0 0">${esc(ORG.name)}</h2></div></div><div class="booking-data-grid">${summary.houses.map(h=>`<div class="booking-data" style="text-align:left"><small>${esc(h.name)}</small><strong>${h.today} täna · ${h.pending} ootel</strong><span class="hint">${Number.isFinite(h.newIdeas)?h.newIdeas+' uut ideed · ':''}${h.upcoming} tulevast kasutust</span><a class="text-link" href="${esc(kHouseUrl(h.id))}#login">Ava maja →</a></div>`).join('')}</div></section>`;
}
function kLeaderQuickHTML(){
  const own=kWorkspace?.collectives||[];if(!own.length)return '';
  const future=(kWorkspace?.bookings||[]).filter(b=>b.date>=etDate()&&b.status!=='tühistatud').sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime));
  const next=future[0],names=own.map(c=>c.name).join(' · ');
  return `<section class="panel" style="margin:14px 0"><span class="eyebrow">${own.length===1?'Minu kollektiiv':'Minu kollektiivid'}</span><h2 style="margin:6px 0 8px">${esc(names)}</h2>${next?`<p><strong>Järgmine proov:</strong> ${esc(next.collective||next.publicTitle||'Proov')} · ${esc(kDateLabel(next.date))} · ${esc(next.startTime)}–${esc(next.endTime)} · ${esc(next.roomName||'')}</p>`:'<p class="hint">Tulevast proovi kalendris ei ole.</p>'}<div class="row-actions">${next?`<button class="button small" onclick="kOpenEdit('${esc(next.id)}','edit')">Muuda järgmist proovi</button><button class="button outline small" onclick="kOpenEdit('${esc(next.id)}','cancel')">Jäta proov ära</button>`:''}<button class="button outline small" onclick="kStaffTab='collectives';kRenderStaff()">Muuda kollektiivi infot</button></div></section>`;
}
function kIdeasHTML(){
  const ideas=(kWorkspace?.ideas||[]).slice().sort((a,b)=>String(b.submittedAt).localeCompare(String(a.submittedAt)));
  const statusLabels={uus:'Uus',vaatamisel:'Vaatamisel',plaanis:'Plaanis',teostatud:'Teostatud',arhiiv:'Arhiiv'};
  return `<section class="panel"><div class="panel-header"><div><h2>Ideepank</h2><p class="hint">Kogukonna ettepanekud sündmusteks, koolitusteks, töötubadeks ja muudeks tegevusteks.</p></div><span class="badge">${ideas.filter(i=>i.status==='uus').length} uut</span></div>${ideas.length?ideas.map(i=>`<article class="booking-row"><div class="booking-row-top"><div><h3>${esc(i.title)}</h3><p>${esc(i.type)}${i.audience?' · '+esc(i.audience):''}${i.preferredTime?' · '+esc(i.preferredTime):''}</p></div><span class="badge ${i.status==='plaanis'||i.status==='teostatud'?'good':''}">${esc(statusLabels[i.status]||i.status)}</span></div><p>${esc(i.description)}</p>${i.name||i.email||i.phone?`<p class="hint">Kontakt: ${esc([i.name,i.email,i.phone].filter(Boolean).join(' · '))}</p>`:''}<div class="field-grid"><label class="field"><span>Staatus</span><select id="ideaStatus_${esc(i.id)}">${Object.entries(statusLabels).map(([v,l])=>`<option value="${v}" ${i.status===v?'selected':''}>${l}</option>`).join('')}</select></label><label class="field"><span>Juhataja märkus</span><input id="ideaNote_${esc(i.id)}" value="${esc(i.managerNote||'')}" maxlength="1500"></label></div><button class="button outline small" onclick="kSaveIdea('${esc(i.id)}')">Salvesta idee olek</button><div id="ideaMsg_${esc(i.id)}" class="status-msg"></div></article>`).join(''):'<p>Ideepanka pole veel ettepanekuid lisatud.</p>'}</section>`;
}
async function kSaveIdea(id){
  try{
    const result=await post({action:'updateIdea',ideaId:id,status:$('ideaStatus_'+id).value,managerNote:$('ideaNote_'+id).value.trim()});
    kNotice('ideaMsg_'+id,result.message||'Salvestatud.');await kLoadWorkspace(true);await kLoadWorkspaceSection('ideas',true);kRenderStaff();
  }catch(e){kNotice('ideaMsg_'+id,e.message,true);}
}


function kCloseContractDialog(useHistory=true){
  const dialog=$('kContractDialog');
  if(useHistory&&history.state?.kContractDialog){history.back();return;}
  if(dialog){try{dialog.close();}catch(e){}dialog.remove();}
}
window.addEventListener('popstate',()=>{if($('kContractDialog')?.open)kCloseContractDialog(false);});
const kContractStatusLabels={mustand:'Mustand',saadetud:'Ootab kliendi kinnitust',kinnitatud:'Kinnitatud',asendatud:'Asendatud',tühistatud:'Tühistatud'};
function kContractForBooking(bookingId){
  return (kWorkspace?.contracts||[]).filter(c=>c.bookingId===bookingId).sort((a,b)=>(Number(b.version)||0)-(Number(a.version)||0))[0]||null;
}
function kContractSuggestedPrice(b){
  const stored=Number(b.estimatedTotal||0);if(stored>0)return stored;
  const room=rooms.find(r=>r.id===b.roomId),rate=Number.isFinite(room?.pricing?.community)?room.pricing.community:Number.isFinite(room?.pricing?.commercial)?room.pricing.commercial:null;
  if(!Number.isFinite(rate))return 0;
  const mins=t=>{const [h,m]=String(t||'0:0').split(':').map(Number);return h*60+m};
  const hours=Math.max(1,Math.ceil((mins(b.endTime)-mins(b.startTime))/60));return Math.max(0,hours*rate);
}
function kDefaultContractGeneral(){
  return 'Ruumi kasutatakse ainult kokkulepitud ajal ja eesmärgil. Kasutaja järgib rahvamaja töötaja juhiseid ning vastutab enda ja kutsutud osalejate tegevuse eest. Tekitatud kahjust või rikkest teavitatakse rahvamaja viivitamata. Pärast kasutust antakse ruum üle kokkulepitud seisukorras. Kokkuleppe muudatused tuleb pooltel enne kasutust eraldi kinnitada.';
}
function kDefaultContractCancellation(){
  return 'Tühistamisest teavitatakse rahvamaja esimesel võimalusel. Tühistamisega seotud tasud või kulud kehtivad ainult siis, kui need on käesolevas kokkuleppes eraldi kokku lepitud.';
}
function kBookingSnapshotFromBooking(b){
  return {eventType:b.eventType||'',description:b.notes||'',clientType:b.clientType||'',selectedServicesText:b.selectedServicesText||'',roomCost:Number(b.roomCost||0),servicesTotal:Number(b.servicesTotal||0),estimatedTotal:Number(b.estimatedTotal||0),quoteNote:b.disclaimer||''};
}
function kBookingSnapshotHTML(snap={}){
  const rows=[
    ['Kasutuse liik',snap.eventType||'—'],
    ['Kliendi kirjeldus',snap.description||'—'],
    ['Kasutuse laad',snap.clientType||'—'],
    ['Valitud teenused',snap.selectedServicesText||'Lisateenuseid ei valitud'],
    ['Broneerimisel näidatud ruumihind',kMoney(Number(snap.roomCost||0))+' €'],
    ['Broneerimisel näidatud teenused',kMoney(Number(snap.servicesTotal||0))+' €'],
    ['Broneerimisel näidatud koguhind',kMoney(Number(snap.estimatedTotal||0))+' €']
  ];
  return `<section class="k-review" style="margin:16px 0"><h3>Broneeringu algne sisend</h3><div class="booking-data-grid">${rows.map(([label,value])=>`<div class="booking-data"><small>${esc(label)}</small><strong style="white-space:pre-wrap">${esc(value)}</strong></div>`).join('')}</div>${snap.quoteNote?`<p class="hint">${esc(snap.quoteNote)}</p>`:''}</section>`;
}
function kContractViewHTML(c){
  return `${kBookingSnapshotHTML(c.bookingSnapshot||{})}<div class="status-msg ${c.status==='kinnitatud'?'':'error'}"><strong>${esc(kContractStatusLabels[c.status]||c.status)}</strong>${c.acceptedAt?` · ${esc(new Intl.DateTimeFormat('et-EE',{dateStyle:'medium',timeStyle:'short'}).format(new Date(c.acceptedAt)))}`:''}</div>
  <div class="booking-data-grid">
    <div class="booking-data"><small>Lepingu ID</small><strong>${esc(c.id)}</strong></div>
    <div class="booking-data"><small>Versioon</small><strong>${esc(c.version)}</strong></div>
    <div class="booking-data"><small>Hind</small><strong>${kMoney(c.price)} €</strong></div>
    <div class="booking-data"><small>Kinnitaja</small><strong>${esc(c.acceptedName||'—')}</strong></div>
  </div>
  ${c.priceNote?`<h3>Hinna märkus</h3><p>${esc(c.priceNote)}</p>`:''}
  ${c.included?`<h3>Hinna sees</h3><p style="white-space:pre-wrap">${esc(c.included)}</p>`:''}
  ${c.specialTerms?`<h3>Eritingimused</h3><p style="white-space:pre-wrap">${esc(c.specialTerms)}</p>`:''}
  <h3>Tühistamise tingimused</h3><p style="white-space:pre-wrap">${esc(c.cancellationTerms)}</p>
  <h3>Üldtingimused</h3><p style="white-space:pre-wrap">${esc(c.generalTerms)}</p>`;
}
function kContractDraftForm(){
  return {
    price:Number($('kContractPrice')?.value||0),
    priceNote:$('kContractPriceNote')?.value.trim()||'',
    included:$('kContractIncluded')?.value.trim()||'',
    specialTerms:$('kContractSpecial')?.value.trim()||'',
    cancellationTerms:$('kContractCancellation')?.value.trim()||'',
    generalTerms:$('kContractGeneral')?.value.trim()||''
  };
}
async function kSaveContractDraft(bookingId){
  const button=$('kContractDraftSave');if(button)button.disabled=true;
  kNotice('kContractMessage','Salvestan mustandi serverisse…');
  try{
    const result=await post({action:'saveContractDraft',bookingId,...kContractDraftForm()});
    await kLoadWorkspaceSection('contracts',true);
    const state=$('kContractDraftState');
    if(state)state.textContent='Mustand on serverisse salvestatud'+(result.savedAt?' · '+new Intl.DateTimeFormat('et-EE',{dateStyle:'short',timeStyle:'short'}).format(new Date(result.savedAt)):'')+'.';
    kNotice('kContractMessage','Mustand on salvestatud. Kliendile ei ole midagi saadetud.');
  }catch(e){kNotice('kContractMessage',e.message||'Mustandi salvestamine ebaõnnestus.',true);}
  finally{if(button)button.disabled=false;}
}
function kOpenContract(bookingId){
  const b=kWorkspace.bookings.find(x=>x.id===bookingId);if(!b)return;
  const current=kContractForBooking(bookingId);
  $('kContractDialog')?.remove();const dialog=document.createElement('dialog');dialog.id='kContractDialog';dialog.className='k-dialog';dialog.setAttribute('aria-labelledby','kContractHeading');
  if(current?.status==='kinnitatud'){
    dialog.innerHTML=`<div class="panel-header k-dialog-sticky"><h2 id="kContractHeading">Ruumi kasutamise leping</h2><button type="button" class="k-dialog-close" aria-label="Sulge leping" onclick="kCloseContractDialog()">×</button></div><p>${esc(b.name)} · ${esc(kDateLabel(b.date))} · ${esc(b.roomName)}</p>${kContractViewHTML(current)}<div class="row-actions"><button class="button outline small" onclick="kResendContractPdf('${esc(current.id)}')">Saada PDF uuesti kliendile</button><button type="button" class="button outline small" onclick="kCloseContractDialog()">Sulge</button></div><div id="kContractMessage" class="status-msg"></div>`;
  }else{
    const room=rooms.find(r=>r.id===b.roomId)||{},price=current?.price??kContractSuggestedPrice(b);
    const included=current?.included??((room.included||[]).join('\n'));
    const special=current?.specialTerms??[b.notes,room.extra].filter(Boolean).join('\n');
    const cancellation=current?.cancellationTerms??kDefaultContractCancellation();
    const general=current?.generalTerms??kDefaultContractGeneral();
    const priceNote=current?.priceNote??'Lõpliku summa aluseks on käesolev leping.';
    dialog.innerHTML=`<div class="panel-header k-dialog-sticky"><div><span class="eyebrow">Broneering ${esc(b.id)}</span><h2 id="kContractHeading">Koosta ruumi kasutamise leping</h2></div><button type="button" class="k-dialog-close" aria-label="Sulge leping ilma saatmata" onclick="kCloseContractDialog()">×</button></div>
    <p><strong>Klient:</strong> ${esc(b.name)} · ${esc(b.email)} · ${esc(b.phone||'')}<br><strong>Kasutus:</strong> ${esc(kDateLabel(b.date))} ${esc(b.startTime)}–${esc(b.endTime)} · ${esc(b.roomName)}</p>
    ${kBookingSnapshotHTML(current?.bookingSnapshot||kBookingSnapshotFromBooking(b))}
    ${current?.status==='saadetud'?`<div class="status-msg">Kliendile on juba saadetud versioon ${esc(current.version)}. Uue versiooni saatmisel muutub eelmine link kehtetuks.</div>`:''}
    <div id="kContractDraftState" class="status-msg">${current?.status==='mustand'?'Mustand on serverisse salvestatud.':'Mustandit ei ole veel salvestatud.'}</div>
    <form id="kContractForm" onsubmit="kSendContract(event,'${esc(b.id)}')">
      <div class="field-grid">${kField('Lepinguline hind €','kContractPrice',price,'number','required min="0" max="1000000" step="0.01"')}${kField('Hinna märkus','kContractPriceNote',priceNote,'text','maxlength="1200"')}</div>
      ${kText('Hinna sees','kContractIncluded',included,'maxlength="4000" placeholder="Näiteks: ruum, lauad ja toolid…"')}
      ${kText('Eritingimused','kContractSpecial',special,'maxlength="5000" placeholder="Näiteks võtme üleandmine, tehnika, koristuse erikokkulepe…"')}
      ${kText('Tühistamise tingimused','kContractCancellation',cancellation,'required maxlength="5000"')}
      ${kText('Üldtingimused','kContractGeneral',general,'required maxlength="10000"')}
      <p class="hint">Saatmisel lukustatakse see lepinguversioon. Klient saab personaalse lingi e-postile ja pärast kinnitamist PDF-koopia.</p>
      <div class="row-actions"><button class="button outline" id="kContractDraftSave" type="button" onclick="kSaveContractDraft('${esc(b.id)}')">Salvesta mustand</button><button class="button" id="kContractSend" type="submit">Saada kliendile kinnitamiseks</button><button class="button outline" type="button" onclick="kCloseContractDialog()">Sulge ilma salvestamata</button></div><div id="kContractMessage" class="status-msg" aria-live="polite"></div>
    </form>`;
  }
  document.body.appendChild(dialog);
  dialog.addEventListener('cancel',ev=>{ev.preventDefault();kCloseContractDialog();});
  dialog.addEventListener('click',ev=>{if(ev.target===dialog)kCloseContractDialog();});
  history.pushState({...history.state,kContractDialog:true},'',location.href);
  dialog.showModal();
}
async function kSendContract(ev,bookingId){
  ev.preventDefault();const button=$('kContractSend');button.disabled=true;kNotice('kContractMessage','Koostan lepinguversiooni ja saadan kliendile…');
  try{
    const result=await post({action:'sendContract',bookingId,price:Number($('kContractPrice').value),priceNote:$('kContractPriceNote').value.trim(),included:$('kContractIncluded').value.trim(),specialTerms:$('kContractSpecial').value.trim(),cancellationTerms:$('kContractCancellation').value.trim(),generalTerms:$('kContractGeneral').value.trim()});
    kNotice('kContractMessage',result.message);await kLoadWorkspace(true);await kLoadWorkspaceSection('contracts',true);setTimeout(()=>{$('kContractDialog')?.close();kRenderStaff();},700);
  }catch(e){kNotice('kContractMessage',e.message,true);button.disabled=false;}
}
async function kResendContractPdf(contractId){
  kNotice('kContractMessage','Saadan PDF-koopia uuesti…');
  try{const result=await post({action:'resendContractPdf',contractId});kNotice('kContractMessage',result.message);}catch(e){kNotice('kContractMessage',e.message,true);}
}


let kBookingViewMode='overview';
try{kBookingViewMode=sessionStorage.getItem('culturehub_booking_view_v1:'+ORG.id+':'+HOUSE.id)||'overview';}catch(e){}
function kSetBookingView(mode){
  kBookingViewMode=['overview','series','all'].includes(mode)?mode:'overview';
  try{sessionStorage.setItem('culturehub_booking_view_v1:'+ORG.id+':'+HOUSE.id,kBookingViewMode);}catch(e){}
  kRenderBookings();
}
function kBookingsHTML(){return `<section class="panel"><div class="panel-header"><div><h2>Proovid ja sündmused</h2><p class="hint">Korduvad proovid on vaikimisi koondatud üheks graafikuks.</p></div><button class="button small" onclick="kNewSchedule()">${manager()?'Lisa proov või üritus':'Lisa oma kollektiivi proov'}</button></div>
<nav class="k-tabs" aria-label="Kalendrivaate valik"><button class="button ${kBookingViewMode==='overview'?'':'outline'} small" onclick="kSetBookingView('overview')">Ülevaade</button><button class="button ${kBookingViewMode==='series'?'':'outline'} small" onclick="kSetBookingView('series')">Korduvad proovid</button><button class="button ${kBookingViewMode==='all'?'':'outline'} small" onclick="kSetBookingView('all')">Kõik kirjed</button></nav>
<div class="k-filter-grid">${kField('Alates','kListFrom',etDate(),'date')}${kField('Kuni','kListTo',kSeasonRange(etDate()).end,'date')}<label class="field"><span>Kollektiiv</span><select id="kListCollective"><option value="">Kõik</option>${kWorkspace.collectives.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label><label class="service-option"><input type="checkbox" id="kShowCancelled"><span>Näita tühistatud kirjeid</span></label></div><button class="button outline small" onclick="kRenderBookings()">Näita valikut</button><p id="kBookingCount" class="hint"></p><div id="kBookingList" class="k-booking-list"></div></section>`;}
function kBookingExternal(b){return manager()&&!b.collectiveId&&!!b.email&&String(b.type||'broneering').toLowerCase()==='broneering';}
function kBookingActive(b){return !['tühistatud','tuhistatud','cancelled','canceled','rejected'].includes(String(b.status||'').toLowerCase().trim());}
function kBookingNeedsAttention(b){
  const status=String(b.status||'').toLowerCase().trim(),contract=kSectionLoaded('contracts')?kContractForBooking(b.id):null;
  return ['ootel','pending'].includes(status)||(kBookingExternal(b)&&b.contractRequired===true&&(!contract||contract.status==='saadetud'));
}
function kBookingItemHTML(b){
  const contractsReady=!manager()||kSectionLoaded('contracts'),contract=contractsReady?kContractForBooking(b.id):null,status=String(b.status||'').toLowerCase().trim(),external=kBookingExternal(b),active=kBookingActive(b),contractRequired=external&&(b.contractRequired===true||HOUSE.contractMode==='required');
  const contractInfo=external&&contract?`<p class="hint"><strong>Leping:</strong> ${esc(kContractStatusLabels[contract.status]||contract.status)} · v${esc(contract.version)}${contract.acceptedName?' · '+esc(contract.acceptedName):''}</p>`:'';
  const policy=contractRequired&&contractsReady&&!contract?'<p class="hint"><strong>Rahvamaja eeskirjade järgi kinnitub see broneering pärast ruumi kasutamise lepingu kinnitamist.</strong></p>':'';
  let primary='';
  if(manager()&&external&&active&&!contractsReady)primary='<button class="button outline small" disabled>Kontrollin lepingu olekut…</button>';
  else if(manager()&&external&&active){
    if(contract?.status==='kinnitatud'||contract?.status==='saadetud')primary=`<button class="button small" onclick="kOpenContract('${esc(b.id)}')">${contract.status==='kinnitatud'?'Vaata lepingut':'Vaata / muuda lepingut'}</button>`;
    else if(contract?.status==='mustand')primary=`<button class="button small" onclick="kOpenContract('${esc(b.id)}')">Jätka lepingut</button>`;
    else if(contractRequired)primary=`<button class="button small" onclick="kOpenContract('${esc(b.id)}')">Koosta leping</button>`;
    else{const pending=['ootel','pending'].includes(status);primary=(pending?`<button class="button small" onclick="kApproveLegacy('${esc(b.id)}')">Kinnita broneering</button>`:'')+`<button class="button outline small" onclick="kOpenContract('${esc(b.id)}')">Koosta leping</button>`;}
  }else if(manager()&&['ootel','pending'].includes(status))primary=`<button class="button small" onclick="kApproveLegacy('${esc(b.id)}')">Kinnita</button>`;
  const actions=!active?`<button class="button outline small" onclick="kOpenEdit('${esc(b.id)}','restore')">Taasta</button>`:`<button class="button outline small" onclick="kOpenEdit('${esc(b.id)}','edit')">Muuda</button><button class="button outline small" onclick="kOpenEdit('${esc(b.id)}','cancel')">Tühista</button>${primary}`;
  return `<article class="booking-row"><div class="booking-row-top"><div><h3>${esc(b.publicTitle||b.collective||'Ruum kasutuses')}</h3><p>${esc(kDateLabel(b.date))} · ${esc(b.startTime)}–${esc(b.endTime)} · ${esc(b.roomName)}</p>${external?`<p>${esc(b.name)} · ${esc(b.email)}${b.phone?' · '+esc(b.phone):''}</p>`:''}${policy}${contractInfo}</div><span class="badge ${b.status==='kinnitatud'?'good':''}">${esc(b.status)}</span></div><div class="row-actions">${actions}</div></article>`;
}
function kSeriesGroups(list){
  const map=new Map();list.filter(b=>b.seriesId&&b.collectiveId).forEach(b=>{if(!map.has(b.seriesId))map.set(b.seriesId,[]);map.get(b.seriesId).push(b);});
  return [...map.entries()].map(([seriesId,items])=>({seriesId,items:items.sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime))})).sort((a,b)=>(a.items[0]?.date||'').localeCompare(b.items[0]?.date||''));
}
function kSeriesSummaryHTML(group){
  const items=group.items,active=items.filter(kBookingActive),sample=active[0]||items[0],next=active.find(b=>b.date>=etDate())||active[0]||items[0],first=active[0]||items[0],last=active.at(-1)||items.at(-1);
  const weekday=['','esmaspäeviti','teisipäeviti','kolmapäeviti','neljapäeviti','reedeti','laupäeviti','pühapäeviti'][kIsoWeekday(sample.date)]||'iga nädal',cancelled=items.length-active.length;
  const details=items.map(b=>`<div class="booking-row" style="margin:10px 0"><div class="booking-row-top"><div><strong>${esc(kDateLabel(b.date))}</strong><p>${esc(b.startTime)}–${esc(b.endTime)} · ${esc(b.roomName)}</p></div><span class="badge ${b.status==='kinnitatud'?'good':''}">${esc(b.status)}</span></div><div class="row-actions">${kBookingActive(b)?`<button class="button outline small" onclick="kOpenEdit('${esc(b.id)}','edit')">Muuda</button><button class="button outline small" onclick="kOpenEdit('${esc(b.id)}','cancel')">Tühista</button>`:`<button class="button outline small" onclick="kOpenEdit('${esc(b.id)}','restore')">Taasta</button>`}</div></div>`).join('');
  return `<article class="booking-row"><div class="booking-row-top"><div><span class="eyebrow">Korduv proov</span><h3>${esc(sample.collective||sample.publicTitle||'Proovigraafik')}</h3><p><strong>${esc(weekday)}</strong> · ${esc(sample.startTime)}–${esc(sample.endTime)} · ${esc(sample.roomName)}</p><p class="hint">${esc(kDateLabel(first.date))} – ${esc(kDateLabel(last.date))} · ${active.length} aktiivset korda${cancelled?' · '+cancelled+' tühistatud':''}</p>${next&&next.date>=etDate()?`<p class="hint"><strong>Järgmine:</strong> ${esc(kDateLabel(next.date))} · ${esc(next.startTime)}</p>`:''}</div><span class="badge good">graafik</span></div><div class="row-actions"><button class="button small" onclick="kOpenSeriesEdit('${esc(group.seriesId)}')">Muuda graafikut</button></div><details class="k-activity"><summary>Näita kõiki kordi (${items.length})</summary><div class="k-activity-fields">${details}</div></details></article>`;
}
function kOpenSeriesEdit(seriesId){
  const items=(kWorkspace.bookings||[]).filter(b=>b.seriesId===seriesId&&kBookingActive(b)).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime)),target=items.find(b=>b.date>=etDate())||items[0];if(!target)return;
  kOpenEdit(target.id,'edit');setTimeout(()=>{if($('kEditScope'))$('kEditScope').value='following';},0);
}
function kRenderBookings(){
  const from=$('kListFrom')?.value||etDate(),to=$('kListTo')?.value||kSeasonRange(etDate()).end,group=$('kListCollective')?.value||'',cancelled=!!$('kShowCancelled')?.checked;
  const list=(kWorkspace.bookings||[]).filter(b=>(!from||b.date>=from)&&(!to||b.date<=to)&&(!group||b.collectiveId===group)&&(cancelled||kBookingActive(b))).sort((a,b)=>(a.date+a.startTime).localeCompare(b.date+b.startTime));
  const seriesGroups=kSeriesGroups(list),seriesIds=new Set(seriesGroups.map(g=>g.seriesId)),singles=list.filter(b=>!seriesIds.has(b.seriesId)),attention=singles.filter(kBookingNeedsAttention),regularSingles=singles.filter(b=>!kBookingNeedsAttention(b));
  let html='';
  if(kBookingViewMode==='all'){
    $('kBookingCount').textContent=`Valikus ${list.length} üksikkirjet. Siin on nähtavad ka kõik korduvate proovide kuupäevad.`;html=list.map(kBookingItemHTML).join('');
  }else if(kBookingViewMode==='series'){
    $('kBookingCount').textContent=`${seriesGroups.length} korduvat proovigraafikut. Detailid avanevad graafiku kaardilt.`;html=seriesGroups.map(kSeriesSummaryHTML).join('')||'<p class="muted">Selles ajavahemikus korduvaid proove pole.</p>';
  }else{
    $('kBookingCount').textContent=`${attention.length} tähelepanu vajavat · ${seriesGroups.length} korduvat graafikut · ${regularSingles.length} muud üksikkirjet.`;
    if(attention.length)html+=`<div class="panel-header" style="margin-top:14px"><h3>Tähelepanu vajavad</h3><span class="badge">${attention.length}</span></div>`+attention.map(kBookingItemHTML).join('');
    if(seriesGroups.length)html+=`<div class="panel-header" style="margin-top:24px"><h3>Korduvad proovid</h3><span class="badge">${seriesGroups.length} graafikut</span></div>`+seriesGroups.map(kSeriesSummaryHTML).join('');
    if(regularSingles.length)html+=`<div class="panel-header" style="margin-top:24px"><h3>Ühekordsed sündmused ja kasutused</h3><span class="badge">${regularSingles.length}</span></div>`+regularSingles.map(kBookingItemHTML).join('');
    if(!html)html='<p class="muted">Selles ajavahemikus kirjeid pole.</p>';
  }
  $('kBookingList').innerHTML=html;
}
async function kApproveLegacy(id){try{await post({action:'updateStatus',bookingId:id,status:'kinnitatud'});await kLoadWorkspace(true);await kLoadWorkspaceSection('bookings',true);if(manager())await kLoadWorkspaceSection('contracts',true);kRenderStaff();}catch(e){alert(e.message);}}
function kSeasonRange(date){const y=Number(date.slice(0,4)),m=Number(date.slice(5,7)),year=m<=7?y-1:y;return {year,start:`${year}-09-01`,end:`${year+1}-07-31`};}
function kIsoWeekday(date){return ((new Date(date+'T12:00:00Z').getUTCDay()+6)%7)+1;}
async function kNewSchedule(date=etDate()){
  try{await kLoadWorkspace();showView('login');kShowSchedule(date);$('adminCalendarEntryPanel').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){alert(e.message==='SERVER_UPDATE_REQUIRED'?'Serveri haldusuuendus pole veel ühendatud.':e.message);}
}
showCalendarEntryForDate=function(date){if(!staffUser)return;if(kWorkspace)kShowSchedule(date);else if(manager())kLegacy.showCalendarEntryForDate(date);};
loadCalendarCollectives=async function(){if(!staffUser)return;try{await kLoadWorkspace();}catch(e){if(manager())return kLegacy.loadCalendarCollectives();}};
selectEventCalendarDate=function(date){$('eventDate').value=date;eventCalendarMonth=date.slice(0,7);renderEventCalendar();loadEventSchedule('day');if(staffUser)kLoadWorkspace().then(()=>kShowSchedule(date)).catch(()=>{if(manager())kLegacy.showCalendarEntryForDate(date);});};
function kShowSchedule(date){
  const panel=$('adminCalendarEntryPanel');panel.classList.remove('hidden');
  if($('kScheduleForm')){if($('kStartDate').value!==date&&$('kRepeat').value==='once'){$('kStartDate').value=date;kInvalidateSchedule();}return;}
  const season=kSeasonRange(date),groups=kWorkspace.collectives.filter(c=>c.active);
  panel.innerHTML=`<div class="panel-header"><h2>${manager()?'Lisa proov või üritus':'Lisa oma kollektiivi proov'}</h2><button class="text-link" type="button" onclick="$('adminCalendarEntryPanel').classList.add('hidden')">Sulge</button></div><details class="k-assist"><summary>Sisesta graafik ühe lausega</summary><p class="hint">Näiteks: Kavalik neljapäeviti 19.30–21.30, hooaeg ${season.year}/${String(season.year+1).slice(2)}.</p>${kText('Graafiku kirjeldus','kAssistText','','maxlength="1500"')}<button class="button outline small" type="button" onclick="kParseSchedule()">Täida vorm tekstist</button>${kWorkspace.aiAvailable?'<button class="button outline small" type="button" onclick="kAskAI()">Koosta AI abil</button><p class="hint">AI-le saadetakse sinu kirjeldus ja kollektiivide nimed. Tulemus täidab vormi; kalendrisse salvestad ise.</p>':''}<div id="kAssistMessage" class="status-msg" aria-live="polite"></div></details><form id="kScheduleForm" onsubmit="kPreviewSchedule(event)"><div class="field-grid"><label class="field"><span>Kirje liik</span><select id="kEntryType" onchange="kScheduleType()"><option value="Proov">Kollektiivi proov</option>${manager()?'<option value="Sündmus">Üritus</option>':''}</select></label><label class="field" id="kGroupWrap"><span>Kollektiiv</span><select id="kCollective" onchange="kFillCollective()"><option value="">Vali kollektiiv</option>${groups.map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join('')}</select></label></div><p class="hint" id="kCollectiveInfo"></p><div id="kTitleWrap" hidden>${kField('Ürituse nimetus','kTitle','','text','maxlength="160"')}</div><div class="field-grid"><label class="field"><span>Ruum</span><select id="kRoom" required>${kRoomOptions('')}</select></label><label class="field"><span>Kordamine</span><select id="kRepeat" onchange="kRepeatChanged()"><option value="once">Üks kord</option><option value="weekly">Igal nädalal</option><option value="season">Terve hooaeg: september–juuli</option></select></label></div><div id="kSeasonWrap" hidden><label class="field"><span>Hooaeg</span><select id="kSeason" onchange="kSetSeason()">${[season.year-1,season.year,season.year+1].map(y=>`<option value="${y}" ${y===season.year?'selected':''}>${y}/${y+1}</option>`).join('')}</select></label></div><div class="field-grid">${kField('Kuupäev / perioodi algus','kStartDate',date,'date','required')}<div id="kUntilWrap" hidden>${kField('Perioodi lõpp','kUntil',season.end,'date')}</div></div><div id="kWeekdayWrap" hidden><label class="field"><span>Proovipäev</span><select id="kWeekday" onchange="kFillTimes()">${kDayNames.map((d,i)=>`<option value="${i+1}" ${kIsoWeekday(date)===i+1?'selected':''}>${d}</option>`).join('')}</select></label></div><div class="field-grid">${kField('Algusaeg','kStartTime','','time','required')}${kField('Lõpuaeg','kEndTime','','time','required')}</div><div id="kEventPublicWrap" hidden><h3 style="font:700 15px Manrope;margin:18px 0 10px">Avalik sündmuse info</h3>${kText('Lühikirjeldus','kPublicDescription','','maxlength="600" placeholder="Lühike tekst, mis aitab külastajal otsustada, kas sündmus talle sobib."')}${kImageControl('Sündmuse pilt','','event','new-event',{id:'kEventImageUrl'})}<div class="field-grid">${kField('Piletimüügi link','kTicketUrl','','url','maxlength="500" placeholder="https://…"')}${kField('Sotsiaalmeedia / Facebooki sündmuse link','kSocialUrl','','url','maxlength="500" placeholder="https://…"')}</div>${kField('Lisainfo link','kInfoUrl','','url','maxlength="500" placeholder="https://…"')}<p class="hint">Täida ainult need lingid, mida sündmusel vaja on. Avalikul lehel kuvatakse vastavad nupud automaatselt.</p></div><div id="kExceptionsWrap" hidden>${kText('Jäta need kuupäevad vahele','kExceptions','','placeholder="Näiteks 24.12.2026, 31.12.2026"')}<p class="hint">Lisa puhkepäevad või vaheajad kuupäevadena. Pühi automaatselt välja ei jäeta.</p>${manager()?'<label class="service-option"><input id="kIncludePast" type="checkbox"><span>Lisa ka hooaja möödunud prooviajad</span></label>':''}</div><label class="service-option"><input id="kPublic" type="checkbox" checked><span>Näita sündmuse nime avalikus kalendris</span></label>${kText('Lisainfo','kNotes','','maxlength="1500"')}${kNotify('kNotifySchedule')}<p class="hint" id="kScheduleCount"></p><button class="button" id="kPreviewButton" type="submit">Vaata graafik üle</button><div id="kScheduleMessage" class="status-msg" aria-live="polite"></div><div id="kScheduleReview" aria-live="polite"></div></form>`;
  $('kScheduleForm').addEventListener('input',kInvalidateSchedule);$('kScheduleForm').addEventListener('change',kInvalidateSchedule);kScheduleType();
  if(groups.length===1){$('kCollective').value=groups[0].id;kFillCollective();}
}
function kScheduleType(){const trial=$('kEntryType').value==='Proov';$('kGroupWrap').hidden=!trial;$('kTitleWrap').hidden=trial;$('kEventPublicWrap').hidden=trial;$('kCollective').required=trial;$('kTitle').required=!trial;if($('kPublic'))$('kPublic').closest('label').querySelector('span').textContent=trial?'Näita proovi nime avalikus kalendris':'Näita sündmust avalikul sündmuste lehel';kInvalidateSchedule();}
function kFillCollective(){
  const c=kWorkspace.collectives.find(x=>x.id===$('kCollective').value);if(!c)return;
  const day=kDayNames.findIndex(d=>(c.schedule||'').toLowerCase().includes(d.toLowerCase()));if(day>=0)$('kWeekday').value=String(day+1);
  $('kRoom').value=/kool/i.test(c.location)&&!/rahvamaja/i.test(c.location)?'':c.roomId||(/rahvamaja/i.test(c.location)?(kPrimaryRoom()?.id||''):'');
  $('kCollectiveInfo').textContent=[c.schedule,c.location,!c.leaderUserId&&manager()?'Juhendaja konto sidumiseks ava „Kollektiivid”.':''].filter(Boolean).join(' · ');kFillTimes();
}
function kFillTimes(){const c=kWorkspace.collectives.find(x=>x.id===$('kCollective').value);if(!c)return;let date=$('kStartDate').value||etDate();if($('kRepeat').value!=='once')date=addDays(date,(Number($('kWeekday').value)-kIsoWeekday(date)+7)%7);const t=collectiveTimeDefaults(c,date);$('kStartTime').value=t.startTime;$('kEndTime').value=t.endTime;kInvalidateSchedule();}
function kSetSeason(){const year=Number($('kSeason').value);$('kStartDate').value=`${year}-09-01`;$('kUntil').value=`${year+1}-07-31`;kFillTimes();}
function kRepeatChanged(){const repeat=$('kRepeat').value!=='once';for(const id of ['kUntilWrap','kWeekdayWrap','kExceptionsWrap'])$(id).hidden=!repeat;$('kSeasonWrap').hidden=$('kRepeat').value!=='season';if($('kRepeat').value==='season')kSetSeason();else kInvalidateSchedule();}
function kParseDate(value){if(/^\d{4}-\d{2}-\d{2}$/.test(value))return value;const m=value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);if(m)return `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}`;throw new Error('Kuupäev ei sobi: '+value);}
function kBuildDates(start,end,weekday,excluded=[],includePast=false,today=etDate()){
  const valid=d=>/^\d{4}-\d{2}-\d{2}$/.test(d)&&!Number.isNaN(new Date(d+'T12:00:00Z').getTime())&&new Date(d+'T12:00:00Z').toISOString().slice(0,10)===d;
  if(!valid(start)||!valid(end)||end<start)throw new Error('Kontrolli perioodi algust ja lõppu.');
  if((new Date(end+'T12:00:00Z')-new Date(start+'T12:00:00Z'))/86400000>370)throw new Error('Lisa korraga kuni ühe hooaja graafik.');
  if(excluded.some(d=>!valid(d)))throw new Error('Mõni vahelejäetav kuupäev ei sobi.');
  const dates=[],skippedPast=[];for(let date=start;date<=end;date=addDays(date,1)){if(weekday&&kIsoWeekday(date)!==Number(weekday))continue;if(excluded.includes(date))continue;if(!includePast&&date<today){skippedPast.push(date);continue;}dates.push(date);}
  if(!dates.length)throw new Error('Valikus pole lisatavaid kuupäevi.');return {dates,skippedPast};
}
function kScheduleDraft(){
  const repeat=$('kRepeat').value!=='once',excluded=repeat?$('kExceptions').value.split(/[,;\s]+/).filter(Boolean).map(kParseDate):[];
  const {dates,skippedPast}=kBuildDates($('kStartDate').value,repeat?$('kUntil').value:$('kStartDate').value,repeat?Number($('kWeekday').value):null,excluded,manager()&&$('kIncludePast')?.checked);
  const isEvent=$('kEntryType').value==='Sündmus';return {action:'houseSaveSchedule',type:$('kEntryType').value,collectiveId:$('kEntryType').value==='Proov'?$('kCollective').value:'',roomId:$('kRoom').value,dates,startTime:$('kStartTime').value,endTime:$('kEndTime').value,publicTitle:$('kTitle').value.trim(),publicEvent:$('kPublic').checked,publicDescription:isEvent?$('kPublicDescription').value.trim():'',imageUrl:isEvent?$('kEventImageUrl').value.trim():'',ticketUrl:isEvent?$('kTicketUrl').value.trim():'',socialUrl:isEvent?$('kSocialUrl').value.trim():'',infoUrl:isEvent?$('kInfoUrl').value.trim():'',notes:$('kNotes').value.trim(),notify:$('kNotifySchedule').checked?'summary':'none',includePast:manager()&&!!$('kIncludePast')?.checked,skippedPast};
}
function kInvalidateSchedule(){kSchedulePending=null;if($('kScheduleReview'))$('kScheduleReview').innerHTML='';try{const d=kScheduleDraft();$('kScheduleCount').textContent=`Valikus ${d.dates.length} kuupäeva${d.skippedPast.length?`; ${d.skippedPast.length} möödunud kuupäeva jääb välja`:''}.`;}catch(e){if($('kScheduleCount'))$('kScheduleCount').textContent=e.message;}}
async function kPreviewSchedule(ev){
  ev?.preventDefault();if(!$('kScheduleForm').reportValidity())return;const button=$('kPreviewButton');button.disabled=true;kNotice('kScheduleMessage','Kontrollin kogu graafikut ja puhvreid…');
  try{const draft=kScheduleDraft(),signature=JSON.stringify(draft),result=await post({...draft,dryRun:true});if(signature!==JSON.stringify(kScheduleDraft())){kNotice('kScheduleMessage','Vorm muutus kontrollimise ajal. Kontrolli graafikut uuesti.');return;}
    kNotice('kScheduleMessage',result.conflicts.length?'Mõni kuupäev kattub teise kasutusega. Midagi pole salvestatud.':'Graafik on kontrollitud.',!!result.conflicts.length);
    kSchedulePending={...draft,requestId:'KRM-'+crypto.randomUUID(),conflicts:result.conflicts};
    $('kScheduleReview').innerHTML=`<section class="k-review"><h3>${result.count} uut kalendrikirjet</h3><p>${esc(kDateLabel(draft.dates[0]))} – ${esc(kDateLabel(draft.dates.at(-1)))} · ${esc(draft.startTime)}–${esc(draft.endTime)}</p><p>${draft.notify==='summary'?'Saadetakse üks koondkiri juhatajale.':'Meiliteadet ei saadeta.'}</p>${draft.skippedPast.length?`<p>${draft.skippedPast.length} möödunud proovipäeva jäeti välja.</p>`:''}${result.duplicates.length?`<p>${result.duplicates.length} samasugust proovi on juba olemas ja neid ei lisata uuesti.</p>`:''}${result.conflicts.length?`<div class="status-msg error"><strong>Kattuvad kuupäevad</strong><p>${result.conflicts.map(c=>esc(kDateLabel(c.date))).join(', ')}</p><button type="button" class="button outline small" onclick="kExcludeConflicts()">Jäta need kuupäevad välja ja kontrolli uuesti</button></div>`:`<button type="button" id="kSaveScheduleButton" class="button" onclick="kCommitSchedule()" ${!result.count?'disabled':''}>Salvesta ${result.count} kirjet</button>`}<details><summary>Vaata kõiki kuupäevi</summary><p class="k-date-list">${result.dates.map(kDateLabel).map(esc).join(' · ')}</p></details></section>`;
  }catch(e){kNotice('kScheduleMessage',e.message,true);}finally{button.disabled=false;}
}
function kExcludeConflicts(){const dates=kSchedulePending?.conflicts.map(c=>c.date)||[];if($('kRepeat').value==='once'){kNotice('kScheduleMessage','Vali sellele proovile teine aeg.',true);return;}$('kExceptions').value=[$('kExceptions').value,...dates].filter(Boolean).join(', ');kInvalidateSchedule();kPreviewSchedule();}
async function kCommitSchedule(){
  if(!kSchedulePending)return;const button=$('kSaveScheduleButton');button.disabled=true;const draft={...kSchedulePending};delete draft.conflicts;delete draft.skippedPast;
  try{const result=await post(draft);kSchedulePending=null;$('kScheduleReview').innerHTML='';kNotice('kScheduleMessage',`${result.message} ${result.notificationResult?.warning|| (result.notificationResult?.sent?'Juhatajale saadeti üks koondkiri.':'Meiliteadet ei saadetud.')}`);await kLoadWorkspace(true);await kLoadWorkspaceSection('bookings',true);await loadEventSchedule('upcoming',{force:true});}catch(e){kNotice('kScheduleMessage',e.message+' Saad sama salvestust uuesti proovida.',true);button.disabled=false;}
}

function kOpenEdit(id,operation){
  const b=kWorkspace.bookings.find(x=>x.id===id);if(!b)return;kEditing={booking:b,operation};kEditPending=null;
  $('kEditDialog')?.remove();const dialog=document.createElement('dialog');dialog.id='kEditDialog';dialog.className='k-dialog';dialog.setAttribute('aria-labelledby','kEditHeading');
  const label={edit:'Muuda kalendrikirjet',cancel:'Tühista kalendrikirje',restore:'Taasta kalendrikirje'}[operation];
  dialog.innerHTML=`<div class="panel-header"><h2 id="kEditHeading">${label}</h2><button type="button" class="text-link" onclick="$('kEditDialog').close()">Sulge</button></div><p>${esc(b.publicTitle||b.collective||'Ruum kasutuses')} · ${esc(kDateLabel(b.date))}</p><form id="kEditForm" onsubmit="kPreviewEdit(event)"><label class="field"><span>Muudatuse ulatus</span><select id="kEditScope"><option value="one">Ainult see kord</option>${b.seriesId?'<option value="following">See ja järgnevad korrad</option><option value="all">Kogu seeria</option>':''}</select></label>${operation==='edit'?`<div class="field-grid">${kField('Kuupäev','kEditDate',b.date,'date','required')}<label class="field"><span>Ruum</span><select id="kEditRoom" required>${kRoomOptions(b.roomId)}</select></label></div><p class="hint">Seeria kuupäeva muutmisel nihkuvad valitud korrad sama arvu päevade võrra.</p><div class="field-grid">${kField('Algusaeg','kEditStart',b.startTime,'time','required')}${kField('Lõpuaeg','kEditEnd',b.endTime,'time','required')}</div>${b.collectiveId?'':kField('Nimetus','kEditTitle',b.publicTitle,'text','required maxlength="160"')}${b.collectiveId?'':`<h3 style="font:700 15px Manrope;margin:18px 0 10px">Avalik sündmuse info</h3>${kText('Lühikirjeldus','kEditPublicDescription',b.publicDescription||'','maxlength="600"')}${kImageControl('Sündmuse pilt',b.imageUrl||'','event',b.id,{id:'kEditImageUrl'})}<div class="field-grid">${kField('Piletimüügi link','kEditTicketUrl',b.ticketUrl||'','url','maxlength="500" placeholder="https://…"')}${kField('Sotsiaalmeedia / Facebooki sündmuse link','kEditSocialUrl',b.socialUrl||'','url','maxlength="500" placeholder="https://…"')}</div>${kField('Lisainfo link','kEditInfoUrl',b.infoUrl||'','url','maxlength="500" placeholder="https://…"')}`}<label class="service-option"><input id="kEditPublic" type="checkbox" ${b.publicEvent?'checked':''}><span>${b.collectiveId?'Näita nimetust avalikus kalendris':'Näita sündmust avalikul sündmuste lehel'}</span></label>${kText('Lisainfo','kEditNotes',b.notes,'maxlength="1500"')}`:`<p class="hint">${operation==='cancel'?'Tühistamine vabastab ruumi. Kirjed säilivad ja neid saab hiljem taastada.':'Taastamisel kontrollitakse kõiki valitud aegu uuesti koos puhvriga.'}</p>`}${kNotify('kNotifyEdit')}<button class="button" id="kEditPreview" type="submit">Vaata muudatus üle</button><div id="kEditMessage" class="status-msg" aria-live="polite"></div><div id="kEditReview" aria-live="polite"></div></form>`;
  document.body.appendChild(dialog);$('kEditForm').addEventListener('input',()=>{kEditPending=null;$('kEditReview').innerHTML='';});dialog.showModal();
}
function kEditDraft(){const {booking:b,operation}=kEditing;return {action:'houseEditUsage',bookingId:b.id,operation,scope:$('kEditScope').value,notify:$('kNotifyEdit').checked?'summary':'none',...(operation==='edit'?{date:$('kEditDate').value,roomId:$('kEditRoom').value,startTime:$('kEditStart').value,endTime:$('kEditEnd').value,publicTitle:$('kEditTitle')?.value||b.publicTitle,publicEvent:$('kEditPublic').checked,publicDescription:$('kEditPublicDescription')?.value.trim()||'',imageUrl:$('kEditImageUrl')?.value.trim()||'',ticketUrl:$('kEditTicketUrl')?.value.trim()||'',socialUrl:$('kEditSocialUrl')?.value.trim()||'',infoUrl:$('kEditInfoUrl')?.value.trim()||'',notes:$('kEditNotes').value}: {})};}
async function kPreviewEdit(ev){
  ev.preventDefault();const button=$('kEditPreview');button.disabled=true;kNotice('kEditMessage','Kontrollin muudatust…');
  try{const draft=kEditDraft(),signature=JSON.stringify(draft),result=await post({...draft,dryRun:true});if(signature!==JSON.stringify(kEditDraft()))throw new Error('Vorm muutus. Kontrolli muudatust uuesti.');
    kEditPending={...draft,scopeRevision:result.scopeRevision,requestId:'KRM-'+crypto.randomUUID()};
    kNotice('kEditMessage',result.conflicts.length?'Kattuvad kuupäevad: '+result.conflicts.map(c=>kDateLabel(c.date)).join(', '):'Muudatus on kontrollitud.',!!result.conflicts.length);
    $('kEditReview').innerHTML=result.conflicts.length?'':`<div class="k-review"><h3>Muudatus puudutab ${result.count} kirjet</h3><p>${draft.notify==='summary'?'Saadetakse üks koondkiri.':'Meiliteadet ei saadeta.'}</p><button type="button" class="button" id="kEditCommit" onclick="kCommitEdit()">${{edit:'Salvesta muudatus',cancel:'Tühista valitud kirjed',restore:'Taasta valitud kirjed'}[draft.operation]}</button></div>`;
  }catch(e){kNotice('kEditMessage',e.message,true);}finally{button.disabled=false;}
}
async function kCommitEdit(){if(!kEditPending)return;const button=$('kEditCommit');button.disabled=true;try{const result=await post(kEditPending);kEditPending=null;$('kEditReview').innerHTML='';kNotice('kEditMessage',result.message+' '+(result.notificationResult?.warning|| (result.notificationResult?.sent?'Üks koondkiri saadetud.':'Meiliteadet ei saadetud.')));await kLoadWorkspace(true);await kLoadWorkspaceSection('bookings',true);if(manager())await kLoadWorkspaceSection('contracts',true);if($('kBookingList'))kRenderBookings();await loadEventSchedule('upcoming',{force:true});}catch(e){kNotice('kEditMessage',e.message,true);button.disabled=false;}}

const kActivityFields=[['name','Nimi',100],['schedule','Prooviaja kirjeldus',400],['location','Tegutsemiskoht',200],['instructor','Juhendaja nimi',160],['email','Kontakt e-post',120,'email'],['phone','Telefon',80],['audience','Sihtrühm',300],['fee','Osalustasu / tingimus',160],['joinLabel','Liitumisnupu tekst',120],['joinUrl','Liitumise HTTPS-link',1200,'url'],['description','Tutvustus',2000,'textarea'],['imageAlt','Pildi kirjeldus',200],['linkUrl','Lisainfo HTTPS-link',1200,'url']];
function kActivityEditor(c){
  return `<details class="k-activity" data-id="${esc(c.id)}"><summary>${esc(c.name||'Uus kollektiiv')}</summary><div class="k-activity-fields"><div class="field-grid">${kActivityFields.map(([key,label,max,type])=>`<label class="field"><span>${label}</span>${type==='textarea'?`<textarea data-key="${key}" maxlength="${max}">${esc(c[key])}</textarea>`:`<input data-key="${key}" type="${type||'text'}" maxlength="${max}" value="${esc(c[key])}" ${['name','location'].includes(key)?'required':''}>`}</label>`).join('')}</div>${kImageControl('Kollektiivi pilt',c.imageUrl||'','collective',c.id,{dataKey:'imageUrl'})}${manager()?`<label class="field"><span>Haldusõigusega juhendaja konto</span><select data-key="leaderUserId"><option value="">Konto pole seotud</option>${kWorkspace.users.filter(u=>u.role==='collective'&&u.active).map(u=>`<option value="${esc(u.id)}" ${c.leaderUserId===u.id?'selected':''}>${esc(u.name)} · ${esc(u.email)}</option>`).join('')}</select></label><p class="hint">Seotud kasutaja saab muuta selle kollektiivi infot ja proove. Kontakt e-post üksi haldusõigust ei anna.</p><button class="button outline small" type="button" onclick="kRemoveActivity(this)">Eemalda avalikust loetelust</button>`:''}</div></details>`;
}
function kActivitiesHTML(){const groups=kWorkspace.collectives;return `<section class="panel"><div class="panel-header"><h2>${manager()?'Kollektiivid ja huvitegevus':'Minu kollektiivid'} (${groups.length})</h2>${manager()?'<button type="button" class="button outline small" onclick="kAddActivity()">Lisa kollektiiv</button>':''}</div><p class="hint">Prooviaja kirjeldus on kodulehe tutvustuses. Tegelikud kuupäevad lisa või muuda kalendris.</p>${!groups.length&&!manager()?'<p>Sinu kontoga pole veel kollektiivi seotud. Juhataja saab selle siduda vaates „Kollektiivid”.</p>':''}<form id="kActivitiesForm" onsubmit="kSaveActivities(event)"><div id="kActivityEditors">${groups.map(kActivityEditor).join('')}</div><button class="button" type="submit" ${!manager()&&!groups.length?'disabled':''}>Salvesta kollektiivide info</button><div id="kActivitiesMessage" class="status-msg" aria-live="polite"></div></form></section>`;}
function kAddActivity(){$('kActivityEditors').insertAdjacentHTML('beforeend',kActivityEditor({id:HOUSE.id+'-'+crypto.randomUUID(),location:HOUSE.name}));$('kActivityEditors').lastElementChild.open=true;}
function kRemoveActivity(button){if(confirm('Eemaldan kollektiivi avalikust loetelust pärast salvestamist. Olemasolevad kalendrikirjed säilivad. Kas jätkata?'))button.closest('.k-activity').remove();}
async function kSaveActivities(ev){ev.preventDefault();const button=ev.submitter;button.disabled=true;try{const activities=[...$('kActivityEditors').querySelectorAll('.k-activity')].map(el=>({id:el.dataset.id,...Object.fromEntries([...el.querySelectorAll('[data-key]')].map(i=>[i.dataset.key,i.value.trim()]))}));await post({action:'houseSaveActivities',revision:kSite.revision,activities});await kLoadWorkspace(true);kRenderActivities();kNotice('kActivitiesMessage','Info on salvestatud ja kodulehel nähtav.');}catch(e){kNotice('kActivitiesMessage',e.message,true);}finally{button.disabled=false;}}

function kImportHTML(){
  const season=kSeasonRange(etDate());
  const years=[season.year-1,season.year,season.year+1];
  const example=`Segakoor Ringen
Proov: teisipäeviti 19.00–21.00
Koht: Rõngu Rahvamaja, suur saal
Juhendaja: Mari Maasik
E-post: mari@example.ee
Telefon: 512 3456

Rahvatantsurühm Rukkilill
Proovid: kolmapäeviti 18.30–20.00 ja pühapäeviti 17.00–19.00
Koht: Rõngu Rahvamaja, väike saal
Juhendaja: Jaan Tamm
Telefon: 5555 5555`;
  return `<section class="panel"><h2>Impordi kollektiivid AI abil</h2><p class="hint">Kleebi siia korraga kollektiivide info. AI eraldab nimed, prooviajad, tegutsemiskohad, juhendajad ja kontaktid. Midagi ei salvestata enne sinu kinnitust.</p>
  <details class="k-activity" open>
    <summary>Kuidas sisestada, et AI saaks infost hästi aru?</summary>
    <div class="k-activity-fields">
      <p class="hint"><strong>Üks kollektiiv ühe lõigu kaupa.</strong> Võid kirjutada tavakeeles — kindlat vormi ei pea järgima.</p>
      <ul class="booking-include-list">
        <li><strong>Nimi</strong> – kollektiivi või huviringi nimi.</li>
        <li><strong>Prooviaeg</strong> – nädalapäev ning võimalusel algus- ja lõpuaeg, nt „teisipäeviti 19.00–21.00”.</li>
        <li><strong>Koht / ruum</strong> – kirjuta võimalusel maja ja ruumi nimi täpselt nii, nagu need Kultuuripesas on.</li>
        <li><strong>Juhendaja</strong> – nimi.</li>
        <li><strong>Kontakt</strong> – e-post ja/või telefon.</li>
        <li><strong>Tutvustus</strong> – soovi korral lühike avalik kirjeldus kollektiivist.</li>
      </ul>
      <p class="hint">Kui kollektiivil on mitu proovipäeva, kirjuta need kõik välja. Kui mõni info puudub, jäta see lihtsalt kirjutamata — AI ei peaks seda ise välja mõtlema.</p>
      <p class="hint"><strong>Hea näide:</strong></p>
      <pre style="white-space:pre-wrap;margin:0;padding:14px;border:1px solid var(--line);border-radius:12px;background:#f7f8f4;font:12px/1.55 ui-monospace,SFMono-Regular,Consolas,monospace">${esc(example)}</pre>
      <p class="hint">Võid ka kopeerida info vanalt kodulehelt, Wordist, e-kirjast või tabelist. Pärast analüüsi näed kõiki AI leitud välju enne salvestamist ja saad neid parandada.</p>
    </div>
  </details>
  ${kText('Kollektiivide alginfo','kImportText','','maxlength="12000" placeholder="Kleebi siia kollektiivide info. Soovitus: üks kollektiiv ühe lõigu kaupa; lisa nimi, prooviaeg, koht/ruum, juhendaja ja kontaktid, kui need on teada."')}
  <div class="field-grid"><label class="field"><span>Proovikalendri hooaeg</span><select id="kImportSeason">${years.map(y=>`<option value="${y}" ${y===season.year?'selected':''}>${y}/${y+1}</option>`).join('')}</select></label><label class="service-option" style="align-self:end"><input id="kImportCalendar" type="checkbox" checked><span>Lisa täielikud prooviajad ka kalendrisse</span></label></div><button class="button" id="kImportAnalyze" type="button" onclick="kRunCollectiveImportAI()" ${kWorkspace.aiAvailable?'':'disabled'}>Analüüsi AI abil</button>${kWorkspace.aiAvailable?'':'<p class="status-msg error">AI-abiline pole serveris ühendatud.</p>'}<div id="kImportMessage" class="status-msg" aria-live="polite"></div><div id="kImportReview"></div></section>`;
}
async function kRunCollectiveImportAI(){
  const text=$('kImportText').value.trim(),button=$('kImportAnalyze');
  if(text.length<10){kNotice('kImportMessage','Kleebi esmalt kollektiivide info.',true);return;}
  button.disabled=true;kNotice('kImportMessage','AI analüüsib kollektiive, proovigraafikuid ja kontakte…');
  try{
    const result=await post({action:'houseImportCollectivesDraft',text});
    kImportDraft={...result,collectives:(result.collectives||[]).map(c=>({...c,_id:c.existingId||HOUSE.id+'-'+crypto.randomUUID()}))};
    kNotice('kImportMessage',result.message+(result.summary?' '+result.summary:''));
    kRenderImportReview();
  }catch(e){kNotice('kImportMessage',e.message,true);}finally{button.disabled=false;}
}
function kImportWeekdayOptions(selected){
  return '<option value="">Vali päev</option>'+kDayNames.map((d,i)=>`<option value="${i+1}" ${Number(selected)===i+1?'selected':''}>${d}</option>`).join('');
}
function kImportRoomOptions(selected){
  return '<option value="">Vali ruum / ära lisa kalendrisse</option>'+rooms.map(r=>`<option value="${esc(r.id)}" ${r.id===selected?'selected':''}>${esc(r.name)}</option>`).join('');
}
function kRenderImportReview(){
  const box=$('kImportReview');if(!box||!kImportDraft)return;
  const items=kImportDraft.collectives||[];
  box.innerHTML=`<section class="k-review" style="margin-top:20px"><div class="panel-header"><div><h3 style="margin:0">Kontrolli enne salvestamist</h3><p class="hint" style="margin:5px 0 0">AI leidis ${items.length} kollektiivi. Punase märkusega väljad vajavad sinu tähelepanu.</p></div></div><div class="managed-activities">${items.map((c,i)=>{
    const warnings=(c.warnings||[]);
    const existing=c.existingId?'<span class="badge good">olemasolev</span>':'<span class="badge">uus</span>';
    const rehearsals=(c.rehearsals||[]).map((r,j)=>`<div class="rate-card k-import-rehearsal" data-r="${j}"><div class="field-grid"><label class="field"><span>Prooviruum</span><select data-rkey="roomId">${kImportRoomOptions(r.roomId||'')}</select></label><label class="field"><span>Nädalapäev</span><select data-rkey="weekday">${kImportWeekdayOptions(r.weekday)}</select></label></div><div class="field-grid">${kField('Algus','kImportStart_'+i+'_'+j,r.startTime||'','time','data-rkey="startTime"')}${kField('Lõpp','kImportEnd_'+i+'_'+j,r.endTime||'','time','data-rkey="endTime"')}</div></div>`).join('');
    return `<article class="k-import-item" data-index="${i}" data-id="${esc(c._id)}" data-existing-id="${esc(c.existingId||'')}" style="border:1px solid var(--line);border-radius:14px;padding:16px"><div class="panel-header"><h3 style="margin:0">${esc(c.name||'Nimi puudub')}</h3>${existing}</div><div class="field-grid">${kField('Nimi','kImportName_'+i,c.name||'','text','data-ikey="name" required maxlength="100"')}${kField('Tegutsemiskoht','kImportLocation_'+i,c.location||'','text','data-ikey="location" required maxlength="200"')}</div>${kText('Prooviaja kirjeldus','kImportSchedule_'+i,c.schedule||'','data-ikey="schedule" maxlength="400"')}<div class="field-grid">${kField('Juhendaja','kImportInstructor_'+i,c.instructor||'','text','data-ikey="instructor" maxlength="160"')}${kField('Kontakt e-post','kImportEmail_'+i,c.email||'','email','data-ikey="email" maxlength="120"')}</div>${kField('Telefon','kImportPhone_'+i,c.phone||'','text','data-ikey="phone" maxlength="80"')}<div class="field-grid">${kField('Sihtrühm','kImportAudience_'+i,c.audience||'','text','data-ikey="audience" maxlength="300"')}${kField('Osalustasu / tingimus','kImportFee_'+i,c.fee||'','text','data-ikey="fee" maxlength="160"')}</div><div class="field-grid">${kField('Liitumisnupu tekst','kImportJoinLabel_'+i,c.joinLabel||'','text','data-ikey="joinLabel" maxlength="120"')}${kField('Liitumise link','kImportJoinUrl_'+i,c.joinUrl||'','url','data-ikey="joinUrl" maxlength="1200" placeholder="https://…"')}</div>${kText('Tutvustus','kImportDescription_'+i,c.description||'','data-ikey="description" maxlength="2000"')}<h4 style="margin:16px 0 8px">Proovikalender</h4>${rehearsals||'<p class="hint">AI ei leidnud sellest infost kalendrisse lisatavat täpset prooviaega.</p>'}${warnings.length?`<div class="status-msg error"><strong>Kontrolli:</strong> ${warnings.map(esc).join(' · ')}</div>`:''}</article>`;
  }).join('')}</div><button class="button" id="kImportSave" type="button" onclick="kSaveCollectiveImport()">Salvesta kontrollitud andmed</button><div id="kImportSaveMessage" class="status-msg" aria-live="polite"></div></section>`;
}
function kReadImportReview(){
  return [...document.querySelectorAll('.k-import-item')].map(el=>{
    const values={};el.querySelectorAll('[data-ikey]').forEach(input=>values[input.dataset.ikey]=input.value.trim());
    const rehearsals=[...el.querySelectorAll('.k-import-rehearsal')].map(row=>{
      const r={};row.querySelectorAll('[data-rkey]').forEach(input=>r[input.dataset.rkey]=input.dataset.rkey==='weekday'?(input.value?Number(input.value):null):(input.value||null));return r;
    });
    return {id:el.dataset.id,existingId:el.dataset.existingId||null,...values,rehearsals};
  });
}
function kActivityForImport(item){
  const old=kWorkspace.collectives.find(c=>c.id===item.id)||{};
  const use=(key)=>item[key]||old[key]||'';
  return {id:item.id,name:use('name'),schedule:use('schedule'),location:use('location'),instructor:use('instructor'),email:use('email'),phone:use('phone'),audience:use('audience'),fee:use('fee'),joinLabel:use('joinLabel'),joinUrl:use('joinUrl'),description:use('description'),imageUrl:old.imageUrl||'',imageAlt:old.imageAlt||'',linkUrl:old.linkUrl||'',leaderUserId:old.leaderUserId||''};
}
async function kSaveCollectiveImport(){
  const button=$('kImportSave');if(!button)return;
  const imported=kReadImportReview();
  const invalid=imported.filter(x=>!x.name||!x.location);
  if(invalid.length){kNotice('kImportSaveMessage','Kõigil kollektiividel peab enne salvestamist olema nimi ja tegutsemiskoht.',true);return;}
  button.disabled=true;kNotice('kImportSaveMessage','Salvestan kollektiivid ja kontrollin proovikalendrit ühe toiminguna…');
  try{
    const result=await post({action:'houseCommitCollectiveImport',revision:kSite.revision,collectives:imported,addCalendar:!!$('kImportCalendar')?.checked,seasonYear:Number($('kImportSeason').value)});
    await kLoadWorkspace(true);kImportDraft=null;
    const warning=result.skipped?.length?' Kontrolli: '+result.skipped.join('; '):'';
    kNotice('kImportSaveMessage',`${result.message} Kalendrisse lisati ${result.calendarCount||0} proovikirjet.${warning}`,!!result.skipped?.length);
  }catch(e){kNotice('kImportSaveMessage',e.message,true);}finally{button.disabled=false;}
}

const kPriceFields={community:'Kogukonnasõbralik kasutus €/h',commercial:'Kommertskasutus €/h',minimumHours:'Saali minimaalne rendiaeg tundides',sound:'Helitehnika €/üritus',lights:'Valgustus €/üritus',technicianCommunity:'Tehniline tugi kogukonnale €/h',technicianCommercial:'Tehniline tugi kommertskasutusel €/h',technicianMinimum:'Tehnilise toe miinimum tundides'};
const kTextFields={homeTitle:'Avalehe pealkiri',homeDescription:'Avalehe tutvustus',homeNote:'Avalehe lisalause',communityTitle:'Kogukonna osa pealkiri',communityDescription:'Kogukonna osa tekst',activitiesDescription:'Huvitegevuse sissejuhatus',address:'Aadress',phone:'Telefon',email:'E-post',hallDescription:'Saali tutvustus',hallCapacity:'Saali mahutavus',included:'Rendi hinna sees (iga asi eraldi reale)',extra:'Eraldi kokkuleppel'};
function kSettingsHTML(){return `<section class="panel"><h2>Kodulehe sisu ja hinnad</h2><form id="kSettingsForm" onsubmit="kSaveSettings(event)"><details class="k-activity" open><summary>Hinnakiri</summary><div class="field-grid k-activity-fields">${Object.entries(kPriceFields).map(([key,label])=>kField(label,'kPrice_'+key,kSite.prices[key],'number',`required min="${key.endsWith('Hours')||key.endsWith('Minimum')?'0.25':'0'}" max="10000" step="0.25"`)).join('')}</div></details><details class="k-activity"><summary>Avaleht, kontakt ja saal</summary><div class="k-activity-fields">${Object.entries(kTextFields).map(([key,label])=>kText(label,'kText_'+key,kSite.texts[key],'maxlength="3000"')).join('')}</div></details><button type="submit" class="button">Salvesta sisu ja hinnad</button><div id="kSettingsMessage" class="status-msg" aria-live="polite"></div></form></section><section class="panel"><h2>Pildid ja ruumide lisainfo</h2><div class="content-list">${[{type:'house',id:HOUSE.id,name:'Avalehe pilt'},...rooms.map(r=>({type:'room',...r}))].map(r=>`<button class="content-option" onclick="kImageEditor('${r.type}','${r.id}')">${esc(r.name)}</button>`).join('')}</div><div id="kImageEditor"></div></section>`;}
async function kSaveSettings(ev){ev.preventDefault();const button=ev.submitter;button.disabled=true;try{const prices=Object.fromEntries(Object.keys(kPriceFields).map(k=>[k,Number($('kPrice_'+k).value)])),texts=Object.fromEntries(Object.keys(kTextFields).map(k=>[k,$('kText_'+k).value.trim()]));const result=await post({action:'houseSaveSettings',revision:kSite.revision,prices,texts});kSite=result.site;await kLoadWorkspace(true);kApplyPublic();kNotice('kSettingsMessage','Sisu ja hinnad on salvestatud. Uus hind kehtib uutele broneeringutele.');}catch(e){kNotice('kSettingsMessage',e.message,true);}finally{button.disabled=false;}}
async function kImageEditor(type,id){try{const result=await jsonp({action:'listPublicContent'});publicContent=result.content||[];const item=publicContent.find(x=>x.type===type&&x.id===id)||{};$('kImageEditor').innerHTML=`<form onsubmit="kSaveImage(event,'${type}','${id}')">${type==='room'?kText('Ruumi lisatutvustus','kRoomDescription',item.description,'maxlength="2000"'):''}${kImageControl(type==='house'?'Avalehe peapilt':'Ruumi põhifoto',item.imageUrl||'',type,id,{id:'kImageUrl'})}${kField('Pildi kirjeldus','kImageAlt',item.imageAlt)}<button class="button small" type="submit">Salvesta</button><div id="kImageMessage" class="status-msg" aria-live="polite"></div></form>`;}catch(e){kNotice('kSettingsMessage',e.message,true);}}
async function kSaveImage(ev,type,id){ev.preventDefault();ev.submitter.disabled=true;try{const old=publicContent.find(x=>x.type===type&&x.id===id)||{};await post({action:'savePublicContent',type,id,description:type==='house'?old.description||'':$('kRoomDescription').value,imageUrl:$('kImageUrl').value.trim(),imageAlt:$('kImageAlt').value.trim(),linkUrl:old.linkUrl||''});await loadPublicHouse();renderRooms();kNotice('kImageMessage','Salvestatud.');}catch(e){kNotice('kImageMessage',e.message,true);}finally{ev.submitter.disabled=false;}}
function kUsersHTML(){
  const platform=staffUser?.role==='platform_admin';
  const directors=(kWorkspace.users||[]).filter(u=>u.role==='director'&&String(u.organizationId||'')===ORG.id);
  const directorSection=platform?`<section class="panel"><h2>${esc(ORG.name)} juhataja konto</h2><p class="hint">Juhataja näeb ja haldab kõiki selle organisatsiooni maju, kuid mitte teiste organisatsioonide andmeid.</p><details class="k-activity"><summary>Lisa organisatsiooni juhataja</summary><form class="k-activity-fields" onsubmit="kCreateDirector(event)">${kField('Nimi','kDirectorName','','text','required minlength="2" maxlength="100"')}${kField('E-post','kDirectorEmail','','email','required')}${kField('Algne parool','kDirectorPassword','','password','required minlength="12" autocomplete="new-password"')}<p class="hint">Vähemalt 12 märki. Edasta algne parool juhatajale turvalise kanali kaudu.</p><button class="button" type="submit">Loo juhataja konto</button><div id="kDirectorMessage" class="status-msg" aria-live="polite"></div></form></details>${directors.map(u=>`<div class="booking-row"><h3>${esc(u.name)}</h3><p>${esc(u.email)} · ${u.active?'Aktiivne':'Suletud'}</p><div class="row-actions"><button class="button outline small" onclick="kToggleUser('${esc(u.id)}',${!u.active})">${u.active?'Sulge konto':'Ava konto'}</button></div><details class="k-activity"><summary>Määra uus parool</summary><form class="k-activity-fields" onsubmit="kSetUserPassword(event,'${esc(u.id)}')"><label class="field"><span>Uus parool</span><input data-reset-password type="password" required minlength="12" autocomplete="new-password"></label><p class="hint">Vähemalt 12 märki. Parooli muutmisel aeguvad kasutaja varasemad sessioonid.</p><button class="button small" type="submit">Salvesta uus parool</button><div class="status-msg" data-reset-message aria-live="polite"></div></form></details></div>`).join('')||'<p class="muted">Selle organisatsiooni juhataja kontot pole veel loodud.</p>'}</section>`:'';
  const passwordSection=`<section class="panel"><h2>Minu parool</h2><details class="k-activity"><summary>Muuda oma parooli</summary><form class="k-activity-fields" onsubmit="kSetMyPassword(event)">${kField('Uus parool','kMyNewPassword','','password','required minlength="12" autocomplete="new-password"')}<button class="button" type="submit">Muuda parooli</button><div id="kMyPasswordMessage" class="status-msg" aria-live="polite"></div></form></details></section>`;
  return directorSection+`<section class="panel"><h2>Juhendajate kontod</h2><p class="hint">Loo konto ning seo see seejärel vaates „Kollektiivid” ühe või mitme kollektiiviga. Konto loomine meili ei saada.</p><details class="k-activity"><summary>Lisa juhendaja konto</summary><form class="k-activity-fields" onsubmit="kCreateUser(event)">${kField('Nimi','kUserName','','text','required minlength="2" maxlength="100"')}${kField('E-post','kUserEmail','','email','required')}${kField('Algne parool','kUserPassword','','password','required minlength="12" autocomplete="new-password"')}<p class="hint">Vähemalt 12 märki. Edasta parool juhendajale turvalise kanali kaudu.</p><button class="button" type="submit">Loo konto</button><div id="kUserMessage" class="status-msg" aria-live="polite"></div></form></details>${kWorkspace.users.filter(u=>u.role==='collective'&&((u.house?.toLowerCase().includes((HOUSE.shortName||HOUSE.name).toLowerCase())||(u.allowedRoomIds||[]).some(id=>rooms.some(r=>r.id===id))||kWorkspace.collectives.some(c=>c.leaderUserId===u.id)))).map(u=>`<div class="booking-row"><h3>${esc(u.name)}</h3><p>${esc(u.email)} · ${u.active?'Aktiivne':'Suletud'}</p><p class="hint">${esc(kWorkspace.collectives.filter(c=>c.leaderUserId===u.id).map(c=>c.name).join(', ')||'Kollektiiviga sidumata')}</p><button class="button outline small" onclick="kToggleUser('${esc(u.id)}',${!u.active})">${u.active?'Sulge konto':'Ava konto'}</button></div>`).join('')}<div id="kUserListMessage" class="status-msg" aria-live="polite"></div></section>`+passwordSection;}
async function kCreateDirector(ev){
  ev.preventDefault();const button=ev.submitter;button.disabled=true;
  try{
    const password=$('kDirectorPassword').value,passwordSalt=b64(crypto.getRandomValues(new Uint8Array(24))),passwordVerifier=await verifier(password,passwordSalt,150000);
    await post({action:'createUser',name:$('kDirectorName').value.trim(),email:$('kDirectorEmail').value.trim(),role:'director',organizationId:ORG.id,allowedHouseIds:[],passwordSalt,passwordVerifier});
    $('kDirectorPassword').value='';await kLoadWorkspace(true);await kLoadWorkspaceSection('users',true);kRenderStaff();kNotice('kDirectorMessage','Juhataja konto on loodud.');
  }catch(e){kNotice('kDirectorMessage',e.message,true);button.disabled=false;}
}
async function kSetUserPassword(ev,userId){
  ev.preventDefault();const form=ev.currentTarget,button=ev.submitter,input=form.querySelector('[data-reset-password]'),message=form.querySelector('[data-reset-message]');
  button.disabled=true;message.classList.remove('error');message.textContent='Salvestan uut parooli…';
  try{
    const password=input.value;if(password.length<12)throw new Error('Parool peab olema vähemalt 12 märki.');
    const passwordSalt=b64(crypto.getRandomValues(new Uint8Array(24))),passwordVerifier=await verifier(password,passwordSalt,150000);
    await post({action:'manageUser',userId,userAction:'setPassword',passwordSalt,passwordVerifier});
    input.value='';message.textContent='Uus parool on salvestatud. Kasutaja saab nüüd sellega sisse logida.';
  }catch(e){message.textContent=e.message||'Parooli muutmine ebaõnnestus.';message.classList.add('error');}
  finally{button.disabled=false;}
}
async function kSetMyPassword(ev){
  ev.preventDefault();const button=ev.submitter;button.disabled=true;
  try{
    const password=$('kMyNewPassword').value,passwordSalt=b64(crypto.getRandomValues(new Uint8Array(24))),passwordVerifier=await verifier(password,passwordSalt,150000);
    await post({action:'manageUser',userId:staffUser.id,userAction:'setPassword',passwordSalt,passwordVerifier});
    $('kMyNewPassword').value='';kNotice('kMyPasswordMessage','Parool on muudetud.');
  }catch(e){kNotice('kMyPasswordMessage',e.message,true);}finally{button.disabled=false;}
}
async function kCreateUser(ev){ev.preventDefault();ev.submitter.disabled=true;try{const passwordSalt=b64(crypto.getRandomValues(new Uint8Array(24))),passwordVerifier=await verifier($('kUserPassword').value,passwordSalt,150000);await post({action:'createUser',name:$('kUserName').value.trim(),email:$('kUserEmail').value.trim(),role:'collective',organizationId:ORG.id,houseId:HOUSE.id,house:HOUSE.name,allowedRoomIds:rooms.map(r=>r.id),passwordSalt,passwordVerifier});$('kUserPassword').value='';await kLoadWorkspace(true);await kLoadWorkspaceSection('users',true);kRenderStaff();}catch(e){kNotice('kUserMessage',e.message,true);ev.submitter.disabled=false;}}
async function kToggleUser(id,active){if(!confirm(active?'Avada konto uuesti?':'Sulgeda selle juhendaja ligipääs? Kollektiivi andmed jäävad alles.'))return;try{await post({action:'manageUser',userId:id,userAction:'setActive',active});await kLoadWorkspace(true);await kLoadWorkspaceSection('users',true);kRenderStaff();}catch(e){kNotice('kUserListMessage',e.message,true);}}
function kActivityHTML(){return `<section class="panel"><h2>Viimased muudatused</h2><p class="hint">Siit näed muudatusi ka siis, kui meiliteade jäi saatmata.</p>${kWorkspace.activity.map(a=>`<article class="booking-row"><h3>${esc(a.action)}</h3><p>${esc(a.title)} · ${a.count} kirjet</p><p class="hint">${esc(a.name)} · ${esc(new Intl.DateTimeFormat('et-EE',{dateStyle:'short',timeStyle:'short',timeZone:'Europe/Tallinn'}).format(new Date(a.at)))}</p></article>`).join('')||'<p>Muudatusi pole veel registreeritud.</p>'}</section>`;}

function kExtractSchedule(text,groups,today=etDate()){
  const lower=text.toLocaleLowerCase('et'),draft={excludedDates:[],question:''};
  const found=groups.filter(g=>g.name.toLocaleLowerCase('et').split(/\s+/).filter(w=>w.length>3&&!['segarühm','ansambel','memmede','tantsurühm','laste'].includes(w)).some(w=>lower.includes(w)));
  if(found.length===1)draft.collectiveId=found[0].id;
  const weekday=['esmaspäev','teisipäev','kolmapäev','neljapäev','reede','laupäev','pühapäev'].findIndex(w=>lower.includes(w));if(weekday>=0)draft.weekday=weekday+1;
  const time=text.match(/(?:^|\s)([01]?\d|2[0-3])[.:]([0-5]\d)\s*[–—-]\s*([01]?\d|2[0-3])[.:]([0-5]\d)(?!\d)/);
  if(time){draft.startTime=time[1].padStart(2,'0')+':'+time[2];draft.endTime=time[3].padStart(2,'0')+':'+time[4];}
  const season=lower.match(/(?:hooaeg|hooajaks|hooaegadeks)\s*(20\d{2})(?:\s*[/-]\s*(?:20)?\d{2})?/);
  if(season||/hooaj/.test(lower)){const year=season?Number(season[1]):kSeasonRange(today).year;draft.startDate=`${year}-09-01`;draft.endDate=`${year+1}-07-31`;}
  const dates=text.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}/g)||[];
  if(!season&&!/hooaj/.test(lower)){if(dates[0])draft.startDate=kParseDate(dates[0]);if(dates[1])draft.endDate=kParseDate(dates[1]);}
  if(/välja|välja arvatud|vahele/.test(lower)){const excluded=lower.split(/välja arvatud|jäta vahele|vahele|välja/).slice(1).join(' ');draft.excludedDates=(excluded.match(/\d{4}-\d{2}-\d{2}|\d{1,2}\.\d{1,2}\.\d{4}/g)||[]).map(kParseDate);}
  draft.question=[!draft.collectiveId?'Vali kollektiiv.':'',!draft.startTime||!draft.endTime?'Täpsusta algus- ja lõpuaeg.':'',!draft.startDate?'Täpsusta kuupäev või periood.':'',draft.endDate&&!draft.weekday?'Vali kordamise nädalapäev.':''].filter(Boolean).join(' ');return draft;
}
function kApplyDraft(draft){
  $('kEntryType').value='Proov';kScheduleType();if(draft.collectiveId){$('kCollective').value=draft.collectiveId;kFillCollective();}
  $('kRepeat').value=draft.endDate&&draft.endDate!==draft.startDate?'weekly':'once';kRepeatChanged();
  if(draft.startDate)$('kStartDate').value=draft.startDate;if(draft.endDate)$('kUntil').value=draft.endDate;if(draft.weekday)$('kWeekday').value=draft.weekday;
  $('kStartTime').value=draft.startTime||'';$('kEndTime').value=draft.endTime||'';if(draft.roomId)$('kRoom').value=draft.roomId;
  $('kExceptions').value=(draft.excludedDates||[]).join(', ');kInvalidateSchedule();kNotice('kAssistMessage','Vorm on täidetud. '+(draft.question||'Vaata kuupäevad ja ajad üle ning kontrolli graafikut.'));
}
function kParseSchedule(){try{kApplyDraft(kExtractSchedule($('kAssistText').value,kWorkspace.collectives));}catch(e){kNotice('kAssistMessage',e.message,true);}}
async function kAskAI(){kNotice('kAssistMessage','Koostan graafiku mustandit…');try{const result=await post({action:'houseAssist',text:$('kAssistText').value});kApplyDraft(result.draft);}catch(e){kNotice('kAssistMessage',e.message,true);}}
