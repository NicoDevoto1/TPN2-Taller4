// Bloque-3/ansiedad/script.js

const lienzo = document.getElementById('lienzo');
const ctx = lienzo.getContext('2d');

const ancho = window.innerWidth;
const alto = window.innerHeight;
lienzo.width = ancho;
lienzo.height = alto;

const colorPrimario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-primaria').trim() || '#f2f2f2';
const colorAcento = getComputedStyle(document.documentElement).getPropertyValue('--color-acento').trim() || '#d94f30';
const colorFondo = getComputedStyle(document.documentElement).getPropertyValue('--color-fondo').trim() || '#0e0e10';
const colorSecundario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-secundaria').trim() || '#8a8a8f';

const TIPOS_TOKEN = ['circulo', 'cuadrado', 'triangulo']; // la línea se reserva para marcar las zonas objetivo
const TAMAÑO_FIGURA = 34;
const RADIO_FIGURA = TAMAÑO_FIGURA / 2;
const RADIO_ZONA = 40;
const MARGEN_BORDE = 60;
const MAX_FIGURAS = 30; // techo de seguridad para que el navegador no colapse

let figurasActivas = [];
let figuraArrastrada = null;
let offsetAgarre = { x: 0, y: 0 };

let contadorResueltas = 0;
let contadorPerdidas = 0;
let intervaloAparicion = 3000; // ms — va bajando con cada acierto, así el ritmo se acelera

// --- Creación de figuras ---
function posicionAlAzar() {
  return {
    x: MARGEN_BORDE + Math.random() * (ancho - MARGEN_BORDE * 2),
    y: MARGEN_BORDE + Math.random() * (alto - MARGEN_BORDE * 2)
  };
}

function crearFigura() {
  if (figurasActivas.length >= MAX_FIGURAS) return;

  const origen = posicionAlAzar();
  let objetivo = posicionAlAzar();
  // Aseguramos que la zona objetivo no quede pegada al punto de aparición
  while (Math.hypot(objetivo.x - origen.x, objetivo.y - origen.y) < 180) {
    objetivo = posicionAlAzar();
  }

  const tiempoLimite = Math.max(1800, 5000 - contadorResueltas * 120); // se acorta con cada acierto

  figurasActivas.push({
    id: Math.random().toString(36).slice(2),
    x: origen.x,
    y: origen.y,
    tipo: TIPOS_TOKEN[Math.floor(Math.random() * TIPOS_TOKEN.length)],
    objetivo,
    tiempoCreacion: performance.now(),
    tiempoLimite
  });
}

// --- Motor de aparición: sigue generando figuras solo, sin que el usuario haga nada ---
function agendarProximaAparicion() {
  setTimeout(() => {
    crearFigura();
    agendarProximaAparicion(); // se vuelve a agendar leyendo el intervalo actualizado (puede haberse acelerado)
  }, intervaloAparicion);
}

// --- Colocación: acertar NO calma el sistema, lo alimenta ---
function resolverFigura(figura) {
  figurasActivas = figurasActivas.filter((f) => f.id !== figura.id);
  contadorResueltas++;

  // Premio invertido: por cada acierto aparecen DOS figuras nuevas, y el ritmo ambiental se acelera
  crearFigura();
  crearFigura();
  intervaloAparicion = Math.max(700, intervaloAparicion * 0.92);
}

function perderFigura(figura) {
  figurasActivas = figurasActivas.filter((f) => f.id !== figura.id);
  contadorPerdidas++;
}

// --- Dibujo ---
function dibujarFigura(figura, jitterX, jitterY) {
  const x = figura.x + jitterX;
  const y = figura.y + jitterY;

  ctx.fillStyle = colorPrimario;
  ctx.beginPath();
  if (figura.tipo === 'circulo') {
    ctx.arc(x, y, RADIO_FIGURA, 0, Math.PI * 2);
  } else if (figura.tipo === 'triangulo') {
    ctx.moveTo(x, y - RADIO_FIGURA);
    ctx.lineTo(x + RADIO_FIGURA, y + RADIO_FIGURA);
    ctx.lineTo(x - RADIO_FIGURA, y + RADIO_FIGURA);
    ctx.closePath();
  } else {
    ctx.rect(x - RADIO_FIGURA, y - RADIO_FIGURA, RADIO_FIGURA * 2, RADIO_FIGURA * 2);
  }
  ctx.fill();
}

function dibujarZonaObjetivo(figura) {
  ctx.strokeStyle = colorSecundario;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 6]); // trazo discontinuo — la referencia visual construida con líneas
  ctx.beginPath();
  ctx.arc(figura.objetivo.x, figura.objetivo.y, RADIO_ZONA, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
}

function dibujarFrame() {
  ctx.fillStyle = colorFondo;
  ctx.fillRect(0, 0, ancho, alto);

  const ahora = performance.now();

  figurasActivas.forEach((figura) => {
    const transcurrido = ahora - figura.tiempoCreacion;
    const progreso = Math.min(1, transcurrido / figura.tiempoLimite); // 0 → recién aparece, 1 → se pierde

    // Vibración: crece de forma acelerada a medida que se acerca al límite
    const intensidad = Math.pow(progreso, 2) * 24;
    const jitterX = (Math.random() - 0.5) * intensidad;
    const jitterY = (Math.random() - 0.5) * intensidad;

    dibujarZonaObjetivo(figura);
    dibujarFigura(figura, jitterX, jitterY);

    if (progreso >= 1 && figura !== figuraArrastrada) {
      perderFigura(figura);
    }
  });

  requestAnimationFrame(dibujarFrame);
}

// --- Interacción: drag and drop con mouse ---
lienzo.addEventListener('mousedown', (e) => {
  const rect = lienzo.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;

  // Se agarra la figura más cercana al clic, si está dentro de un radio razonable
  let candidata = null;
  let distanciaMinima = RADIO_FIGURA + 12;

  figurasActivas.forEach((figura) => {
    const distancia = Math.hypot(mx - figura.x, my - figura.y);
    if (distancia <= distanciaMinima) {
      distanciaMinima = distancia;
      candidata = figura;
    }
  });

  if (candidata) {
    figuraArrastrada = candidata;
    offsetAgarre.x = candidata.x - mx;
    offsetAgarre.y = candidata.y - my;
  }
});

document.addEventListener('mousemove', (e) => {
  if (!figuraArrastrada) return;
  const rect = lienzo.getBoundingClientRect();
  figuraArrastrada.x = e.clientX - rect.left + offsetAgarre.x;
  figuraArrastrada.y = e.clientY - rect.top + offsetAgarre.y;
});

document.addEventListener('mouseup', () => {
  if (!figuraArrastrada) return;

  const distanciaAlObjetivo = Math.hypot(
    figuraArrastrada.x - figuraArrastrada.objetivo.x,
    figuraArrastrada.y - figuraArrastrada.objetivo.y
  );

  if (distanciaAlObjetivo <= RADIO_ZONA) {
    resolverFigura(figuraArrastrada);
  }
  // si no llegó a la zona, se suelta donde quedó — sigue viva, sigue vibrando, el usuario puede retomarla

  figuraArrastrada = null;
});

// --- Arranque ---
crearFigura();
crearFigura();
agendarProximaAparicion();
dibujarFrame();