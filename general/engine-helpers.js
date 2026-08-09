// general/engine-helpers.js
// Funciones base de Matter.js reutilizadas por las 9 interfaces del sistema

function crearMundoBase(canvasContainerId, opciones = {}) {
  const { Engine, Render, Runner, World } = Matter;

  const contenedor = document.getElementById(canvasContainerId);
  const ancho = opciones.width || contenedor.clientWidth;
  const alto = opciones.height || contenedor.clientHeight;

  const engine = Engine.create();
  engine.gravity.y = opciones.gravity !== undefined ? opciones.gravity : 1;

  const render = Render.create({
    element: contenedor,
    engine: engine,
    options: {
      width: ancho,
      height: alto,
      wireframes: false,
      background: opciones.background || 'transparent'
    }
  });

  Render.run(render);
  const runner = Runner.create();
  Runner.run(runner, engine);

  return { engine, render, runner, World };
}

function crearLimites(engine, ancho, alto, grosor = 60) {
  const { Bodies, World } = Matter;
  const opciones = { isStatic: true, render: { visible: false } };

  const suelo = Bodies.rectangle(ancho / 2, alto + grosor / 2, ancho, grosor, opciones);
  const paredIzq = Bodies.rectangle(-grosor / 2, alto / 2, grosor, alto * 2, opciones);
  const paredDer = Bodies.rectangle(ancho + grosor / 2, alto / 2, grosor, alto * 2, opciones);

  World.add(engine.world, [suelo, paredIzq, paredDer]);
  return { suelo, paredIzq, paredDer };
}

function crearFigura(World, world, tipo, x, y, opciones = {}) {
  const { Bodies } = Matter;
  const tamaño = opciones.tamaño || 40;
  const estilo = {
    restitution: opciones.restitution ?? 0.1,
    friction: opciones.friction ?? 0.8,
    render: { fillStyle: opciones.color || '#f2f2f2' }
  };

  let cuerpo;
  switch (tipo) {
    case 'circulo':
      cuerpo = Bodies.circle(x, y, tamaño / 2, estilo);
      break;
    case 'triangulo':
      cuerpo = Bodies.polygon(x, y, 3, tamaño / 1.5, estilo);
      break;
    case 'linea':
      cuerpo = Bodies.rectangle(x, y, tamaño * 2, 6, estilo);
      break;
    case 'cuadrado':
    default:
      cuerpo = Bodies.rectangle(x, y, tamaño, tamaño, estilo);
      break;
  }

  World.add(world, cuerpo);
  return cuerpo;
}