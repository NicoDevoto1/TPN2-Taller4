// Bloque-3/expectativa/script.js

const { engine, render, World } = crearMundoBase('canvas-expectativa', {
  gravity: 1,
  background: 'transparent'
});

const ancho = render.options.width;
const alto = render.options.height;

crearLimites(engine, ancho, alto);

const { Body, Bodies, Events } = Matter;
const figurasApiladas = [];
const canvasContenedor = document.getElementById('canvas-expectativa');
const bandeja = document.getElementById('bandeja');
const contadorEl = document.getElementById('contador');

const TAMAÑO_FIGURA = 65;

// --- Límite de objetos: aleatorio entre 10 y 15, definido al cargar ---
const LIMITE_MAXIMO = Math.floor(Math.random() * (15 - 10 + 1)) + 10;

const MARGEN_OVERLAP_MINIMO = 15; // píxeles de superposición horizontal que siempre se mantienen
const OFFSET_MAXIMO = TAMAÑO_FIGURA - MARGEN_OVERLAP_MINIMO;
let xUltimaPosicion = ancho / 2; // arranca centrada, después sigue al usuario dentro del margen

// --- Probabilidad de aparición por tipo de figura ---
const PESOS_FIGURAS = {
  cuadrado: 35,
  circulo: 30,
  triangulo: 20,
  linea: 15
};

function elegirFigurasAlAzar(cantidad) {
  const tipos = Object.keys(PESOS_FIGURAS);
  const disponibles = [];

  while (disponibles.length < cantidad && disponibles.length < tipos.length) {
    const pesoTotal = tipos.reduce((suma, t) => suma + PESOS_FIGURAS[t], 0);
    let umbral = Math.random() * pesoTotal;
    let elegido = null;

    for (const tipo of tipos) {
      umbral -= PESOS_FIGURAS[tipo];
      if (umbral <= 0) { elegido = tipo; break; }
    }
    if (!disponibles.includes(elegido)) disponibles.push(elegido);
  }
  return disponibles;
}

function renderizarBandeja() {
  bandeja.innerHTML = '';

  if (figurasApiladas.length >= LIMITE_MAXIMO) {
    contadorEl.textContent = `Torre completa (${figurasApiladas.length}/${LIMITE_MAXIMO})`;
    return;
  }

  const cantidadOpciones = Math.floor(Math.random() * 3) + 2; // 2, 3 o 4
  const tiposDisponibles = elegirFigurasAlAzar(cantidadOpciones);

  const iconos = { circulo: '●', cuadrado: '■', triangulo: '▲', linea: '▬' };

  tiposDisponibles.forEach((tipo) => {
    const el = document.createElement('div');
    el.className = 'figura-arrastrable';
    el.dataset.tipo = tipo;
    el.textContent = iconos[tipo];
    el.addEventListener('mousedown', iniciarArrastre);
    bandeja.appendChild(el);
  });

  contadorEl.textContent = `Piezas: ${figurasApiladas.length}/${LIMITE_MAXIMO}`;
}

// --- Drag desde la bandeja ---
let elementoArrastrado = null;
let tipoArrastrado = null;

function iniciarArrastre(e) {
  tipoArrastrado = e.currentTarget.dataset.tipo;
  elementoArrastrado = e.currentTarget;
}

document.addEventListener('mousemove', (e) => {
  if (!elementoArrastrado) return;
  elementoArrastrado.style.position = 'fixed';
  elementoArrastrado.style.left = `${e.clientX - 24}px`;
  elementoArrastrado.style.top = `${e.clientY - 24}px`;
});

// --- Apilado: cae con física real, un atrapador la intercepta y la fija ---

let alturaAcumulada = 0;
const MARGEN_INFERIOR = 60; // debe coincidir con el grosor del suelo en crearLimites
const BASE_Y = alto - MARGEN_INFERIOR;

let piezaCayendo = null;
let timeoutSeguridad = null;

function alturaDeFigura(tipo, tamaño) {
  if (tipo === 'linea') return 8;
  return tamaño;
}

// Atrapador invisible: sensor que se ubica justo arriba de la última pieza apilada
const atrapador = Bodies.rectangle(ancho / 2, BASE_Y, TAMAÑO_FIGURA * 1.8, 12, {
  isStatic: true,
  isSensor: true,
  render: { visible: false }
});
World.add(engine.world, atrapador);

function actualizarAtrapador() {
  Body.setPosition(atrapador, { x: xUltimaPosicion, y: BASE_Y - alturaAcumulada });
}

// Suelta la pieza desde arriba, con física real (puede tambalear, generar tensión)
function iniciarCaida(tipo, xInicial) {
  const cuerpo = crearFigura(World, engine.world, tipo, xInicial, 20, { tamaño: TAMAÑO_FIGURA });
  cuerpo.tipoFigura = tipo;
  piezaCayendo = cuerpo;

  // Red de seguridad: si en 1.5s no fue atrapada, se fuerza el apilado igual
  timeoutSeguridad = setTimeout(() => {
    if (piezaCayendo === cuerpo) asentarFigura(cuerpo);
  }, 1500);
}

// Fija la pieza en su posición exacta de la torre y la vuelve estática
function asentarFigura(cuerpo) {
  clearTimeout(timeoutSeguridad);
  const alturaFigura = alturaDeFigura(cuerpo.tipoFigura, TAMAÑO_FIGURA);
  const yObjetivo = BASE_Y - alturaAcumulada - alturaFigura / 2;

  const xCaida = cuerpo.position.x;
  const desvio = Math.max(-OFFSET_MAXIMO, Math.min(OFFSET_MAXIMO, xCaida - xUltimaPosicion));
  const xObjetivo = xUltimaPosicion + desvio;

  Body.setPosition(cuerpo, { x: xObjetivo, y: yObjetivo });
  Body.setAngle(cuerpo, 0); // la endereza al asentarse, sin importar cómo cayó girando
  Body.setVelocity(cuerpo, { x: 0, y: 0 });
  Body.setAngularVelocity(cuerpo, 0);
  Body.setStatic(cuerpo, true);

  cuerpo.posicionReposo = { x: xObjetivo, y: yObjetivo }; // referencia fija para el balanceo rígido
  alturaAcumulada += alturaFigura;
  xUltimaPosicion = xObjetivo;
  figurasApiladas.push(cuerpo);

  actualizarAtrapador();
  piezaCayendo = null;
  renderizarBandeja();
}

// Cuando la pieza que cae toca el atrapador, se asienta automáticamente
Events.on(engine, 'collisionStart', (evento) => {
  evento.pairs.forEach((par) => {
    const { bodyA, bodyB } = par;
    if (bodyA === atrapador && bodyB === piezaCayendo) asentarFigura(bodyB);
    if (bodyB === atrapador && bodyA === piezaCayendo) asentarFigura(bodyA);
  });
});

document.addEventListener('mouseup', (e) => {
  if (!elementoArrastrado) return;

  try {
    const zonaGuia = document.getElementById('zona-guia');
    const rectZona = zonaGuia.getBoundingClientRect();
    const rectCanvas = canvasContenedor.getBoundingClientRect();
    const dentroDeLaZona =
      e.clientX >= rectZona.left && e.clientX <= rectZona.right &&
      e.clientY >= rectZona.top && e.clientY <= rectZona.bottom;

    if (dentroDeLaZona && !piezaCayendo && figurasApiladas.length < LIMITE_MAXIMO) {
      const xDrop = e.clientX - rectCanvas.left; // el punto donde soltó define desde dónde cae
      iniciarCaida(tipoArrastrado, xDrop);
    }
  } finally {
    elementoArrastrado.style.position = '';
    elementoArrastrado.style.left = '';
    elementoArrastrado.style.top = '';
    elementoArrastrado = null;
    tipoArrastrado = null;
  }
});

// --- Balanceo rígido: toda la torre gira como un solo cuerpo desde su base ---
const PIVOTE = { x: ancho / 2, y: BASE_Y };

Events.on(engine, 'beforeUpdate', () => {
  const tiempo = engine.timing.timestamp / 1000;
  const total = figurasApiladas.length;
  const anguloGlobal = Math.sin(tiempo * 0.6) * Math.min(0.015 + total * 0.004, 0.1);
  const cos = Math.cos(anguloGlobal);
  const sin = Math.sin(anguloGlobal);

  figurasApiladas.forEach((cuerpo) => {
    const dx = cuerpo.posicionReposo.x - PIVOTE.x;
    const dy = cuerpo.posicionReposo.y - PIVOTE.y;

    // Rotamos cada pieza alrededor del MISMO pivote, no de su propio centro
    const xRotado = PIVOTE.x + dx * cos - dy * sin;
    const yRotado = PIVOTE.y + dx * sin + dy * cos;

    Body.setPosition(cuerpo, { x: xRotado, y: yRotado });
    Body.setAngle(cuerpo, anguloGlobal);
  });
});

renderizarBandeja(); // primera carga