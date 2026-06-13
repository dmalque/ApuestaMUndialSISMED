/* ============================================================
   CONFIGURACIÓN — edita SOLO este archivo
   ============================================================ */

const CONFIG = {
  // 1) Pega aquí los datos de tu proyecto Supabase
  //    (Supabase → Settings → API)
  SUPABASE_URL: "https://vtzkbpsvtygshktxvhrd.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "sb_publishable_w86JO2f91VQ4wdX8pmY1Ag_yzk1CTlY",

  // 2) Reglas de la polla
  STAKE: 1,                 // S/ por apuesta (cada pronóstico = 1 sol implícito)
  LOCK_MINUTES: 60,         // las apuestas cierran N minutos antes del partido
  CURRENCY: "S/",           // símbolo de moneda

  // Si NADIE acierta un partido:
  //  "refund"  → a cada uno se le devuelve su sol (nadie gana ni pierde)
  //  "lost"    → todos pierden su sol (queda como pérdida histórica)
  NO_WINNER_RULE: "refund",

  // En eliminatorias (octavos, cuartos…): el resultado que vale para la
  // apuesta 1-X-2 es el de los 90 minutos (el empate sí es apuesta válida).
  KNOCKOUT_RULE: "ft",

  // 3) Zona horaria para mostrar los horarios
  TIMEZONE: "America/Lima",

  // 4) Fuente de datos del Mundial 2026 (openfootball, gratuita, sin API key)
  DATA_URL: "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json",

  // Cada cuántos minutos se refrescan resultados automáticamente
  REFRESH_MINUTES: 5,
};
