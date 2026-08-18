// --- Importar módulos de Matter.js ---
const Engine = Matter.Engine,
      Render = Matter.Render,
      Runner = Matter.Runner,
      Bodies = Matter.Bodies,
      Composite = Matter.Composite,
      Events = Matter.Events,
      Constraint = Matter.Constraint,
      Body = Matter.Body;

const engine = Engine.create();
engine.world.gravity.y = 0; 
engine.world.gravity.x = 0;

const contenedor = document.getElementById('contenedor-expectativa');
const overlayDolor = document.getElementById('overlay-dolor');
const ancho = window.innerWidth;
const alto = window.innerHeight;

const render = Render.create({
  element: contenedor,
  engine: engine,
  options: {
    width: ancho,
    height: alto,
    wireframes: false,
    background: 'transparent'
  }
});

// Colores
const colorPrimario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-primaria').trim() || '#f2f2f2';
const colorAlerta = '#d94f30';

// --- 1. CREACIÓN DE LA RED ORGÁNICA ---
const RADIO_MAX = 13; 
const resortes = [];
const opcionesCuerpo = { frictionAir: 0.1, density: 0.05, render: { fillStyle: colorPrimario } };

// FIGURA CENTRAL: isStatic (inamovible)
const centro = Bodies.rectangle(ancho / 2, alto / 2, RADIO_MAX * 2, RADIO_MAX * 2, { 
  ...opcionesCuerpo, 
  isStatic: true 
});

// Figuras periféricas
const cantidadNodos = 6;
const radioReposo = 80;
const nodos = [];

for (let i = 0; i < cantidadNodos; i++) {
  const angulo = (Math.PI * 2 / cantidadNodos) * i;
  const nx = ancho / 2 + Math.cos(angulo) * radioReposo;
  const ny = alto / 2 + Math.sin(angulo) * radioReposo;
  
  let nodo = (i % 2 === 0) 
    ? Bodies.circle(nx, ny, RADIO_MAX, opcionesCuerpo) 
    : Bodies.polygon(nx, ny, 3, RADIO_MAX + 2, opcionesCuerpo);
  
  nodos.push(nodo);

  resortes.push(Constraint.create({
    bodyA: centro,
    bodyB: nodo,
    stiffness: 0.03, 
    damping: 0.1,    
    render: { strokeStyle: colorPrimario, lineWidth: 2 }
  }));
}

for (let i = 0; i < cantidadNodos; i++) {
  resortes.push(Constraint.create({
    bodyA: nodos[i],
    bodyB: nodos[(i + 1) % cantidadNodos],
    stiffness: 0.03,
    damping: 0.1,
    render: { strokeStyle: colorPrimario, lineWidth: 2 }
  }));
}

Composite.add(engine.world, [centro, ...nodos, ...resortes]);

// --- 2. GESTIÓN DE AGARRES (CORREGIDO) ---
// Ahora guardamos el ID del puntero y la figura asociada permanentemente hasta que sueltes
const agarres = new Map(); 

function obtenerFiguraCercana(x, y) {
  let figuraEncontrada = null;
  let distMinima = RADIO_MAX * 3; 
  
  nodos.forEach(figura => {
    const dist = Math.hypot(figura.position.x - x, figura.position.y - y);
    if (dist < distMinima) {
      distMinima = dist;
      figuraEncontrada = figura;
    }
  });
  return figuraEncontrada;
}

// --- 3. BUCLE DE FÍSICAS: TENSIÓN Y RESPIRACIÓN AGITADA ---
Events.on(engine, 'beforeUpdate', function() {
  
  // 1. Forzar posición al dedo (absoluto, para que nunca se escape)
  agarres.forEach((agarre) => {
    Body.setPosition(agarre.figura, { x: agarre.x, y: agarre.y });
  });

  // Calcular Tensión
  let deformacionMaxima = 0;
  nodos.forEach(nodo => {
    const distCentro = Math.hypot(nodo.position.x - centro.position.x, nodo.position.y - centro.position.y);
    const estiramiento = Math.max(0, distCentro - radioReposo);
    if (estiramiento > deformacionMaxima) deformacionMaxima = estiramiento;
  });

  let tension = Math.min(1, deformacionMaxima / 250);

  if (tension > 0.05) {
    
    // A) TEMBLOR (Incluso la figura que tenés agarrada tiembla sobre tu cursor)
    const intensidadVibracion = tension * 6;
    nodos.forEach(figura => {
      Body.setPosition(figura, {
        x: figura.position.x + (Math.random() - 0.5) * intensidadVibracion,
        y: figura.position.y + (Math.random() - 0.5) * intensidadVibracion
      });
    });

    // B) OSCURIDAD: RESPIRACIÓN AGITADA
    const velocidadRespiracion = 800 - (tension * 650);
    const pulso = (Math.sin(performance.now() / velocidadRespiracion) + 1) / 2;

    const opacidadBase = tension * 0.55; 
    const opacidadPulso = pulso * (tension * 0.40);
    const opacidadTotal = Math.min(0.95, opacidadBase + opacidadPulso);
    
    overlayDolor.style.backgroundColor = `rgba(8, 8, 8, ${opacidadTotal})`; 
    
    // C) LÍNEAS
    resortes.forEach(resorte => {
      resorte.render.strokeStyle = tension > 0.65 ? colorAlerta : colorPrimario;
      resorte.render.lineWidth = Math.max(0.3, 2 - tension * 1.7); 
    });

  } else {
    overlayDolor.style.backgroundColor = `rgba(8, 8, 8, 0)`;
    resortes.forEach(resorte => {
      resorte.render.strokeStyle = colorPrimario;
      resorte.render.lineWidth = 2;
    });
  }
});

// --- 4. EVENTOS DE INTERACCIÓN (CORREGIDOS) ---
const canvasMatter = render.canvas;

function iniciarInteraccion(id, x, y) {
  const figura = obtenerFiguraCercana(x, y);
  if (figura) agarres.set(id, { figura, x, y });
}

function moverInteraccion(id, x, y) {
  // Solo actualiza las coordenadas de la figura YA agarrada. Nunca la suelta.
  if (agarres.has(id)) {
    const agarre = agarres.get(id);
    agarre.x = x;
    agarre.y = y;
  }
}

function terminarInteraccion(id) {
  agarres.delete(id);
}

// Mouse
canvasMatter.addEventListener('mousedown', (e) => iniciarInteraccion('mouse', e.clientX, e.clientY));
canvasMatter.addEventListener('mousemove', (e) => moverInteraccion('mouse', e.clientX, e.clientY));
window.addEventListener('mouseup', () => terminarInteraccion('mouse'));
window.addEventListener('mouseleave', () => terminarInteraccion('mouse'));

// Touch
canvasMatter.addEventListener('touchstart', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    iniciarInteraccion(t.identifier, t.clientX, t.clientY);
  }
}, { passive: false });

canvasMatter.addEventListener('touchmove', (e) => {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const t = e.changedTouches[i];
    moverInteraccion(t.identifier, t.clientX, t.clientY);
  }
}, { passive: false });

canvasMatter.addEventListener('touchend', (e) => { 
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    terminarInteraccion(e.changedTouches[i].identifier);
  }
}, { passive: false });
canvasMatter.addEventListener('touchcancel', (e) => { 
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    terminarInteraccion(e.changedTouches[i].identifier);
  }
}, { passive: false });

Render.run(render);
Runner.run(Runner.create(), engine);