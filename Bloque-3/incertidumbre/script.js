// Bloque-3/incertidumbre/script.js

const capaMapa = document.getElementById('capaMapa');
const capaOscuridad = document.getElementById('capaOscuridad');
const ctxMapa = capaMapa.getContext('2d');
const ctxOscuridad = capaOscuridad.getContext('2d');
capaOscuridad.draggable = false;

const ancho = window.innerWidth;
const alto = window.innerHeight;
capaMapa.width = capaOscuridad.width = ancho;
capaMapa.height = capaOscuridad.height = alto;

const colorPrimario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-primaria').trim() || '#f2f2f2';
const colorAcento = getComputedStyle(document.documentElement).getPropertyValue('--color-acento').trim() || '#d94f30';

// --- Configuración del laberinto ---
const FILAS = 6;
const COLUMNAS = 6;
const TAMAÑO_TABLERO = Math.min(ancho, alto) * 0.7;
const celdaSize = TAMAÑO_TABLERO / FILAS;
const origenX = (ancho - celdaSize * COLUMNAS) / 2;
const origenY = (alto - celdaSize * FILAS) / 2;

const RADIO_LUZ = celdaSize * 1.3;
const TAMAÑO_TOKEN = celdaSize * 0.4;
const TIPOS_TOKEN = ['circulo', 'cuadrado', 'triangulo']; // la línea queda reservada para los muros

const RONDAS_TOTALES = 5;
let rondaActual = 1;
let maze, meta, token;
let arrastrando = false;

// --- Generación del laberinto (recursive backtracker) ---
function generarLaberinto() {
  maze = [];
  for (let f = 0; f < FILAS; f++) {
    const fila = [];
    for (let c = 0; c < COLUMNAS; c++) {
      fila.push({ arriba: true, derecha: true, abajo: true, izquierda: true, visitada: false });
    }
    maze.push(fila);
  }

  const pila = [{ f: 0, c: 0 }];
  maze[0][0].visitada = true;

  while (pila.length > 0) {
    const actual = pila[pila.length - 1];
    const vecinos = obtenerVecinosNoVisitados(actual.f, actual.c);

    if (vecinos.length === 0) {
      pila.pop();
      continue;
    }

    const siguiente = vecinos[Math.floor(Math.random() * vecinos.length)];
    derribarPared(actual, siguiente);
    maze[siguiente.f][siguiente.c].visitada = true;
    pila.push(siguiente);
  }
}

function obtenerVecinosNoVisitados(f, c) {
  const vecinos = [];
  if (f > 0 && !maze[f - 1][c].visitada) vecinos.push({ f: f - 1, c, dir: 'arriba' });
  if (c < COLUMNAS - 1 && !maze[f][c + 1].visitada) vecinos.push({ f, c: c + 1, dir: 'derecha' });
  if (f < FILAS - 1 && !maze[f + 1][c].visitada) vecinos.push({ f: f + 1, c, dir: 'abajo' });
  if (c > 0 && !maze[f][c - 1].visitada) vecinos.push({ f, c: c - 1, dir: 'izquierda' });
  return vecinos;
}

function derribarPared(actual, siguiente) {
  const opuestas = { arriba: 'abajo', derecha: 'izquierda', abajo: 'arriba', izquierda: 'derecha' };
  maze[actual.f][actual.c][siguiente.dir] = false;
  maze[siguiente.f][siguiente.c][opuestas[siguiente.dir]] = false;
}

// --- Utilidades de grilla ---
function celdaCentro(f, c) {
  return {
    x: origenX + c * celdaSize + celdaSize / 2,
    y: origenY + f * celdaSize + celdaSize / 2
  };
}

function elegirCeldaAlAzar() {
  return { f: Math.floor(Math.random() * FILAS), c: Math.floor(Math.random() * COLUMNAS) };
}

// --- Dibujo del laberinto (capa de abajo, siempre completo) ---
function dibujarLaberinto() {
  ctxMapa.clearRect(0, 0, ancho, alto);
  ctxMapa.strokeStyle = colorPrimario;
  ctxMapa.lineWidth = 3;

  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      const x = origenX + c * celdaSize;
      const y = origenY + f * celdaSize;
      const celda = maze[f][c];

      ctxMapa.beginPath();
      if (celda.arriba) { ctxMapa.moveTo(x, y); ctxMapa.lineTo(x + celdaSize, y); }
      if (celda.derecha) { ctxMapa.moveTo(x + celdaSize, y); ctxMapa.lineTo(x + celdaSize, y + celdaSize); }
      if (celda.abajo) { ctxMapa.moveTo(x, y + celdaSize); ctxMapa.lineTo(x + celdaSize, y + celdaSize); }
      if (celda.izquierda) { ctxMapa.moveTo(x, y); ctxMapa.lineTo(x, y + celdaSize); }
      ctxMapa.stroke();
    }
  }

  // Meta: un pequeño marcador, oculto bajo la oscuridad hasta que la luz lo alcance
  const centroMeta = celdaCentro(meta.f, meta.c);
  ctxMapa.fillStyle = colorAcento;
  ctxMapa.beginPath();
  ctxMapa.arc(centroMeta.x, centroMeta.y, celdaSize * 0.15, 0, Math.PI * 2);
  ctxMapa.fill();
}

// --- Dibujo del token (la figura que el usuario mueve) ---
function dibujarToken(ctx) {
  const r = TAMAÑO_TOKEN / 2;
  ctx.fillStyle = colorPrimario;
  ctx.beginPath();

  if (token.tipo === 'circulo') {
    ctx.arc(token.x, token.y, r, 0, Math.PI * 2);
  } else if (token.tipo === 'triangulo') {
    ctx.moveTo(token.x, token.y - r);
    ctx.lineTo(token.x + r, token.y + r);
    ctx.lineTo(token.x - r, token.y + r);
    ctx.closePath();
  } else {
    ctx.rect(token.x - r, token.y - r, r * 2, r * 2);
  }
  ctx.fill();
}

// --- Loop de renderizado: oscuridad total + agujero de luz alrededor del token ---
function dibujarFrame() {
  ctxOscuridad.globalCompositeOperation = 'source-over';
  ctxOscuridad.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--color-fondo').trim() || '#0e0e10';
  ctxOscuridad.fillRect(0, 0, ancho, alto);

  const gradiente = ctxOscuridad.createRadialGradient(token.x, token.y, 0, token.x, token.y, RADIO_LUZ);
  gradiente.addColorStop(0, 'rgba(0,0,0,1)');
  gradiente.addColorStop(1, 'rgba(0,0,0,0)');

  ctxOscuridad.globalCompositeOperation = 'destination-out';
  ctxOscuridad.fillStyle = gradiente;
  ctxOscuridad.beginPath();
  ctxOscuridad.arc(token.x, token.y, RADIO_LUZ, 0, Math.PI * 2);
  ctxOscuridad.fill();

  ctxOscuridad.globalCompositeOperation = 'source-over';
  dibujarToken(ctxOscuridad);

  requestAnimationFrame(dibujarFrame);
}

// --- Movimiento restringido por las paredes del laberinto ---
function moverToken(mx, my) {
  const cObjetivo = Math.min(COLUMNAS - 1, Math.max(0, Math.floor((mx - origenX) / celdaSize)));
  const fObjetivo = Math.min(FILAS - 1, Math.max(0, Math.floor((my - origenY) / celdaSize)));

  if (cObjetivo === token.c && fObjetivo === token.f) {
    token.x = mx;
    token.y = my;
    return;
  }

  const df = fObjetivo - token.f;
  const dc = cObjetivo - token.c;

  // Solo se permite avanzar a una celda directamente adyacente, y solo si no hay pared en el medio
  if (Math.abs(df) + Math.abs(dc) === 1) {
    const celdaActual = maze[token.f][token.c];
    let permitido = false;
    if (df === -1 && !celdaActual.arriba) permitido = true;
    if (df === 1 && !celdaActual.abajo) permitido = true;
    if (dc === 1 && !celdaActual.derecha) permitido = true;
    if (dc === -1 && !celdaActual.izquierda) permitido = true;

    if (permitido) {
      token.f = fObjetivo;
      token.c = cObjetivo;
      const centro = celdaCentro(fObjetivo, cObjetivo);
      token.x = centro.x;
      token.y = centro.y;
      verificarMeta();
    }
    // si hay pared, el token no se mueve: choca y se queda donde estaba
  }
}

function verificarMeta() {
  if (token.f === meta.f && token.c === meta.c) {
    setTimeout(siguienteRonda, 600); // pequeña pausa para que se note el hallazgo antes de regenerar
  }
}

// --- Control de rondas ---
function iniciarRonda() {
  generarLaberinto();
  const inicio = elegirCeldaAlAzar();

  // NUEVO: elegimos la meta entre las celdas más lejanas del inicio, midiendo el camino real
  const distancias = calcularDistancias(inicio);
  let distanciaMaxima = 0;
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      if (distancias[f][c] > distanciaMaxima) distanciaMaxima = distancias[f][c];
    }
  }

  const UMBRAL = 0.7; // la meta va a estar, como mínimo, al 70% del recorrido más largo posible
  const candidatas = [];
  for (let f = 0; f < FILAS; f++) {
    for (let c = 0; c < COLUMNAS; c++) {
      if (distancias[f][c] >= distanciaMaxima * UMBRAL) candidatas.push({ f, c });
    }
  }

  meta = candidatas[Math.floor(Math.random() * candidatas.length)];

  const centro = celdaCentro(inicio.f, inicio.c);
  token = {
    f: inicio.f, c: inicio.c,
    x: centro.x, y: centro.y,
    tipo: TIPOS_TOKEN[Math.floor(Math.random() * TIPOS_TOKEN.length)]
  };

  dibujarLaberinto();
  document.getElementById('rondaActual').textContent = rondaActual;
}

function siguienteRonda() {
  rondaActual++;
  if (rondaActual > RONDAS_TOTALES) {
    document.getElementById('info').textContent = 'Recorrido completo';
    return;
  }
  iniciarRonda();
}

// Agregar estas dos funciones nuevas

function obtenerVecinosTransitables(f, c) {
  const celda = maze[f][c];
  const vecinos = [];
  if (!celda.arriba && f > 0) vecinos.push({ f: f - 1, c });
  if (!celda.derecha && c < COLUMNAS - 1) vecinos.push({ f, c: c + 1 });
  if (!celda.abajo && f < FILAS - 1) vecinos.push({ f: f + 1, c });
  if (!celda.izquierda && c > 0) vecinos.push({ f, c: c - 1 });
  return vecinos;
}

function calcularDistancias(inicio) {
  const dist = Array.from({ length: FILAS }, () => Array(COLUMNAS).fill(-1));
  const cola = [inicio];
  dist[inicio.f][inicio.c] = 0;

  while (cola.length > 0) {
    const actual = cola.shift();
    obtenerVecinosTransitables(actual.f, actual.c).forEach((vecino) => {
      if (dist[vecino.f][vecino.c] === -1) {
        dist[vecino.f][vecino.c] = dist[actual.f][actual.c] + 1;
        cola.push(vecino);
      }
    });
  }
  return dist;
}

// --- Interacción: tap o drag con mouse ---
// Por esta:
capaOscuridad.addEventListener('mousedown', (e) => {
  e.preventDefault(); // NUEVO: bloquea el drag nativo del navegador antes de que arranque
  arrastrando = true;
});
document.addEventListener('mouseup', () => { arrastrando = false; });
document.addEventListener('mousemove', (e) => {
  if (!arrastrando) return;
  const rect = capaOscuridad.getBoundingClientRect();
  moverToken(e.clientX - rect.left, e.clientY - rect.top);
});

iniciarRonda();
dibujarFrame();