// Bloque-3/incertidumbre/script.js

const capaMapa = document.getElementById('capaMapa');
const capaOscuridad = document.getElementById('capaOscuridad');
const ctxMapa = capaMapa.getContext('2d');
const ctxOscuridad = capaOscuridad.getContext('2d');

const ancho = window.innerWidth;
const alto = window.innerHeight;
capaMapa.width = capaOscuridad.width = ancho;
capaMapa.height = capaOscuridad.height = alto;

const colorPrimario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-primaria').trim() || '#f2f2f2';
const colorAcento = getComputedStyle(document.documentElement).getPropertyValue('--color-acento').trim() || '#d94f30';
const colorFondo = getComputedStyle(document.documentElement).getPropertyValue('--color-fondo').trim() || '#0e0e10';

const RADIO_LUZ = 180;
const TAMAÑO_TOKEN = 26;
const RADIO_TOKEN = TAMAÑO_TOKEN / 2;
const TIPOS_TOKEN = ['circulo', 'cuadrado', 'triangulo']; // la línea queda reservada para los obstáculos

const CANTIDAD_OBSTACULOS = 18;
const LARGO_MIN_OBSTACULO = 60;
const LARGO_MAX_OBSTACULO = 160;
const MARGEN_BORDE = 40;

const RONDAS_TOTALES = 5;
let rondaActual = 1;
let metaAlcanzada = false;
let obstaculos = [];
let meta, token;
let arrastrando = false;
let offsetAgarre = { x: 0, y: 0 };
let posAnteriorToken = { x: 0, y: 0 };
let radioLuzVisual = RADIO_LUZ; // Empieza con el valor original (150)

// -- Definir límites para el radio de luz --
const RADIO_LUZ_MAX = 200; // Radio completo al estar quieto
const RADIO_LUZ_MIN = 60;  // Radio castigado por velocidad rápida
const UMBRAL_VELOCIDAD = 15; // Velocidad a partir de la cual empieza el castigo

// --- Generación de un campo de obstáculos dispersos (no un laberinto estructurado) ---
// Reemplaza tu función generarObstaculos con esta:
function generarObstaculos(puntoExclusion) {
  obstaculos = [];
  let intentos = 0;

  while (obstaculos.length < CANTIDAD_OBSTACULOS && intentos < CANTIDAD_OBSTACULOS * 20) {
    intentos++;
    const cx = MARGEN_BORDE + Math.random() * (ancho - MARGEN_BORDE * 2);
    const cy = MARGEN_BORDE + Math.random() * (alto - MARGEN_BORDE * 2);
    const largo = LARGO_MIN_OBSTACULO + Math.random() * (LARGO_MAX_OBSTACULO - LARGO_MIN_OBSTACULO);
    const angulo = Math.random() * Math.PI * 2;
    // Nueva propiedad: velocidad de rotación aleatoria (algunas giran a un lado, otras al otro)
    const velRotacion = (Math.random() - 0.5) * 0.02; 

    // Calculamos los extremos basados en el centro (cx, cy)
    const x1 = cx + Math.cos(angulo) * (largo / 2);
    const y1 = cy + Math.sin(angulo) * (largo / 2);
    const x2 = cx - Math.cos(angulo) * (largo / 2);
    const y2 = cy - Math.sin(angulo) * (largo / 2);

    const distAlInicio = Math.hypot(puntoExclusion.x - cx, puntoExclusion.y - cy);
    if (distAlInicio < RADIO_LUZ) continue;

    obstaculos.push({ cx, cy, largo, angulo, velRotacion, x1, y1, x2, y2 });
  }
}

// --- Geometría: distancia de un punto a un segmento (para colisión y para el excluir zona inicial) ---
function distanciaPuntoSegmento(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const largo2 = dx * dx + dy * dy;
  let t = largo2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / largo2;
  t = Math.max(0, Math.min(1, t));
  const cx = x1 + t * dx;
  const cy = y1 + t * dy;
  return Math.hypot(px - cx, py - cy);
}

function colisionaConObstaculos(x, y) {
  return obstaculos.some((o) => distanciaPuntoSegmento(x, y, o.x1, o.y1, o.x2, o.y2) < RADIO_TOKEN + 4);
}

// --- Dibujo del campo (capa de abajo, siempre completo) ---
function dibujarCampo() {
  ctxMapa.clearRect(0, 0, ancho, alto);
  ctxMapa.strokeStyle = colorPrimario;
  ctxMapa.lineWidth = 3;
  ctxMapa.lineCap = 'round';

  obstaculos.forEach((o) => {
    // Actualizar rotación
    o.angulo += o.velRotacion;
    o.x1 = o.cx + Math.cos(o.angulo) * (o.largo / 2);
    o.y1 = o.cy + Math.sin(o.angulo) * (o.largo / 2);
    o.x2 = o.cx - Math.cos(o.angulo) * (o.largo / 2);
    o.y2 = o.cy - Math.sin(o.angulo) * (o.largo / 2);

    ctxMapa.beginPath();
    ctxMapa.moveTo(o.x1, o.y1);
    ctxMapa.lineTo(o.x2, o.y2);
    ctxMapa.stroke();
  });

  // Dibujar meta oculta
  ctxMapa.fillStyle = colorAcento;
  ctxMapa.beginPath();
  ctxMapa.arc(meta.x, meta.y, 10, 0, Math.PI * 2);
  ctxMapa.fill();
}

// --- Dibujo del token ---
function dibujarToken(ctx) {
  ctx.fillStyle = colorPrimario;
  ctx.beginPath();

  if (token.tipo === 'circulo') {
    ctx.arc(token.x, token.y, RADIO_TOKEN, 0, Math.PI * 2);
  } else if (token.tipo === 'triangulo') {
    ctx.moveTo(token.x, token.y - RADIO_TOKEN);
    ctx.lineTo(token.x + RADIO_TOKEN, token.y + RADIO_TOKEN);
    ctx.lineTo(token.x - RADIO_TOKEN, token.y + RADIO_TOKEN);
    ctx.closePath();
  } else {
    ctx.rect(token.x - RADIO_TOKEN, token.y - RADIO_TOKEN, RADIO_TOKEN * 2, RADIO_TOKEN * 2);
  }
  ctx.fill();
}

// --- Loop de renderizado: oscuridad + agujero de luz + pulso de proximidad a la meta ---
function dibujarFrame() {
  ctxOscuridad.globalCompositeOperation = 'source-over';
  ctxOscuridad.fillStyle = colorFondo;
  ctxOscuridad.fillRect(0, 0, ancho, alto);

  // --- 1. LÓGICA DE VELOCIDAD Y RADIO DE LUZ ---
  let radioObjetivo = RADIO_LUZ; // Radio por defecto (150)

  // Solo castigamos si el usuario está interactuando
  if (arrastrando) {
    const dx = token.x - posAnteriorToken.x;
    const dy = token.y - posAnteriorToken.y;
    const velocidadFrame = Math.hypot(dx, dy);

    // Valores súper agresivos
    const UMBRAL_VELOCIDAD = 1; // Prácticamente cualquier movimiento rápido lo activa
    const RADIO_MINIMO = 20;    // La luz se pega casi a la figura (que mide 13)

    if (velocidadFrame > UMBRAL_VELOCIDAD) {
      // Multiplicador gigante: apenás acelerás, el radio cae en picada
      const reduccion = (velocidadFrame - UMBRAL_VELOCIDAD) * 20; 
      radioObjetivo = Math.max(RADIO_MINIMO, RADIO_LUZ - reduccion);
    }
  }

  // Guardamos la posición actual para compararla en el próximo frame
  posAnteriorToken = { x: token.x, y: token.y };

  // Interpolación diferenciada (Game Feel)
  if (radioObjetivo < radioLuzVisual) {
    // Si la luz se está achicando, lo hace súper rápido (0.4)
    radioLuzVisual += (radioObjetivo - radioLuzVisual) * 0.4; 
  } else {
    // Si te quedás quieto y la luz se recupera, lo hace muy lento (0.02)
    radioLuzVisual += (radioObjetivo - radioLuzVisual) * 0.02; 
  }

  //radioLuzVisual += (radioObjetivo - radioLuzVisual) * 0.15;
  // ---------------------------------------------

  // Pulso sutil: si la meta está cerca
  const distanciaAMeta = Math.hypot(token.x - meta.x, token.y - meta.y);
  const RADIO_INSINUACION = RADIO_LUZ * 2.5;
  
  // Verificamos usando el radioLuzVisual para que el pulso responda a la ceguera
  if (distanciaAMeta > radioLuzVisual && distanciaAMeta < RADIO_INSINUACION) {
    const cercania = 1 - (distanciaAMeta - radioLuzVisual) / (RADIO_INSINUACION - radioLuzVisual);
    const pulso = (Math.sin(performance.now() / 300) + 1) / 2; // oscila entre 0 y 1
    // Math.max evita valores negativos si hay un salto brusco
    const opacidadInsinuacion = Math.max(0, cercania * pulso * 0.15); 

    ctxOscuridad.globalCompositeOperation = 'destination-out';
    ctxOscuridad.fillStyle = `rgba(0,0,0,${opacidadInsinuacion})`;
    ctxOscuridad.beginPath();
    ctxOscuridad.arc(meta.x, meta.y, 18, 0, Math.PI * 2);
    ctxOscuridad.fill();
  }

  // Agujero de luz real alrededor del token (usando el tamaño dinámico)
  const gradiente = ctxOscuridad.createRadialGradient(token.x, token.y, 0, token.x, token.y, radioLuzVisual);
  gradiente.addColorStop(0, 'rgba(0,0,0,1)');
  gradiente.addColorStop(1, 'rgba(0,0,0,0)');

  ctxOscuridad.globalCompositeOperation = 'destination-out';
  ctxOscuridad.fillStyle = gradiente;
  ctxOscuridad.beginPath();
  ctxOscuridad.arc(token.x, token.y, radioLuzVisual, 0, Math.PI * 2);
  ctxOscuridad.fill();

  ctxOscuridad.globalCompositeOperation = 'source-over';
  dibujarToken(ctxOscuridad);

  requestAnimationFrame(dibujarFrame);
}

// -- Modificá tu función moverToken(mx, my) --
function moverToken(mx, my) {
  // 1. Guardar posición actual antes del movimiento
  const dx = mx - token.x;
  const dy = my - token.y;
  // 2. Calcular la distancia movida (velocidad instantánea)
  velocidadActual = Math.hypot(dx, dy);

  // (Aquí va tu código de movimiento libre con colisión existente...)
  if (!colisionaConObstaculos(mx, token.y)) token.x = mx;
  if (!colisionaConObstaculos(token.x, my)) token.y = my;

  verificarMeta();
}

function verificarMeta() {
  if (metaAlcanzada) return; // ya se está procesando la llegada, ignorar el resto de los movimientos

  const distancia = Math.hypot(token.x - meta.x, token.y - meta.y);
  if (distancia < RADIO_TOKEN + 12) {
    metaAlcanzada = true;
    setTimeout(siguienteRonda, 600);
  }
}

// --- Control de rondas ---
function elegirPuntoLibre(evitar) {
  let punto;
  let intentos = 0;
  do {
    punto = {
      x: MARGEN_BORDE + Math.random() * (ancho - MARGEN_BORDE * 2),
      y: MARGEN_BORDE + Math.random() * (alto - MARGEN_BORDE * 2)
    };
    intentos++;
  } while (
    intentos < 100 &&
    (colisionaConObstaculos(punto.x, punto.y) ||
      (evitar && Math.hypot(punto.x - evitar.x, punto.y - evitar.y) < ancho * 0.35))
  );
  return punto;
}

function iniciarRonda() {
  const inicio = { x: ancho / 2, y: alto / 2 };
  generarObstaculos(inicio);
  meta = elegirPuntoLibre(inicio);

  token = {
    x: inicio.x, y: inicio.y,
    tipo: TIPOS_TOKEN[Math.floor(Math.random() * TIPOS_TOKEN.length)]
  };

  metaAlcanzada = false; // NUEVO: se resetea al arrancar cada ronda
  dibujarCampo();
}

function siguienteRonda() {
  rondaActual++; // sigue sumando indefinidamente, sin techo
  iniciarRonda();
}

// --- Interacción: drag con mouse ---
capaOscuridad.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const rect = capaOscuridad.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  const distanciaAlToken = Math.hypot(mx - token.x, my - token.y);

  // Solo arranca el drag si el clic fue realmente sobre la figura (con un margen chico de tolerancia)
  if (distanciaAlToken <= RADIO_TOKEN + 10) {
    arrastrando = true;
    offsetAgarre.x = token.x - mx; // guarda dónde agarraste respecto al centro real
    offsetAgarre.y = token.y - my;
  }
});

document.addEventListener('mouseup', () => { arrastrando = false; });

document.addEventListener('mousemove', (e) => {
  if (!arrastrando) return;
  const rect = capaOscuridad.getBoundingClientRect();
  const mx = e.clientX - rect.left + offsetAgarre.x;
  const my = e.clientY - rect.top + offsetAgarre.y;
  moverToken(mx, my);
});

iniciarRonda();
dibujarFrame();