
/* ===== Mock data (replace with Firestore calls later) ===== */
var CATS=["IDs & Cards","Wallets & Bags","Electronics","Calculators & School Supplies","Clothing","Keys","Others"];
var PLACES=["Library","Canteen","Gym","Chapel","Main Building","Science Building","Parking Area","Other"];
var AUTH=["Guard Post (Main Gate)","Library Desk","Faculty Office","Security Office","Other"];
var EMAIL_DOMAIN="@xu.edu.ph";
var db={
 users:[{email:"admin@xu.edu.ph",name:"Admin",admin:true},{email:"student@xu.edu.ph",name:"Student",admin:false}],
 reports:[
  {id:1,type:"lost",title:"Black wallet",cat:"Wallets & Bags",desc:"Black leather wallet with school ID inside",place:"Canteen",date:"2026-10-27",owner:"student@xu.edu.ph",status:"open",handed:false,auth:"",photo:""},
  {id:2,type:"found",title:"Black wallet found",cat:"Wallets & Bags",desc:"Found black wallet near table, has ID card",place:"Canteen",date:"2026-10-28",owner:"juan@xu.edu.ph",status:"open",handed:true,auth:"Guard Post (Main Gate)",photo:""},
  {id:3,type:"found",title:"Casio calculator",cat:"Calculators & School Supplies",desc:"Scientific calculator with initials on the back",place:"Science Building",date:"2026-10-29",owner:"maria@xu.edu.ph",status:"open",handed:true,auth:"Faculty Office",photo:""},
  {id:4,type:"lost",title:"Blue umbrella",cat:"Others",desc:"Blue foldable umbrella",place:"Library",date:"2026-10-29",owner:"student@xu.edu.ph",status:"pending",handed:false,auth:"",photo:""}
 ],
 claims:[],nid:5,nc:1
};
var S={user:null,view:"login",cat:"All",q:"",tab:"all",reg:false,sel:null,atab:"reports",aq:"",ptype:"lost",handed:"no",photo:""};

/* ===== Helpers ===== */
function $(id){return document.getElementById(id)}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function toast(m){var t=$("toast");t.textContent=m;t.className="on";setTimeout(function(){t.className=""},2000)}
function label(s){return{open:"Open",claim_pending:"Claim Pending",returned:"Returned",pending:"Pending Review",rejected:"Rejected",approved:"Approved"}[s]||s}
function rep(id){return db.reports.filter(function(r){return r.id==id})[0]}
function words(t){return String(t).toLowerCase().split(/[^a-z0-9]+/).filter(function(w){return w.length>2})}
function matches(r){
 var w=words(r.title+" "+r.desc);
 return db.reports.filter(function(o){return o.type!==r.type&&o.cat===r.cat&&(o.status==="open"||o.status==="claim_pending")})
 .map(function(o){var ow=words(o.title+" "+o.desc);return{r:o,n:w.filter(function(x){return ow.indexOf(x)>-1}).length}})
 .filter(function(m){return m.n>0}).sort(function(a,b){return b.n-a.n});
}
function go(v,id){S.view=v;if(id!==undefined)S.sel=id;draw()}
function setNav(t){S.view=t;draw()}

/* ===== Views ===== */
function vLogin(){
 return '<div class="hero"><i></i><h1>CampusFind</h1><p>Lost something on campus? Found something? Post it here.</p></div>'+
 '<main><div class="card">'+
 (S.reg?'<label>Full name</label><input id="nm" autocomplete="name">':'')+
 '<label>School email</label><input id="em" type="email" placeholder="name'+EMAIL_DOMAIN+'" autocomplete="email">'+
 '<label>Password</label><input id="pw" type="password">'+
 '<div class="err" id="er"></div>'+
 '<button class="btn" onclick="doAuth()">'+(S.reg?'Create account':'Log in')+'</button>'+
 '<p class="meta" style="margin-top:12px;text-align:center">'+(S.reg?'Have an account? ':'New here? ')+
 '<a href="#" onclick="S.reg=!S.reg;draw();return false" style="color:var(--navy);font-weight:600">'+(S.reg?'Log in':'Create account')+'</a></p></div>'+
 '<p class="meta" style="text-align:center">Demo: student@xu.edu.ph or admin@xu.edu.ph (any password)</p></main>';
}
function doAuth(){
 var e=$("em").value.trim().toLowerCase(),p=$("pw").value,er=$("er");
 if(e.slice(-EMAIL_DOMAIN.length)!==EMAIL_DOMAIN){er.textContent="Use your school email ending in "+EMAIL_DOMAIN;return}
 if(p.length<6){er.textContent="Password must be at least 6 characters";return}
 var u=db.users.filter(function(x){return x.email===e})[0];
 if(S.reg){if(u){er.textContent="This email is already registered";return}
  u={email:e,name:$("nm").value.trim()||e.split("@")[0],admin:false};db.users.push(u)}
 else if(!u){er.textContent="No account found. Create one first.";return}
 S.user=u;S.view="feed";draw();
}
function card(r){
 return '<div class="card item" onclick="go(\'detail\','+r.id+')"><div class="thumb">'+(r.photo?'<img class="thumb" src="'+r.photo+'" alt="">':'📦')+'</div><div style="min-width:0">'+
 '<h3>'+esc(r.title)+'</h3><span class="tag t-'+r.type+'">'+(r.type==="lost"?"Lost":"Found")+'</span><span class="tag s-'+r.status+'">'+label(r.status)+'</span>'+
 '<div class="meta">'+esc(r.cat)+' • '+esc(r.place)+' • '+esc(r.date)+'</div></div></div>';
}
function vFeed(){
 var list=db.reports.filter(function(r){
  if(r.status==="pending"||r.status==="rejected")return false;
  if(S.tab!=="all"&&r.type!==S.tab)return false;
  if(S.cat!=="All"&&r.cat!==S.cat)return false;
  var q=S.q.toLowerCase();return !q||(r.title+" "+r.desc+" "+r.place).toLowerCase().indexOf(q)>-1;
 }).sort(function(a,b){return b.id-a.id});
 return '<input id="q" placeholder="Search items, e.g. wallet" value="'+esc(S.q)+'" oninput="S.q=this.value;draw(true)" style="margin-top:0">'+
 '<div class="chips">'+["all","lost","found"].map(function(t){return '<button class="'+(S.tab===t?'on':'')+'" onclick="S.tab=\''+t+'\';draw()">'+({all:"All",lost:"Lost",found:"Found"}[t])+'</button>'}).join("")+'</div>'+
 '<div class="chips">'+["All"].concat(CATS).map(function(c){return '<button class="'+(S.cat===c?'on':'')+'" onclick="S.cat=\''+c+'\';draw()">'+c+'</button>'}).join("")+'</div>'+
 (list.length?list.map(card).join(""):'<div class="empty">No reports match. Try another keyword or category, or post one yourself.</div>');
}
function vDetail(){
 var r=rep(S.sel);if(!r)return '<div class="empty">Report not found.</div>';
 var mine=r.owner===S.user.email,h='';
 h+=(r.photo?'<img class="photo" src="'+r.photo+'" alt="">':'')+
 '<div class="card"><h2 style="margin-top:0">'+esc(r.title)+'</h2><span class="tag t-'+r.type+'">'+(r.type==="lost"?"Lost":"Found")+'</span><span class="tag s-'+r.status+'">'+label(r.status)+'</span>'+
 '<p style="margin:10px 0">'+esc(r.desc)+'</p><div class="meta">Category: '+esc(r.cat)+'<br>Location: '+esc(r.place)+'<br>Date: '+esc(r.date)+'<br>Posted by: '+esc(r.owner)+'</div></div>';
 if(r.type==="found")h+='<div class="pick">'+(r.handed?'<b>Handed to:</b> '+esc(r.auth||"a local authority"):'<b>Not yet handed to an authority.</b> The finder is still holding this item.')+'</div>';
 var myc=db.claims.filter(function(c){return c.rid===r.id&&c.by===S.user.email})[0];
 if(myc){h+='<div class="card"><b>Your claim</b> <span class="tag s-'+myc.status+'">'+(myc.status==='pending'?'Awaiting admin':label(myc.status))+'</span><p class="meta" style="margin-top:6px">'+esc(myc.details)+'</p>'+
  (myc.status==="approved"?'<div class="pick">Approved. Pick up at: <b>'+esc(r.auth||"the local authority")+'</b>. Bring your school ID.</div>':'')+'</div>'}
 else if(r.type==="found"&&!mine&&r.status==="open")h+='<button class="btn gold" onclick="go(\'claim\','+r.id+')">This is mine - claim it</button>';
 var m=matches(r);
 h+='<h2>Possible matches</h2>'+(m.length?m.map(function(x){return card(x.r)}).join(""):'<div class="meta">No matches yet. Check back later.</div>');
 return h;
}
function vClaim(){
 var r=rep(S.sel);
 return '<div class="card"><b>'+esc(r.title)+'</b><div class="meta">'+esc(r.cat)+' • '+esc(r.place)+'</div></div>'+
 '<label>Describe details only the owner would know</label><textarea id="cd" rows="5" placeholder="Color, what is inside, marks, stickers, scratches..."></textarea>'+
 '<div class="err" id="er"></div><button class="btn" onclick="sendClaim('+r.id+')">Send claim</button>';
}
function sendClaim(id){
 var d=$("cd").value.trim();if(d.length<10){$("er").textContent="Add more detail (at least 10 characters).";return}
 db.claims.push({id:db.nc++,rid:id,by:S.user.email,details:d,status:"pending"});
 rep(id).status="claim_pending";toast("Claim sent");go("detail",id);
}
function vPost(){
 var f=S.ptype==="found";
 return '<div class="seg"><button class="l '+(!f?'on':'')+'" onclick="S.ptype=\'lost\';draw()">I lost something</button><button class="f '+(f?'on':'')+'" onclick="S.ptype=\'found\';draw()">I found something</button></div>'+
 '<label>Item name</label><input id="ti" placeholder="e.g. Black wallet">'+
 '<label>Category</label><select id="ca">'+CATS.map(function(c){return '<option>'+c+'</option>'}).join("")+'</select>'+
 '<label>Description</label><textarea id="de" rows="3" placeholder="Color, brand, anything distinctive"></textarea>'+
 '<label>Where was it '+(f?'found':'lost')+'?</label><select id="pl">'+PLACES.map(function(c){return '<option>'+c+'</option>'}).join("")+'</select>'+
 '<label>Date</label><input id="dt" type="date" value="'+new Date().toISOString().slice(0,10)+'">'+
 (f?'<label>Was the item handed to a local authority?</label><select id="hd" onchange="S.handed=this.value;draw(true)"><option value="no" '+(S.handed==="no"?'selected':'')+'>No, I still have it</option><option value="yes" '+(S.handed==="yes"?'selected':'')+'>Yes</option></select>'+
  (S.handed==="yes"?'<label>Handed to</label><select id="au">'+AUTH.map(function(c){return '<option>'+c+'</option>'}).join("")+'</select>':''):'')+
 '<label>Photo (optional)</label><input id="ph" type="file" accept="image/*" onchange="pickPhoto(this)">'+
 (S.photo?'<img class="photo" src="'+S.photo+'" alt="Preview">':'')+
 '<div class="err" id="er"></div><button class="btn" onclick="sendReport()">Submit for review</button>'+
 '<p class="meta" style="margin-top:8px">An admin checks every report before it appears in the feed.</p>';
}
function pickPhoto(inp){
 var f=inp.files[0];if(!f)return;var rd=new FileReader();
 rd.onload=function(){var im=new Image();im.onload=function(){
  var w=Math.min(800,im.width),c=document.createElement("canvas");c.width=w;c.height=im.height*(w/im.width);
  c.getContext("2d").drawImage(im,0,0,c.width,c.height);S.photo=c.toDataURL("image/jpeg",.7);keep();draw(true)};im.src=rd.result};
 rd.readAsDataURL(f);
}
var draft={};
function keep(){["ti","ca","de","pl","dt","hd","au"].forEach(function(k){if($(k))draft[k]=$(k).value})}
function sendReport(){
 var t=$("ti").value.trim();if(!t){$("er").textContent="Enter an item name.";return}
 var f=S.ptype==="found",hd=f&&S.handed==="yes";
 db.reports.push({id:db.nid++,type:S.ptype,title:t,cat:$("ca").value,desc:$("de").value.trim(),place:$("pl").value,date:$("dt").value,owner:S.user.email,status:"pending",handed:hd,auth:hd?$("au").value:"",photo:S.photo});
 S.photo="";S.handed="no";toast("Submitted. Waiting for admin review.");setNav("mine");
}
function vMine(){
 var rs=db.reports.filter(function(r){return r.owner===S.user.email}).sort(function(a,b){return b.id-a.id});
 var cs=db.claims.filter(function(c){return c.by===S.user.email});
 return '<h2 style="margin-top:0">My reports</h2>'+(rs.length?rs.map(card).join(""):'<div class="empty">No reports yet. Tap Post to add one.</div>')+
 '<h2>My claims</h2>'+(cs.length?cs.map(function(c){var r=rep(c.rid);return '<div class="card item" onclick="go(\'detail\','+r.id+')"><div><b>'+esc(r.title)+'</b> <span class="tag s-'+c.status+'">'+(c.status==='pending'?'Awaiting admin':label(c.status))+'</span><div class="meta">'+esc(c.details)+'</div></div></div>'}).join(""):'<div class="meta">No claims yet.</div>');
}
function vAdmin(){
 var pr=db.reports.filter(function(r){return r.status==="pending"});
 var pc=db.claims.filter(function(c){return c.status==="pending"});
 var ac=db.claims.filter(function(c){return c.status==="approved"&&rep(c.rid).status==="claim_pending"});
 var rt=db.reports.filter(function(r){return r.status==="returned"});
 var T=S.atab,h='<div class="stats">'+
  [["Reports to review",pr.length,"reports"],["Claims to review",pc.length,"claims"],["Ready for handover",ac.length,"handover"],["Returned",rt.length,"all"]].map(function(x){
   return '<button class="stat" onclick="S.atab=\''+x[2]+'\';draw()"><b>'+x[1]+'</b>'+x[0]+'</button>'}).join("")+'</div>'+
  '<div class="chips">'+[["reports","Reports"],["claims","Claims"],["handover","Handover"],["all","All records"]].map(function(t){
   return '<button class="'+(T===t[0]?'on':'')+'" onclick="S.atab=\''+t[0]+'\';draw()">'+t[1]+'</button>'}).join("")+'</div>';
 if(T==="reports")h+=pr.length?pr.map(function(r){
  return '<div class="card"><h3>'+esc(r.title)+'</h3><span class="tag t-'+r.type+'">'+(r.type==="lost"?"Lost":"Found")+'</span><div class="meta">'+esc(r.cat)+' • '+esc(r.place)+' • '+esc(r.date)+'</div>'+
  (r.photo?'<img class="photo" style="margin-top:8px" src="'+r.photo+'" alt="">':'')+
  '<p style="margin:8px 0">'+esc(r.desc)+'</p><div class="meta">Posted by '+esc(r.owner)+'</div>'+
  (r.type==="found"?'<div class="pick">'+(r.handed?'Handed to: <b>'+esc(r.auth)+'</b>. Check with them that the item is there.':'Not handed to an authority. Confirm with the finder.')+'</div>':'')+
  '<div class="chk">Checked for spam, duplicates and real details</div>'+
  '<button class="btn sm ok" onclick="decide(\'r\','+r.id+',\'open\')">Approve</button><button class="btn sm bad" onclick="decide(\'r\','+r.id+',\'rejected\')">Reject</button></div>'}).join(""):'<div class="empty">No reports waiting for review.</div>';
 if(T==="claims")h+=pc.length?pc.map(function(c){var r=rep(c.rid);
  return '<div class="card"><h3>'+esc(r.title)+'</h3><div class="meta">Item posted by '+esc(r.owner)+'</div><div class="meta" style="margin-top:6px"><b>Item description:</b> '+esc(r.desc)+'</div>'+
  '<div class="pick" style="background:#fff8e6;border-color:#f0d78c"><b>Claimant ('+esc(c.by)+') says:</b><br>'+esc(c.details)+'</div>'+
  '<button class="btn sm ok" onclick="decide(\'c\','+c.id+',\'approved\')">Approve claim</button><button class="btn sm bad" onclick="decide(\'c\','+c.id+',\'rejected\')">Reject claim</button></div>'}).join(""):'<div class="empty">No claims waiting for review.</div>';
 if(T==="handover")h+=ac.length?ac.map(function(c){var r=rep(c.rid);
  return '<div class="card"><h3>'+esc(r.title)+'</h3><div class="meta">Owner: '+esc(c.by)+'<br>Pick up at: '+esc(r.auth||"not set")+'</div><button class="btn sm" onclick="decide(\'m\','+c.id+')">Mark as returned</button></div>'}).join(""):'<div class="empty">No approved claims waiting for pickup.</div>';
 if(T==="all"){
  var q=(S.aq||"").toLowerCase(),all=db.reports.filter(function(r){return !q||(r.title+" "+r.owner+" "+r.status).toLowerCase().indexOf(q)>-1}).sort(function(a,b){return b.id-a.id});
  h+='<input id="aq" placeholder="Search title, email or status" value="'+esc(S.aq||"")+'" oninput="S.aq=this.value;draw(true)">'+(all.length?all.map(card).join(""):'<div class="empty">No records match.</div>');
 }
 return h;
}
function decide(k,id,v){
 if(k==="r"){rep(id).status=v}
 else{var c=db.claims.filter(function(x){return x.id===id})[0],r=rep(c.rid);
  if(k==="c"){c.status=v;if(v==="rejected")r.status="open"}
  else r.status="returned"}
 toast("Updated");draw();
}

/* ===== Shell ===== */
var TITLES={feed:"CampusFind",post:"New report",mine:"My activity",admin:"Admin review",detail:"Item details",claim:"Claim item"};
function draw(keepFocus){
 var a=$("app"),v=S.view,h;
 if(!S.user){a.innerHTML=vLogin();return}
 var sub=v==="detail"||v==="claim",pos=document.activeElement&&document.activeElement.id,st=pos&&document.activeElement.selectionStart;
 var body={feed:vFeed,post:vPost,mine:vMine,admin:vAdmin,detail:vDetail,claim:vClaim}[v]();
 var nav=[["feed","🔎","Browse"],["post","➕","Post"],["mine","👤","Mine"]];
 if(S.user.admin)nav.push(["admin","🛡️","Admin"]);
 a.innerHTML='<header>'+(sub?'<button onclick="go(\''+(v==="claim"?'detail':'feed')+'\')" aria-label="Back">←</button>':'')+'<h1>'+TITLES[v]+'</h1><button onclick="S.user=null;S.view=\'login\';draw()" aria-label="Log out" style="font-size:13px;border:1px solid rgba(255,255,255,.5);border-radius:6px;padding:4px 9px">Log out</button></header>'+
 '<main id="mn">'+body+'</main><nav>'+nav.map(function(n){return '<button class="'+(v===n[0]?'on':'')+'" onclick="setNav(\''+n[0]+'\')"><b>'+n[1]+'</b>'+n[2]+'</button>'}).join("")+'</nav>';
 if(v==="post"){Object.keys(draft).forEach(function(k){if($(k)&&draft[k]!=null)$(k).value=draft[k]})}
 if(keepFocus&&pos&&$(pos)){$(pos).focus();try{$(pos).setSelectionRange(st,st)}catch(e){}}
}
document.addEventListener("change",function(e){if(S.view==="post")keep()});
document.addEventListener("input",function(e){if(S.view==="post")keep()});
document.addEventListener("deviceready",function(){},false);
draw();
