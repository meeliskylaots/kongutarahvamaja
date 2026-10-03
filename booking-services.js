/* Use the house's stored service prices; missing or zero prices mean agreement required. */
function pricedBookingServices(prices,community,hours=0){
  const p=prices||{},minimum=Math.max(0,Number(p.technicianMinimum)||0);
  return [
    {inputId:'serviceSound',id:'sound',label:'Helitehnika',rate:Number(p.sound),hours:null},
    {inputId:'serviceLights',id:'lights',label:'Valgustus',rate:Number(p.lights),hours:null},
    {inputId:'serviceTechnician',id:'technician',label:'Tehniline tugi',rate:Number(community?p.technicianCommunity:p.technicianCommercial),hours:Math.max(minimum,hours)}
  ].filter(x=>Number.isFinite(x.rate)&&x.rate>0).map(x=>({...x,total:x.rate*(x.hours===null?1:x.hours)}));
}
function syncBookingServices(prices){
  const community=$('clientType')?.value!=='commercial',available=pricedBookingServices(prices,community);
  for(const id of ['serviceSound','serviceLights','serviceTechnician']){
    const input=$(id);if(!input)continue;
    const service=available.find(x=>x.inputId===id);
    input.disabled=!service;if(!service)input.checked=false;
    const label=input.closest('label');if(label)label.style.display=service?'':'none';
  }
  const options=document.querySelector('#bookingForm .service-options');
  if(options){
    options.style.display=available.length?'':'none';
    const disclosure=options.closest('details');
    const summary=disclosure?.querySelector('summary');
    if(summary)summary.textContent=available.length?'Tehnika ja hinnad':'Tehnika ja lisavajadused';
    const heading=options.previousElementSibling?.previousElementSibling;
    if(heading?.tagName==='H2')heading.textContent=available.length?'Vali vajalik tehnika':'Tehnika ja lisavajadused';
    const hint=options.previousElementSibling;
    if(hint?.classList.contains('hint'))hint.textContent=available.length?'Valitud teenused lisanduvad allolevale hinnale. Muud vajadused kirjuta sündmuse kirjeldusse.':((typeof HOUSE!=='undefined'&&HOUSE.technicalNote)||'Kirjelda tehnilisi vajadusi sündmuse kirjelduses. Lahenduse ja hinna täpsustab rahvamaja.');
  }
  return available;
}
