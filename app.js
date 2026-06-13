/* ============================================================
   FIEBRE MUNDIAL 26 — lógica de la app
   Datos: openfootball worldcup.json · Backend: Supabase
   ============================================================ */

const db = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const S = {
  matches: [],      // partidos del JSON (con overrides aplicados)
  bets: [],         // todas las apuestas
  players: [],      // jugadores
  overrides: {},    // correcciones manuales de resultados {match_key:{score1,score2}}
  me: null,         // jugador en sesión
  tab: "hoy",
  ready: false,
};

/* ---------------- utilidades ---------------- */
const $ = (sel) => document.querySelector(sel);
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
const matchKey = (m) => `${m.date}_${slug(m.team1)}_${slug(m.team2)}`;

function parseKickoff(m){
  // formato openfootball: "13:00 UTC-6"
  const t = (m.time || "12:00 UTC+0").match(/(\d{1,2}):(\d{2})\s*UTC([+-]\d{1,2})/);
  if(!t) return new Date(`${m.date}T12:00:00Z`);
  const off = parseInt(t[3],10);
  const offStr = (off<0?"-":"+") + String(Math.abs(off)).padStart(2,"0") + ":00";
  return new Date(`${m.date}T${t[1].padStart(2,"0")}:${t[2]}:00${offStr}`);
}
const lockTime = (m) => new Date(parseKickoff(m).getTime() - CONFIG.LOCK_MINUTES*60000);

const fmtTime = (d) => new Intl.DateTimeFormat("es-PE",{timeZone:CONFIG.TIMEZONE,hour:"2-digit",minute:"2-digit",hour12:true}).format(d);
const fmtDay  = (d) => new Intl.DateTimeFormat("es-PE",{timeZone:CONFIG.TIMEZONE,weekday:"long",day:"numeric",month:"long"}).format(d);
const limaDateStr = (d) => new Intl.DateTimeFormat("en-CA",{timeZone:CONFIG.TIMEZONE,year:"numeric",month:"2-digit",day:"2-digit"}).format(d);

const money = (n) => {
  const sign = n>0 ? "+" : n<0 ? "−" : "";
  return `${sign}${CONFIG.CURRENCY} ${Math.abs(n).toFixed(2)}`;
};
const potFmt = (n) => `${CONFIG.CURRENCY} ${n.toFixed(2)}`;

function getScore(m){
  const ov = S.overrides[matchKey(m)];
  if(ov && ov.score1 !== null && ov.score1 !== undefined) return [ov.score1, ov.score2];
  if(m.score && Array.isArray(m.score.ft)) return m.score.ft;
  return null;
}
const isFinished = (m) => getScore(m) !== null;
function outcome(m){
  const s = getScore(m);
  if(!s) return null;
  return s[0] > s[1] ? "1" : s[0] < s[1] ? "2" : "X";
}

/* apuesta válida = registrada/modificada (hora del servidor) antes del cierre */
const isValidBet = (bet, m) => new Date(bet.updated_at || bet.created_at) <= lockTime(m);

function betsFor(m){
  const key = matchKey(m);
  return S.bets.filter(b => b.match_key === key);
}
function myBet(m){
  if(!S.me) return null;
  return betsFor(m).find(b => b.player_id === S.me.id) || null;
}

/* liquidación de un partido terminado */
function settle(m){
  const all = betsFor(m);
  const valid = all.filter(b => isValidBet(b,m));
  const pot = valid.length * CONFIG.STAKE;
  const res = outcome(m);
  const winners = valid.filter(b => b.pick === res);
  const share = winners.length ? pot / winners.length : 0;
  const rows = all.map(b => {
    const v = isValidBet(b,m);
    let net = 0, hit = false;
    if(v){
      if(winners.length === 0){
        net = CONFIG.NO_WINNER_RULE === "lost" ? -CONFIG.STAKE : 0;
      } else if(b.pick === res){
        hit = true; net = share - CONFIG.STAKE;
      } else {
        net = -CONFIG.STAKE;
      }
    }
    return { bet:b, valid:v, hit, net };
  });
  return { pot, winners: winners.length, share, rows, res };
}

/* tabla acumulada */
function standings(){
  const map = {};
  S.players.filter(p=>p.active).forEach(p => map[p.id] = {player:p, net:0, hits:0, played:0});
  S.matches.filter(isFinished).forEach(m => {
    settle(m).rows.forEach(r => {
      const e = map[r.bet.player_id];
      if(!e || !r.valid) return;
      e.net += r.net; e.played++; if(r.hit) e.hits++;
    });
  });
  return Object.values(map).sort((a,b)=> b.net - a.net || b.hits - a.hits || a.player.name.localeCompare(b.player.name));
}

const playerName = (id) => (S.players.find(p=>p.id===id)||{}).name || "¿?";

/* ---------------- carga de datos ---------------- */
async function loadMatches(){
  const url = CONFIG.DATA_URL + "?t=" + Math.floor(Date.now()/300000); // rompe caché c/5 min
  const r = await fetch(url);
  if(!r.ok) throw new Error("No se pudo leer la fuente de partidos");
  const data = await r.json();
  S.matches = (data.matches||[]).slice().sort((a,b)=> parseKickoff(a)-parseKickoff(b));
}
async function loadDB(){
  const [p,b,o] = await Promise.all([
    db.from("players").select("*").order("name"),
    db.from("bets").select("*"),
    db.from("result_overrides").select("*"),
  ]);
  if(p.error||b.error||o.error) throw (p.error||b.error||o.error);
  S.players = p.data; S.bets = b.data;
  S.overrides = {};
  o.data.forEach(x => S.overrides[x.match_key] = x);
}
async function loadAll(){
  await Promise.all([loadMatches(), loadDB()]);
  S.ready = true;
}

/* ---------------- sesión ---------------- */
function restoreSession(){
  const id = localStorage.getItem("fm26_player");
  if(id) S.me = S.players.find(p => p.id === id && p.active) || null;
  renderUserChip();
}
function setSession(p){
  S.me = p;
  if(p) localStorage.setItem("fm26_player", p.id);
  else localStorage.removeItem("fm26_player");
  renderUserChip(); render();
}
function renderUserChip(){
  $("#btn-user").textContent = S.me ? S.me.name.split(" ")[0] : "Entrar";
}

/* ---------------- acciones ---------------- */
async function placeBet(m, pick){
  if(!S.me){ openLogin(); return; }
  if(new Date() > lockTime(m)){ toast("⛔ Las apuestas para este partido ya cerraron"); render(); return; }
  const key = matchKey(m);
  const prev = myBet(m);
  // optimista
  if(prev){ prev.pick = pick; } else {
    S.bets.push({player_id:S.me.id, match_key:key, pick, updated_at:new Date().toISOString()});
  }
  render();
  const { error } = await db.from("bets")
    .upsert({ player_id:S.me.id, match_key:key, pick }, { onConflict:"player_id,match_key" });
  if(error){ toast("Error al guardar, intenta de nuevo"); await loadDB(); render(); return; }
  await loadDB(); render();
  toast(`✅ Apuesta registrada: ${pickLabel(pick, m)} (${CONFIG.CURRENCY} ${CONFIG.STAKE.toFixed(2)})`);
}
const pickLabel = (pick,m) => pick==="1" ? `Gana ${m.team1}` : pick==="2" ? `Gana ${m.team2}` : "Empate";

/* ---------------- render ---------------- */
function render(){
  if(!S.ready) return;
  const v = $("#view");
  if(S.tab==="hoy") v.innerHTML = viewHoy();
  else if(S.tab==="tabla") v.innerHTML = viewTabla();
  else v.innerHTML = viewPartidos();
  bindView();
}

function ticketHTML(m, opts={}){
  const key = matchKey(m);
  const ko = parseKickoff(m), lk = lockTime(m), now = new Date();
  const fin = isFinished(m);
  const open = !fin && now < lk;
  const score = getScore(m);
  const mine = myBet(m);
  const allBets = betsFor(m);
  const validCount = allBets.filter(b=>isValidBet(b,m)).length;
  const pot = (open ? allBets.length : validCount) * CONFIG.STAKE;
  const stl = fin ? settle(m) : null;

  const chip = (pk, label) => {
    const sel = mine && mine.pick===pk;
    const winCls = fin && stl.res===pk ? "win" : "";
    return `<button class="pick-btn ${sel?"selected":""} ${winCls}" data-key="${key}" data-pick="${pk}" ${open?"":"disabled"}>
      <span class="pk">${pk}</span><span class="pk-label">${label}</span></button>`;
  };

  let foot = "";
  if(open){
    const mins = Math.max(0, Math.round((lk - now)/60000));
    const t = mins >= 60 ? `${Math.floor(mins/60)} h ${mins%60} min` : `${mins} min`;
    foot = `<div class="lock-note open">🟢 Apuestas abiertas · cierran en <b>&nbsp;${t}</b>&nbsp;(${fmtTime(lk)})</div>
      <div class="lock-note">👥 ${allBets.length} ${allBets.length===1?"compañero ya apostó":"compañeros ya apostaron"} · los pronósticos se revelan al cierre</div>`;
  } else if(!fin){
    foot = `<div class="lock-note closed">🔒 Apuestas cerradas · ${now>=ko ? "partido en juego o por confirmar resultado" : "inicia " + fmtTime(ko)}</div>`;
  }

  let strip = "";
  if(!open && allBets.length){
    const rows = (stl ? stl.rows : allBets.map(b=>({bet:b, valid:isValidBet(b,m)})))
      .slice().sort((a,b)=> playerName(a.bet.player_id).localeCompare(playerName(b.bet.player_id)))
      .map(r => {
        const net = stl && r.valid ? `<span class="net ${r.net>0?"pos":r.net<0?"neg":"zero"}">${money(r.net)}</span>` : (r.valid ? "" : `<span class="net zero">fuera de plazo</span>`);
        return `<div class="bet-row ${r.hit?"hit":""} ${r.valid?"":"invalid"}">
          <span class="who"><span class="bet-pick">${r.bet.pick}</span>${playerName(r.bet.player_id)}${S.me&&r.bet.player_id===S.me.id?" (tú)":""}</span>${net}</div>`;
      }).join("");
    const head = stl
      ? (stl.winners ? `🏅 ${stl.winners} acertó${stl.winners>1?"/aron":""} · cada uno recibe ${potFmt(stl.share)}` : (CONFIG.NO_WINNER_RULE==="lost"?"Nadie acertó · todos pierden su sol":"Nadie acertó · se devuelve el sol a cada uno"))
      : "Pronósticos registrados";
    strip = `<div class="bets-strip"><div class="bets-strip-title">${head}</div>${rows}</div>`;
  }

  return `<article class="ticket">
    <div class="ticket-head">
      <span>${m.group || m.round || ""} · ${fmtTime(ko)} · ${m.ground||""}</span>
      <span class="pot">Pozo ${potFmt(pot)}</span>
    </div>
    <div class="ticket-body">
      <div class="matchup">
        <span class="team t1">${m.team1}</span>
        <span class="score-mid">${score ? `${score[0]} – ${score[1]}` : `<span class="vs">VS</span>`}</span>
        <span class="team t2">${m.team2}</span>
      </div>
      ${fin ? `<div class="ticket-meta">Final · resultado: <b>${stl.res==="X"?"Empate":(stl.res==="1"?m.team1:m.team2)}</b></div>`:""}
      <div class="picks">
        ${chip("1", m.team1.length>11 ? "Local" : m.team1)}
        ${chip("X","Empate")}
        ${chip("2", m.team2.length>11 ? "Visita" : m.team2)}
      </div>
      ${foot}${strip}
    </div>
  </article>`;
}

function viewHoy(){
  const today = limaDateStr(new Date());
  const todays = S.matches.filter(m => limaDateStr(parseKickoff(m)) === today);
  let html = "";
  if(!S.me){
    html += `<div class="empty"><span class="big">🎟️</span>Para apostar, primero <b>entra con tu nombre</b> tocando el botón verde de arriba.</div>`;
  }
  if(todays.length){
    html += `<div class="section-label">Partidos de hoy · ${fmtDay(new Date())}</div>`;
    html += todays.map(m=>ticketHTML(m)).join("");
  } else {
    html += `<div class="empty"><span class="big">😴</span>Hoy no hay partidos.</div>`;
  }
  // próximos (mañana)
  const next = S.matches.filter(m => limaDateStr(parseKickoff(m)) > today && !isFinished(m));
  if(next.length){
    const nd = limaDateStr(parseKickoff(next[0]));
    const nextDay = next.filter(m => limaDateStr(parseKickoff(m)) === nd);
    html += `<div class="section-label">Puedes ir apostando · ${fmtDay(parseKickoff(nextDay[0]))}</div>`;
    html += nextDay.map(m=>ticketHTML(m)).join("");
  }
  return html;
}

function viewTabla(){
  const st = standings();
  const played = S.matches.filter(isFinished).length;
  let html = `<div class="section-label">Tabla acumulada</div>
  <p class="podium-note">Cada apuesta = ${CONFIG.CURRENCY} ${CONFIG.STAKE.toFixed(2)}. El pozo de cada partido se reparte entre quienes aciertan. El acumulado se paga al final del torneo. <b>${played}</b> partidos jugados.</p>`;
  if(!st.length) return html + `<div class="empty"><span class="big">👥</span>Aún no hay jugadores registrados.<br>El administrador puede agregarlos desde su perfil.</div>`;
  html += `<div class="standings">` + st.map((e,i)=>{
    const me = S.me && e.player.id===S.me.id;
    return `<div class="stand-row ${me?"me":""}">
      <span class="stand-pos ${i===0?"p1":""}">${i===0?"🥇":i===1?"🥈":i===2?"🥉":i+1}</span>
      <span><span class="stand-name">${e.player.name}${me?" (tú)":""}</span>
      <div class="stand-sub">${e.hits} aciertos · ${e.played} apuestas</div></span>
      <span class="stand-net net ${e.net>0?"pos":e.net<0?"neg":"zero"}">${money(e.net)}</span>
    </div>`;
  }).join("") + `</div>`;
  return html;
}

function viewPartidos(){
  const groups = {};
  S.matches.forEach(m => {
    const d = limaDateStr(parseKickoff(m));
    (groups[d] = groups[d] || []).push(m);
  });
  const today = limaDateStr(new Date());
  const days = Object.keys(groups).sort();
  // mostrar primero hoy/futuro cercano: orden cronológico pero hacemos scroll al día actual
  let html = `<div class="section-label">Calendario completo · ${S.matches.length} partidos</div>`;
  days.forEach(d => {
    const ms = groups[d];
    html += `<div class="day-group" ${d===today?'id="today-anchor"':""}>
      <div class="section-label">${fmtDay(parseKickoff(ms[0]))}${d===today?" · HOY":""}</div>`;
    html += ms.map(m=>{
      const sc = getScore(m);
      const mine = myBet(m);
      let flag = "";
      if(mine){
        if(isFinished(m)){
          const ok = isValidBet(mine,m) && mine.pick===outcome(m);
          flag = `<span class="${ok?"hit":"miss"}">${ok?"✓":"✗"} ${mine.pick}</span>`;
        } else flag = `<span class="mypick">${mine.pick}</span>`;
      }
      return `<button class="mini-match" data-detail="${matchKey(m)}">
        <span class="m1">${m.team1}</span>
        <span class="mini-score ${sc?"":"pending"}">${sc?`${sc[0]}–${sc[1]}`:fmtTime(parseKickoff(m))}</span>
        <span class="m2">${m.team2}</span>
        <span class="mini-flag">${flag}</span>
      </button>`;
    }).join("");
    html += `</div>`;
  });
  return html;
}

/* ---------------- modales ---------------- */
function openModal(html){ $("#modal-card").innerHTML = html; $("#modal").classList.remove("hidden"); }
function closeModal(){ $("#modal").classList.add("hidden"); }

function openLogin(){
  const list = S.players.filter(p=>p.active);
  openModal(`<div class="modal-title">¿Quién eres?</div>
    <div class="modal-sub">Elige tu nombre. La primera vez crearás tu PIN de 3 dígitos; luego entrarás con tu nombre + PIN.</div>
    <div class="player-list">
      ${list.map(p=>`<button class="player-btn" data-login="${p.id}">${p.name} <span>${p.pin?"🔒":"✨ primera vez"}</span></button>`).join("") || `<p class="hint">Aún no hay jugadores. El administrador debe agregarlos (ver README).</p>`}
    </div>`);
  document.querySelectorAll("[data-login]").forEach(b => b.onclick = () => {
    const p = S.players.find(x=>x.id===b.dataset.login);
    if(p.pin) askPin(p); else createPin(p);
  });
}

/* primera vez: el jugador crea su PIN de 3 dígitos */
function createPin(p, changing=false){
  openModal(`<div class="modal-title">${changing ? "Cambiar PIN" : `¡Hola, ${p.name}!`}</div>
    <div class="modal-sub">${changing ? "Elige tu nuevo PIN de 3 dígitos." : "Es tu primera vez aquí. Crea tu PIN de <b>3 dígitos</b> para proteger tus apuestas."}</div>
    <input class="input" id="pin-1" type="password" inputmode="numeric" maxlength="3" placeholder="PIN (3 dígitos)" autocomplete="off">
    <input class="input" id="pin-2" type="password" inputmode="numeric" maxlength="3" placeholder="Repite tu PIN" autocomplete="off">
    <button class="btn btn-primary" id="pin-create">${changing ? "Guardar nuevo PIN" : "Crear PIN y entrar"}</button>
    <button class="btn btn-ghost" id="pin-back">Volver</button>
    <p class="hint">Memorízalo: lo usarás cada vez que entres desde otro celular. Si lo olvidas, el administrador puede reiniciarlo.</p>`);
  $("#pin-1").focus();
  $("#pin-create").onclick = async () => {
    const a = $("#pin-1").value.trim(), b = $("#pin-2").value.trim();
    if(!/^\d{3}$/.test(a)){ toast("El PIN debe tener exactamente 3 números"); return; }
    if(a !== b){ toast("Los PIN no coinciden, inténtalo de nuevo"); return; }
    const { error } = await db.from("players").update({ pin: a }).eq("id", p.id);
    if(error){ toast("Error al guardar el PIN, intenta de nuevo"); return; }
    p.pin = a;
    await loadDB();
    setSession(S.players.find(x=>x.id===p.id));
    closeModal();
    toast(changing ? "PIN actualizado 🔒" : `¡Listo, ${p.name}! Ya puedes apostar ⚽`);
  };
  $("#pin-back").onclick = changing ? openProfile : openLogin;
}

function askPin(p){
  openModal(`<div class="modal-title">${p.name}</div>
    <div class="modal-sub">Ingresa tu PIN de 3 dígitos.</div>
    <input class="input" id="pin-input" type="password" inputmode="numeric" maxlength="3" placeholder="•••" autocomplete="off">
    <button class="btn btn-primary" id="pin-ok">Entrar</button>
    <button class="btn btn-ghost" id="pin-back">Volver</button>
    <p class="hint">¿Olvidaste tu PIN? Pídele al administrador que lo reinicie y podrás crear uno nuevo.</p>`);
  $("#pin-input").focus();
  $("#pin-input").addEventListener("keydown", e => { if(e.key==="Enter") $("#pin-ok").click(); });
  $("#pin-ok").onclick = () => {
    if($("#pin-input").value === p.pin){ setSession(p); closeModal(); toast(`¡Hola, ${p.name}! ⚽`); }
    else toast("PIN incorrecto");
  };
  $("#pin-back").onclick = openLogin;
}

function openProfile(){
  if(!S.me){ openLogin(); return; }
  const st = standings().find(e=>e.player.id===S.me.id);
  openModal(`<div class="modal-title">${S.me.name}</div>
    <div class="modal-sub">${st ? `Acumulado: <b>${money(st.net)}</b> · ${st.hits} aciertos en ${st.played} apuestas` : "Aún sin apuestas liquidadas"}</div>
    ${S.me.is_admin ? `<button class="btn btn-primary" id="btn-admin">⚙️ Panel de administrador</button>` : ""}
    <button class="btn btn-ghost" id="btn-mypin">Cambiar mi PIN</button>
    <button class="btn btn-ghost" id="btn-switch">Cambiar de jugador</button>
    <p class="hint">Las apuestas cierran ${CONFIG.LOCK_MINUTES} min antes de cada partido (hora del servidor). Los pronósticos de todos se revelan recién al cierre.</p>`);
  $("#btn-switch").onclick = () => { setSession(null); openLogin(); };
  $("#btn-mypin").onclick = () => createPin(S.me, true);
  const a = $("#btn-admin"); if(a) a.onclick = openAdmin;
}

function openAdmin(){
  openModal(`<div class="modal-title">⚙️ Administrador</div>
    <div class="modal-sub">Agregar jugador (cada uno creará su PIN al entrar por primera vez)</div>
    <div class="modal-row">
      <input class="input" id="np-name" placeholder="Nombre (ej. Carlos R.)">
      <button class="btn btn-primary" style="width:auto;padding:0 18px" id="np-add">Agregar</button>
    </div>
    <div class="modal-sub" style="margin-top:14px">Jugadores · toca el nombre para activar/desactivar · 🔑 reinicia su PIN</div>
    <div class="player-list admin-list">
      ${S.players.map(p=>`<button class="player-btn" data-tg="${p.id}">${p.name}
        <span>${p.is_admin?'<span class="tag-admin">ADMIN</span> ':''}${p.active?'':'<span class="tag-off">INACTIVO</span> '}${p.pin?`<span class="pin-reset" data-rp="${p.id}" title="Reiniciar PIN">🔑↺</span>`:'<span class="tag-off">SIN PIN</span>'}</span></button>`).join("")}
    </div>
    <div class="modal-sub" style="margin-top:14px">Corregir un resultado (si la fuente falla)</div>
    <p class="hint">Abre el partido desde la pestaña “Partidos” y usa el botón “Corregir resultado”.</p>
    <button class="btn btn-ghost" id="adm-back">Cerrar</button>`);
  $("#adm-back").onclick = closeModal;
  $("#np-add").onclick = async () => {
    const name = $("#np-name").value.trim(); if(!name) return;
    const { error } = await db.from("players").insert({ name });
    if(error){ toast("Error: " + error.message); return; }
    await loadDB(); toast(`Jugador ${name} agregado`); openAdmin();
  };
  document.querySelectorAll("[data-rp]").forEach(el => el.onclick = async (e) => {
    e.stopPropagation();
    const p = S.players.find(x=>x.id===el.dataset.rp);
    if(!confirm(`¿Reiniciar el PIN de ${p.name}? Creará uno nuevo al entrar.`)) return;
    await db.from("players").update({ pin: null }).eq("id", p.id);
    await loadDB(); toast(`PIN de ${p.name} reiniciado 🔑`); openAdmin();
  });
  document.querySelectorAll("[data-tg]").forEach(b => b.onclick = async () => {
    const p = S.players.find(x=>x.id===b.dataset.tg);
    if(p.id===S.me.id){ toast("No puedes desactivarte a ti mismo"); return; }
    await db.from("players").update({active: !p.active}).eq("id", p.id);
    await loadDB(); openAdmin(); render();
  });
}

function openMatchDetail(key){
  const m = S.matches.find(x=>matchKey(x)===key); if(!m) return;
  const adminBtn = S.me && S.me.is_admin ? `<button class="btn btn-ghost" id="fix-result">✏️ Corregir resultado</button>` : "";
  openModal(`<div style="margin:-6px -4px 0">${ticketHTML(m)}</div>${adminBtn}
    <button class="btn btn-ghost" id="det-close">Cerrar</button>`);
  $("#det-close").onclick = closeModal;
  bindPicks($("#modal-card"));
  const fx = $("#fix-result");
  if(fx) fx.onclick = () => {
    const cur = getScore(m) || ["",""];
    openModal(`<div class="modal-title">Corregir: ${m.team1} vs ${m.team2}</div>
      <div class="modal-sub">Este marcador reemplaza al de la fuente automática y recalcula las ganancias.</div>
      <div class="modal-row">
        <input class="input" id="ov1" inputmode="numeric" placeholder="${m.team1}" value="${cur[0]}">
        <input class="input" id="ov2" inputmode="numeric" placeholder="${m.team2}" value="${cur[1]}">
      </div>
      <button class="btn btn-primary" id="ov-save">Guardar resultado</button>
      <button class="btn btn-ghost" id="ov-del">Quitar corrección (usar fuente)</button>`);
    $("#ov-save").onclick = async () => {
      const s1 = parseInt($("#ov1").value,10), s2 = parseInt($("#ov2").value,10);
      if(isNaN(s1)||isNaN(s2)){ toast("Ingresa ambos marcadores"); return; }
      await db.from("result_overrides").upsert({ match_key:key, score1:s1, score2:s2 });
      await loadDB(); render(); closeModal(); toast("Resultado corregido ✏️");
    };
    $("#ov-del").onclick = async () => {
      await db.from("result_overrides").delete().eq("match_key", key);
      await loadDB(); render(); closeModal(); toast("Corrección eliminada");
    };
  };
}

/* ---------------- bindings ---------------- */
function bindPicks(root){
  root.querySelectorAll(".pick-btn:not(:disabled)").forEach(b => b.onclick = () => {
    const m = S.matches.find(x=>matchKey(x)===b.dataset.key);
    placeBet(m, b.dataset.pick);
  });
}
function bindView(){
  bindPicks($("#view"));
  document.querySelectorAll("[data-detail]").forEach(b => b.onclick = () => openMatchDetail(b.dataset.detail));
  if(S.tab==="partidos"){
    const a = $("#today-anchor");
    if(a) a.scrollIntoView({block:"start"});
  }
}

let toastTimer;
function toast(msg){
  const t = $("#toast"); t.textContent = msg; t.classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>t.classList.add("hidden"), 2600);
}

/* ---------------- arranque ---------------- */
document.querySelectorAll(".tab").forEach(b => b.onclick = () => {
  document.querySelectorAll(".tab").forEach(x=>x.classList.remove("active"));
  b.classList.add("active"); S.tab = b.dataset.tab; render();
  window.scrollTo({top:0});
});
$("#btn-user").onclick = openProfile;
$("#modal").addEventListener("click", e => { if(e.target.id==="modal") closeModal(); });

(async function init(){
  try{
    await loadAll();
    restoreSession();
    render();
    if(!S.me) openLogin();
  }catch(err){
    $("#view").innerHTML = `<div class="empty"><span class="big">⚠️</span>No se pudo cargar la app.<br>
      Revisa que <b>config.js</b> tenga tu URL y ANON KEY de Supabase y que hayas ejecutado <b>schema.sql</b>.<br>
      <small>${err.message||err}</small></div>`;
    console.error(err);
  }

  // tiempo real: si un compañero apuesta, se refleja al instante
  try{
    db.channel("rt-bets")
      .on("postgres_changes",{event:"*",schema:"public",table:"bets"}, async ()=>{ await loadDB(); render(); })
      .on("postgres_changes",{event:"*",schema:"public",table:"result_overrides"}, async ()=>{ await loadDB(); render(); })
      .subscribe();
  }catch(e){ /* opcional */ }

  // refresco periódico de resultados + cuenta regresiva
  setInterval(async ()=>{ try{ await loadMatches(); render(); }catch(e){} }, CONFIG.REFRESH_MINUTES*60000);
  setInterval(()=>{ if(S.tab==="hoy") render(); }, 30000);
  document.addEventListener("visibilitychange", async ()=>{
    if(!document.hidden){ try{ await loadAll(); render(); }catch(e){} }
  });
})();
