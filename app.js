/* Tend app behavior. Routes use the URL hash so links and browser back work. */
(() => {
  const D = window.TEND_DATA;
  const view = document.getElementById("app-view");
  const sheetRoot = document.getElementById("sheet-root");
  const toastEl = document.getElementById("toast");
  const $ = (s, root=document) => root.querySelector(s);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const state = {
    contacts: D.contacts.map(c => ({...c, notes:[...c.notes], promises:[...c.promises], interests:[...c.interests]})),
    followups: [...D.followups], reminders:[...D.reminders], events:[...D.events],
    guided: true, guidedStep:0, filter:"All", query:"", captured:[], currentFollowup:0, digestSeen:false,
    onboardingStep:0, onboardingDone:true, notificationEnabled:true, timer:0
  };
  const route = () => location.hash.replace(/^#\/?/,"") || "home";
  const initials = n => n.split(" ").map(x=>x[0]).slice(0,2).join("").toUpperCase();
  const contact = id => state.contacts.find(c=>c.id===id);
  const badge = c => `<span class="person-avatar" style="--avatar-bg:${esc(c.color)}20;--avatar-color:${esc(c.color)}">${esc(initials(c.name))}</span>`;
  const person = (c, sub=c.role+" · "+c.company) => `<div class="person-row">${badge(c)}<div class="person-info"><div class="person-name">${esc(c.name)}</div><div class="person-meta">${esc(sub)}</div></div></div>`;
  const button = (text, action, cls="small-button", extra="") => `<button class="${cls}" data-action="${action}" ${extra}>${text}</button>`;
  const head = (title, kicker="") => `<header class="app-header"><div>${kicker?'<p class="eyebrow">'+esc(kicker)+'</p>':''}<h1 class="app-title">${esc(title)}</h1></div><button class="avatar" data-action="profile" aria-label="Jordan’s profile">J</button></header>`;
  const section = (title, action="", label="See all") => `<div class="section-head"><h2>${title}</h2>${action?button(label,action,"text-button"):""}</div>`;
  const routeTo = path => { location.hash = "#/"+path; };
  function setHint(step) {
    const hints=["Tap the big button to capture someone you just met.","Open Alex’s contact card to see the details Tend saved.","Try Fall Career Fair mode and capture a few people.","Review a follow-up and personalize the note.","Open the weekly digest for a few easy reasons to reconnect."];
    const el=$("#hint"), text=$("#hint-text");
    if(el){el.hidden=!state.guided||step>=hints.length;text.textContent=hints[Math.min(step,hints.length-1)];}
  }
  function render() {
    const r=route(), parts=r.split("/");
    const tab=parts[0];
    document.querySelectorAll(".tab").forEach(el=>el.classList.toggle("active",el.dataset.tab===tab));
    if(tab==="home") view.innerHTML=home();
    else if(tab==="contacts") view.innerHTML=contacts();
    else if(tab==="contact") view.innerHTML=contactPage(parts[1]);
    else if(tab==="events") view.innerHTML=events();
    else if(tab==="event-mode") view.innerHTML=eventMode();
    else if(tab==="event-review") view.innerHTML=eventReview();
    else if(tab==="followup") view.innerHTML=followup();
    else if(tab==="digest") view.innerHTML=digest();
    else if(tab==="settings") view.innerHTML=settings();
    else if(tab==="onboarding") view.innerHTML=onboarding();
    else view.innerHTML=home();
    if(tab==="home"&&state.guidedStep===0)setHint(0);
    bindSearch();
  }
  function home() {
    const pending=state.followups.map(contact).filter(Boolean);
    const recent=state.contacts.slice(0,5);
    const reminder=state.reminders[0];
    return `${head("Today","WEDNESDAY, OCTOBER 14")}<section class="hero-card"><h2>Good morning, Jordan.</h2><p>You’ve got this. Your next conversation is one tap away.</p><button class="button primary hero-action" data-action="event-start">Open event</button></section>
      ${section("Follow up", "followups", "View all")}
      ${pending.length?pending.map(c=>{let r=state.reminders.find(x=>x.contact===c.id);return `<article class="card list-card follow-card">${person(c)}${button("Review","review:"+c.id,"small-button coral")}<div class="due-line">${esc(r?r.reason:"Send a quick thank-you")}</div></article>`}).join(""):'<div class="empty-state">All caught up. Nice work.</div>'}
      <div class="digest-banner"><div><strong>One thoughtful note goes a long way</strong><span>3 people are worth reaching out to this week.</span></div>${button("See why","digest","small-button")}</div>
      ${section("Recently met","contacts","All contacts")}${recent.map(c=>`<article class="card list-card" data-open-contact="${c.id}">${person(c,c.met+" · "+c.company)}<button class="text-button" data-action="open:"+c.id aria-label="Open ${esc(c.name)}">›</button></article>`).join("")}
      <div class="card"><div class="person-meta">Next reminder · ${esc(reminder.when)}</div><div class="person-name" style="margin-top:4px">${esc(contact(reminder.contact)?.name)}: ${esc(reminder.reason)}</div></div>`;
  }
  function contacts() {
    let list=state.contacts.filter(c=>c.name.toLowerCase().includes(state.query.toLowerCase())||c.company.toLowerCase().includes(state.query.toLowerCase())||c.role.toLowerCase().includes(state.query.toLowerCase()));
    if(state.filter==="Starred")list=list.filter(c=>c.starred);
    if(state.filter==="By event")list=list.filter(c=>c.event==="Fall Career Fair");
    if(state.filter==="Due")list=list.filter(c=>state.followups.includes(c.id));
    return `${head("Contacts",state.contacts.length+" PEOPLE YOU’VE MET")}<label class="searchbox"><span aria-hidden="true">⌕</span><input id="contact-search" value="${esc(state.query)}" placeholder="Search names or places" aria-label="Search contacts"></label><div class="filters">${["All","Starred","By event","Due"].map(f=>button(f,"filter:"+f,"filter-chip "+(state.filter===f?"active":""))).join("")}</div><div id="contact-list">${list.length?list.map(c=>`<article class="card list-card" data-open-contact="${c.id}">${person(c,c.role+" · "+c.company)}<button class="text-button" data-action="open:"+c.id aria-label="Open ${esc(c.name)}">›</button></article>`).join(""):'<div class="empty-state">No matches. Try another search.</div>'}</div>`;
  }
  function contactPage(id) {
    const c=contact(id); if(!c)return '<div class="empty-state">Contact not found.</div>';
    return `<button class="text-button" data-action="back">‹ Back to contacts</button><div class="contact-header">${badge(c)}<div><div class="person-name">${esc(c.name)} ${c.starred?"★":""}</div><div class="person-meta">${esc(c.role)} at ${esc(c.company)}</div></div></div><div class="filters"><span class="chip">${esc(c.met)}</span><span class="chip">${esc(c.date)}</span></div><div class="summary-box"><strong>✦ Tend summary</strong>${esc(c.summary)}</div><div class="chip-label">INTERESTS</div><div>${c.interests.map(x=>'<span class="chip">'+esc(x)+'</span>').join("")||'<span class="person-meta">No interests yet</span>'}</div><div class="chip-label">PROMISES & NEXT STEPS</div><div>${c.promises.map(x=>'<span class="chip promise">'+esc(x)+'</span>').join("")||'<span class="person-meta">Nothing promised yet</span>'}</div><div class="button-row">${button("Draft message","draft:"+c.id)}${button("Set reminder","remind:"+c.id)}</div><div class="button-row">${button("Add note","note:"+c.id)}${button(c.starred?"Unstar":"Star","star:"+c.id)}</div><div class="section-head"><h2>Notes</h2></div><div class="timeline">${c.notes.slice().reverse().map((n,i)=>'<div class="timeline-item"><div class="timeline-date">'+(i===0?"Today":c.date)+'</div>'+esc(n)+'</div>').join("")}</div><div class="button-row">${button("Introduced by","coming")}${button("Edit contact","edit:"+c.id)}</div>`;
  }
  function events() {
    return `${head("Events","YOUR PEOPLE, BY PLACE")}<section class="event-live"><p>UP NEXT</p><h2>Fall Career Fair</h2><p>October 14 · Westbridge University</p><div class="event-count">8 people in your sample list</div>${button("Start event mode","event-start","button primary")}</section>${section("Past events")}<div class="card event-card"><h3>Fall Career Fair</h3><p>October 14 · Westbridge University</p><div class="event-meta"><span>8 people met</span>${button("Review event","event-review","text-button")}</div></div>${state.events.slice(1).map(e=>`<div class="card event-card"><h3>${esc(e.name)}</h3><p>${esc(e.date)}</p><div class="event-meta"><span>${e.count} ${e.count===1?"person":"people"} met</span><span>✓ Saved</span></div></div>`).join("")}`;
  }
  function eventMode() {
    return `<button class="text-button" data-action="back-events">‹ Events</button><div class="event-live"><p>EVENT MODE</p><h2>Fall Career Fair</h2><p>October 14 · Keep meeting people, Tend will keep up.</p><div class="event-count">${6+state.captured.length} people met</div><button class="big-capture" data-action="event-capture" aria-label="Capture next person">＋</button><div class="capture-label">Tap to capture someone</div><div class="event-controls">${button("End event","event-end","small-button coral")}${button("Quick note","capture","small-button")}</div></div><div class="section-head"><h2>Quick cards</h2></div>${(state.captured.map(id=>contact(id)).filter(Boolean).concat(state.contacts.filter(c=>c.event==="Fall Career Fair").slice(0,3))).map(c=>`<article class="card list-card" data-open-contact="${c.id}">${person(c,c.role+" · "+c.company)}<span class="chip">Saved</span></article>`).join("")}`;
  }
  function eventReview() {
    const list=state.contacts.filter(c=>c.event==="Fall Career Fair");
    return `<button class="text-button" data-action="back-events">‹ Events</button>${head("Event review","FALL CAREER FAIR")}<p class="person-meta">Take a quick look through who you met. You can fix anything before following up.</p>${list.map(c=>`<div class="card list-card">${person(c)}${button("Confirm","confirm:"+c.id,"small-button")}${button("Edit","edit:"+c.id,"text-button")}</div>`).join("")}<button class="button primary full" data-action="draft-all">✦ Draft thank-you notes for everyone</button>`;
  }
  function followup() {
    const ids=state.followups, id=ids[state.currentFollowup];
    if(!id)return `${head("Follow up")}<div class="success-mark">✓</div><p class="empty-state">You’re all caught up.</p>`;
    const c=contact(id), rem=state.reminders.find(x=>x.contact===id);
    return `<button class="text-button" data-action="back">‹ Today</button>${head("Follow up",`NOTE ${state.currentFollowup+1} OF ${ids.length}`)}<article class="card follow-card">${person(c)}<div class="due-line">${esc(rem?.reason||"Send a thank-you while the conversation is fresh.")}</div></article><p class="person-meta">A personal draft, ready for your edits.</p><label class="sr-only" for="draft-text">Follow-up draft</label><textarea class="draft-box" id="draft-text">${esc(rem?.draft||`Hi ${c.name.split(" ")[0]}, it was great meeting you at the Fall Career Fair. I enjoyed hearing about ${c.interests[0]||"your work"} and learning more about ${c.company}. I’d love to stay in touch and hear more about your experience when you have a moment. Thanks again for the conversation!`)}</textarea><div class="button-row">${button("Skip","skip","text-button")}${button("Remind me tomorrow","tomorrow","small-button")}</div><button class="button primary full" data-action="send">Send note</button><div id="handoff"></div>`;
  }
  function digest() {
    return `${head("A little nudge","WEEKLY DIGEST")}<p class="person-meta">Three people worth reaching out to this week, with a reason to say hello.</p>${D.digest.map(d=>{const c=contact(d.contact);return `<article class="card">${person(c)}<div class="summary-box"><strong>Why now</strong>${esc(d.reason)}</div><p class="person-meta">${esc(d.draft)}</p><div class="button-row">${button("Draft note","draft:"+c.id)}${button("Remind me","remind:"+c.id)}</div></article>`}).join("")}${button("Back to today","home","button quiet")}`;
  }
  function settings() {
    return `${head("Settings","MAKE TEND YOURS")}<div class="card"><div class="person-row">${badge({name:"Jordan",color:"#4f46e5"})}<div class="person-info"><div class="person-name">Jordan</div><div class="person-meta">Junior · Class of 2027</div></div>${button("Edit","coming","text-button")}</div></div><div class="settings-group"><h3>Reminders</h3><div class="card"><label class="setting-row"><span>Follow-up reminders<small>A gentle nudge when it’s time to reconnect</small></span><input type="checkbox" checked></label><label class="setting-row"><span>Event prompts<small>Remember to capture someone new</small></span><input type="checkbox" checked></label><label class="setting-row"><span>Weekly digest<small>Three people worth reaching out to</small></span><input type="checkbox" checked></label></div></div><div class="settings-group"><h3>Your privacy</h3><div class="card"><p class="person-meta">In this demo, your contacts are fictional. A future Tend app would delete audio after transcription, never scrape social media, and let you export or delete your data anytime.</p><div class="button-row">${button("Export my data","coming")}${button("Delete account","coming","small-button coral")}</div></div></div><div class="settings-group"><h3>Try a feature</h3><div class="card">${button("Show weekly digest","digest","text-button")}${button("Restart demo","restart","text-button")}${button("Replay intro","onboarding","text-button")}</div></div>`;
  }
  function onboarding() {
    const step=state.onboardingStep;
    const screens=[
      '<div class="onboarding"><a class="brand" href="#/home">🌱 tend</a><h1>Remember everyone you meet.</h1><p>Follow up without the effort. Let’s get your Tend set up.</p><button class="button primary" data-action="onboard-next">Get started</button><button class="skip-link" data-action="skip-intro">Skip intro</button></div>',
      '<div class="onboarding"><h1>Welcome, Jordan.</h1><p>Choose how you’d sign in. This is only a demo, so no account is created.</p><button class="button primary" data-action="onboard-next">Continue with Apple</button><button class="button" data-action="onboard-next">Continue with Google</button><button class="button" data-action="onboard-next">Continue with email</button><button class="skip-link" data-action="skip-intro">Skip intro</button></div>',
      '<div class="onboarding"><h1>Keep your people close.</h1><p>Contacts access would help Tend find the people you already know. For this demo, nothing is read or saved.</p><button class="button primary" data-action="onboard-next">Allow contacts</button><button class="skip-link" data-action="onboard-next">Not now</button></div>',
      '<div class="onboarding"><h1>Who matters most?</h1><p>Star up to five people. You can always change this later.</p>'+state.contacts.slice(0,8).map(c=>'<button class="card list-card" data-action="onboard-star:'+c.id+'">'+person(c)+'<span>'+ (c.starred?"★":"☆")+'</span></button>').join("")+'<button class="button primary full" data-action="skip-intro">Continue</button></div>'
    ];
    return screens[Math.min(step,3)];
  }
  function bindSearch() {
    const input=$("#contact-search"); if(!input)return;
    input.addEventListener("input",e=>{state.query=e.target.value;const pos=e.target.selectionStart;render();const next=$("#contact-search");if(next){next.focus();next.setSelectionRange(pos,pos);}});
  }
  function showToast(message) { toastEl.textContent=message;toastEl.classList.add("show");clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>toastEl.classList.remove("show"),2400); }
  function openSheet(content) { sheetRoot.innerHTML='<div class="sheet-backdrop" data-action="close-sheet"><section class="sheet" role="dialog" aria-modal="true">'+content+'</section></div>'; const sheet=$(".sheet",sheetRoot);sheet?.addEventListener("click",e=>e.stopPropagation()); }
  function closeSheet(){sheetRoot.innerHTML="";clearInterval(state.timer);}
  function captureSheet(){openSheet('<div class="sheet-handle"></div><div class="sheet-top"><h2>Who did you meet?</h2>'+button("×","close-sheet","sheet-close","aria-label=\"Close\"")+'</div><p class="person-meta">Talk for a few seconds. Tend will remember the details.</p><div class="wave-wrap"><div class="wave">'+Array.from({length:19},()=>'<i></i>').join("")+'</div><div class="timer" id="timer">00:00 · tap to stop</div></div><button class="button primary full" data-action="stop-recording">Stop and see what Tend heard</button><div class="capture-options">'+button("▧ Photo","photo","small-button")+'</div><button class="text-button full" data-action="type-contact">Type instead</button><p class="person-meta" style="text-align:center">Demo only. No microphone or camera is used.</p>');state.timer=0;const timer=$("#timer");state.timerId=setInterval(()=>{state.timer++;if(timer)timer.textContent="00:"+String(state.timer).padStart(2,"0")+" · tap to stop";if(state.guided&&state.timer>=4)transcriptSheet();},1000);}
  function transcriptSheet(photo=false){clearInterval(state.timerId);openSheet('<div class="sheet-handle"></div><div class="sheet-top"><h2>'+(photo?"Name tag scanned":"Here’s what Tend heard")+'</h2>'+button("×","close-sheet","sheet-close","aria-label=\"Close\"")+'</div><p class="eyebrow">'+(photo?"SIMULATED PHOTO SCAN":"SAMPLE TRANSCRIPT")+'</p><div class="transcript" id="transcript"></div><h3 style="font-size:13px">✦ Tend filled this in for you</h3><div class="field-list" id="fields"></div><div class="sheet-buttons"><button class="button primary" data-action="save-alex">Save contact</button><button class="button" data-action="edit-alex">Edit</button></div><p class="person-meta">This is scripted sample data. Nothing was recorded.</p>');const tx=$("#transcript");const words="Just met Alex Rivera, product manager at Lumen Labs, we talked about her startup podcast, she said to email her about the spring internship.".split(" ");let i=0;const type=setInterval(()=>{if(!tx||i>=words.length){clearInterval(type);revealFields();return;}tx.textContent+=(i?" ":"")+words[i++];},photo?20:45);}
  function revealFields(){const fields=[["Name","Alex Rivera"],["Company & role","Lumen Labs · Product Manager"],["Where you met","Fall Career Fair"],["Interests","Startup podcasts"],["Promise","Email about spring internship"],["Summary","A product manager who invited Jordan to follow up about a spring internship."]];const host=$("#fields");if(!host)return;fields.forEach((f,i)=>setTimeout(()=>{if($("#fields"))host.insertAdjacentHTML("beforeend",'<div class="field-row"><strong>✦ '+esc(f[0])+'</strong><span>'+esc(f[1])+'</span></div>');},i*130));}
  function typeSheet(){openSheet('<div class="sheet-handle"></div><div class="sheet-top"><h2>Add a contact</h2>'+button("×","close-sheet","sheet-close","aria-label=\"Close\"")+'</div><form class="type-form" id="type-contact-form"><label for="new-name">Name</label><input id="new-name" required placeholder="Name"><label for="new-role">Role and company</label><input id="new-role" placeholder="Role at company"><label for="new-note">What do you want to remember?</label><textarea id="new-note" placeholder="A detail from your conversation"></textarea><button class="button primary full">Save contact</button></form>');}
  function photoSheet(){openSheet('<div class="sheet-handle"></div><div class="sheet-top"><h2>Scan a name tag</h2>'+button("×","close-sheet","sheet-close","aria-label=\"Close\"")+'</div><div class="wave-wrap"><div class="person-avatar" style="width:74px;height:74px;font-size:28px">▧</div><div class="timer">Scanning sample name tag…</div></div><p class="transcript">Camera access is not used. We’ll show a sample scan of Alex Rivera.</p><button class="button primary full" data-action="show-scan">Show sample scan</button>');}
  document.addEventListener("click",e=>{
    const actionEl=e.target.closest("[data-action]");
    const openEl=e.target.closest("[data-open-contact]");
    if(openEl&&!actionEl){routeTo("contact/"+openEl.dataset.openContact);return;}
    if(!actionEl)return;
    const a=actionEl.dataset.action;
    if(a==="capture"){captureSheet();return}
    if(a==="close-sheet"){if(e.target===actionEl||actionEl.classList.contains("sheet-close"))closeSheet();return}
    if(a==="stop-recording"){transcriptSheet();return}
    if(a==="photo"){photoSheet();return}
    if(a==="show-scan"){transcriptSheet(true);return}
    if(a==="type-contact"){typeSheet();return}
    if(a==="save-alex"||a==="edit-alex"){let alex=contact("alex-rivera");if(!alex){alex={id:"alex-rivera",name:"Alex Rivera",role:"Product Manager",company:"Lumen Labs",met:"Fall Career Fair",event:"Fall Career Fair",date:"Oct 14",color:"#be4bdb",interests:["Startup podcasts"],promises:["Email about spring internship"],summary:"Talked about a startup podcast and invited Jordan to email about a spring internship.",notes:["Asked Jordan to follow up about the spring internship."],starred:false};state.contacts.unshift(alex)}closeSheet();state.guidedStep=Math.max(state.guidedStep,1);setHint(state.guidedStep);routeTo("contact/alex-rivera");return}
    if(a==="event-start"){routeTo("event-mode");return}
    if(a==="event-capture"){const pool=["sam-williams","olivia-martin","ethan-brooks","grace-kim"];const id=pool[state.captured.length%pool.length];if(!state.captured.includes(id))state.captured.push(id);showToast(contact(id).name+" added to your event.");render();return}
    if(a==="event-end"){routeTo("event-review");return}
    if(a==="event-review"){routeTo("event-review");return}
    if(a==="draft-all"){showToast("Putting together your sample drafts…");setTimeout(()=>showToast("8 thank-you drafts ready."),850);return}
    if(a==="followups"){state.currentFollowup=0;routeTo("followup");return}
    if(a==="send"){const h=$("#handoff");if(h)h.innerHTML='<div class="card"><strong style="font-size:12px">Opening your email app…</strong><p class="person-meta">This is a simulated handoff. Did you send it?</p>'+button("Yes, mark it done","sent","button primary full")+button("Back to draft","handoff-back","text-button full")+'</div>';return}
    if(a==="sent"){const id=state.followups[state.currentFollowup];state.followups=state.followups.filter(x=>x!==id);state.currentFollowup=Math.min(state.currentFollowup,state.followups.length-1);state.guidedStep=Math.max(state.guidedStep,4);showToast("Follow-up marked done ✓");render();return}
    if(a==="handoff-back"){const h=$("#handoff");if(h)h.innerHTML="";return}
    if(a==="skip"||a==="tomorrow"){const id=state.followups[state.currentFollowup];if(a==="tomorrow"&&id){let c=contact(id);state.reminders.unshift({contact:id,when:"Tomorrow",reason:"You asked for a reminder",draft:""});showToast("We’ll remind you tomorrow about "+c.name+".")}state.currentFollowup++;render();return}
    if(a==="digest"){state.digestSeen=true;state.guidedStep=Math.max(state.guidedStep,4);setHint(4);routeTo("digest");return}
    if(a==="restart"){restart();return}
    if(a==="home"){routeTo("home");return}
    if(a==="back"||a==="back-events"){history.length>1?history.back():routeTo(a==="back-events"?"events":"home");return}
    if(a==="filter:"+a.split(":")[1]){state.filter=a.split(":")[1];render();return}
    if(a.startsWith("open:")){routeTo("contact/"+a.slice(5));state.guidedStep=Math.max(state.guidedStep,2);setHint(state.guidedStep);return}
    if(a.startsWith("review:")){state.currentFollowup=Math.max(0,state.followups.indexOf(a.slice(7)));state.guidedStep=Math.max(state.guidedStep,3);setHint(state.guidedStep);routeTo("followup");return}
    if(a.startsWith("star:")){let c=contact(a.slice(5));c.starred=!c.starred;render();return}
    if(a.startsWith("remind:")){let id=a.slice(7);state.reminders.unshift({contact:id,when:"Tomorrow",reason:"You chose to reconnect tomorrow",draft:""});showToast("Reminder set for tomorrow.");return}
    if(a.startsWith("draft:")){const id=a.slice(6);state.currentFollowup=Math.max(0,state.followups.indexOf(id));if(state.currentFollowup<0)state.currentFollowup=0;routeTo("followup");return}
    if(a.startsWith("note:")){const id=a.slice(5),note=prompt("Add a note to remember:");if(note){contact(id).notes.push(note);render();showToast("Note added.");}return}
    if(a.startsWith("confirm:")){showToast("Contact confirmed.");return}
    if(a.startsWith("edit:")){showToast("Contact editing is coming in the full app.");return}
    if(a==="onboard-next"){state.onboardingStep++;if(state.onboardingStep>3){state.onboardingDone=true;routeTo("home")}else render();return}
    if(a==="skip-intro"){state.onboardingDone=true;routeTo("home");return}
    if(a.startsWith("onboard-star:")){let c=contact(a.slice(13));c.starred=!c.starred;render();return}
    if(a==="coming"||a==="profile"){showToast("Coming in the full app.");return}
  });
  document.addEventListener("submit",e=>{
    if(e.target.id==="type-contact-form"){e.preventDefault();const name=$("#new-name").value.trim();if(!name)return;const rolecompany=$("#new-role").value.trim().split(" at ");const id="added-"+Date.now();state.contacts.unshift({id,name,role:rolecompany[0]||"New contact",company:rolecompany[1]||"Career fair",met:"Just now",event:"Fall Career Fair",date:"Today",color:"#4f46e5",interests:[],promises:[],summary:$("#new-note").value.trim()||"A new connection to remember.",notes:[$("#new-note").value.trim()||"Met today."],starred:false});closeSheet();routeTo("contact/"+id);return;}
    if(e.target.id==="waitlist-form"){e.preventDefault();submitWaitlist(e.target);}
  });
  function submitWaitlist(form) {
    const status=$("#form-status"),email=$("#email").value.trim();
    if($("#website").value)return;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status.textContent="Please enter a valid email address.";status.className="form-status error";$("#email").focus();return;}
    const endpoint=window.TEND_CONFIG?.FORM_ENDPOINT;
    if(!endpoint||endpoint==="PASTE_FORMSPREE_URL_HERE"){console.info("Tend waitlist is not connected. Add a Formspree URL in config.js.");status.textContent="The waitlist form isn’t connected yet. Please check back soon.";status.className="form-status error";return;}
    const buttonEl=form.querySelector('button[type="submit"]');buttonEl.disabled=true;buttonEl.textContent="Sending…";status.textContent="";status.className="form-status";
    const payload={email,school:$("#school").value.trim(),graduation_year:$("#grad-year").value};
    fetch(endpoint,{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify(payload)}).then(res=>{if(!res.ok)throw new Error("Request failed");status.textContent="You’re on the list. We’ll be in touch before the beta.";status.className="form-status";form.reset();}).catch(()=>{status.textContent="Something went wrong. Please try again.";status.className="form-status error";}).finally(()=>{buttonEl.disabled=false;buttonEl.innerHTML='Join the waitlist <span aria-hidden="true">→</span>';});
  }
  function restart(){state.contacts=D.contacts.map(c=>({...c,notes:[...c.notes],promises:[...c.promises],interests:[...c.interests]}));state.followups=[...D.followups];state.reminders=[...D.reminders];state.captured=[];state.currentFollowup=0;state.guidedStep=0;state.filter="All";state.query="";closeSheet();routeTo("home");showToast("Demo restarted.");setHint(0);}
  const toggle=$("#guided-toggle");toggle.addEventListener("change",()=>{state.guided=toggle.checked;setHint(state.guidedStep);});
  const mobileSheet=$("#waitlist-sheet");const desktopForm=$("#waitlist-form").cloneNode(true);const slot=$("#mobile-form-slot");slot.appendChild(desktopForm);desktopForm.id="mobile-waitlist-form";desktopForm.querySelector("#email").id="mobile-email";desktopForm.querySelector('label[for="email"]').htmlFor="mobile-email";desktopForm.querySelector("#school").id="mobile-school";desktopForm.querySelector('label[for="school"]').htmlFor="mobile-school";desktopForm.querySelector("#grad-year").id="mobile-grad-year";desktopForm.querySelector('label[for="grad-year"]').htmlFor="mobile-grad-year";desktopForm.querySelector("#website").id="mobile-website";desktopForm.querySelector('label[for="website"]').htmlFor="mobile-website";desktopForm.querySelector("#form-status").id="mobile-form-status";
  document.addEventListener("click",e=>{const a=e.target.closest("[data-action]")?.dataset.action;if(a==="open-waitlist"){mobileSheet.classList.add("open");mobileSheet.setAttribute("aria-hidden","false");$("#mobile-email").focus()}if(a==="close-waitlist"||e.target===mobileSheet){mobileSheet.classList.remove("open");mobileSheet.setAttribute("aria-hidden","true");}});
  desktopForm.addEventListener("submit",e=>{e.preventDefault();const status=$("#mobile-form-status");const email=$("#mobile-email").value.trim();if($("#mobile-website").value)return;if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){status.textContent="Please enter a valid email address.";status.className="form-status error";return;}const endpoint=window.TEND_CONFIG?.FORM_ENDPOINT;if(!endpoint||endpoint==="PASTE_FORMSPREE_URL_HERE"){status.textContent="The waitlist form isn’t connected yet. Please check back soon.";status.className="form-status error";console.info("Tend waitlist is not connected. Add a Formspree URL in config.js.");return;}const btn=desktopForm.querySelector('button[type="submit"]');btn.disabled=true;status.textContent="Sending…";fetch(endpoint,{method:"POST",headers:{"Accept":"application/json","Content-Type":"application/json"},body:JSON.stringify({email,school:$("#mobile-school").value.trim(),graduation_year:$("#mobile-grad-year").value})}).then(res=>{if(!res.ok)throw Error();status.textContent="You’re on the list. We’ll be in touch before the beta.";desktopForm.reset();}).catch(()=>{status.textContent="Something went wrong. Please try again.";status.className="form-status error";}).finally(()=>{btn.disabled=false;});});
  window.addEventListener("hashchange",render);window.addEventListener("popstate",render);
  render();
  // One simulated notification appears after a short pause. It contains no real push delivery.
  setTimeout(()=>{if(state.notificationEnabled&&!state.digestSeen&&route()==="home"){const root=$("#notification-root");if(root){root.innerHTML='<div class="notification" data-action="review:maria-lopez"><strong>Tend · A little reminder</strong><span>Maria’s application deadline is coming up. Your note is ready.</span></div>';setTimeout(()=>{if(root)root.innerHTML=""},7000);}}},20000);
})();