// Bloque-3/expectativa/script.js

const { engine, render, World } = crearMundoBase('canvas-expectativa', {
  gravity: 1,
  background: 'transparent'
});

const ancho = render.options.width;
const alto = render.options.height;

crearLimites(engine, ancho, alto);

const { Body, Events } = Matter;
const figurasApiladas = [];
const canvasContenedor = document.getElementById('canvas-expectativa');
const bandeja = document.getElementById('bandeja');
const contadorEl = document.getElementById('contador');

const TAMAÑO_FIGURA = 65; // antes 40 — figuras más grandes

// --- Límite de objetos: aleatorio entre 10 y 15, definido al cargar ---
const LIMITE_MAXIMO = Math.floor(Math.random() * (15 - 10 + 1)) + 10;

// --- Probabilidad de aparición por tipo de figura ---
// Ajustable: la suma no necesita dar 100, son pesos relativos
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

  // No siempre las 4: entre 2 y 4 opciones disponibles por turno
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

// --- Drag and drop con mouse ---
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

document.addEventListener('mouseup', (e) => {
  if (!elementoArrastrado) return;

  const rectCanvas = canvasContenedor.getBoundingClientRect();
  const dentroDelCanvas =
    e.clientX >= rectCanvas.left && e.clientX <= rectCanvas.right &&
    e.clientY >= rectCanvas.top && e.clientY <= rectCanvas.bottom;

  if (dentroDelCanvas && figurasApiladas.length < LIMITE_MAXIMO) {
    const x = e.clientX - rectCanvas.left;
    const y = e.clientY - rectCanvas.top;
    const cuerpo = crearFigura(World, engine.world, tipoArrastrado, x, y, { tamaño: TAMAÑO_FIGURA });
    figurasApiladas.push(cuerpo);
    renderizarBandeja(); // se regenera la selección tras cada suelta exitosa
  }

  elementoArrastrado = null;
  tipoArrastrado = null;
});

// Límite de ángulo: la torre se balancea pero nunca cae del todo
const LIMITE_ANGULO = 0.35;

Events.on(engine, 'beforeUpdate', () => {
  figurasApiladas.forEach((cuerpo) => {
    if (Math.abs(cuerpo.angle) > LIMITE_ANGULO) {
      const angulo = Math.sign(cuerpo.angle) * LIMITE_ANGULO;
      Body.setAngle(cuerpo, angulo);
      Body.setAngularVelocity(cuerpo, cuerpo.angularVelocity * -0.3);
    }
  });
});

renderizarBandeja(); // primera carga