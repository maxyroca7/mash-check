/*
 * planillas-base.js — Las 3 planillas MASH que vienen de fábrica.
 *
 * POR QUÉ ES UN ARCHIVO DE DATOS: la pantalla de carga NO sabe nada de botiquines ni de
 * tableros; solo sabe dibujar "una planilla" a partir de esta descripción. Así, agregar o
 * cambiar una planilla es cambiar datos, no código (y en la Fase 1b el constructor va a
 * generar exactamente esta misma forma de objeto).
 *
 * FORMA de una planilla:
 *   id, codigo, titulo
 *   cabecera:      campos de arriba            { key, label, tipo }   tipo: texto | opciones
 *   secciones:     tablas de ítems             { id, titulo, columnas[], filas[] }
 *   observaciones: true si lleva cuadro de notas al final
 *   pie:           campos de abajo (texto)     { key, label, tipo }
 *
 * TIPOS de columna: siNo | bienMal | check | texto
 *
 * La FECHA no está acá: todos los registros tienen siempre una fecha (el día elegido).
 * Tampoco hay firma dibujada: por ahora alcanza con el nombre escrito (ver DIAGNOSTICO.md).
 */
const PLANILLAS_BASE = [
  {
    id: 'botiquines',
    codigo: '6114 REG-04',
    titulo: 'Control de Botiquines',
    // En la planilla de papel los 5 puestos eran columnas (80 casillas juntas). Con guantes y
    // una mano eso es inmanejable, así que acá el PUESTO es un dato de la cabecera: se carga
    // un registro por puesto (16 ítems). El reporte los junta después.
    cabecera: [
      { key: 'puesto', label: 'Puesto', tipo: 'opciones',
        opciones: ['Puesto Uno', 'Producción', 'Calidad', 'Cocina', 'Logística A4'] },
      { key: 'reviso', label: 'Revisó', tipo: 'texto' }
    ],
    secciones: [{
      id: 's1',
      titulo: 'Elementos a chequear',
      columnas: [
        { key: 'c1', label: 'Disponible', tipo: 'siNo' },
        { key: 'c2', label: 'Observaciones', tipo: 'texto' }
      ],
      filas: [
        { key: 'r1', label: 'Guantes descartables' },
        { key: 'r2', label: 'Gasas y vendas' },
        { key: 'r3', label: 'Apósitos' },
        { key: 'r4', label: 'Cinta adhesiva' },
        { key: 'r5', label: 'Yodo (pervinox)' },
        { key: 'r6', label: 'Agua oxigenada' },
        { key: 'r7', label: 'Alcohol' },
        { key: 'r8', label: 'Jabón neutro (blanco)' },
        { key: 'r9', label: 'Alcohol en gel' },
        { key: 'r10', label: 'Platsul (crema para quemaduras)' },
        { key: 'r11', label: 'Ibuprofeno' },
        { key: 'r12', label: 'Paracetamol' },
        { key: 'r13', label: 'Irix colirio gotas' },
        { key: 'r14', label: 'Algodón' },
        { key: 'r15', label: 'Solución fisiológica' },
        { key: 'r16', label: 'Curitas' }
      ]
    }],
    observaciones: false,
    pie: []
  },

  {
    id: 'tableros',
    codigo: '6114 REG-09',
    titulo: 'Control de Tableros Eléctricos',
    cabecera: [
      { key: 'sector', label: 'Sector', tipo: 'texto' },
      { key: 'area', label: 'Área', tipo: 'texto' },
      { key: 'identificacion', label: 'Identificación', tipo: 'texto' },
      { key: 'tipo', label: 'Tipo', tipo: 'texto' }
    ],
    secciones: [
      {
        id: 's1',
        titulo: 'Estado general e instalación',
        columnas: [
          { key: 'c1', label: 'Condición', tipo: 'bienMal' },
          { key: 'c2', label: 'Acción a realizar', tipo: 'texto' },
          { key: 'c3', label: 'Responsable', tipo: 'texto' }
        ],
        filas: [
          { key: 'r1', label: 'Acceso despejado y cercano al área de trabajo' },
          { key: 'r2', label: 'Señalización de "Riesgo eléctrico"' },
          { key: 'r3', label: 'Señalización de la tensión de servicio' },
          { key: 'r4', label: 'Señalización de números de fases' },
          { key: 'r5', label: 'Tablero montado dentro de cajas/gabinetes/armarios' },
          { key: 'r6', label: 'Construido con materiales no higroscópicos ni combustibles' },
          { key: 'r7', label: 'Resistente a la corrosión o protegido contra ella' },
          { key: 'r8', label: 'Posee luces piloto que indiquen el funcionamiento de cada fase' },
          { key: 'r9', label: 'Posee tapa interior' },
          { key: 'r10', label: 'Instalación entre 0,6 y 2,0 m de altura' }
        ]
      },
      {
        id: 's2',
        titulo: 'Protecciones',
        columnas: [
          { key: 'c1', label: 'Condición', tipo: 'bienMal' },
          { key: 'c2', label: 'Acción a realizar', tipo: 'texto' },
          { key: 'c3', label: 'Responsable', tipo: 'texto' }
        ],
        filas: [
          { key: 'r1', label: '¿Tiene interruptores de corte o termomagnéticos automáticos?' },
          { key: 'r2', label: '¿Tiene interruptores diferenciales? (10 mA para 220 V y 30 mA para 380 V)' },
          { key: 'r3', label: 'El tablero cuenta con Puesta a Tierra (PAT)' },
          { key: 'r4', label: 'Todos los interruptores están debidamente identificados' },
          { key: 'r5', label: 'El cableado cuenta con recubrimiento y no está libre' },
          { key: 'r6', label: '¿Puede cerrarse fácilmente? ¿La cerradura está rígida o suelta?' }
        ]
      },
      {
        id: 's3',
        titulo: 'Trabajos a realizar',
        columnas: [
          { key: 'c1', label: 'Realizado', tipo: 'check' },
          { key: 'c2', label: 'Responsable', tipo: 'texto' }
        ],
        filas: [
          { key: 'r1', label: 'Limpieza' },
          { key: 'r2', label: 'Cableado desordenado' }
        ]
      }
    ],
    observaciones: true,
    pie: [
      { key: 'controlo', label: 'Controló', tipo: 'texto' }
    ]
  },

  {
    id: 'absorbentes',
    codigo: '6114 REG-05',
    titulo: 'Control de Absorbentes',
    cabecera: [
      { key: 'reviso', label: 'Revisó', tipo: 'texto' }
    ],
    secciones: [{
      id: 's1',
      titulo: 'Ubicaciones',
      columnas: [
        { key: 'c1', label: 'Disponible', tipo: 'siNo' },
        { key: 'c2', label: 'Recargar (<50%)', tipo: 'siNo' },
        { key: 'c3', label: 'Posee cartelería', tipo: 'siNo' },
        { key: 'c4', label: 'Tapa', tipo: 'siNo' },
        { key: 'c5', label: 'Limpio', tipo: 'siNo' },
        { key: 'c6', label: 'Observaciones', tipo: 'texto' }
      ],
      filas: [
        { key: 'r1', label: 'FCD' },
        { key: 'r2', label: 'Calle Principal' },
        { key: 'r3', label: 'Galpón principal: Solubles' },
        { key: 'r4', label: 'Floables 1-2' },
        { key: 'r5', label: 'Floables 3-4' },
        { key: 'r6', label: 'Floables L5' },
        { key: 'r7', label: 'Floables L6' },
        { key: 'r8', label: 'Taller' },
        { key: 'r9', label: 'Compactadora' },
        { key: 'r10', label: 'Líneas de Envasado 4 y 5' },
        { key: 'r11', label: 'Línea de paraquat' },
        { key: 'r12', label: 'Aduana' },
        { key: 'r13', label: 'Materia prima: salida de emergencia' },
        { key: 'r14', label: 'Producto terminado' },
        { key: 'r15', label: "Depósito de IBC's" },
        { key: 'r16', label: 'Sector 2,4D' },
        { key: 'r17', label: 'Línea de envasado ext. 2,4D' },
        { key: 'r18', label: 'Caldera' },
        { key: 'r19', label: 'Playón logístico' },
        { key: 'r20', label: 'Galpón A3' },
        { key: 'r21', label: 'HM' },
        { key: 'r22', label: 'Evaporador' },
        { key: 'r23', label: 'Galpón A4' }
      ]
    }],
    observaciones: false,
    pie: []
  }
];
