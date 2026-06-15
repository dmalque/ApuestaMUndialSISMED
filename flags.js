/* ============================================================
   BANDERAS — mapa selección → código ISO de país
   La bandera se genera como emoji Unicode desde el código (sin
   peticiones de red): cada letra se convierte a su "Regional
   Indicator Symbol". Funciona offline y lo dibuja el propio celular.
   ============================================================ */

const TEAM_CODES = {
  "Algeria":"dz","Argentina":"ar","Australia":"au","Austria":"at","Belgium":"be",
  "Bosnia & Herzegovina":"ba","Brazil":"br","Canada":"ca","Cape Verde":"cv",
  "Colombia":"co","Croatia":"hr","Curaçao":"cw","Czech Republic":"cz","DR Congo":"cd",
  "Ecuador":"ec","Egypt":"eg","England":"gb-eng","France":"fr","Germany":"de",
  "Ghana":"gh","Haiti":"ht","Iran":"ir","Iraq":"iq","Ivory Coast":"ci","Japan":"jp",
  "Jordan":"jo","Mexico":"mx","Morocco":"ma","Netherlands":"nl","New Zealand":"nz",
  "Norway":"no","Panama":"pa","Paraguay":"py","Portugal":"pt","Qatar":"qa",
  "Saudi Arabia":"sa","Scotland":"gb-sct","Senegal":"sn","South Africa":"za",
  "South Korea":"kr","Spain":"es","Sweden":"se","Switzerland":"ch","Tunisia":"tn",
  "Turkey":"tr","USA":"us","Uruguay":"uy","Uzbekistan":"uz","Wales":"gb-wls",
  "Italy":"it","Nigeria":"ng","Cameroon":"cm","Chile":"cl","Peru":"pe",
  "Costa Rica":"cr","Denmark":"dk","Poland":"pl","Serbia":"rs","Ukraine":"ua",
  "Greece":"gr","Romania":"ro","Hungary":"hu","Mali":"ml","Burkina Faso":"bf",
  "Honduras":"hn","Jamaica":"jm","Venezuela":"ve","Bolivia":"bo",
};

// Inglaterra, Escocia y Gales no tienen emoji propio universal → se manejan aparte
const SUBFLAG_EMOJI = {
  "gb-eng":"🏴\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}", // 🏴ó³ §¥®§®§®¿
  "gb-sct":"🏴\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  "gb-wls":"🏴\u{E0067}\u{E0062}\u{E0077}\u{E006C}\u{E0073}\u{E007F}",
};

// Convierte código ISO de 2 letras a bandera emoji (🇧🇷, 🇲🇽, …)
function isoToFlag(code){
  if(!code) return "";
  if(SUBFLAG_EMOJI[code]) return SUBFLAG_EMOJI[code];
  const cc = code.slice(0,2).toUpperCase();
  if(!/^[A-Z]{2}$/.test(cc)) return "";
  return String.fromCodePoint(...[...cc].map(c => 0x1F1E6 + (c.charCodeAt(0) - 65)));
}

// Bandera de una selección por su nombre (o "" si es placeholder de eliminatoria)
function teamFlag(name){
  const code = TEAM_CODES[name];
  return code ? isoToFlag(code) : "";
}
