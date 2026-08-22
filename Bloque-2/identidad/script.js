// Bloque-2/empatia/script.js

const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');
const bandeja = document.getElementById('bandeja');

const ancho = window.innerWidth;
const alto = window.innerHeight;
lienzo.width = ancho;
lienzo.height = alto;

const colorPrimario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-primaria').trim() || '#f2f2f2';
const colorAcento = getComputedStyle(document.documentElement).getPropertyValue('--color-acento').trim() || '#d94f30';
const colorFondo = getComputedStyle(document.documentElement).getPropertyValue('--color-fondo').trim() || '#0e0e10';
const colorSecundario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-secundaria').trim() || '#8a8a8f';

const CENTRO = { x: ancho / 2, y: alto / 2 };
const RADIO_CENTRO = 55;
const RADIO_ZONA_SINTONIA = 130;
const TIPOS_TOKEN = ['circulo', 'cuadrado', 'triangulo'];
const TAMAÑO_FIGURA = 30;

const FIGURAS_NECESARIAS = 5;
const TIEMPO_SINCRONIA_MS = 1400; // cuánto tiempo acumulado en fase abierta hace falta para conectar

let conexionesLogradas = 0;
let figurasConectadas = []; // { x, y, tipo } — quedan fijas, forman la constelación
let figuraArrastrando = null; // { tipo, x, y, sincroAcumulada }
let offsetAgarre = { x: 0, y: 0 };
let ultimoFrame = performance.now();

// Cada conexión lograda profundiza y calma un poco el pulso
let intensidadPulso = 1;
let velocidadPulso = 1;

function valorPulso(t) {
  const base = 0.6 * Math.sin(t * 0.0009 * velocidadPulso) + 0.4 * Math.sin(t * 0.0017 * velocidadPulso + 1.3);
  return (base * intensidadPulso + 1) / 2; // normalizado 0..1
}

function faseAbierta(t) {
  return valorPulso(t) > 0.6;
}

// --- Bandeja: siempre ofrece una figura nueva para arrastrar ---
const iconos = { circulo: '●', cuadrado: '■', triangulo: '▲' };

function renderizarBandeja() {
  bandeja.innerHTML = '';
  if (conexionesLogradas >= FIGURAS_NECESARIAS) return;

  const tipo = TIPOS_TOKEN[Math.floor(Math.random() * TIPOS_TOKEN.length)];
  const el = document.createElement('div');
  el.className = 'figura-arrastrable';
  el.dataset.tipo = tipo;
  el.textContent = iconos[tipo];
  el.addEventListener('mousedown', iniciarArrastre);
  bandeja.appendChild(el);
}

function iniciarArrastre(e) {
  const rect = lienzo.getBoundingClientRect();
  figuraArrastrando = {
    tipo: e.currentTarget.dataset.tipo,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
    sincroAcumulada: 0
  };
  e.currentTarget.style.visibility = 'hidden'; // se "levanta" de la bandeja mientras se arrastra
  offsetAgarre = { x: 0, y: 0 };
}

document.addEventListener('mousemove', (e) => {
  if (!figuraArrastrando) return;
  const rect = lienzo.getBoundingClientRect();
  figuraArrastrando.x = e.clientX - rect.left;
  figuraArrastrando.y = e.clientY - rect.top;
});

document.addEventListener('mouseup', () => {
  if (!figuraArrastrando) return;
  // Si no llegó a completar la sincronía, el intento se pierde y aparece una figura nueva para reintentar
  figuraArrastrando = null;
  renderizarBandeja();
});

// --- Lógica de conexión ---
function actualizarSincronia(deltaMs, t) {
  if (!figuraArrastrando) return;

  const distancia = Math.hypot(figuraArrastrando.x - CENTRO.x, figuraArrastrando.y - CENTRO.y);
  const dentroDeZona = distancia <= RADIO_ZONA_SINTONIA;

  if (dentroDeZona && faseAbierta(t)) {
    figuraArrastrando.sincroAcumulada += deltaMs;
  }

  if (figuraArrastrando.sincroAcumulada >= TIEMPO_SINCRONIA_MS) {
    conectarFigura(figuraArrastrando);
    figuraArrastrando = null;
    renderizarBandeja();
  }
}

function conectarFigura(figura) {
  figurasConectadas.push({ x: figura.x, y: figura.y, tipo: figura.tipo });
  conexionesLogradas++;
  document.getElementById('contadorConexiones').textContent = conexionesLogradas;

  // Cada conexión lograda calma un poco el pulso: se vuelve más lento y menos errático
  intensidadPulso = Math.max(0.4, intensidadPulso - 0.1);
  velocidadPulso = Math.max(0.5, velocidadPulso - 0.08);
}

// --- Dibujo ---
function dibujarFiguraGenerica(ctx, x, y, tipo, tamaño, color) {
  const r = tamaño / 2;
  ctx.fillStyle = color;
  ctx.beginPath();
  if (tipo === 'circulo') {
    ctx.arc(x, y, r, 0, Math.PI * 2);
  } else if (tipo === 'triangulo') {
    ctx.moveTo(x, y - r);
    ctx.lineTo(x + r, y + r);
    ctx.lineTo(x - r, y + r);
    ctx.closePath();
  } else {
    ctx.rect(x - r, y - r, r * 2, r * 2);
  }
  ctx.fill();
}

function dibujarFrame(t) {
  const deltaMs = t - ultimoFrame;
  ultimoFrame = t;

  ctx.fillStyle = colorFondo;
  ctx.fillRect(0, 0, ancho, alto);

  // Zona de sintonía (referencia visual, construida con línea discontinua)
  ctx.strokeStyle = colorSecundario;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 6]);
  ctx.beginPath();
  ctx.arc(CENTRO.x, CENTRO.y, RADIO_ZONA_SINTONIA, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  // Líneas fijas hacia las figuras ya conectadas
  figurasConectadas.forEach((f) => {
    ctx.strokeStyle = colorAcento;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CENTRO.x, CENTRO.y);
    ctx.lineTo(f.x, f.y);
    ctx.stroke();
    dibujarFiguraGenerica(ctx, f.x, f.y, f.tipo, TAMAÑO_FIGURA, colorPrimario);
  });

  // Anillo de pulso: visible e intenso en fase abierta, tenue en fase cerrada
  const pulso = valorPulso(t);
  const abierta = faseAbierta(t);
  ctx.strokeStyle = abierta ? colorAcento : colorSecundario;
  ctx.globalAlpha = abierta ? 0.8 : 0.25;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(CENTRO.x, CENTRO.y, RADIO_CENTRO + 14 + pulso * 10, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // Figura central: su brillo permanente crece con cada conexión lograda
  const luzBase = 0.15 + (conexionesLogradas / FIGURAS_NECESARIAS) * 0.85;
  ctx.globalAlpha = luzBase;
  dibujarFiguraGenerica(ctx, CENTRO.x, CENTRO.y, 'circulo', RADIO_CENTRO * 2, colorPrimario);
  ctx.globalAlpha = 1;

  // Línea de intento en curso, mientras se arrastra (tenue, sin confirmar nada)
  if (figuraArrastrando) {
    actualizarSincronia(deltaMs, t);

    const progreso = Math.min(1, figuraArrastrando.sincroAcumulada / TIEMPO_SINCRONIA_MS);
    ctx.strokeStyle = colorAcento;
    ctx.globalAlpha = 0.2 + progreso * 0.6;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(CENTRO.x, CENTRO.y);
    ctx.lineTo(figuraArrastrando.x, figuraArrastrando.y);
    ctx.stroke();
    ctx.globalAlpha = 1;

    dibujarFiguraGenerica(ctx, figuraArrastrando.x, figuraArrastrando.y, figuraArrastrando.tipo, TAMAÑO_FIGURA, colorPrimario);
  }

  requestAnimationFrame(dibujarFrame);
}

document.getElementById('totalConexiones').textContent = FIGURAS_NECESARIAS;
renderizarBandeja();
requestAnimationFrame(dibujarFrame);