(function () {
'use strict';
var state={user:null,classes:[],classesReady:false,queued:false,classRequest:0,classLoading:false};

function basePath(){return String(window.__SIPANDU_BASE_PATH__||'').replace(/\/+$/,'')}
function url(path){var clean='/'+String(path||'').replace(/^\/+/,'');var base=basePath();return base&&clean.indexOf(base+'/')!==0?base+clean:clean}
function text(value){return String(value==null?'':value)}
function esc(value){return text(value).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[c]})}
function semester(value){return text(value).toLowerCase()==='ganjil'?'Ganjil':'Genap'}
function svg(name){
 var paths={
  class:'<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/>',
  users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/>',
  layers:'<path d="m12 2 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5"/><path d="m3 17 9 5 9-5"/>',
  check:'<path d="m5 12 4 4L19 6"/>',
  arrow:'<path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>'
 };
 return '<svg viewBox="0 0 24 24" aria-hidden="true">'+paths[name]+'</svg>'
}
function findHeading(value){return Array.from(document.querySelectorAll('h1,h2')).find(function(node){return text(node.textContent).replace(/\s+/g,' ').trim().toLowerCase()===value.toLowerCase()})}
function clickMenu(label){
 var target=Array.from(document.querySelectorAll('button,a')).find(function(node){return text(node.textContent).replace(/\s+/g,' ').trim()===label});
 if(target) target.click()
}
function courseName(item){return (item.course&&item.course.name||'Kelas')+' — Kelas '+(item.name||'A')}

function addStyle(){
 if(document.getElementById('sipandu-lecturer-dashboard-style'))return;
 var style=document.createElement('style');style.id='sipandu-lecturer-dashboard-style';style.textContent=`
[data-sipandu-old-latest="true"]{display:none!important}
.sld-guide,.sld-summary{border:1px solid #dbe7f7;border-radius:26px;background:#fff;box-shadow:0 12px 34px rgba(15,42,91,.055)}
.sld-guide{position:relative;overflow:hidden;padding:26px 28px;background:linear-gradient(115deg,#fff 0%,#f7fbff 62%,#edf5ff 100%)}
.sld-guide:before{content:"";position:absolute;inset:0 auto auto 0;width:100%;height:4px;background:#1d63ff}
.sld-guide-head{display:flex;align-items:flex-start;justify-content:space-between;gap:24px}
.sld-kicker{color:#1764ff;font:850 11px/1.2 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;letter-spacing:.15em;text-transform:uppercase}
.sld-guide h2,.sld-summary h2{margin:8px 0 0;color:#0b1635;font:850 25px/1.18 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;letter-spacing:-.025em}
.sld-guide-progress{margin:7px 0 0;color:#65748f;font:500 13px/1.5 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}.sld-guide-progress strong{color:#10265d}
.sld-primary{display:inline-flex;min-height:46px;align-items:center;justify-content:center;gap:10px;border:0;border-radius:14px;background:#1764ff;color:#fff;padding:0 18px;box-shadow:0 9px 20px rgba(23,100,255,.2);font:800 13px/1 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.sld-primary svg,.sld-action svg,.sld-metric svg{width:17px;height:17px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
.sld-steps{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));margin-top:24px}
.sld-step{position:relative;display:flex;min-width:0;flex-direction:column;align-items:center;border:0;background:transparent;padding:0 5px;color:#7b879d;font:650 11px/1.35 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;text-align:center}
.sld-step:not(:last-child):before{content:"";position:absolute;z-index:0;left:56%;top:16px;width:88%;height:2px;background:#d9e2ef}
.sld-step.is-done:not(:last-child):before{background:#22a06b}
.sld-step i{position:relative;z-index:1;display:grid;width:34px;height:34px;place-items:center;border:2px solid #d8e2f0;border-radius:50%;background:#edf2f8;color:#71809b;font-style:normal;font-weight:850}
.sld-step.is-done i{border-color:#22a06b;background:#22a06b;color:#fff}.sld-step.is-current i{border-color:#e8a317;background:#fff7d6;color:#8a5a00;box-shadow:0 0 0 5px #fff0b3}
.sld-step span{display:block;margin-top:9px;max-width:110px}.sld-step.is-current span{color:#9a6500;font-weight:850}
.sld-summary{padding:24px 28px}.sld-summary-head{display:flex;align-items:end;justify-content:space-between;gap:18px}.sld-summary-head p{margin:6px 0 0;color:#6b7890;font:500 13px/1.5 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}
.sld-all{border:0;background:transparent;color:#1764ff;font:800 12px/1 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;cursor:pointer}
.sld-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin-top:18px}
.sld-card{min-width:0;border:1px solid #dfe7f2;border-radius:19px;background:#fff;padding:18px}
.sld-card-top{display:flex;align-items:center;gap:9px}.sld-code{border-radius:99px;background:#edf4ff;color:#1659e8;padding:7px 11px;font:850 11px/1 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}.sld-credit{color:#8995a9;font:750 11px/1 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}
.sld-card h3{margin:0;color:#111a32;font:800 17px/1.3 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sld-term{margin:5px 0 0;color:#70809b;font:500 12px/1.4 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}
.sld-metrics{display:flex;gap:18px;margin-top:15px;padding:13px 0;border-top:1px solid #edf1f7;border-bottom:1px solid #edf1f7}
.sld-metric{display:flex;align-items:center;gap:7px;color:#1764ff}.sld-metric span{color:#71809a;font:650 11px/1.3 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}.sld-metric strong{display:block;color:#13203d;font-size:15px}
.sld-roster{margin-top:13px}.sld-roster-head{display:flex;align-items:center;justify-content:space-between;color:#53627b;font-size:11px;font-weight:800}.sld-roster-list{display:grid;gap:7px;max-height:276px;margin-top:8px;padding-right:5px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#9aabc4 transparent}.sld-person{display:flex;align-items:center;gap:9px;border-radius:12px;background:#f7f9fc;padding:8px 10px}.sld-avatar{display:grid;width:30px;height:30px;flex:0 0 30px;place-items:center;border-radius:10px;background:#eaf2ff;color:#1764ff;font-size:10px;font-weight:850}.sld-person-name{min-width:0}.sld-person-name strong{display:block;overflow:hidden;color:#1a243b;font-size:11px;text-overflow:ellipsis;white-space:nowrap}.sld-person-name span{display:block;margin-top:2px;color:#8793a7;font-size:10px}.sld-roster-empty{margin-top:8px;border-radius:12px;background:#f8fafc;padding:10px;color:#8793a7;font-size:11px}
.sld-actions{display:grid;grid-template-columns:1fr 1fr;gap:9px;margin-top:14px}.sld-action{display:inline-flex;min-height:43px;align-items:center;justify-content:center;gap:7px;border:1px solid #cfe0ff;border-radius:12px;background:#edf4ff;color:#1455d8;font:800 12px/1 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif;text-decoration:none}.sld-action.is-primary{border-color:#1764ff;background:#1764ff;color:#fff}
.sld-empty{grid-column:1/-1;border:1px dashed #cdd9ea;border-radius:18px;padding:28px;text-align:center;color:#6f7e97;font:600 13px/1.5 "Plus Jakarta Sans",ui-sans-serif,system-ui,sans-serif}
@media(max-width:900px){.sld-guide-head{flex-direction:column}.sld-primary{width:100%}.sld-steps{grid-template-columns:repeat(3,1fr);gap:20px 4px}.sld-step:nth-child(3):before,.sld-step:nth-child(6):before{display:none}.sld-grid{grid-template-columns:1fr}}
@media(max-width:560px){.sld-guide,.sld-summary{padding:20px;border-radius:21px}.sld-guide h2,.sld-summary h2{font-size:21px}.sld-steps{grid-template-columns:repeat(2,1fr)}.sld-step:nth-child(2):before,.sld-step:nth-child(4):before{display:none}.sld-step:nth-child(3):before{display:block}.sld-card h3{white-space:normal}.sld-actions{grid-template-columns:1fr}}
`;document.head.appendChild(style)
}

function guideNode(){
 var classes=state.classes,hasClass=classes.length>0,hasStudents=classes.some(function(item){return Number(item.students_count||0)>0});
 var completed=hasClass?(hasStudents?2:1):0;
 var progressCopy=state.classesReady?'<strong>'+completed+' dari 6</strong> langkah terverifikasi selesai':'<strong>Memverifikasi langkah…</strong>';
 var labels=['Buat kelas','Tambah mahasiswa','Susun pertemuan','Tambah materi','Buat tugas & kuis','Nilai & rekap'];
 var section=document.createElement('section');section.className='sld-guide';section.dataset.sipanduLecturerGuide='true';
 section.innerHTML='<div class="sld-guide-head"><div><div class="sld-kicker">Panduan Dosen</div><h2>Siapkan kelas pertama Anda</h2><p class="sld-guide-progress">'+progressCopy+'</p></div><button class="sld-primary" type="button">Lanjutkan panduan '+svg('arrow')+'</button></div><div class="sld-steps">'+labels.map(function(label,index){var done=state.classesReady&&index<completed,current=state.classesReady&&index===completed;return '<button type="button" class="sld-step '+(done?'is-done ':'')+(current?'is-current':'')+'" data-step="'+index+'"><i>'+(index+1)+'</i><span>'+esc(label)+'</span></button>'}).join('')+'</div>';
 section.querySelector('.sld-primary').onclick=function(){if(completed<2)clickMenu('Kelas Saya');else if(classes[0])location.href=url(classes[0].detail_url||('/kelas/'+classes[0].id))};
 section.querySelectorAll('.sld-step').forEach(function(button){button.onclick=function(){var step=Number(button.dataset.step||0);if(step<2)clickMenu('Kelas Saya');else if(classes[0])location.href=url(classes[0].detail_url||('/kelas/'+classes[0].id))}});
 return section
}

function memberInitials(name){
 return text(name).split(/\s+/).filter(Boolean).slice(0,2).map(function(part){return part.charAt(0).toUpperCase()}).join('')
}
function summaryNode(){
 var section=document.createElement('section');section.className='sld-summary';section.dataset.sipanduLecturerSummary='true';
 var cards=state.classes.map(function(item){
  var detail=url(item.detail_url||('/kelas/'+item.id)),journal=url('/kelas/'+item.id+'/jurnal');
  var students=(Array.isArray(item.members)?item.members:[]).filter(function(member){return member.membership_role==='student'&&member.status==='active'&&member.user});
  var roster=students.map(function(member){var user=member.user||{};return '<div class="sld-person"><span class="sld-avatar">'+esc(memberInitials(user.name)||'M')+'</span><span class="sld-person-name"><strong>'+esc(user.name||'Mahasiswa')+'</strong><span>'+esc(user.identity_number||'NIM belum tersedia')+'</span></span></div>'}).join('');
   var code=esc(item.course&&item.course.code||'KELAS'),credits=Number(item.course&&item.course.credits||0);
  return '<article class="sld-card"><h3 title="'+esc(courseName(item))+'">'+esc(courseName(item))+'</h3><p class="sld-term">'+esc(semester(item.academic_term&&item.academic_term.semester))+' '+esc(item.academic_term&&item.academic_term.academic_year||'')+'</p><div class="sld-metrics"><div class="sld-metric">'+svg('users')+'<span><strong>'+Number(item.students_count||0)+'</strong>Mahasiswa</span></div><div class="sld-metric">'+svg('layers')+'<span><strong>'+code+'</strong>'+credits+' SKS</span></div></div><div class="sld-roster"><div class="sld-roster-head"><span>Peserta mahasiswa</span></div>'+(roster?'<div class="sld-roster-list">'+roster+'</div>':'<div class="sld-roster-empty">Belum ada mahasiswa aktif di kelas ini.</div>')+'</div><div class="sld-actions"><a class="sld-action is-primary" href="'+esc(detail)+'">Buka Kelas '+svg('arrow')+'</a><a class="sld-action" href="'+esc(journal)+'">Rekap</a></div></article>'
 }).join('');
 section.innerHTML='<div class="sld-summary-head"><div><div class="sld-kicker">Aktivitas Pengajaran</div><h2>Ringkasan Kelas</h2><p>Akses cepat, peserta kelas, dan rekap pembelajaran dalam satu tampilan.</p></div><button type="button" class="sld-all">Lihat semua kelas →</button></div><div class="sld-grid">'+(cards||'<div class="sld-empty">Memuat data kelas…</div>')+'</div>';
 section.querySelector('.sld-all').onclick=function(){clickMenu('Kelas Saya')};
 return section
}

function inferredRole(){
 if(state.user&&state.user.role)return state.user.role;
 var labels=Array.from(document.querySelectorAll('p,span')).map(function(node){return text(node.textContent).replace(/\s+/g,' ').trim().toLowerCase()});
 return labels.indexOf('dosen')>=0?'lecturer':(labels.indexOf('admin prodi')>=0?'admin_prodi':'')
}
function renderKey(){
 return inferredRole()+'|'+(state.classesReady?'ready':'loading')+'|'+state.classes.map(function(item){var members=Array.isArray(item.members)?item.members:[];return [item.id,Number(item.students_count||0),members.map(function(member){return [member.id,member.status,member.user&&member.user.name].join('-')}).join('.')].join(':')}).join(',')
}
function render(){
 state.queued=false;var role=inferredRole();if(['lecturer','admin_prodi'].indexOf(role)<0)return;
 var heroHeading=Array.from(document.querySelectorAll('h1')).find(function(node){return /^Selamat datang/i.test(text(node.textContent).trim())});
 var hero=heroHeading&&heroHeading.closest('section');if(!hero||!hero.parentElement)return;
 document.querySelectorAll('[data-sipandu-onboarding-dashboard]').forEach(function(node){node.remove()});
 var old=findHeading('Kelas terbaru'),oldSection=old&&old.closest('section');
 var todayHeading=findHeading('Apa yang perlu diperhatikan?'),todaySection=todayHeading&&todayHeading.closest('section');
 if(oldSection){if(state.classes.length)oldSection.dataset.sipanduOldLatest='true';else oldSection.removeAttribute('data-sipandu-old-latest')}
 var key=renderKey();
 var guide=document.querySelector('[data-sipandu-lecturer-guide]');
 if(!guide||guide.dataset.renderKey!==key){
  var freshGuide=guideNode();freshGuide.dataset.renderKey=key;
  if(guide)guide.replaceWith(freshGuide);else hero.insertAdjacentElement('afterend',freshGuide);
  guide=freshGuide
 }
 var summary=document.querySelector('[data-sipandu-lecturer-summary]');
 if(!summary||summary.dataset.renderKey!==key){
  var freshSummary=summaryNode();freshSummary.dataset.renderKey=key;
  if(summary)summary.replaceWith(freshSummary);
  else if(todaySection)todaySection.insertAdjacentElement('afterend',freshSummary);
  else if(oldSection)oldSection.insertAdjacentElement('beforebegin',freshSummary);
  else guide.insertAdjacentElement('afterend',freshSummary);
  summary=freshSummary
 }
 if(todaySection&&summary&&todaySection.nextElementSibling!==summary){
  todaySection.insertAdjacentElement('afterend',summary)
 }
}
function schedule(){if(state.queued)return;state.queued=true;requestAnimationFrame(render)}
function freshOptions(){
 return {credentials:'include',cache:'no-store',headers:{Accept:'application/json','Cache-Control':'no-cache','Pragma':'no-cache'}}
}
function freshUrl(path){
 var target=url(path);
 return target+(target.indexOf('?')>=0?'&':'?')+'_sipandu='+Date.now()
}
function loadClasses(){
 if(state.classLoading)return Promise.resolve();
 state.classLoading=true;
 var request=++state.classRequest;
 return fetch(freshUrl('/sipandu-api/classes'),freshOptions())
  .then(function(r){return r.ok?r.json():null})
  .then(function(data){
   if(request!==state.classRequest)return;
   if(data&&Array.isArray(data.classes)){
    state.classes=data.classes;
    state.classesReady=true;
    schedule()
   }
  })
  .catch(function(){if(request===state.classRequest)schedule()})
  .then(function(){if(request===state.classRequest)state.classLoading=false})
}
function load(){
 fetch(freshUrl('/sipandu-api/bootstrap'),freshOptions())
  .then(function(r){return r.ok?r.json():null})
  .then(function(data){
   if(data&&data.user){
    state.user=data.user;
    schedule();
    return loadClasses()
   }
  })
  .catch(function(){schedule()})
}
function boot(){
 addStyle();
 var root=document.getElementById('app')||document.body;
 new MutationObserver(schedule).observe(root,{childList:true,subtree:true});
 schedule();
 load();
 [900,2200,5000].forEach(function(delay){
  window.setTimeout(function(){loadClasses()},delay)
 });
 window.addEventListener('focus',function(){loadClasses();schedule()});
 window.addEventListener('pageshow',function(event){
  if(event.persisted){state.classesReady=false;schedule()}
  load()
 });
 window.addEventListener('sipandu:classes-changed',function(){loadClasses()});
 document.addEventListener('visibilitychange',function(){
  if(document.visibilityState==='visible')loadClasses()
 })
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot()
}());
