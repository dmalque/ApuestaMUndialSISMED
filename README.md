# ⚽ Fiebre Mundial 26 — Polla de oficina

Aplicación web para la polla mundialista de tu oficina (Mundial 2026). Cada compañero
apuesta **S/ 1** por partido eligiendo **1 (local) · X (empate) · 2 (visita)**. El pozo
de cada partido se reparte entre los que aciertan y todo se acumula hasta el final del
torneo. Los partidos y resultados se cargan automáticamente de la fuente abierta
**openfootball** (sin API key).

## Cómo funciona

- **Hoy**: muestra los partidos del día (y del siguiente) con botones grandes 1 / X / 2.
  Dos toques y tu apuesta queda registrada.
- Las apuestas **cierran 60 minutos antes** de cada partido. La validez se controla con
  la **hora del servidor** de Supabase, así nadie puede hacer trampa cambiando la hora
  de su celular. Hasta el cierre puedes cambiar tu pronóstico.
- Los pronósticos de los demás **se revelan recién al cierre** (para que nadie copie).
- Al terminar el partido: pozo = N apostadores × S/1; los acertantes se lo reparten en
  partes iguales. Tu ganancia neta = (pozo ÷ acertantes) − 1. Los que fallan: −S/1.
  Si **nadie** acierta, por defecto se devuelve el sol a cada uno (configurable).
- **Tabla**: ranking acumulado de ganancias/pérdidas de todo el torneo.
- **Partidos**: calendario completo con resultados, tus aciertos (✓) y fallos (✗).
- En eliminatorias el resultado válido para la apuesta es el de los **90 minutos**
  (el empate sí paga), regla clásica de polla.
- **Cómo entran los participantes**: el administrador carga previamente la lista de
  nombres (nadie se registra). La **primera vez** que cada uno abre la app, elige su
  nombre y crea su **PIN de 3 dígitos**; desde entonces entra con nombre + PIN. La
  sesión queda recordada en su celular. Si alguien olvida su PIN, el admin lo reinicia
  con un toque (🔑↺ en el Panel de administrador) y la persona crea uno nuevo.
- El **administrador** puede agregar/desactivar jugadores, reiniciar PIN y corregir un
  resultado si la fuente automática fallara.

---

## Instalación (15 minutos, todo gratis)

### Paso 1 · Crear la base de datos en Supabase

1. Entra a [supabase.com](https://supabase.com) → **Start your project** (crea cuenta gratis).
2. **New project** → ponle nombre (ej. `fiebre-mundial`), elige una contraseña y región
   (South America - São Paulo es la más cercana a Perú).
3. Cuando el proyecto esté listo, ve a **SQL Editor** (ícono de terminal a la izquierda),
   pega TODO el contenido de `supabase/schema.sql` y presiona **Run**.
   - ⚠️ Antes de correr, edita la última parte del archivo: cambia `'Tu Nombre'` por tu
     nombre real (serás el administrador) y, si quieres, agrega de una vez los nombres
     de tus 10 compañeros. Tu PIN lo crearás al entrar por primera vez a la app, igual
     que todos.
4. Ve a **Settings → API** y copia dos valores:
   - **Project URL** (algo como `https://abcd1234.supabase.co`)
   - **anon public key** (una clave larga)

### Paso 2 · Configurar la app

Abre el archivo `config.js` y pega tus valores:

```js
SUPABASE_URL: "https://abcd1234.supabase.co",
SUPABASE_ANON_KEY: "eyJhbGciOi...",
```

(En ese mismo archivo puedes cambiar las reglas: minutos de cierre, qué pasa si nadie
acierta, etc.)

### Paso 3 · Publicar en Vercel

**Opción fácil (sin GitHub):**
1. Entra a [vercel.com](https://vercel.com) y crea una cuenta gratis.
2. En el dashboard: **Add New → Project → Deploy** y arrastra la carpeta completa
   `fiebre-mundial` a la zona de carga (o usa vercel.com/new con "Deploy without Git").
3. En ~30 segundos tendrás una URL tipo `https://fiebre-mundial.vercel.app`.

**Opción con GitHub (recomendada para actualizar fácil):**
1. Sube la carpeta a un repositorio de GitHub.
2. En Vercel: **Add New → Project → Import** tu repositorio → **Deploy**
   (no necesita configuración: es un sitio estático).
3. Cada vez que cambies algo en GitHub, Vercel republica solo.

> También funciona en GitHub Pages si prefieres: Settings → Pages → Deploy from branch.

### Paso 4 · Compartir con la oficina

Manda la URL por WhatsApp al grupo. En el celular pueden tocar
**"Agregar a pantalla de inicio"** y queda como una app más. Cada uno entra, elige su
nombre (y PIN si le pusiste) ¡y a apostar! 🎉

Como administrador puedes agregar a los 10 jugadores desde la app:
botón con tu nombre (arriba a la derecha) → **Panel de administrador**.

---

## Fuente de datos

Los 104 partidos y resultados vienen de
[openfootball/worldcup.json](https://github.com/openfootball/worldcup.json)
(datos de dominio público, sin API key, actualizados durante el torneo). La app los
refresca cada 5 minutos y cada vez que abres la pantalla. Si algún resultado tardara en
actualizarse, el admin puede corregirlo manualmente desde el detalle del partido
(pestaña Partidos → tocar el partido → "Corregir resultado") y se recalcula todo.

## Notas honestas

- Es una app **de confianza entre compañeros**: el PIN es disuasivo, no seguridad
  bancaria. Para 10 amigos de oficina es más que suficiente.
- El plan gratuito de Supabase y Vercel sobra de lejos para 10 usuarios durante todo
  el torneo (límites miles de veces por encima de lo que usarán).
- El dinero físico lo manejan ustedes; la app solo lleva la contabilidad exacta de
  cuánto acumula cada uno para el pago final.

¡Que gane el mejor pronosticador! 🏆
