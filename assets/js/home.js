/* Domotty · home 2026: configuratore, Prova Jana (funzione "jana"), Contattaci (funzione "contact"), newsletter, linguette, cookie. */
(function(){
'use strict';
function $(i){ return document.getElementById(i); }
function esc(t){ return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function eur0(v){ try{ return '€ '+Math.round(v).toLocaleString('it-IT',{useGrouping:'always'}); }catch(e){ return '€ '+Math.round(v); } }

/* stanze come nel Domotty Planner (versione light) */
var TIPI={soggiorno:{n:'Soggiorno',w:6,d:5,l:2,t:2},cucina:{n:'Cucina',w:4,d:4,l:1,t:1},camera:{n:'Camera',w:4.4,d:4,l:1,t:1},cameretta:{n:'Cameretta',w:3.6,d:3.6,l:1,t:1},bagno:{n:'Bagno',w:3,d:2.6,l:1,t:1},studio:{n:'Studio',w:3.6,d:3.2,l:1,t:1}};
var ORD=['soggiorno','cucina','camera','cameretta','bagno','studio'], MAX=8;
var C={n:{soggiorno:1,cucina:1,camera:1,cameretta:1,bagno:1,studio:0},clima:true,allarme:false,cancello:false,citofono:true};
var L={luci:{},tapp:{},clima:{},canc:0,cancT:0}, AMB='sera';
var ROOMS=[];
function build(){
  var old={}; ROOMS.forEach(function(r){ old[r.id]=r; });
  ROOMS=[]; ORD.forEach(function(k){ for(var i=0;i<C.n[k];i++){ var t=TIPI[k], id=k+i; ROOMS.push({id:id,tipo:k,nome:t.n+(C.n[k]>1?' '+(i+1):''),l:t.l,t:t.t,cl:C.clima&&['soggiorno','camera'].indexOf(k)>=0?1:0}); } });
  layout();
}
function layout(){
  var rs=ROOMS.map(function(r){ return {r:r,w:TIPI[r.tipo].w,d:TIPI[r.tipo].d}; });
  var nR=rs.length<=3?1:2, rows=[[],[]], wid=[0,0];
  rs.slice().sort(function(a,b){ return b.w*b.d-a.w*a.d; }).forEach(function(x){ var i=nR===1?0:(wid[0]<=wid[1]?0:1); rows[i].push(x); wid[i]+=x.w; });
  rows=rows.filter(function(r){ return r.length; }); rows.forEach(function(rw){ rw.sort(function(a,b){ return rs.indexOf(a)-rs.indexOf(b); }); });
  var W=Math.max.apply(null,rows.map(function(rw){ return rw.reduce(function(s,x){ return s+x.w; },0); }).concat([1])), y=0;
  rows.forEach(function(rw){ var sw=rw.reduce(function(s,x){ return s+x.w; },0), k=W/sw, d=Math.max.apply(null,rw.map(function(x){ return x.d; })), x0=0; rw.forEach(function(x){ x.r.g={x:x0,y:y,w:x.w*k,d:d}; x0+=x.w*k; }); y+=d; });
}
function ids(r,k){ var a=[], n=k==='l'?r.l:k==='t'?r.t:r.cl; for(var i=0;i<n;i++) a.push(r.id+'-'+k+i); return a; }
function tp(id){ if(!L.tapp[id]) L.tapp[id]={pos:100,target:100}; return L.tapp[id]; }

/* disegno isometrico */
var C30=.866;
function P(x,y,z){ return [(x-y)*C30,(x+y)*.5-(z||0)]; }
function pts(a){ return a.map(function(p){ var q=P(p[0],p[1],p[2]); return q[0].toFixed(3)+','+q[1].toFixed(3); }).join(' '); }
function poly(a,f,e){ return '<polygon points="'+pts(a)+'" fill="'+f+'" '+(e||'')+'/>'; }
function shade(h,f){ var n=parseInt(h.slice(1),16),r=n>>16,g=n>>8&255,b=n&255; function c(v){ return Math.max(0,Math.min(255,Math.round(v*f))); } return 'rgb('+c(r)+','+c(g)+','+c(b)+')'; }
function box(x,y,w,d,h,col,z0){ z0=z0||0; var zt=z0+h; return poly([[x,y,zt],[x+w,y,zt],[x+w,y+d,zt],[x,y+d,zt]],shade(col,1.08))+poly([[x,y+d,z0],[x+w,y+d,z0],[x+w,y+d,zt],[x,y+d,zt]],shade(col,.78))+poly([[x+w,y,z0],[x+w,y+d,z0],[x+w,y+d,zt],[x+w,y,zt]],shade(col,.92)); }
function ell(cx,cy,r){ var a=[]; for(var i=0;i<28;i++){ var t=i/28*Math.PI*2; a.push([cx+r*Math.cos(t),cy+r*Math.sin(t),.01]); } return a; }
var FLOOR={soggiorno:'#C9A57A',cucina:'#D9D4CB',camera:'#B98E63',cameretta:'#C7A27C',bagno:'#CFE0E6',studio:'#B8956D'};
function arredi(R){ var x=R.x,y=R.y,w=R.w,d=R.d,t=R.r.tipo;
  if(t==='soggiorno') return box(x+w*.18,y+d*.62,w*.46,d*.18,.42,'#5C6B82')+box(x+w*.18,y+d*.78,w*.46,d*.06,.75,'#4E5C72')+box(x+w*.3,y+d*.36,w*.22,d*.14,.22,'#8A6A4A')+box(x+w*.25,y+.15,w*.36,.25,.45,'#3A3F48')+box(x+w*.33,y+.2,w*.2,.06,.55,'#111111',.45);
  if(t==='cucina') return box(x+.15,y+.15,w-.3,.6,.9,'#E8E4DC')+box(x+w*.3,y+d*.45,w*.4,d*.28,.75,'#8A6A4A');
  if(t==='camera'||t==='cameretta'){ var bw=t==='camera'?w*.42:w*.3; return box(x+(w-bw)/2,y+.2,bw,d*.5,.45,'#E9ECF2')+box(x+(w-bw)/2,y+.2,bw,.18,.85,'#6E5843')+box(x+(w-bw)/2+.1,y+.4,bw*.4,.35,.55,'#FFFFFF')+box(x+w-.75,y+d*.55,.55,d*.3,1.3,'#9B7B5A'); }
  if(t==='bagno') return box(x+.15,y+.15,w*.55,.8,.5,'#F4F7F9')+box(x+w-.75,y+d*.5,.5,.5,.4,'#F4F7F9');
  if(t==='studio') return box(x+w*.25,y+.2,w*.5,.7,.75,'#8A6A4A')+box(x+w*.4,y+.3,.5,.05,.35,'#222222',.75)+box(x+w*.4,y+1.05,.45,.45,.45,'#3A3F48');
  return ''; }
function ov(a0,a1,b0,b1){ return Math.min(a1,b1)-Math.max(a0,b0); }
function est(R,l,rs){ return !rs.some(function(Q){ if(Q===R) return false;
  if(l==='n') return Math.abs(Q.y+Q.d-R.y)<.06&&ov(R.x,R.x+R.w,Q.x,Q.x+Q.w)>.3; if(l==='s') return Math.abs(Q.y-(R.y+R.d))<.06&&ov(R.x,R.x+R.w,Q.x,Q.x+Q.w)>.3;
  if(l==='o') return Math.abs(Q.x+Q.w-R.x)<.06&&ov(R.y,R.y+R.d,Q.y,Q.y+Q.d)>.3; return Math.abs(Q.x-(R.x+R.w))<.06&&ov(R.y,R.y+R.d,Q.y,Q.y+Q.d)>.3; }); }
function lungo(l,R,f0,f1){ var x=R.x,y=R.y,w=R.w,d=R.d;
  if(l==='n') return function(f,z){ return [x+w*(f0+(f1-f0)*f),y+.02,z]; }; if(l==='s') return function(f,z){ return [x+w*(f0+(f1-f0)*f),y+d-.02,z]; };
  if(l==='o') return function(f,z){ return [x+.02,y+d*(f0+(f1-f0)*f),z]; }; return function(f,z){ return [x+w-.02,y+d*(f0+(f1-f0)*f),z]; }; }
function fin(id,l,R,f0,f1,notte){ var z0=.55,z1=2.05,q=lungo(l,R,f0,f1),st=tp(id),c=1-st.pos/100,s='<g class="hit" data-act="tapp" data-id="'+id+'"><title>'+esc(R.r.nome)+' · tapparella</title>';
  s+=poly([q(0,z0),q(1,z0),q(1,z1),q(0,z1)],notte?'#2B4A75':'#BFE3FF','stroke="#E7ECF3" stroke-width=".07"');
  if(c>.005){ var zc=z1-(z1-z0)*c; s+=poly([q(0,zc),q(1,zc),q(1,z1),q(0,z1)],'#7D8796'); for(var zz=z1-.12;zz>zc+.02;zz-=.12){ var a=P.apply(null,q(0,zz)),b=P.apply(null,q(1,zz)); s+='<line x1="'+a[0].toFixed(2)+'" y1="'+a[1].toFixed(2)+'" x2="'+b[0].toFixed(2)+'" y2="'+b[1].toFixed(2)+'" stroke="#646E7D" stroke-width=".018"/>'; } }
  return s+poly([q(0,z1),q(1,z1),q(1,z1+.18),q(0,z1+.18)],'#D6DCE4')+'</g>'; }
function svgCasa(rooms,interattiva){
  var notte=AMB==='sera', G={W:0,D:0}, s='', lights='', devs='';
  var Rs=rooms.map(function(r){ return {r:r,x:r.g.x,y:r.g.y,w:r.g.w,d:r.g.d}; });
  Rs.forEach(function(R){ G.W=Math.max(G.W,R.x+R.w); G.D=Math.max(G.D,R.y+R.d); });
  var GD=3;
  s+=poly([[-.6,-.6,-.02],[G.W+.6,-.6,-.02],[G.W+.6,G.D+GD,-.02],[-.6,G.D+GD,-.02]],notte?'#1D3B2A':'#5E9B5B');
  s+=poly([[G.W*.45,G.D,-.01],[G.W*.45+1.4,G.D,-.01],[G.W*.45+1.4,G.D+GD,-.01],[G.W*.45,G.D+GD,-.01]],notte?'#454A52':'#B7B1A6');
  Rs.slice().sort(function(a,b){ return (a.x+a.w/2+a.y+a.d/2)-(b.x+b.w/2+b.y+b.d/2); }).forEach(function(R){
    var r=R.r,x=R.x,y=R.y,w=R.w,d=R.d,col=FLOOR[r.tipo], on=ids(r,'l').some(function(i){ return L.luci[i]; });
    var hn=est(R,'n',Rs)?2.5:.85, ho=est(R,'o',Rs)?2.5:.85, wc=notte?'#2A3D5C':'#EEF1F5';
    s+=poly([[x,y,0],[x+w,y,0],[x+w,y+d,0],[x,y+d,0]],notte?shade(col,on?.78:.38):col,'stroke="rgba(0,0,0,.18)" stroke-width=".03"');
    s+=poly([[x,y,0],[x+w,y,0],[x+w,y,hn],[x,y,hn]],notte?shade('#3B5378',on?1:.8):'#E3E8EF')+poly([[x,y,0],[x,y+d,0],[x,y+d,ho],[x,y,ho]],notte?shade('#324868',on?1:.8):'#D3DAE4');
    s+=poly([[x,y,hn],[x+w,y,hn],[x+w,y+.14,hn],[x,y+.14,hn]],wc)+poly([[x,y,ho],[x+.14,y,ho],[x+.14,y+d,ho],[x,y+d,ho]],wc);
    var lt=['n','s','o','e'].filter(function(l){ return est(R,l,Rs); }); if(lt.indexOf('n')>=0&&lt.indexOf('s')>=0) lt.splice(lt.indexOf('s'),1); if(!lt.length) lt=['n'];
    var tt=ids(r,'t'); R.front=[];
    tt.forEach(function(id,i){ var l=lt[i%lt.length], n=Math.ceil((tt.length-lt.indexOf(l))/lt.length), k=Math.floor(i/lt.length), f0=(k+.5)/n-.17, f1=(k+.5)/n+.17; if(l==='s'||l==='e') R.front.push([id,l,f0,f1]); else s+=fin(id,l,R,f0,f1,notte); });
    ids(r,'c').forEach(function(id){ var cx=x+w*.72, z=hn>1?2.15:1.6, c=L.clima[id]; s+='<g class="hit" data-act="clima" data-id="'+id+'"><title>'+esc(r.nome)+' · clima</title>'+box(cx-.5,y+.05,1,.22,.3,'#F4F6F8',z-.3);
      if(c){ for(var j=0;j<3;j++){ var a=P(cx-.3+j*.3,y+.35,z-.4),b=P(cx-.3+j*.3,y+1.4,z-1); s+='<line x1="'+a[0].toFixed(2)+'" y1="'+a[1].toFixed(2)+'" x2="'+b[0].toFixed(2)+'" y2="'+b[1].toFixed(2)+'" stroke="#6EC8FF" stroke-width=".06" stroke-linecap="round" stroke-dasharray=".18 .2"><animate attributeName="stroke-dashoffset" from="0" to="-.76" dur="1s" repeatCount="indefinite"/></line>'; } } s+='</g>'; });
    s+=arredi(R);
    var nl=ids(r,'l'); nl.forEach(function(id,i){ var lx=x+w*((i+1)/(nl.length+1)), ly=y+d*.5, o=!!L.luci[id];
      if(o) lights+='<polygon points="'+pts(ell(lx,ly,Math.min(w,d)*.62))+'" fill="url(#glow)" style="mix-blend-mode:screen" pointer-events="none"/>';
      var t1=P(lx,ly,2.45), b1=P(lx,ly,1.95); devs+='<g class="hit" data-act="luce" data-id="'+id+'"><title>'+esc(r.nome)+' · luce</title><line x1="'+t1[0].toFixed(2)+'" y1="'+t1[1].toFixed(2)+'" x2="'+b1[0].toFixed(2)+'" y2="'+b1[1].toFixed(2)+'" stroke="#8094B3" stroke-width=".03"/><circle cx="'+b1[0].toFixed(2)+'" cy="'+(b1[1]+.08).toFixed(2)+'" r="'+(o?.26:.18)+'" fill="'+(o?'#FFE2A1':'#9AA6B6')+'"/><circle cx="'+b1[0].toFixed(2)+'" cy="'+(b1[1]+.08).toFixed(2)+'" r=".5" fill="transparent"/></g>'; });
    var lab=P(x+.3,y+d*.5,0); s+='<text transform="matrix(.866,.5,-.866,.5,'+lab[0].toFixed(2)+','+lab[1].toFixed(2)+')" font-family="Poppins,sans-serif" font-size=".34" font-weight="600" fill="'+(notte?'rgba(255,255,255,.75)':'rgba(15,31,61,.72)')+'">'+esc(r.nome)+'</text>';
  });
  s+=lights+devs;
  Rs.forEach(function(R){ var wc=notte?'#3B5378':'#E9EDF2'; if(est(R,'s',Rs)) s+=box(R.x,R.y+R.d-.12,R.w,.12,.32,wc); if(est(R,'e',Rs)) s+=box(R.x+R.w-.12,R.y,.12,R.d,.32,wc); (R.front||[]).forEach(function(f){ s+=fin(f[0],f[1],R,f[2],f[3],notte); }); });
  if(C.cancello||C.citofono){ var cy=G.D+GD, cx0=G.W*.45-.2, cw=1.8, mc=notte?'#55606E':'#D8D2C6'; s+=box(-.6,cy-.08,cx0+.6,.16,.9,mc)+box(cx0+cw,cy-.08,G.W+.6-cx0-cw,.16,.9,mc);
    if(C.cancello){ var off=L.canc*cw*.95, g='<g class="hit" data-act="canc"><title>Cancello</title>'; for(var b=0;b<=10;b++) g+=box(cx0+off+b*cw/10,cy-.04,.05,.08,1.25,'#2E3440'); s+=g+box(cx0+off,cy-.05,cw,.1,.08,'#2E3440',1.15)+'</g>'; }
    if(C.citofono) s+=box(cx0-.45,cy+.1,.3,.12,1.3,'#3A4250'); }
  if(C.allarme){ var a=P(G.W-.1,G.D-.1,2.3); s+='<circle cx="'+a[0].toFixed(2)+'" cy="'+a[1].toFixed(2)+'" r=".18" fill="'+(L.all?'#FF5A5F':'#F4F6F8')+'"/>'; }
  var cs=[P(-.6,-.6,2.9),P(G.W+.6,-.6,0),P(-.6,G.D+GD,0),P(G.W+.6,G.D+GD,0),P(G.W+.6,-.6,2.9)], xs=cs.map(function(p){ return p[0]; }), ys=cs.map(function(p){ return p[1]; });
  var vx=Math.min.apply(null,xs)-.4, vy=Math.min.apply(null,ys)-.4, vw=Math.max.apply(null,xs)-vx+.4, vh=Math.max.apply(null,ys)-vy+.6;
  return '<svg viewBox="'+vx.toFixed(2)+' '+vy.toFixed(2)+' '+vw.toFixed(2)+' '+vh.toFixed(2)+'" role="img" aria-label="Casa isometrica"><defs><radialGradient id="glow"><stop offset="0" stop-color="#FFD58A" stop-opacity=".95"/><stop offset=".45" stop-color="#FFB347" stop-opacity=".45"/><stop offset="1" stop-color="#FF9A2A" stop-opacity="0"/></radialGradient></defs>'+s+'</svg>';
}

/* prezzo indicativo (stessi valori del Planner) */
function stima(){
  var luci=0,tapp=0,cl=0; ROOMS.forEach(function(r){ luci+=r.l; tapp+=r.t; cl+=r.cl; });
  var imp=1999, incl=10, exT=Math.max(0,tapp-incl), exL=Math.max(0,luci-Math.max(0,incl-tapp));
  imp+=exL*31.55+exT*39.25+cl*80+(C.cancello?90:0);
  if(C.allarme){ var sens=ROOMS.length; imp+=364.08+54.97+28.05+sens*34.22+200+20*(2+sens); }
  return {imp:imp,luci:luci,tapp:tapp,cl:cl,lo:Math.floor(imp*.95/50)*50,hi:Math.ceil(imp*1.1/50)*50};
}

/* interfaccia */
function renderCfg(){
  var tot=ROOMS.length;
  $('stanze').innerHTML=ORD.map(function(k){ var v=C.n[k]; return '<div class="stp"><span>'+TIPI[k].n+'</span><span class="c"><button type="button" aria-label="Togli '+TIPI[k].n+'" data-n="'+k+'" data-v="-1"'+(v<=0||(tot<=1)?' disabled':'')+'>–</button><b>'+v+'</b><button type="button" aria-label="Aggiungi '+TIPI[k].n+'" data-n="'+k+'" data-v="1"'+(tot>=MAX?' disabled':'')+'>+</button></span></div>'; }).join('');
  function sw(k,n,d){ return '<label class="tog" for="x-'+k+'"><span>'+n+'<small>'+d+'</small></span><input type="checkbox" class="sw" id="x-'+k+'" data-x="'+k+'"'+(C[k]?' checked':'')+'></label>'; }
  $('extra').innerHTML=sw('clima','Clima','In soggiorno e nelle camere')+sw('allarme','Allarme','Centrale, sirena e sensori')+sw('cancello','Cancello','Si apre dall’app')+sw('citofono','Videocitofono','La chiamata arriva sul pannello');
  var s=stima();
  $('riep').textContent=tot+' stanze · '+s.luci+' luci · '+s.tapp+' tapparelle'+(s.cl?' · '+s.cl+' climatizzatori':'')+(C.allarme?' · allarme':'');
  $('stima').innerHTML=s.lo<=1999?'da '+eur0(1999)+' <small>+ IVA</small>':eur0(s.lo)+' – '+eur0(s.hi)+' <small>+ IVA</small>';
  var li=[tot+' stanze, '+s.luci+' luci e '+s.tapp+' tapparelle']; if(s.cl) li.push(s.cl+' climatizzatori comandati'); if(C.allarme) li.push('allarme con sensori'); if(C.cancello) li.push('cancello automatico'); if(C.citofono) li.push('videocitofono: prezzo dopo il sopralluogo');
  $('stimaLista').innerHTML=li.map(function(x){ return '<li>'+esc(x)+'</li>'; }).join('');
  $('bWa').href='https://wa.me/393202812627?text='+encodeURIComponent('Ciao Domotty! Ho provato la casa sul sito: '+li.join(', ')+'. Vorrei prenotare un sopralluogo.');
}
function renderHouse(){ $('house').innerHTML=svgCasa(ROOMS,true); }
function renderTab(){
  var n=new Date(), h=n.getHours(), m=n.getMinutes();
  $('ora').textContent=(h<10?'0':'')+h+':'+(m<10?'0':'')+m; $('ora2').textContent=$('ora').textContent;
  $('giorno').textContent=n.toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long'});
  var t=''; ROOMS.forEach(function(r){ ids(r,'l').forEach(function(id,i,a){ var o=!!L.luci[id]; t+='<button type="button" class="'+(o?'on':'')+'" data-act="luce" data-id="'+id+'"><span>'+esc(r.nome)+(a.length>1?' · luce '+(i+1):' · luce')+'</span><small>'+(o?'accesa':'spenta')+'</small></button>'; });
    ids(r,'t').forEach(function(id,i,a){ var st=tp(id); t+='<button type="button" class="'+(st.pos>50?'on':'')+'" data-act="tapp" data-id="'+id+'"><span>'+esc(r.nome)+(a.length>1?' · tapparella '+(i+1):' · tapparella')+'</span><small data-tps="'+id+'">'+stT(st)+'</small></button>'; }); });
  $('tl').innerHTML=t;
}
function stT(st){ return st.pos!==st.target?(st.target>st.pos?'sale…':'scende…'):st.pos>99?'aperta':st.pos<1?'chiusa':Math.round(st.pos)+'%'; }
var raf=null,last=0;
function moving(){ for(var k in L.tapp){ if(L.tapp[k].pos!==L.tapp[k].target) return true; } return L.canc!==L.cancT; }
function anima(ts){ var dt=last?Math.min(100,ts-last)/1000:0; last=ts;
  for(var k in L.tapp){ var t=L.tapp[k]; if(t.pos<t.target) t.pos=Math.min(t.target,t.pos+24*dt); else if(t.pos>t.target) t.pos=Math.max(t.target,t.pos-24*dt); }
  if(L.canc<L.cancT) L.canc=Math.min(L.cancT,L.canc+.18*dt); else if(L.canc>L.cancT) L.canc=Math.max(L.cancT,L.canc-.18*dt);
  renderHouse(); document.querySelectorAll('[data-tps]').forEach(function(e){ e.textContent=stT(tp(e.getAttribute('data-tps'))); });
  if(moving()) raf=requestAnimationFrame(anima); else { raf=null; last=0; renderTab(); } }
function avvia(){ if(!raf){ last=0; raf=requestAnimationFrame(anima); } }
function all(k){ var a=[]; ROOMS.forEach(function(r){ a=a.concat(ids(r,k)); }); return a; }
var toastT; function toast(t){ var e=$('toast'); e.textContent=t; e.hidden=false; clearTimeout(toastT); toastT=setTimeout(function(){ e.hidden=true; },2600); }
function scenario(n){
  if(n==='giorno'){ AMB='giorno'; all('t').forEach(function(i){ tp(i).target=100; }); all('l').forEach(function(i){ L.luci[i]=false; }); toast('Buongiorno: tapparelle su, luci spente'); }
  if(n==='sera'){ AMB='sera'; all('t').forEach(function(i){ tp(i).target=0; }); ROOMS.forEach(function(r){ if(r.tipo==='soggiorno'||r.tipo==='cucina') ids(r,'l').forEach(function(i){ L.luci[i]=true; }); }); toast('Sera: tapparelle giù, luci della zona giorno accese'); }
  if(n==='esco'){ all('l').forEach(function(i){ L.luci[i]=false; }); all('t').forEach(function(i){ tp(i).target=0; }); all('c').forEach(function(i){ L.clima[i]=false; }); L.cancT=0; if(C.allarme) L.all=true; toast('Esco: tutto spento'+(C.allarme?', allarme inserito':'')); }
  if(n==='rientro'){ L.all=false; if(C.cancello) L.cancT=1; ROOMS.forEach(function(r){ if(r.tipo==='soggiorno') ids(r,'l').forEach(function(i){ L.luci[i]=true; }); }); var c=all('c')[0]; if(c) L.clima[c]=true; toast('Bentornato: luci accese'+(c?', clima acceso':'')); }
  $('bAmb').textContent=AMB==='sera'?'Mostra di giorno':'Mostra di sera';
  avvia(); renderHouse(); renderTab();
}
function azione(a,id){
  if(a==='luce') L.luci[id]=!L.luci[id];
  else if(a==='tapp'){ var t=tp(id); t.target=t.pos!==t.target?t.pos:(t.pos>50?0:100); avvia(); }
  else if(a==='clima') L.clima[id]=!L.clima[id];
  else if(a==='canc'){ L.cancT=L.canc>.5?0:1; avvia(); }
  renderHouse(); renderTab();
}
var demoT=null, demoI=0, DEMO=['giorno','sera','esco','rientro'];
function demo(on){ clearInterval(demoT); demoT=null; if(on){ demoI=0; scenario(DEMO[demoI++]); demoT=setInterval(function(){ scenario(DEMO[demoI++%DEMO.length]); },4200); } $('bDemo').textContent=demoT?'Ferma':'Fammi vedere'; }
document.addEventListener('click',function(e){
  var t=e.target, x;
  if((x=t.closest('#prova [data-act]'))){ if(demoT) demo(false); azione(x.getAttribute('data-act'),x.getAttribute('data-id')); return; }
  if((x=t.closest('[data-sc]'))){ if(demoT) demo(false); scenario(x.getAttribute('data-sc')); return; }
  if((x=t.closest('[data-n]'))){ var k=x.getAttribute('data-n'); C.n[k]=Math.max(0,C.n[k]+(+x.getAttribute('data-v'))); build(); renderCfg(); renderHouse(); renderTab(); return; }
});
document.addEventListener('change',function(e){ var t=e.target; if(t.hasAttribute('data-x')){ C[t.getAttribute('data-x')]=t.checked; build(); renderCfg(); renderHouse(); renderTab(); } });
$('bAmb').addEventListener('click',function(){ AMB=AMB==='sera'?'giorno':'sera'; $('bAmb').textContent=AMB==='sera'?'Mostra di giorno':'Mostra di sera'; renderHouse(); });
$('bDemo').addEventListener('click',function(){ demo(!demoT); });
document.addEventListener('click',function(e){ var b=e.target.closest('[data-dev]'); if(!b) return; var d=b.getAttribute('data-dev'); $('device').className='device '+d; document.querySelector('.cfg').classList.toggle('tablet',d==='tablet'); document.querySelectorAll('[data-dev]').forEach(function(x){ x.setAttribute('aria-pressed',x===b?'true':'false'); }); });
/* sfondo e barra di avanzamento come sul sito attuale */
(function(){ var root=document.body, red=window.matchMedia('(prefers-reduced-motion: reduce)').matches, q=0;
  function up(){ q=0; var H=innerHeight||800, r=root.getBoundingClientRect(); root.style.setProperty('--g',(red?0:Math.max(0,Math.min(1,-r.top/Math.max(1,r.height-H)))).toFixed(4)); }
  addEventListener('scroll',function(){ if(!q) q=requestAnimationFrame(up); },{passive:true}); up(); })();
/* linguette Novità */
(function(){ var tabs=$('tabs'); if(!tabs) return; setTimeout(function(){ tabs.classList.add('in'); },900);
  var hover=matchMedia('(hover: hover) and (pointer: fine)').matches, all=[].slice.call(tabs.querySelectorAll('.tab'));
  function set(t,o){ t.classList.toggle('open',o); var b=t.querySelector('.tab-h'); if(b) b.setAttribute('aria-expanded',o?'true':'false'); }
  all.forEach(function(t){ var tm=0; if(hover){ t.addEventListener('mouseenter',function(){ clearTimeout(tm); all.forEach(function(o){ if(o!==t) set(o,false); }); set(t,true); }); t.addEventListener('mouseleave',function(){ tm=setTimeout(function(){ set(t,false); },260); }); }
    t.querySelector('.tab-h').addEventListener('click',function(){ var o=!t.classList.contains('open'); all.forEach(function(x){ set(x,false); }); set(t,o); }); });
  document.addEventListener('click',function(e){ if(!e.target.closest('#tabs')) all.forEach(function(o){ set(o,false); }); }); })();

/* hero: piccola casa che cambia scenario da sola */
var HERO=[{id:'h1',tipo:'soggiorno',nome:'Soggiorno',l:2,t:2,cl:1,g:{x:0,y:0,w:6,d:5}},{id:'h2',tipo:'cucina',nome:'Cucina',l:1,t:1,cl:0,g:{x:6,y:0,w:4,d:5}},{id:'h3',tipo:'camera',nome:'Camera',l:1,t:1,cl:1,g:{x:0,y:5,w:5,d:4}},{id:'h4',tipo:'bagno',nome:'Bagno',l:1,t:1,cl:0,g:{x:5,y:5,w:5,d:4}}];
var HAMB='sera', heroI=0, HS=[['Scenario «Sera»: luci accese, tapparelle giù',function(){ HAMB='sera'; ['h1-l0','h1-l1','h2-l0'].forEach(function(i){ L.luci[i]=true; }); ['h1-t0','h1-t1','h2-t0','h3-t0','h4-t0'].forEach(function(i){ tp(i).target=0; }); }],
  ['Scenario «Buongiorno»: tapparelle su',function(){ HAMB='giorno'; for(var k in L.luci) if(k[0]==='h') L.luci[k]=false; ['h1-t0','h1-t1','h2-t0','h3-t0','h4-t0'].forEach(function(i){ tp(i).target=100; }); }],
  ['Clima acceso in camera a 22 °C',function(){ L.clima['h3-c0']=true; }]];
function heroStep(){ var s=HS[heroI++%HS.length]; s[1](); $('heroTag').textContent=s[0]; heroAnim(); }
var hraf=null,hl=0; function heroAnim(){ if(hraf) return; hl=0; hraf=requestAnimationFrame(function f(ts){ var dt=hl?Math.min(100,ts-hl)/1000:0; hl=ts; var mv=false; ['h1-t0','h1-t1','h2-t0','h3-t0','h4-t0'].forEach(function(i){ var t=tp(i); if(t.pos<t.target){ t.pos=Math.min(t.target,t.pos+30*dt); mv=true; } else if(t.pos>t.target){ t.pos=Math.max(t.target,t.pos-30*dt); mv=true; } }); drawHero(); hraf=mv?requestAnimationFrame(f):null; }); }
function drawHero(){ var saved=AMB; AMB=HAMB; var c={cancello:C.cancello,citofono:C.citofono,allarme:C.allarme}; C.cancello=false; C.citofono=false; C.allarme=false; $('heroArt').querySelector('svg')&&$('heroArt').querySelector('svg').remove(); $('heroArt').insertAdjacentHTML('afterbegin',svgCasa(HERO,false)); C.cancello=c.cancello; C.citofono=c.citofono; C.allarme=c.allarme; AMB=saved; }

/* avvio */
build(); scenario('sera'); $('toast').hidden=true; renderCfg(); renderHouse(); renderTab();
HS[0][1](); HERO.forEach(function(r){ ids(r,'t').forEach(function(i){ tp(i).pos=0; }); }); drawHero(); heroI=1;
if(!window.matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(heroStep,5000);
setInterval(renderTab,30000);

/* avviso cookie come sul sito attuale (solo cookie tecnici) */
(function(){ var c=document.getElementById('cookie'); if(!c) return; var seen=0; try{ seen=+localStorage.getItem('domotty-consent')||0; }catch(e){}
  if(!(seen>0&&Date.now()-seen<1000*60*60*24*182)) setTimeout(function(){ c.hidden=false; },1000);
  var ok=document.getElementById('cookie-ok'); if(ok) ok.addEventListener('click',function(){ try{ localStorage.setItem('domotty-consent',String(Date.now())); }catch(e){} c.hidden=true; }); })();

/* ---------- Contattaci: stesso modulo del sito attuale (funzione Supabase "contact") + tipo «Consulenza online» ---------- */
(function(){
  var cfg=window.DOMOTTY_CONFIG||{}, ONLINE=true;
  var fnUrl=function(n){ return String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/'+n; };
  function post(name,payload){ if(!cfg.supabaseUrl) return Promise.reject(new Error('config'));
    return fetch(fnUrl(name),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok||!j.ok){ var er=new Error(j.error||'server'); er.code=j.error; throw er; } return j; }); }); }
  var emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  var modal=$('modal'), form=$('contact-form'), sent=$('sent'), errBox=$('form-err'), typeBtns=[].slice.call(document.querySelectorAll('.tp[data-type]')), current='Informazioni generali', lastFocus=null;
  var ta=form.querySelector('textarea[name="messaggio"]');
  function setType(t){ current=t; typeBtns.forEach(function(b){ b.setAttribute('aria-checked',b.getAttribute('data-type')===t?'true':'false'); }); [].forEach.call(modal.querySelectorAll('.js-type'),function(s){ s.textContent=t; });
    ta.placeholder=t==='Consulenza online'?'Quando preferisci la videochiamata (giorni e orari) e cosa vorresti vedere':''; }
  function openModal(t){ lastFocus=document.activeElement; setType(t||'Informazioni generali'); form.hidden=false; sent.hidden=true; errBox.textContent=''; modal.hidden=false; document.body.classList.add('no-scroll'); setTimeout(function(){ var f=form.querySelector('input[name="nome"]'); if(f) f.focus(); },50); }
  function closeModal(){ modal.hidden=true; document.body.classList.remove('no-scroll'); if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('click',function(e){ var o=e.target.closest&&e.target.closest('[data-open]'); if(o){ e.preventDefault(); openModal(o.getAttribute('data-open')); return; } if(e.target.closest&&e.target.closest('[data-close]')&&e.target.closest('#modal')) closeModal(); });
  document.addEventListener('keydown',function(e){ if(e.key==='Escape'&&!modal.hidden) closeModal(); });
  typeBtns.forEach(function(b){ b.addEventListener('click',function(){ setType(b.getAttribute('data-type')); }); });
  form.addEventListener('submit',function(e){ e.preventDefault();
    var d=new FormData(form), nome=String(d.get('nome')||'').trim(), email=String(d.get('email')||'').trim(); errBox.textContent='';
    if(!nome){ errBox.textContent='Scrivi il tuo nome e cognome.'; form.nome.focus(); return; }
    if(!emailRe.test(email)){ errBox.textContent='Controlla l’indirizzo email.'; form.email.focus(); return; }
    if(!form.privacy.checked){ errBox.textContent='Per inviare la richiesta conferma di aver letto l’informativa privacy.'; return; }
    var btn=form.querySelector('button[type="submit"]'), label=btn.querySelector('.js-send'); btn.disabled=true; label.textContent='Invio in corso';
    var cons=current==='Consulenza online', msg=String(d.get('messaggio')||'').trim();
    /* La funzione "contact" su Supabase non si tocca: la consulenza online viaggia come «Domotica casa o ufficio» con la richiesta scritta in cima al messaggio. */
    post('contact',{tipo:cons?'Domotica casa o ufficio':current,nome:nome,email:email,azienda:String(d.get('azienda')||'').trim(),telefono:String(d.get('telefono')||'').trim(),messaggio:cons?'RICHIESTA: CONSULENZA ONLINE (videochiamata)\n\n'+msg:msg,privacy:true,website:String(d.get('website')||'')})
      .then(function(){ form.reset(); form.hidden=true; sent.hidden=false;
        var wa=document.getElementById('sent-wa'); if(wa) wa.hidden=!cons;
        if(cons&&wa) wa.href='https://wa.me/393202812627?text='+encodeURIComponent('Ciao Domotty! Sono '+nome+', vi ho appena chiesto una consulenza online dal sito: fissiamo giorno e ora?');
        var c=sent.querySelector('button'); if(c) c.focus(); })
      .catch(function(){ errBox.textContent='Non siamo riusciti a inviare la richiesta. Riprova tra poco oppure scrivi a assistenza@domotty.it.'; })
      .then(function(){ btn.disabled=false; label.textContent='Invia richiesta'; }); });
})();

/* ---------- Prova Jana: stessa logica del sito (funzione Supabase "jana", 20 messaggi per prova) ---------- */
(function(){
  var cfg=window.DOMOTTY_CONFIG||{}, fnUrl=function(n){ return String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/'+n; };
  var ONLINE=true;
  var dlg=$('jdemo'); if(!dlg) return;
  var ROOMS=['soggiorno','cucina','camera','bagno','studio','tecnico','giardino'], SH=['soggiorno','cucina','camera','bagno','studio'];
  var NAME={soggiorno:'Soggiorno',cucina:'Cucina',camera:'Camera',bagno:'Bagno',studio:'Studio',tecnico:'Locale tecnico',giardino:'Giardino'};
  var APP={lavatrice:'Lavatrice',lavastoviglie:'Lavastoviglie',forno:'Forno'};
  var WX=[{c:'sereno',t:21,p:5,sun:1,cl:0,r:0},{c:'poco nuvoloso',t:19,p:15,sun:.8,cl:.45,r:0},{c:'nuvoloso',t:17,p:40,sun:.35,cl:1,r:0},{c:'pioggia leggera',t:15,p:85,sun:.15,cl:1,r:1}];
  var SUG=['Accendi le luci in soggiorno','Abbassa tutte le tapparelle','Che tempo fa?','Quanto produce il fotovoltaico?','Modalità cinema','Ho freddo','Cos’è Maistu?','Buonanotte'];
  var now=new Date(), doy=Math.floor((now-new Date(now.getFullYear(),0,0))/864e5), wx=WX[doy%4], wx2=WX[(doy+1)%4];
  function hourNow(){ var d=new Date(); return d.getHours()+d.getMinutes()/60; }
  function isNight(){ var h=hourNow(); return h<7||h>=19.5; }
  var J={luci:{},tapparelle:{},clima:{acceso:false,modalita:'auto',temperatura:21,interna:wx.t<18?19.6:21.2},allarme:false,elettrodomestici:{lavatrice:false,lavastoviglie:false,forno:false},batteria:78};
  ROOMS.forEach(function(r){ J.luci[r]=0; }); SH.forEach(function(r){ J.tapparelle[r]=100; });
  if(isNight()){ J.luci.soggiorno=70; J.luci.giardino=100; J.tapparelle.camera=0; J.tapparelle.soggiorno=40; }
  var busy=false, conv=null, left=20, hist=[], lastFocus=null, pulse=0;
  var log=$('jd-log'), hud=$('jd-hud'), roomsBox=$('jd-rooms'), form=$('jd-form'), input=$('jd-in'), leftEl=$('jd-left'), sym=dlg.querySelector('.jd-id .jsym');
  var nf=function(v,d){ return v.toFixed(d==null?1:d).replace('.',','); };
  var clamp100=function(v){ v=Number(v); return isFinite(v)?Math.max(0,Math.min(100,Math.round(v))):null; };
  function energy(){ var h=hourNow(), solar=isNight()?0:4.2*wx.sun*Math.max(0,Math.sin(Math.PI*(h-7)/12.5)), load=.28;
    ROOMS.forEach(function(r){ load+=J.luci[r]/100*.05; }); if(J.clima.acceso) load+=.85; if(J.elettrodomestici.lavatrice) load+=.55; if(J.elettrodomestici.lavastoviglie) load+=.7; if(J.elettrodomestici.forno) load+=1.6;
    return {solar:solar,load:load,grid:load-solar}; }
  function heating(){ return J.clima.acceso&&(J.clima.modalita==='caldo'||(J.clima.modalita==='auto'&&J.clima.temperatura>J.clima.interna)); }
  function cooling(){ return J.clima.acceso&&(J.clima.modalita==='freddo'||(J.clima.modalita==='auto'&&J.clima.temperatura<J.clima.interna)); }

  /* casa di prova disegnata con lo stesso motore 3D del configuratore */
  var JR=[{id:'jsoggiorno',tipo:'soggiorno',nome:'Soggiorno',g:{x:0,y:0,w:6,d:5}},{id:'jcucina',tipo:'cucina',nome:'Cucina',g:{x:6,y:0,w:4,d:5}},{id:'jtecnico',tipo:'bagno',nome:'Locale tecnico',g:{x:10,y:0,w:2.4,d:5}},
    {id:'jcamera',tipo:'camera',nome:'Camera',g:{x:0,y:5,w:4.6,d:4}},{id:'jstudio',tipo:'studio',nome:'Studio',g:{x:4.6,y:5,w:4,d:4}},{id:'jbagno',tipo:'bagno',nome:'Bagno',g:{x:8.6,y:5,w:3.8,d:4}}];
  JR.forEach(function(r){ var k=r.id.slice(1); r.l=1; r.t=SH.indexOf(k)>=0?1:0; r.cl=k==='soggiorno'?1:0; });
  var JL={luci:{},tapp:{},clima:{},canc:0,cancT:0}, jraf=null, jl=0;
  function syncJL(){ JR.forEach(function(r){ var k=r.id.slice(1); JL.luci[r.id+'-l0']=J.luci[k]>0; if(r.t){ var tid=r.id+'-t0'; if(!JL.tapp[tid]) JL.tapp[tid]={pos:J.tapparelle[k],target:J.tapparelle[k]}; JL.tapp[tid].target=J.tapparelle[k]; } }); JL.clima['jsoggiorno-c0']=J.clima.acceso; JL.all=J.allarme; }
  function drawJ(){ var sv={L:L,C:C,A:AMB}; L=JL; C={cancello:false,citofono:false,allarme:true}; AMB=isNight()?'sera':'giorno';
    var svg=svgCasa(JR,true); L=sv.L; C=sv.C; AMB=sv.A;
    if(J.luci.giardino>0) svg=svg.replace('</svg>','<circle cx="0" cy="0" r="0"/></svg>');
    var gl=J.luci.giardino>0, rain=wx.r&&!isNight();
    svg=svg.replace('</svg>',(gl?'<g pointer-events="none"><circle cx="'+P(5,11.4,1.4)[0].toFixed(2)+'" cy="'+P(5,11.4,1.4)[1].toFixed(2)+'" r=".9" fill="#FFD58A" opacity=".35"/><circle cx="'+P(5,11.4,1.4)[0].toFixed(2)+'" cy="'+P(5,11.4,1.4)[1].toFixed(2)+'" r=".18" fill="#FFE2A1"/></g>':'')+(rain?'<g stroke="#9CC8FF" stroke-width=".04" opacity=".6">'+Array.apply(null,Array(26)).map(function(_,k){ var x=-8+k*.9, y=-1+(k*37%9)*.5; return '<line x1="'+x+'" y1="'+y+'" x2="'+(x-.3)+'" y2="'+(y+.9)+'"/>'; }).join('')+'</g>':'')+'</svg>');
    $('jd-house').innerHTML=svg; }
  function animJ(){ if(jraf) return; jl=0; jraf=requestAnimationFrame(function f(ts){ var dt=jl?Math.min(100,ts-jl)/1000:0; jl=ts, mv=false; for(var k in JL.tapp){ var t=JL.tapp[k]; if(t.pos<t.target){ t.pos=Math.min(t.target,t.pos+30*dt); mv=true; } else if(t.pos>t.target){ t.pos=Math.max(t.target,t.pos-30*dt); mv=true; } } drawJ(); jraf=mv?requestAnimationFrame(f):null; }); }
  var mv=false;
  function card(id,label,big,small){ return '<div class="jd-card" data-c="'+id+'"><small>'+label+'</small><b>'+big+'</b><span>'+small+'</span></div>'; }
  function render(flash){
    var e=energy(), night=isNight(); syncJL(); animJ(); drawJ();
    var cl=J.clima.acceso?(heating()?'Caldo ':cooling()?'Freddo ':'Auto ')+nf(J.clima.temperatura,0)+'°':'Spento';
    hud.innerHTML=card('meteo','Meteo · simulato',nf(wx.t,0)+'° '+(night?'notte':wx.c),'Pioggia '+wx.p+'% · domani '+wx2.c)+card('solare','Fotovoltaico',nf(e.solar)+' kW','Batteria '+J.batteria+'%')+card('consumi','Consumo',nf(e.load)+' kW',e.grid<0?'Immetti in rete '+nf(-e.grid)+' kW':'Prelievo dalla rete '+nf(e.grid)+' kW')+card('clima','Clima',cl,'Interno '+nf(J.clima.interna)+'° · allarme '+(J.allarme?'inserito':'spento'));
    (flash||[]).forEach(function(f){ var c=hud.querySelector('[data-c="'+f+'"]'); if(c) c.classList.add('flash'); });
    [].forEach.call(roomsBox.querySelectorAll('button'),function(b){ b.setAttribute('aria-pressed',J.luci[b.getAttribute('data-room')]>0?'true':'false'); });
  }
  setInterval(function(){ if(dlg.hidden||!J.clima.acceso) return; var d=J.clima.temperatura-J.clima.interna; if(Math.abs(d)<.05) return; J.clima.interna+=Math.max(-.2,Math.min(.2,d)); render(); },2500);
  function scene(n){ var dark=isNight();
    if(n==='cinema'){ ROOMS.forEach(function(r){ if(r!=='giardino') J.luci[r]=0; }); J.luci.soggiorno=20; J.tapparelle.soggiorno=0; J.clima.acceso=true; J.clima.modalita='auto'; J.clima.temperatura=22; }
    else if(n==='buonanotte'){ ROOMS.forEach(function(r){ J.luci[r]=0; }); J.luci.giardino=30; SH.forEach(function(r){ J.tapparelle[r]=0; }); J.allarme=true; J.clima.temperatura=19; }
    else if(n==='esco'){ ROOMS.forEach(function(r){ J.luci[r]=0; }); SH.forEach(function(r){ J.tapparelle[r]=0; }); J.allarme=true; J.clima.acceso=false; J.elettrodomestici.forno=false; }
    else if(n==='rientro'){ J.allarme=false; if(dark){ J.luci.soggiorno=70; J.luci.cucina=60; J.luci.giardino=100; } else SH.forEach(function(r){ J.tapparelle[r]=100; }); J.clima.acceso=true; J.clima.modalita='auto'; J.clima.temperatura=21; }
    else if(n==='buongiorno'){ SH.forEach(function(r){ J.tapparelle[r]=100; }); J.allarme=false; if(dark) J.luci.cucina=60; J.luci.giardino=0; J.clima.acceso=true; J.clima.modalita='auto'; J.clima.temperatura=21; }
    else return null; return 'Scenario · '+n; }
  function apply(list){ var labels=[], fl={};
    (Array.isArray(list)?list:[]).slice(0,14).forEach(function(a){ if(!a||typeof a!=='object') return; var rooms;
      if(a.tipo==='luci'){ var v=clamp100(a.valore!=null?a.valore:(a.acceso===false?0:80)); if(v==null) return; rooms=a.stanza==='tutte'||!a.stanza?ROOMS:(ROOMS.indexOf(a.stanza)>=0?[a.stanza]:[]); rooms.forEach(function(r){ J.luci[r]=v; }); if(rooms.length){ labels.push('Luci '+(rooms.length>1?'tutte':NAME[rooms[0]].toLowerCase())+' · '+(v?v+'%':'spente')); fl.consumi=1; } }
      else if(a.tipo==='tapparelle'){ var p=clamp100(a.valore!=null?a.valore:(a.acceso===false?0:100)); if(p==null) return; rooms=a.stanza==='tutte'||!a.stanza?SH:(SH.indexOf(a.stanza)>=0?[a.stanza]:[]); rooms.forEach(function(r){ J.tapparelle[r]=p; }); if(rooms.length) labels.push('Tapparelle '+(rooms.length>1?'tutte':NAME[rooms[0]].toLowerCase())+' · '+(p===0?'chiuse':p===100?'aperte':'aperte '+p+'%')); }
      else if(a.tipo==='clima'){ if(typeof a.acceso==='boolean') J.clima.acceso=a.acceso; if(['caldo','freddo','auto'].indexOf(a.modalita)>=0){ J.clima.modalita=a.modalita; J.clima.acceso=a.acceso!==false; } var tt=Number(a.temperatura); if(isFinite(tt)&&a.temperatura!=null){ J.clima.temperatura=Math.max(16,Math.min(28,Math.round(tt*2)/2)); J.clima.acceso=a.acceso!==false; } labels.push(J.clima.acceso?'Clima · '+J.clima.modalita+' '+nf(J.clima.temperatura,J.clima.temperatura%1?1:0)+' °C':'Clima · spento'); fl.clima=1; fl.consumi=1; }
      else if(a.tipo==='allarme'){ J.allarme=a.acceso!==false; labels.push('Allarme · '+(J.allarme?'inserito':'disinserito')); fl.clima=1; }
      else if(a.tipo==='elettrodomestico'){ if(!APP[a.nome]) return; J.elettrodomestici[a.nome]=a.acceso!==false; labels.push(APP[a.nome]+' · '+(J.elettrodomestici[a.nome]?'avviato':'spento')); fl.consumi=1; }
      else if(a.tipo==='scenario'){ var l=scene(a.nome); if(l){ labels.push(l); fl.clima=1; fl.consumi=1; } } });
    if(labels.length) render(Object.keys(fl)); return labels; }
  function snapshot(){ var e=energy(), d=new Date(), tl={}, li={}; ROOMS.forEach(function(r){ li[r]=J.luci[r]; }); SH.forEach(function(r){ tl[r]=J.tapparelle[r]; });
    return {ora:('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2),notte:isNight(),meteo:{dati:'simulati per la demo',luogo:'San Sperate (CA)',condizioni:wx.c,temperatura_esterna:wx.t,probabilita_pioggia:wx.p,domani:{condizioni:wx2.c,temperatura:wx2.t}},
      energia:{fotovoltaico_kw:+e.solar.toFixed(1),consumo_kw:+e.load.toFixed(1),rete_kw:+e.grid.toFixed(1),batteria_percento:J.batteria},luci_percento:li,tapparelle_apertura_percento:tl,
      clima:{acceso:J.clima.acceso,modalita:J.clima.modalita,temperatura_impostata:J.clima.temperatura,temperatura_interna:+J.clima.interna.toFixed(1)},allarme_inserito:J.allarme,elettrodomestici_accesi:J.elettrodomestici}; }
  function bubble(cls,text){ var m=document.createElement('div'); m.className='jd-m '+cls; m.textContent=text; log.appendChild(m); log.scrollTop=log.scrollHeight; return m; }
  function chips(labels){ if(!labels.length) return; var c=document.createElement('div'); c.className='jd-acts'; labels.forEach(function(l){ var s=document.createElement('span'); s.textContent=l; c.appendChild(s); }); log.appendChild(c); log.scrollTop=log.scrollHeight; }
  function sysMsg(text,contact){ var m=bubble('sys',text); if(contact){ var a=document.createElement('a'); a.className='btn pri'; a.style.cssText='display:flex;margin:10px auto 0;justify-content:center;font-size:14px;padding:9px 16px;width:max-content'; a.href='https://wa.me/393202812627'; a.target='_blank'; a.rel='noopener'; a.textContent='Parla con noi'; m.appendChild(a); } }
  function setLeft(n){ left=n; leftEl.textContent=n===1?'1 messaggio rimasto':n+' messaggi rimasti'; }
  function lock(on){ busy=on; form.querySelector('button').disabled=on||left<=0; if(sym) sym.classList.toggle('talk',on); }
  function send(text){
    text=String(text||'').trim().slice(0,300); if(!text||busy) return;
    if(left<=0){ sysMsg('Hai usato tutti i messaggi di questa prova. Se vuoi Jana a casa tua, parliamone!',true); return; }
    bubble('me',text); hist.push({role:'user',content:text}); input.value=''; lock(true);
    var ty=document.createElement('div'); ty.className='jd-typing'; ty.innerHTML='<i></i><i></i><i></i>'; log.appendChild(ty); log.scrollTop=log.scrollHeight;
    var ctrl='AbortController' in window?new AbortController():null, to=setTimeout(function(){ if(ctrl) ctrl.abort(); },30000);
    var base=String(cfg.supabaseUrl||''), p;
    p=base?fetch(fnUrl('jana'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({conv:conv,messages:hist.slice(-20),state:snapshot()}),signal:ctrl?ctrl.signal:undefined}).then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ j._status=r.status; return j; }); }):Promise.reject(new Error('nocfg'));
    p.then(function(j){
      if(j.conv) conv=j.conv; if(typeof j.left==='number') setLeft(j.left);
      if(j.ok&&j.reply){ hist.push({role:'assistant',content:String(j.reply)}); bubble('ja',String(j.reply)); chips(apply(j.actions)); if(left<=0) sysMsg('Questa era l’ultima risposta della prova. Ti è piaciuta? Possiamo portare Jana a casa tua.',true); }
      else { hist.pop(); if(j.error==='limit_conv'){ setLeft(0); sysMsg('Hai usato tutti i messaggi di questa prova. Se vuoi Jana a casa tua, parliamone!',true); } else if(j.error==='limit_day'||j.error==='limit_client') sysMsg('Per oggi le prove di Jana sono esaurite. Torna domani, oppure scrivici: te la mostriamo dal vivo.',true); else sysMsg('Jana non riesce a rispondere in questo momento. Riprova tra poco.'); }
    }).catch(function(){ hist.pop(); sysMsg('Jana di prova non è raggiungibile in questo momento. Riprova tra poco.'); }).then(function(){ clearTimeout(to); if(ty.parentNode) ty.parentNode.removeChild(ty); lock(false); input.focus(); });
  }
  form.addEventListener('submit',function(e){ e.preventDefault(); send(input.value); });
  roomsBox.innerHTML=''; ROOMS.forEach(function(r){ var b=document.createElement('button'); b.type='button'; b.setAttribute('data-room',r); b.innerHTML='<i></i>'+NAME[r]; b.addEventListener('click',function(){ J.luci[r]=J.luci[r]>0?0:80; render(['luci']); }); roomsBox.appendChild(b); });
  var sug=$('jd-sug'); sug.innerHTML=''; SUG.forEach(function(x){ var b=document.createElement('button'); b.type='button'; b.textContent=x; b.addEventListener('click',function(){ send(x); }); sug.appendChild(b); });
  function open(pre){ lastFocus=document.activeElement; dlg.hidden=false; document.body.classList.add('jdemo-lock','jdemo-on'); render();
    requestAnimationFrame(function(){ requestAnimationFrame(function(){ dlg.classList.add('in'); }); });
    if(!log.children.length) bubble('ja','Ciao, sono Jana, l’assistente di Domotty! Questa è una casa dimostrativa: chiedimi di accendere le luci, abbassare le tapparelle o regolare il clima, oppure chiedimi che tempo fa e quanto produce il fotovoltaico. Posso anche raccontarti di Domotty e di Maistu.');
    setTimeout(function(){ if(pre) send(pre); else input.focus(); },380); }
  function close(){ dlg.classList.remove('in'); document.body.classList.remove('jdemo-lock','jdemo-on'); setTimeout(function(){ dlg.hidden=true; },320); if(lastFocus&&lastFocus.focus) lastFocus.focus(); }
  document.addEventListener('click',function(e){ var o=e.target.closest&&e.target.closest('[data-jana-open]'); if(o){ e.preventDefault(); open(o.getAttribute('data-jana-open')||''); return; } if(e.target.closest&&e.target.closest('[data-jd-close]')) close(); });
  document.addEventListener('keydown',function(e){ if(dlg.hidden) return; if(e.key==='Escape'){ close(); return; }
    if(e.key==='Tab'){ var f=[].filter.call(dlg.querySelectorAll('button, input, a[href]'),function(x){ return !x.disabled&&x.offsetParent!==null; }); if(!f.length) return; var a=f[0], z=f[f.length-1]; if(e.shiftKey&&document.activeElement===a){ e.preventDefault(); z.focus(); } else if(!e.shiftKey&&document.activeElement===z){ e.preventDefault(); a.focus(); } } });
})();

})();

/* newsletter: stessa funzione del sito ("newsletter", iscrizione con conferma via email) */
(function(){ var cfg=window.DOMOTTY_CONFIG||{}, emailRe=/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  [].forEach.call(document.querySelectorAll('form.js-nl'),function(nl){ var msg=document.getElementById(nl.getAttribute('data-msg'));
    nl.addEventListener('submit',function(e){ e.preventDefault(); var email=String(nl.email.value||'').trim(); msg.className='nl-msg';
      if(!emailRe.test(email)){ msg.className='nl-msg err'; msg.textContent='Controlla l’indirizzo email.'; return; }
      var btn=nl.querySelector('button'); btn.disabled=true;
      fetch(String(cfg.supabaseUrl||'').replace(/\/$/,'')+'/functions/v1/newsletter',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'subscribe',email:email,website:nl.website.value||''})})
        .then(function(r){ return r.json().catch(function(){ return {}; }).then(function(j){ if(!r.ok||!j.ok) throw new Error('x'); }); })
        .then(function(){ nl.hidden=true; msg.textContent='Quasi fatto! Ti abbiamo inviato un’email: clicca il link per confermare l’iscrizione.'; })
        .catch(function(){ msg.className='nl-msg err'; msg.textContent='Non siamo riusciti a completare l’iscrizione. Riprova tra poco.'; })
        .then(function(){ btn.disabled=false; }); }); }); })();
