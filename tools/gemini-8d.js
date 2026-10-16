/* ============ gemini-8d.js — hoja de andar en 5 direcciones con Gemini ============
 *
 *   node tools/gemini-8d.js <id> [atlas.png] [--bg green] [--model gemini-3-pro-image]
 *
 * Manda el atlas de Treasure Cruise de assets/ref/characters/<id>/ (el primer PNG que
 * empiece por "#", o el que le digas) a Gemini y guarda lo que devuelve como
 * <Id>Walk.png en la misma carpeta: 5 filas (abajo, abajo-derecha, derecha,
 * arriba-derecha, arriba) × 4 pasos, sobre fondo liso magenta (o verde con --bg green,
 * para personajes que llevan rosa o magenta). Las direcciones de la izquierda las saca
 * build-sprites en espejo.
 *
 * La clave va en la variable de entorno GEMINI_API_KEY (en Windows también se lee de
 * las variables de usuario). Nunca se imprime.
 */
const fs = require('fs'), path = require('path'), { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..', 'assets', 'ref', 'characters');
const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i >= 0 ? args.splice(i, 2)[1] : def; };
const MODEL = opt('model', 'gemini-3-pro-image');
const BG = opt('bg', 'magenta');
const [id, atlasArg] = args;
if (!id) { console.log('Uso: node tools/gemini-8d.js <id> [atlas.png] [--bg green] [--model ...]'); process.exit(1); }

/** La clave: del entorno o, en Windows, de las variables de usuario (sin mostrarla). */
function apiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY.trim();
  if (process.platform === 'win32') {
    const r = spawnSync('reg', ['query', 'HKCU\\Environment', '/v', 'GEMINI_API_KEY'], { encoding: 'utf8' });
    const m = /GEMINI_API_KEY\s+REG_\w+\s+(\S+)/.exec(r.stdout || '');
    if (m) return m[1].trim();
  }
  throw new Error('Falta GEMINI_API_KEY (ver README)');
}

const BG_TXT = BG === 'green' ? 'pure green (#00FF00)' : 'pure magenta (#FF00FF)';
const PROMPT = `Use the attached One Piece Treasure Cruise sprite sheet ONLY as a reference for the character's
look: same face, hair, outfit, colors, proportions and chibi art style.

Create a new sprite sheet of this character WALKING, seen from a top-down 3/4 RPG camera.

LAYOUT (very important):
- A grid of 5 rows and 4 columns, all cells the same size, evenly spaced, no grid lines.
- Row 1: facing the viewer (down). Row 2: facing down-right (3/4 front). Row 3: facing right
  (side profile). Row 4: facing up-right (3/4 back). Row 5: facing away from the viewer (up).
- Each row is a 4-frame walk cycle, left to right: 1) right foot forward touching the ground,
  2) passing pose, legs together, body slightly higher, 3) left foot forward touching the ground,
  4) passing pose again. Arms swing opposite to the legs.

CONSISTENCY:
- Exactly the same character size in all 20 frames: same height, same scale.
- Feet on the same baseline in every frame of a row; character centered in its cell.
- Full body visible in every frame, nothing cropped.

STYLE AND BACKGROUND:
- Match the reference art style exactly. Clean outlines, no motion blur.
- No effects, no shadows on the ground, no text, no labels, no numbers.
- Solid flat ${BG_TXT} background everywhere, with no gradients or texture.`;

async function main() {
  const dir = path.join(ROOT, id);
  if (!fs.existsSync(dir)) throw new Error('No existe la carpeta ' + dir);
  const atlas = atlasArg ? path.join(dir, atlasArg) : fs.readdirSync(dir).filter(f => f.startsWith('#') && /\.png$/i.test(f)).map(f => path.join(dir, f))[0];
  if (!atlas || !fs.existsSync(atlas)) throw new Error('No hay atlas de Treasure Cruise (#....png) en ' + dir);
  console.log('Atlas:', path.basename(atlas), '· modelo:', MODEL, '· fondo:', BG);

  const body = {
    contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: 'image/png', data: fs.readFileSync(atlas).toString('base64') } }] }],
    generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: '4:5' } }
  };
  const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/' + MODEL + ':generateContent', {
    method: 'POST', headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey() }, body: JSON.stringify(body)
  });
  const json = await res.json();
  if (!res.ok) throw new Error('Gemini: ' + res.status + ' ' + (json.error && json.error.message || ''));
  const part = (json.candidates?.[0]?.content?.parts || []).find(p => p.inlineData || p.inline_data);
  if (!part) throw new Error('Gemini no ha devuelto imagen: ' + JSON.stringify(json).slice(0, 400));
  const img = part.inlineData || part.inline_data;
  const ext = /png/.test(img.mimeType || img.mime_type) ? '.png' : '.jpg';
  const out = path.join(dir, id[0].toUpperCase() + id.slice(1) + 'Walk' + ext);
  fs.writeFileSync(out, Buffer.from(img.data, 'base64'));
  console.log('Guardado:', path.relative(path.join(__dirname, '..'), out));
}

main().catch(e => { console.error(e.message); process.exit(1); });
