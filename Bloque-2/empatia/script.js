const contenedor = document.getElementById('contenedor-empatia');
const canvas = document.getElementById('canvas-empatia');
const ctx = canvas.getContext('2d');

let ancho, alto;
const colorPrimario = getComputedStyle(document.documentElement).getPropertyValue('--color-figura-primaria').trim() || '#f2f2f2';
const colorAlerta = getComputedStyle(document.documentElement).getPropertyValue('--color-acento').trim() || '#d94f30';

function ajustarCanvas() {
  ancho = window.innerWidth;
  alto = window.innerHeight;
  canvas.width = ancho;
  canvas.height = alto;
}
window.addEventListener('resize', ajustarCanvas);
ajustarCanvas();

const TIPOS_FIGURA = ['circulo', 'cuadrado', 'triangulo', 'linea'];
const NECESIDADES = ['cercania', 'espacio'];

// --- 1. CLASE FIGURA CON NECESIDADES MUTANTES ---
class Figura {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    
    // Forma visual aleatoria
    this.tipo = TIPOS_FIGURA[Math.floor(Math.random() * TIPOS_FIGURA.length)];
    
    // Necesidad emocional actual (aleatoria al nacer)
    this.necesidad = NECESIDADES[Math.floor(Math.random() * NECESIDADES.length)];
    
    this.radioBase = 18; // Un poco más chicas para que entren más en el lienzo
    this.estres = 0.5;   // Arrancan con algo de estrés
    this.ondaActiva = 0; // Temporizador visual de la onda
    
    // Radios de tolerancia
    this.radioCercania = 120; // Si necesita cercanía, alguien debe estar a menos de esto
    this.radioEspacio = 150;  // Si necesita espacio, nadie debe estar a menos de esto

    // Ciclo mutante: Cada cuánto cambia de opinión (entre 8 y 20 segundos)
    this.tiempoParaCambio = 30000 + (Math.random() * 45000); 
    this.ultimoUpdate = performance.now();
  }

  evaluarEntorno(todasLasFiguras, ahora) {
    // 1. ¿Es momento de cambiar de necesidad?
    const deltaTiempo = ahora - this.ultimoUpdate;
    this.tiempoParaCambio -= deltaTiempo;
    this.ultimoUpdate = ahora;

    if (this.tiempoParaCambio <= 0) {
      // Cambia de estado
      this.necesidad = this.necesidad === 'espacio' ? 'cercania' : 'espacio';
      // Reinicia el ciclo
      this.tiempoParaCambio = 30000 + (Math.random() * 45000);
      // Emite una onda automática para avisarle al usuario que algo cambió
      this.mostrarNecesidad();
    }

    // 2. Medir distancias con el resto
    let distanciaMinima = Infinity;
    todasLasFiguras.forEach(otra => {
      if (otra !== this) {
        const d = Math.hypot(this.x - otra.x, this.y - otra.y);
        if (d < distanciaMinima) distanciaMinima = d;
      }
    });

    // 3. Subir o bajar el estrés según su necesidad actual
    if (this.necesidad === 'cercania') {
      if (distanciaMinima > this.radioCercania) this.estres += 0.001; // Sufre soledad
      else this.estres -= 0.02; // Feliz acompañada
    } else if (this.necesidad === 'espacio') {
      if (distanciaMinima < this.radioEspacio) this.estres += 0.01; // Se satura rápido si la invaden
      else this.estres -= 0.01; // Feliz sola
    }

    this.estres = Math.max(0, Math.min(1, this.estres));
  }

  mostrarNecesidad() {
    this.ondaActiva = 60; // 60 frames de duración del pulso
  }

 dibujar() {
    ctx.save();
    let renderX = this.x;
    let renderY = this.y;

    // A) ONDA DE COMUNICACIÓN (Petición de Empatía)
    if (this.ondaActiva > 0) {
      const progresoOnda = 1 - (this.ondaActiva / 60);
      ctx.beginPath();
      
      if (this.necesidad === 'cercania') {
        const r = this.radioCercania - (this.radioCercania * progresoOnda);
        ctx.arc(renderX, renderY, Math.max(0, r), 0, Math.PI * 2);
      } else {
        const r = this.radioBase + (this.radioEspacio * progresoOnda);
        ctx.arc(renderX, renderY, r, 0, Math.PI * 2);
      }
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${1 - progresoOnda})`;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 8]);
      ctx.stroke();
      ctx.setLineDash([]);
      this.ondaActiva--;
    }

    // B) SÍNTOMAS DE ESTRÉS
    ctx.globalAlpha = 1;
    let escala = 1;
    let rotacion = 0;
    
    // Por defecto, todas usan el color primario
    let colorActual = colorPrimario; 

    // Color psicológico para la molestia/irritabilidad (Mostaza/Ácido)
    // Podés llevarte este valor a tu variables.css como --color-molestia
    const colorMolestia = '#ff7300';

    if (this.necesidad === 'cercania') {
      // SÍNTOMA DE SOLEDAD: Se achica, pero mantiene una opacidad mínima del 70%
      escala = 1 - (this.estres * 0.4); 
      ctx.globalAlpha = 1 - (this.estres * 0.3); 
      
      if (this.estres > 0.1) {
        // RADAR DE BÚSQUEDA: Emite un eco visual constante
        const tiempo = performance.now();
        const radioRadar = (tiempo / 20) % 70; 
        const opacidadRadar = (1 - (radioRadar / 70)) * this.estres;
        
        ctx.beginPath();
        ctx.arc(renderX, renderY, radioRadar, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${opacidadRadar})`;
        ctx.lineWidth = 1;
        ctx.stroke();
      }

    } else {
      // SÍNTOMA DE INVASIÓN: Tiembla y cambia al color de irritabilidad
      if (this.estres > 0.1) {
        const vibracion = this.estres * 3.5; 
        renderX += (Math.random() - 0.5) * vibracion;
        renderY += (Math.random() - 0.5) * vibracion;
        
        // Reemplaza el color sólido por el de molestia
        colorActual = colorMolestia; 
      }
    }

    // Si está en paz absoluta, micro-movimiento armónico
    if (this.estres === 0) {
      const tiempo = performance.now();
      rotacion = Math.sin(tiempo / 1000 + this.x) * 0.1;
      escala += Math.sin(tiempo / 500 + this.y) * 0.05;

    }

    // C) RENDERIZADO DE LAS FORMAS
    ctx.translate(renderX, renderY);
    ctx.rotate(rotacion);
    ctx.scale(escala, escala);
    
    ctx.beginPath();
    const r = this.radioBase;

    if (this.tipo === 'circulo') {
      ctx.arc(0, 0, r, 0, Math.PI * 2);
    } else if (this.tipo === 'cuadrado') {
      ctx.rect(-r, -r, r * 2, r * 2);
    } else if (this.tipo === 'triangulo') {
      ctx.moveTo(0, -r * 1.2);
      ctx.lineTo(r * 1.1, r * 0.8);
      ctx.lineTo(-r * 1.1, r * 0.8);
    } else if (this.tipo === 'linea') {
      ctx.rect(-r * 1.5, -3, r * 3, 6);
    }
    
    // Relleno sólido asegurado
    ctx.fillStyle = colorActual;
    ctx.fill();
    
    ctx.restore();
  }
}

// --- 2. POBLAR EL ESCENARIO (16 Figuras) ---
const figuras = [];
for (let i = 0; i < 16; i++) {
  const x = 50 + Math.random() * (ancho - 100);
  const y = 50 + Math.random() * (alto - 100);
  figuras.push(new Figura(x, y));
}

// --- 3. GESTIÓN MULTITÁCTIL Y TAPS ---
const agarres = new Map(); 

function obtenerFiguraCercana(x, y) {
  for (let i = 0; i < figuras.length; i++) {
    const f = figuras[i];
    if (Math.hypot(f.x - x, f.y - y) < f.radioBase + 25) return f;
  }
  return null;
}

function iniciarInteraccion(id, x, y) {
  const fig = obtenerFiguraCercana(x, y);
  if (fig) {
    agarres.set(id, { figura: fig, x, y, startX: x, startY: y, time: performance.now() });
  }
}

function moverInteraccion(id, x, y) {
  if (agarres.has(id)) {
    const agarre = agarres.get(id);
    agarre.x = x;
    agarre.y = y;
  }
}

function terminarInteraccion(id) {
  if (agarres.has(id)) {
    const agarre = agarres.get(id);
    const tiempoTocado = performance.now() - agarre.time;
    const distanciaMovida = Math.hypot(agarre.x - agarre.startX, agarre.y - agarre.startY);
    
    // TAP: Si tocó rápido y no arrastró, la figura emite la onda manual
    if (tiempoTocado < 250 && distanciaMovida < 10) {
      agarre.figura.mostrarNecesidad();
    }
    agarres.delete(id);
  }
}

// Eventos Mouse
canvas.addEventListener('mousedown', e => iniciarInteraccion('mouse', e.clientX, e.clientY));
window.addEventListener('mousemove', e => moverInteraccion('mouse', e.clientX, e.clientY));
window.addEventListener('mouseup', () => terminarInteraccion('mouse'));

// Eventos Touch
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  Array.from(e.changedTouches).forEach(t => iniciarInteraccion(t.identifier, t.clientX, t.clientY));
}, { passive: false });

window.addEventListener('touchmove', e => {
  if(e.cancelable) e.preventDefault();
  Array.from(e.changedTouches).forEach(t => moverInteraccion(t.identifier, t.clientX, t.clientY));
}, { passive: false });

window.addEventListener('touchend', e => {
  Array.from(e.changedTouches).forEach(t => terminarInteraccion(t.identifier));
});


// --- 4. BUCLE PRINCIPAL ---
function loop() {
  ctx.clearRect(0, 0, ancho, alto);
  const ahora = performance.now();

  // 1. Mover arrastradas
  agarres.forEach(agarre => {
    agarre.figura.x = agarre.x;
    agarre.figura.y = agarre.y;
  });

  // 2. Evaluar y dibujar
  let estresTotal = 0;

  figuras.forEach(fig => {
    fig.evaluarEntorno(figuras, ahora);
    estresTotal += fig.estres;
    fig.dibujar();
  });

  // 3. Armonía General (Hiper-sensible)
  let hayAlguienSufriendo = false;

  figuras.forEach(fig => {
    // Si alguna figura supera el 10% de estrés, consideramos que está incómoda
    if (fig.estres > 0.1) {
      hayAlguienSufriendo = true;
    }
  });
  
  // Si NADIE sufre, se activa el fondo armónico. Si ALGUIEN sufre, se rompe.
  if (!hayAlguienSufriendo && !contenedor.classList.contains('armonia-total')) {
    contenedor.classList.add('armonia-total');
  } else if (hayAlguienSufriendo && contenedor.classList.contains('armonia-total')) {
    contenedor.classList.remove('armonia-total');
  }

  requestAnimationFrame(loop);
}

loop();