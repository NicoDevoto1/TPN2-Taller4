const contenedor = document.getElementById('canvas-ansiedad');
const zonaObjetivo = document.getElementById('zona-objetivo');

const ICONOS = { circulo: '●', cuadrado: '■', triangulo: '▲', linea: '▬' };
const TIPOS = Object.keys(ICONOS);

const CANTIDAD_OBSTACULOS = 8;
const TAMAÑO_OBSTACULO = { min: 80, max: 220 };
const MITAD_FIGURA = 33;

let obstaculos = [];
let rondaActiva = false;

// --- SISTEMA MULTI-FIGURA ---
let figurasActivas = []; 
let aciertosTotales = 0; // Para saber cuándo subir la dificultad

function posicionAleatoria(margen = 100) {
  const ancho = contenedor.clientWidth;
  const alto = contenedor.clientHeight;
  return {
    x: Math.max(margen, Math.min(ancho - margen, margen + Math.random() * (ancho - margen * 2))),
    y: Math.max(margen, Math.min(alto - margen, margen + Math.random() * (alto - margen * 2)))
  };
}

function generarObstaculos(evitar) {
  contenedor.querySelectorAll('.obstaculo').forEach(el => el.remove());
  obstaculos = [];
  let intentos = 0;
  while (obstaculos.length < CANTIDAD_OBSTACULOS && intentos < 60) {
    intentos++;
    const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
    let ancho = TAMAÑO_OBSTACULO.min + Math.random() * (TAMAÑO_OBSTACULO.max - TAMAÑO_OBSTACULO.min);
    let alto = TAMAÑO_OBSTACULO.min + Math.random() * (TAMAÑO_OBSTACULO.max - TAMAÑO_OBSTACULO.min);

    if (tipo === 'linea') alto = 8;      
    if (tipo === 'circulo') alto = ancho; 

    const x = 40 + Math.random() * (contenedor.clientWidth - ancho - 80);
    const y = 40 + Math.random() * (contenedor.clientHeight - alto - 80);
    const centroX = x + ancho / 2;
    const centroY = y + alto / 2;

    const distAObjetivo = Math.hypot(centroX - evitar.x, centroY - evitar.y);
    if (distAObjetivo < 120) continue;

    const el = document.createElement('div');
    el.className = `obstaculo obstaculo-${tipo}`;
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${ancho}px`;
    el.style.height = `${alto}px`;
    
    obstaculos.push({ x, y, ancho, alto, elemento: el });
    contenedor.appendChild(el);
  }
}

function colisionaConObstaculo(x, y) {
  return obstaculos.some(o =>
    x + MITAD_FIGURA > o.x && x - MITAD_FIGURA < o.x + o.ancho &&
    y + MITAD_FIGURA > o.y && y - MITAD_FIGURA < o.y + o.alto
  );
}

function moverConColision(actual, destinoX, destinoY) {
  if (!colisionaConObstaculo(destinoX, destinoY)) return { x: destinoX, y: destinoY };
  if (!colisionaConObstaculo(destinoX, actual.y)) return { x: destinoX, y: actual.y };
  if (!colisionaConObstaculo(actual.x, destinoY)) return { x: actual.x, y: destinoY };
  return { x: actual.x, y: actual.y };
}

// --- CREACIÓN DINÁMICA DE FIGURAS ---
function spawnFigura() {
  const el = document.createElement('div');
  el.className = 'figura-ansiedad';
  const tipo = TIPOS[Math.floor(Math.random() * TIPOS.length)];
  el.textContent = ICONOS[tipo];

  const pos = posicionAleatoria(120);
  el.style.left = `${pos.x - 32}px`;
  el.style.top = `${pos.y - 32}px`;
  contenedor.appendChild(el);

  // Cada figura tiene su propia memoria y nivel de ansiedad
  figurasActivas.push({
    elemento: el,
    base: { ...pos },
    cursor: { ...pos },
    cursorAnterior: { ...pos },
    arrastrando: false,
    touchId: null, // Identificador para multitáctil
    ansiedad: 0,
    inicioGracia: performance.now()
  });
}

function gestionarRondas() {
  // A partir de 2 aciertos, te obligamos a jugar con 2 figuras al mismo tiempo (Atención Dividida)
  const figurasRequeridas = aciertosTotales >= 2 ? 2 : 1;
  
  while (figurasActivas.length < figurasRequeridas) {
    spawnFigura();
  }

  // Mover el objetivo a un nuevo lugar
  const posZona = posicionAleatoria(80);
  zonaObjetivo.style.left = `${posZona.x - 50}px`;
  zonaObjetivo.style.top = `${posZona.y - 50}px`;
  zonaObjetivo.classList.remove('activa');

  generarObstaculos(posZona);
  rondaActiva = true;
}

// --- EVENTOS DE ÉXITO Y FRACASO ---
function lograrAcierto(figuraIndex) {
  aciertosTotales++;
  const fig = figurasActivas[figuraIndex];
  
  fig.elemento.style.transition = 'transform 0.2s, opacity 0.2s';
  fig.elemento.style.transform = 'scale(0.3)';
  fig.elemento.style.opacity = '0';
  
  // Destruir la figura victoriosa
  setTimeout(() => {
    fig.elemento.remove();
  }, 200);
  
  figurasActivas.splice(figuraIndex, 1);
  zonaObjetivo.classList.add('activa');
  
  setTimeout(gestionarRondas, 250);
}

function perderFigura(figuraIndex) {
  const fig = figurasActivas[figuraIndex];
  
  // Trauma visual (Temblor de pantalla)
  contenedor.classList.add('trauma-visual');
  setTimeout(() => contenedor.classList.remove('trauma-visual'), 400);

  // Dejar la cicatriz permanente
  const cicatriz = document.createElement('div');
  cicatriz.className = 'cicatriz-ansiedad';
  cicatriz.style.left = `${fig.base.x - 32}px`;
  cicatriz.style.top = `${fig.base.y - 32}px`;
  cicatriz.style.transform = `rotate(${(Math.random() - 0.5) * 60}deg)`; 
  cicatriz.textContent = fig.elemento.textContent;
  contenedor.appendChild(cicatriz);

  // Destruir la figura y sacarla del array
  fig.elemento.style.transition = 'transform 0.2s, opacity 0.2s';
  fig.elemento.style.transform = 'scale(0) rotate(90deg)';
  fig.elemento.style.opacity = '0';
  setTimeout(() => {
    fig.elemento.remove();
  }, 200);

  figurasActivas.splice(figuraIndex, 1);
  setTimeout(gestionarRondas, 400);
}

function estaDentroDeZona(fig) {
  const rectFigura = fig.elemento.getBoundingClientRect();
  const rectZona = zonaObjetivo.getBoundingClientRect();
  const cx = rectFigura.left + rectFigura.width / 2;
  const cy = rectFigura.top + rectFigura.height / 2;
  return cx >= rectZona.left && cx <= rectZona.right && cy >= rectZona.top && cy <= rectZona.bottom;
}


// --- DRAG MULTITÁCTIL Y MULTI-FIGURA ---
function obtenerFiguraBajoCursor(x, y) {
  // Buscamos si tocaste alguna de las figuras activas
  for (let i = figurasActivas.length - 1; i >= 0; i--) {
    const fig = figurasActivas[i];
    const rect = fig.elemento.getBoundingClientRect();
    if (x >= rect.left - 10 && x <= rect.right + 10 && y >= rect.top - 10 && y <= rect.bottom + 10) {
      return fig;
    }
  }
  return null;
}

// Mouse
document.addEventListener('mousedown', e => {
  if (!rondaActiva) return;
  const fig = obtenerFiguraBajoCursor(e.clientX, e.clientY);
  if (fig) {
    fig.arrastrando = true;
    fig.touchId = 'mouse';
    fig.cursor = { x: e.clientX, y: e.clientY };
  }
});
document.addEventListener('mousemove', e => {
  figurasActivas.forEach(fig => {
    if (fig.arrastrando && fig.touchId === 'mouse') {
      fig.cursor = { x: e.clientX, y: e.clientY };
    }
  });
});
document.addEventListener('mouseup', e => {
  figurasActivas.forEach((fig, index) => {
    if (fig.arrastrando && fig.touchId === 'mouse') {
      fig.arrastrando = false;
      if (estaDentroDeZona(fig)) lograrAcierto(index);
    }
  });
});

// Touch (soporte para varios dedos a la vez)
document.addEventListener('touchstart', e => {
  if (!rondaActiva) return;
  Array.from(e.changedTouches).forEach(t => {
    const fig = obtenerFiguraBajoCursor(t.clientX, t.clientY);
    if (fig && !fig.arrastrando) {
      fig.arrastrando = true;
      fig.touchId = t.identifier;
      fig.cursor = { x: t.clientX, y: t.clientY };
    }
  });
}, { passive: false });
document.addEventListener('touchmove', e => {
  // e.preventDefault() previene el scroll en mobile
  if(e.cancelable) e.preventDefault(); 
  Array.from(e.changedTouches).forEach(t => {
    figurasActivas.forEach(fig => {
      if (fig.arrastrando && fig.touchId === t.identifier) {
        fig.cursor = { x: t.clientX, y: t.clientY };
      }
    });
  });
}, { passive: false });
document.addEventListener('touchend', e => {
  Array.from(e.changedTouches).forEach(t => {
    figurasActivas.forEach((fig, index) => {
      if (fig.arrastrando && fig.touchId === t.identifier) {
        fig.arrastrando = false;
        if (estaDentroDeZona(fig)) lograrAcierto(index);
      }
    });
  });
});


// --- LÓGICA DE ANSIEDAD PURA (EL LOOP PRINCIPAL) ---
function loop() {
  if (rondaActiva) {
    const ahora = performance.now();
    let maxAnsiedad = 0; // Para saber cuánto hacer tiritar los obstáculos

    // Procesamos cada figura activa en pantalla
    // Usamos iteración inversa por si se elimina una figura durante el loop
    for (let i = figurasActivas.length - 1; i >= 0; i--) {
      let fig = figurasActivas[i];
      const enGracia = (ahora - fig.inicioGracia) < 1000;
      
      const distanciaMovida = Math.hypot(fig.cursor.x - fig.cursorAnterior.x, fig.cursor.y - fig.cursorAnterior.y);
      fig.cursorAnterior = { ...fig.cursor };

      // 1. REGLAS DE ANSIEDAD
      if (!enGracia) {
        if (!fig.arrastrando) fig.ansiedad += 0.0035;
        else if (distanciaMovida < 1.5) fig.ansiedad += 0.002;
        else fig.ansiedad -= 0.006;
      }
      
      fig.ansiedad = Math.max(0, Math.min(1, fig.ansiedad));
      if (fig.ansiedad > maxAnsiedad) maxAnsiedad = fig.ansiedad;

      // Castigo si llegó al 100%
      if (fig.ansiedad >= 1) {
        perderFigura(i);
        continue; // Cortamos el loop para esta figura muerta
      }

      // 2. MOVIMIENTO Y RESISTENCIA
      if (fig.arrastrando) {
        const factorRespuesta = 1 - (fig.ansiedad * 0.65); 
        let destinoX = fig.base.x + (fig.cursor.x - fig.base.x) * factorRespuesta;
        let destinoY = fig.base.y + (fig.cursor.y - fig.base.y) * factorRespuesta;

        // Repulsión Magnética de Obstáculos
        obstaculos.forEach(o => {
          const cx = o.x + o.ancho / 2;
          const cy = o.y + o.alto / 2;
          const distAObstaculo = Math.hypot(destinoX - cx, destinoY - cy);
          
          if (distAObstaculo < o.ancho/2 + 50) {
            const fuerzaRepulsion = (o.ancho/2 + 50 - distAObstaculo) * 0.12;
            const anguloEscape = Math.atan2(destinoY - cy, destinoX - cx);
            destinoX += Math.cos(anguloEscape) * fuerzaRepulsion;
            destinoY += Math.sin(anguloEscape) * fuerzaRepulsion;
          }
        });

        fig.base = moverConColision(fig.base, destinoX, destinoY);
      }

      // 3. SÍNTOMAS VISUALES
      const amplitud = Math.pow(fig.ansiedad, 2) * 15; 
      const jitterX = (Math.random() * 2 - 1) * amplitud;
      const jitterY = (Math.random() * 2 - 1) * amplitud;
      
      fig.elemento.style.left = `${fig.base.x - 32 + jitterX}px`;
      fig.elemento.style.top = `${fig.base.y - 32 + jitterY}px`;
      fig.elemento.style.opacity = Math.max(0.1, 1 - fig.ansiedad);
    }

    // 4. EL ENTORNO REACCIONA A LA ANSIEDAD MÁS ALTA
    obstaculos.forEach(obs => {
        const rot = (Math.random() - 0.5) * (maxAnsiedad * 8);
        obs.elemento.style.transform = `rotate(${rot}deg)`;
    });
  }
  requestAnimationFrame(loop);
}

// Arranca el juego
gestionarRondas();
loop();