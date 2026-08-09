// Bloque-3/ansiedad/script.js

const contenedor = document.getElementById('canvas-ansiedad');
const zonaObjetivo = document.getElementById('zona-objetivo');
const figuraEl = document.getElementById('figura-ansiedad');
const aciertosEl = document.getElementById('aciertos');
const perdidasEl = document.getElementById('perdidas');

const ICONOS = { circulo: '●', cuadrado: '■', triangulo: '▲', linea: '▬' };
const TIPOS = Object.keys(ICONOS);

const TIEMPO_INICIAL = 5000;
const TIEMPO_MINIMO = 1500;
const REDUCCION_POR_ACIERTO = 200;
const RESPUESTA_MINIMA = 0.35; // qué tan "pesada" se vuelve la figura al final

const CANTIDAD_OBSTACULOS = 6;
const TAMAÑO_OBSTACULO = { min: 100, max: 250 };
const MITAD_FIGURA = 33;

let tiempoLimiteActual = TIEMPO_INICIAL;
let inicioRonda = 0;
let arrastrando = false;
let offsetArrastreX = 0, offsetArrastreY = 0;
let posicionBase = { x: 0, y: 0 };
let posicionCursor = { x: 0, y: 0 };
let obstaculos = [];
let aciertos = 0, perdidas = 0;
let rondaActiva = false;

function posicionAleatoria(margen = 100) {
  const ancho = contenedor.clientWidth;
  const alto = contenedor.clientHeight;
  return {
    x: margen + Math.random() * (ancho - margen * 2),
    y: margen + Math.random() * (alto - margen * 2)
  };
}

// --- Obstáculos: visibles, bloquean el paso directo ---
// script.js — reemplazar generarObstaculos() por esta versión

function generarObstaculos(evitarA, evitarB) {
  contenedor.querySelectorAll('.obstaculo').forEach((el) => el.remove());
  obstaculos = [];

  let intentos = 0;
  while (obstaculos.length < CANTIDAD_OBSTACULOS && intentos < 60) {
    intentos++;
    const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
    let ancho = TAMAÑO_OBSTACULO.min + Math.random() * (TAMAÑO_OBSTACULO.max - TAMAÑO_OBSTACULO.min);
    let alto = TAMAÑO_OBSTACULO.min + Math.random() * (TAMAÑO_OBSTACULO.max - TAMAÑO_OBSTACULO.min);

    if (tipo === 'linea') alto = 10;      // la línea siempre queda fina
    if (tipo === 'circulo') alto = ancho; // el círculo necesita proporción 1:1

    const x = 40 + Math.random() * (contenedor.clientWidth - ancho - 80);
    const y = 40 + Math.random() * (contenedor.clientHeight - alto - 80);

    const centroX = x + ancho / 2;
    const centroY = y + alto / 2;
    const distA = Math.hypot(centroX - evitarA.x, centroY - evitarA.y);
    const distB = Math.hypot(centroX - evitarB.x, centroY - evitarB.y);

    if (distA < 90 || distB < 90) continue;

    obstaculos.push({ x, y, ancho, alto });

    const el = document.createElement('div');
    el.className = `obstaculo obstaculo-${tipo}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${ancho}px`;
    el.style.height = `${alto}px`;
    contenedor.appendChild(el);
  }
}

function colisionaConObstaculo(x, y) {
  return obstaculos.some((o) =>
    x + MITAD_FIGURA > o.x && x - MITAD_FIGURA < o.x + o.ancho &&
    y + MITAD_FIGURA > o.y && y - MITAD_FIGURA < o.y + o.alto
  );
}

// Intenta el movimiento completo; si choca, desliza sobre el eje libre; si no hay ninguno, no se mueve
function moverConColision(actual, destinoX, destinoY) {
  if (!colisionaConObstaculo(destinoX, destinoY)) return { x: destinoX, y: destinoY };
  if (!colisionaConObstaculo(destinoX, actual.y)) return { x: destinoX, y: actual.y };
  if (!colisionaConObstaculo(actual.x, destinoY)) return { x: actual.x, y: destinoY };
  return { x: actual.x, y: actual.y };
}

// --- Rondas ---
function iniciarRonda() {
  const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
  figuraEl.textContent = ICONOS[tipo];

  posicionBase = posicionAleatoria(120);
  figuraEl.style.left = `${posicionBase.x - 32}px`;
  figuraEl.style.top = `${posicionBase.y - 32}px`;

  const posZona = posicionAleatoria(80);
  zonaObjetivo.style.left = `${posZona.x - 50}px`;
  zonaObjetivo.style.top = `${posZona.y - 50}px`;
  zonaObjetivo.classList.remove('activa');

  generarObstaculos(posicionBase, posZona);

  inicioRonda = performance.now();
  rondaActiva = true;
}

function perderFigura() {
  rondaActiva = false;
  arrastrando = false;
  perdidas++;
  perdidasEl.textContent = perdidas;

  const direccion = Math.random() > 0.5 ? 1 : -1;
  figuraEl.style.transition = 'transform 0.25s ease-out, opacity 0.25s ease-out';
  figuraEl.style.transform = `translate(${direccion * 60}px, -40px) scale(0.5) rotate(${direccion * 90}deg)`;
  figuraEl.style.opacity = '0';

  setTimeout(() => {
    figuraEl.style.transition = '';
    figuraEl.style.transform = '';
    figuraEl.style.opacity = '1';
    iniciarRonda();
  }, 300);
}

function lograrAcierto() {
  rondaActiva = false;
  arrastrando = false;
  aciertos++;
  aciertosEl.textContent = aciertos;
  zonaObjetivo.classList.add('activa');

  tiempoLimiteActual = Math.max(TIEMPO_MINIMO, tiempoLimiteActual - REDUCCION_POR_ACIERTO);

  figuraEl.style.transition = 'transform 0.2s ease-out, opacity 0.2s ease-out';
  figuraEl.style.transform = 'scale(0.3)';
  figuraEl.style.opacity = '0';

  setTimeout(() => {
    figuraEl.style.transition = '';
    figuraEl.style.transform = '';
    figuraEl.style.opacity = '1';
    iniciarRonda();
  }, 250);
}

function estaDentroDeZona() {
  const rectFigura = figuraEl.getBoundingClientRect();
  const rectZona = zonaObjetivo.getBoundingClientRect();
  const cx = rectFigura.left + rectFigura.width / 2;
  const cy = rectFigura.top + rectFigura.height / 2;
  return cx >= rectZona.left && cx <= rectZona.right && cy >= rectZona.top && cy <= rectZona.bottom;
}

// --- Drag ---
figuraEl.addEventListener('mousedown', (e) => {
  if (!rondaActiva) return;
  e.preventDefault();
  arrastrando = true;
  const rect = figuraEl.getBoundingClientRect();
  offsetArrastreX = e.clientX - rect.left;
  offsetArrastreY = e.clientY - rect.top;
  posicionCursor = { ...posicionBase };
});

document.addEventListener('mousemove', (e) => {
  if (!arrastrando) return;
  posicionCursor = {
    x: e.clientX - offsetArrastreX + 32,
    y: e.clientY - offsetArrastreY + 32
  };
});

document.addEventListener('mouseup', () => {
  if (!arrastrando) return;
  arrastrando = false;
  if (rondaActiva && estaDentroDeZona()) {
    lograrAcierto();
  }
});

document.addEventListener('dragstart', (e) => e.preventDefault());

// --- Loop: retraso creciente + colisión con obstáculos + vibración ---
function loop() {
  if (rondaActiva) {
    const transcurrido = performance.now() - inicioRonda;
    const progreso = Math.min(transcurrido / tiempoLimiteActual, 1);

    if (progreso >= 1) {
      perderFigura();
    } else {
      if (arrastrando) {
        const factorRespuesta = 1 - (1 - RESPUESTA_MINIMA) * progreso;
        const destinoX = posicionBase.x + (posicionCursor.x - posicionBase.x) * factorRespuesta;
        const destinoY = posicionBase.y + (posicionCursor.y - posicionBase.y) * factorRespuesta;
        posicionBase = moverConColision(posicionBase, destinoX, destinoY);
      }

      const amplitud = Math.pow(progreso, 2) * 14;
      const jitterX = (Math.random() * 2 - 1) * amplitud;
      const jitterY = (Math.random() * 2 - 1) * amplitud;
      figuraEl.style.left = `${posicionBase.x - 32 + jitterX}px`;
      figuraEl.style.top = `${posicionBase.y - 32 + jitterY}px`;
    }
  }
  requestAnimationFrame(loop);
}

iniciarRonda();
loop();