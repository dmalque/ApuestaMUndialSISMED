/* ============================================================
   CONFIGURACIÓN — edita SOLO este archivo
   ============================================================ */

const CONFIG = {
  // 1) Pega aquí los datos de tu proyecto Supabase
  //    (Supabase → Settings → API)
  SUPABASE_URL: "https://vtzkbpsvtygshktxvhrd.supabase.co/rest/v1/",
  SUPABASE_ANON_KEY: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ0emticHN2dHlnc2hrdHh2aHJkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzMDI0MTAsImV4cCI6MjA5Njg3ODQxMH0.cjl2wYZq9Io7S9GyZTDTlpIfA2R7ab-vYcNtIG8f7ew",

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
