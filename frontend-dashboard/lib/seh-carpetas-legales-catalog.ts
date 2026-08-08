/** Catálogo fijo del ÍNDICE - CARPETAS LEGALES PLANTAS (réplica del Excel). */

export type CarpetasLegalesRow = {
  no: string;
  documento: string;
  especificacion: string;
  observaciones: string;
};

export type CarpetasLegalesSection = {
  id: string;
  labelLeft: string;
  title: string;
  rows: CarpetasLegalesRow[];
};

export const CARPETAS_LEGALES_SECTIONS: CarpetasLegalesSection[] = [
  {
    id: "general",
    labelLeft: "GENERAL",
    title: "Documental Legal Corporativa",
    rows: [
      {
        no: "0.1",
        documento: "Acta Constitutiva de la sociedad",
        especificacion: "Documento constitutivo y últimas reformas estatutarias",
        observaciones: "Copia simple en carpeta legal",
      },
      {
        no: "0.2",
        documento: "Poder Notarial del representante legal",
        especificacion: "Poder general para actos de administración y/o dominio",
        observaciones: "Verificar vigencia de facultades",
      },
      {
        no: "0.3",
        documento: "Identificación oficial (INE)",
        especificacion: "Identificación vigente del representante legal",
        observaciones: "Copia legible por ambos lados",
      },
      {
        no: "0.4",
        documento: "Póliza de Seguro de Responsabilidad Civil",
        especificacion: "Cobertura por daños a terceros vigente",
        observaciones: "Incluir recibo de pago correspondiente",
      },
      {
        no: "0.5",
        documento: "Identificación Fiscal - Cédula del RFC",
        especificacion: "Cédula de Identificación Fiscal de la empresa",
        observaciones: "Actualizada ante el SAT",
      },
      {
        no: "0.6",
        documento: "Alta en Hacienda",
        especificacion: "Constancia de Situación Fiscal / Inscripción",
        observaciones: "Domicilio fiscal actualizado",
      },
      {
        no: "0.7",
        documento: "Comprobante de Domicilio de la planta",
        especificacion: "Predial, luz o teléfono reciente (antigüedad menor a 3 meses)",
        observaciones: "Coincidente con ubicación de planta",
      },
    ],
  },
  {
    id: "sec1",
    labelLeft: "SECCIÓN 1",
    title: "Permisos Federales (CNE / ASEA / SENER) y Obligaciones Recurrentes",
    rows: [
      {
        no: "1.1",
        documento: "Título de Permiso",
        especificacion: "Permiso otorgado por la autoridad regulatoria (CNE / ASEA / SENER)",
        observaciones: "Original o copia",
      },
      {
        no: "1.2",
        documento: "Aviso de Inicio de Operaciones",
        especificacion: "Aviso formal presentado ante la autoridad competente",
        observaciones: "Original o copia",
      },
      {
        no: "1.3",
        documento: "Cesión de Derechos",
        especificacion: "Documento de cesión de derechos (en caso de aplicar)",
        observaciones: "Aplica solo si hubo cambio o cesión",
      },
      {
        no: "1.4",
        documento: "Acreditación de propiedad",
        especificacion: "Escrituras públicas o Contrato de Arrendamiento vigente",
        observaciones: "Original o copia (en caso de tenerlas)",
      },
      {
        no: "1.5",
        documento: "Listado de Parque Vehicular",
        especificacion: "Relación actualizada y autorizada de unidades de transporte",
        observaciones: "Revisión semestral",
      },
      {
        no: "1.6",
        documento: "Certificado de Destrucción de Cilindros",
        especificacion: "Constancias oficiales de baja y destrucción de recipientes",
        observaciones: "Emitido por empresa autorizada",
      },
      {
        no: "1.7",
        documento: "Manual de Operaciones y Mantenimiento",
        especificacion: "Bitácora oficial de Planta y procedimientos operativos",
        observaciones: "Disponible para consulta en sitio",
      },
      {
        no: "1.8",
        documento: "Evidencia de Pago de Supervisión Anual",
        especificacion: "Comprobantes de pago de derechos de supervisión (CNE / ASEA)",
        observaciones: "Actualizar ejercicio fiscal vigente",
      },
      {
        no: "1.9",
        documento: "Avisos de Modificaciones Técnicas",
        especificacion: "Registros de modificaciones y Cambio de Razón Social (si aplica)",
        observaciones: "Visto bueno",
      },
    ],
  },
  {
    id: "sec2",
    labelLeft: "SECCIÓN 2",
    title: "Planos y Memorias Técnico-Descriptivas",
    rows: [
      {
        no: "2.1",
        documento: "Proyecto Civil y Mecánico",
        especificacion: "Planos arquitectónicos, estructurales y memorias de cálculo mecánico",
        observaciones: "Unidad de Inspección acreditada",
      },
      {
        no: "2.2",
        documento: "Proyecto Planimétrico",
        especificacion: "Plano de conjunto y delimitación de áreas de la planta",
        observaciones: "Unidad de Inspección acreditada",
      },
      {
        no: "2.3",
        documento: "Proyecto Eléctrico",
        especificacion: "Diagramas unifilares, cuadro de cargas y memoria de cálculo",
        observaciones: "Unidad de Inspección acreditada",
      },
      {
        no: "2.4",
        documento: "Proyecto del Sistema Contra Incendio",
        especificacion: "Memorias de cálculo hidráulico, red de hidrantes y rociadores",
        observaciones: "Unidad de Inspección acreditada",
      },
    ],
  },
  {
    id: "sec3",
    labelLeft: "SECCIÓN 3",
    title: "Dictámenes Técnicos de Unidades de Inspección (NOMs)",
    rows: [
      {
        no: "3.1",
        documento: "Instalaciones Eléctricas",
        especificacion: "Dictamen bajo la NOM-001-SEDE-2012",
        observaciones: "Emitido por Unidad de Inspección acreditada",
      },
      {
        no: "3.2",
        documento: "Dictamen Estructural",
        especificacion: "Evaluación estructural de las instalaciones de planta",
        observaciones: "Firmado por DRO o perito estructurista",
      },
      {
        no: "3.3",
        documento: "NOM-018-ASEA-2023",
        especificacion: "Diseño y construcción de plantas de almacenamiento y distribución",
        observaciones: "Emitido por Unidad de Inspección acreditada",
      },
      {
        no: "3.4",
        documento: "NOM-EM-007-ASEA-2025",
        especificacion: "Parque vehicular y condiciones de transporte",
        observaciones: "Emitido por Unidad de Inspección acreditada",
      },
      {
        no: "3.5",
        documento: "NOM-013-SEDG-2002",
        especificacion: "Tanques de almacenamiento de Gas L.P.",
        observaciones: "Emitido por Unidad de Inspección acreditada",
      },
      {
        no: "3.6",
        documento: "NOM-016-CRE-2016",
        especificacion: "Calidad de los petrolíferos (Gas L.P.)",
        observaciones: "Informes de laboratorio y dictamen",
      },
      {
        no: "3.7",
        documento: "Certificados y Válvulas",
        especificacion: "Certificados de fabricación de tanques y Constancia de vigencia de válvulas",
        observaciones: "Trazabilidad completa",
      },
      {
        no: "3.8",
        documento: "NOM-001-STPS-2008",
        especificacion: "Edificios, locales, instalaciones y áreas de trabajo",
        observaciones: "Condiciones de seguridad generales",
      },
      {
        no: "3.9",
        documento: "NOM-002-STPS-2010",
        especificacion: "Prevención y protección contra incendios en los centros de trabajo",
        observaciones: "Equipo contra incendio y brigadas",
      },
      {
        no: "3.10",
        documento: "NOM-005-STPS-1998",
        especificacion: "Manejo, transporte y almacenamiento de sustancias inflamables",
        observaciones: "Sustancias químicas peligrosas",
      },
      {
        no: "3.11",
        documento: "NOM-011-STPS-2001",
        especificacion: "Condiciones de seguridad e higiene - Ruido",
        observaciones: "Evaluación de niveles sonoros en planta",
      },
      {
        no: "3.12",
        documento: "NOM-017-STPS-2008",
        especificacion: "Equipo de protección personal - Selección, uso y manejo en los centros de trabajo",
        observaciones: "Matriz de EPP actualizada",
      },
      {
        no: "3.13",
        documento: "NOM-018-STPS-2015",
        especificacion: "Sistema armonizado para la identificación de peligros (GHS)",
        observaciones: "Hojas de datos de seguridad y señalización",
      },
      {
        no: "3.14",
        documento: "NOM-019-STPS-2011",
        especificacion:
          "Constitución, integración, organización y funcionamiento de las comisiones de seguridad e higiene",
        observaciones: "Actas de recorrido trimestral",
      },
      {
        no: "3.15",
        documento: "NOM-020-STPS-2011",
        especificacion: "Recipientes a presión, recipientes criogénicos y generadores de vapor",
        observaciones: "Control y funcionamiento seguro",
      },
      {
        no: "3.16",
        documento: "NOM-022-STPS-2015",
        especificacion: "Electricidad estática en los centros de trabajo - Condiciones de seguridad",
        observaciones: "Mediciones de puesta a tierra",
      },
      {
        no: "3.17",
        documento: "NOM-025-STPS-2008",
        especificacion: "Condiciones de iluminación en los centros de trabajo",
        observaciones: "Estudio fotométrico",
      },
      {
        no: "3.18",
        documento: "NOM-026-STPS-2008",
        especificacion:
          "Colores y señales de seguridad e higiene, e identificación de riesgos por fluidos en tuberías",
        observaciones: "Pintura y señalización de gasoductos/tuberías",
      },
      {
        no: "3.19",
        documento: "NOM-028-STPS-2012",
        especificacion: "Sistema para la administración de seguridad - Procesos y equipos críticos",
        observaciones: "Administración de riesgos en procesos",
      },
      {
        no: "3.20",
        documento: "NOM-030-STPS-2009",
        especificacion: "Servicios preventivos de seguridad y salud en el trabajo - Funciones y actividades",
        observaciones: "Diagnóstico de seguridad y programa",
      },
      {
        no: "3.21",
        documento: "NOM-035-STPS-2018",
        especificacion: "Factores de riesgo psicosocial en el trabajo - Identificación, análisis y prevención",
        observaciones: "Aplicación de cuestionarios y planes de acción",
      },
      {
        no: "3.22",
        documento: "NOM-009-STPS-2011",
        especificacion: "Condiciones de seguridad para realizar trabajos en altura",
        observaciones: "Aplica en mantenimiento de tanques elevados o esferas",
      },
      {
        no: "3.23",
        documento: "NOM-010-STPS-2014",
        especificacion: "Agentes químicos contaminantes del ambiente laboral - Reconocimiento, evaluación y control",
        observaciones: "Evaluación de contaminantes del aire",
      },
      {
        no: "3.24",
        documento: "NOM-024-STPS-2001",
        especificacion: "Vibraciones - Condiciones de seguridad e higiene en los centros de trabajo",
        observaciones: "Evaluación por bombas de transferencia y compresores",
      },
      {
        no: "3.25",
        documento: "NOM-029-STPS-2011",
        especificacion: "Mantenimiento de las instalaciones eléctricas en los centros de trabajo",
        observaciones: "Procedimientos seguros tableros y motores",
      },
      {
        no: "3.26",
        documento: "NOM-036-1-STPS-2018",
        especificacion: "Factores de riesgo ergonómico - Manejo manual de cargas",
        observaciones: "Aplica si el personal manipula cilindros",
      },
      {
        no: "3.27",
        documento: "NOM-006-STPS-2023",
        especificacion: "Almacenamiento y manejo de materiales - Uso de maquinaria",
        observaciones: "Montacargas, grúas o bandas (cuando aplique)",
      },
      {
        no: "3.28",
        documento: "NOM-027-STPS-2008",
        especificacion: "Actividades de soldadura y corte - Condiciones de seguridad e higiene",
        observaciones: "Trabajos de modificación o reparación",
      },
      {
        no: "3.29",
        documento: "NOM-033-STPS-2015",
        especificacion: "Para realizar trabajos en espacios confinados",
        observaciones: "Limpieza o inspección interior de tanques",
      },
    ],
  },
  {
    id: "sec4",
    labelLeft: "SECCIÓN 4",
    title: "Ambientales",
    rows: [
      {
        no: "4.1",
        documento: "Manifestación de Impacto Ambiental (MIA)",
        especificacion: "Estudio de impacto ambiental autorizado",
        observaciones: "Resolutivo oficial",
      },
      {
        no: "4.2",
        documento: "Licencia Ambiental Única (LAU)",
        especificacion: "Cédula de registro y autorización ambiental",
        observaciones: "Actualizada",
      },
      {
        no: "4.3",
        documento: "Análisis de riesgo del sector hidrocarburo (ARSH)",
        especificacion: "Estudio especializado de riesgos",
        observaciones: "Validado por ASEA",
      },
      {
        no: "4.4",
        documento: "Programa de prevención de accidentes (PPA)",
        especificacion: "Estrategias y medidas preventivas",
        observaciones: "Validado por ASEA",
      },
      {
        no: "4.5",
        documento: "Estudio de riesgo ambiental (ERA)",
        especificacion: "Evaluación integral de riesgos en sitio",
        observaciones: "Documento técnico",
      },
      {
        no: "4.6",
        documento: "Protocolo de respuesta a emergencias (PRE)",
        especificacion: "Planes de acción ante contingencias",
        observaciones: "Presentación en periodo legal",
      },
      {
        no: "4.7",
        documento: "Cedula de operación Anual (COA)",
        especificacion: "Reporte anual de emisiones y transferencias",
        observaciones: "Presentación en periodo legal",
      },
    ],
  },
  {
    id: "sec5",
    labelLeft: "SECCIÓN 5",
    title: "Permisos Municipales, Estatales y de Protección Civil",
    rows: [
      {
        no: "5.1",
        documento: "Licencia de Funcionamiento",
        especificacion: "Autorización municipal para operación comercial",
        observaciones: "Renovación anual",
      },
      {
        no: "5.2",
        documento: "Uso de Suelo y Alineamiento",
        especificacion: "Cédula de Zonificación y Constancia de Alineamiento y Número Oficial",
        observaciones: "Emitido por municipio",
      },
      {
        no: "5.3",
        documento: "Licencia de Construcción original",
        especificacion: "Permiso de obra civil original",
        observaciones: "Respaldando instalaciones",
      },
      {
        no: "5.4",
        documento: "Visto Bueno de Protección Civil",
        especificacion: "Dictamen de viabilidad y Vobo estatal/municipal",
        observaciones: "Actualizado",
      },
      {
        no: "5.5",
        documento: "Estudio de Aguas Residuales",
        especificacion: "Análisis y permisos de descarga",
        observaciones: "Conforme a normatividad local",
      },
      {
        no: "5.6",
        documento: "Dictamen de Impacto Regional",
        especificacion: "Estudio de impacto regional (si aplica)",
        observaciones: "Conforme a normatividad local",
      },
      {
        no: "5.7",
        documento: "Programa Específico de Protección Civil",
        especificacion: "Programa interno de protección civil vigente y autorizado",
        observaciones: "Conforme a normatividad local",
      },
    ],
  },
  {
    id: "sec6",
    labelLeft: "SECCIÓN 6",
    title: "Seguridad, Capacitación (STPS) y Bitácoras de Operación",
    rows: [
      {
        no: "6.1",
        documento: "Hojas de Seguridad (HDS)",
        especificacion: "Hojas de datos de seguridad de productos químicos en sitio",
        observaciones: "Disponibles en áreas de manejo",
      },
      {
        no: "6.2",
        documento: "Constancias de competencias laborales DC-3",
        especificacion: "Evidencia de capacitación en evacuación, primeros auxilios, etc.",
        observaciones: "Plantilla operativa completa",
      },
      {
        no: "6.3",
        documento: "Capacitación específica Gas L.P. y Salud",
        especificacion: "Uso y manejo de gas L.P., seguridad e higiene, prevención de incendios",
        observaciones: "Registradas ante STPS",
      },
      {
        no: "6.4",
        documento: "Reportes de Simulacros periódicos",
        especificacion: "Evidencia fotográfica y documental de simulacros realizados",
        observaciones: "Programa anual ejecutado",
      },
      {
        no: "6.5",
        documento: "Bitácora de Extintores",
        especificacion: "Control, facturas y cartas responsivas de equipos contra incendio",
        observaciones: "Recargas y mantenimiento",
      },
      {
        no: "6.6",
        documento: "Bitácora de Mantenimiento General",
        especificacion: "Registro de mantenimiento preventivo y correctivo de instalaciones",
        observaciones: "Firmado por responsables de planta",
      },
    ],
  },
];
