MÓDULO FORMULARIOS UAFE DIGITALES - ESPECIFICACIÓN COMPLETA

# 📋 MÓDULO FORMULARIOS UAFE DIGITALES
## Sistema de Trazabilidad Notarial - Notaría 18 Quito

📊 RESUMEN EJECUTIVO
Objetivo
Crear un sistema digital para captura, gestión y generación de formularios UAFE (Unidad de Análisis Financiero y Económico) que permita:

Registro proactivo de información personal por parte de usuarios
Reutilización de datos en múltiples trámites
Generación automática de PDFs oficiales
Reportes para cumplimiento UAFE

Alcance

✅ Formularios para Personas Naturales
✅ Formularios para Personas Jurídicas
✅ Formularios de Bienes Inmuebles
✅ Formularios de Vehículos
✅ Sistema de autenticación con PIN
✅ Integración con sistema existente de trazabilidad

Tecnologías

Backend: Node.js + Express + Prisma + PostgreSQL
Frontend: React + Material UI
Autenticación: PIN de 6 dígitos + Sesiones temporales
Generación PDF: pdfmake o jspdf


🏗️ ARQUITECTURA DEL SISTEMA
4 Subsistemas Integrados:
┌────────────────────────────────────────────────────────┐
│ SUBSISTEMA 1: Base de Datos Pública de Personas       │
│ • URL permanente sin token                             │
│ • Autenticación con PIN                                │
│ • Accesible 24/7                                       │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│ SUBSISTEMA 2: Creación de Formularios (Matrizador)    │
│ • Busca personas por cédula                            │
│ • Auto-completa con BD de personas                     │
│ • Genera token único + QR                              │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│ SUBSISTEMA 3: Revisión y Validación (Link Público)    │
│ • Acceso con token específico                          │
│ • Usuario revisa y actualiza datos                     │
│ • Cambios actualizan BD maestra                        │
└────────────────────────────────────────────────────────┘
                          ↓
┌────────────────────────────────────────────────────────┐
│ SUBSISTEMA 4: Generación de PDFs (Matrizador)         │
│ • Validación final de datos                            │
│ • Generación manual de PDFs                            │
│ • Edición perpetua desde matrizador                    │
└────────────────────────────────────────────────────────┘

🔄 SUBSISTEMA 1: BASE DE DATOS PÚBLICA DE PERSONAS
URL Permanente:
https://notaria18quito.com.ec/registro-personal
Flujo de Autenticación con PIN:
┌─────────────────────────────────────────┐
│ 1. Usuario accede a /registro-personal │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. Ingresa CÉDULA:                      │
│    [1234567890] [CONTINUAR]             │
└─────────────────────────────────────────┘
                    ↓
        ┌───────────────────────┐
        │ ¿Existe en sistema?   │
        └───────────────────────┘
         │                    │
      NO │                    │ SÍ
         ↓                    ↓
┌──────────────────┐   ┌──────────────────┐
│ CREAR CUENTA     │   │ INGRESAR         │
│                  │   │                  │
│ Crea PIN (6)     │   │ Ingresa PIN      │
│ [●][●][●][●][●][●]│   │ [●][●][●][●][●][●]│
│ Confirmar:       │   │                  │
│ [●][●][●][●][●][●]│   │ [INGRESAR]       │
│                  │   │                  │
│ [CREAR CUENTA]   │   │ ¿Olvidó PIN?     │
│                  │   │ Ver nota abajo   │
└──────────────────┘   └──────────────────┘
         │                    │
         └──────────┬──────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. SESIÓN ACTIVA (30 minutos)           │
│    • Puede llenar/editar información    │
│    • Extensión automática si activo     │
└─────────────────────────────────────────┘
Recuperación de PIN:
Usuario olvidó PIN
         ↓
NO hay recuperación online
         ↓
Debe acercarse a Notaría 18 con cédula física
         ↓
Matrizador verifica identidad presencial
         ↓
Matrizador resetea PIN desde panel admin
         ↓
Usuario crea nuevo PIN
Características:
✅ Sin token permanente - Solo cédula como ID
✅ PIN de 6 dígitos - Fácil de recordar
✅ Sesiones de 30 minutos - Auto-extensión si activo
✅ Recuperación presencial - Máxima seguridad
✅ Proactivo - Usuario llena antes de ir a notaría
✅ Reutilizable - Una vez llenado, sirve para todos los trámites

🔄 SUBSISTEMA 2: CREACIÓN DE FORMULARIOS (MATRIZADOR)
Flujo de Creación:
┌─────────────────────────────────────────┐
│ 1. Matrizador accede a:                 │
│    "Formularios UAFE" (menú lateral)    │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. Click [+ Nuevo Formulario]           │
│    Selecciona TIPO:                     │
│    • Bienes Inmuebles                   │
│    • Vehículos                          │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. Completa datos del ACTO:             │
│                                         │
│ 🏠 Si es INMUEBLE:                      │
│    • Nº Matriz: [____________]          │
│    • Tipo acto: [Compraventa ▼]        │
│    • Valor: [$__________]               │
│    • Avalúo: [$__________]              │
│                                         │
│ 🚗 Si es VEHÍCULO:                      │
│    • Nº Matriz: [____________]          │
│    • Tipo acto: [Compraventa ▼]        │
│    • Valor: [$__________]               │
│    • Ciudad comercialización: [_____]   │
│    • Ciudad matriculado: [_____]        │
│    • Marca/Modelo/Año (opcional)        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. Agrega COMPARECIENTES:               │
│    [+ Agregar Persona]                  │
│                                         │
│    ┌──────────────────────────────────┐ │
│    │ Cédula/RUC: [1234567890]         │ │
│    │ [BUSCAR]                          │ │
│    └──────────────────────────────────┘ │
│              ↓                          │
│    ┌──────────────────────────────────┐ │
│    │ ✅ JUAN PÉREZ (Encontrado)        │ │
│    │ Info completa - Hace 2 días      │ │
│    │                                  │ │
│    │ Rol: [Comprador ▼]               │ │
│    │ [AGREGAR]                        │ │
│    └──────────────────────────────────┘ │
│                                         │
│    ┌──────────────────────────────────┐ │
│    │ ❌ MARÍA LÓPEZ (No encontrada)    │ │
│    │                                  │ │
│    │ [Enviar link de registro]        │ │
│    └──────────────────────────────────┘ │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 5. Matrizador ve ESTADO:                │
│                                         │
│ ✅ Juan Pérez - Comprador               │
│    Info completa                        │
│                                         │
│ ⚠️  María López - Vendedor              │
│    Pendiente de registro                │
│                                         │
│ [EDITAR MANUALMENTE]                    │
│ [GENERAR LINK REVISIÓN]                 │
│ [GUARDAR BORRADOR]                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 6. Al [GENERAR LINK]:                   │
│                                         │
│ Sistema crea:                           │
│ • Token único: C8GHIWTZ                 │
│ • URL: notaria18quito.com.ec/uafe/TOKEN │
│ • Código QR con la URL                  │
│                                         │
│ Matrizador puede:                       │
│ • Copiar URL                            │
│ • Descargar QR                          │
│ • Enviar por WhatsApp                   │
└─────────────────────────────────────────┘
Estados de Comparecientes:
✅ Completado   - Info completa en BD, listo
⚠️  Incompleto  - Registrado pero faltan campos
❌ No registrado - Debe crear cuenta primero
👁️  En revisión - Accedió al link, editando

🔄 SUBSISTEMA 3: REVISIÓN Y VALIDACIÓN (LINK PÚBLICO)
URL con Token:
https://notaria18quito.com.ec/uafe/C8GHIWTZ
Flujo:
┌─────────────────────────────────────────┐
│ 1. Usuario recibe link/QR del matrizador│
│    Accede SIN autenticación             │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. Página muestra:                      │
│                                         │
│ 📄 FORMULARIO UAFE                      │
│ Trámite: Compraventa de Inmueble       │
│ Nº Matriz: 20251701018D00531           │
│ Valor: $85,000                         │
│                                         │
│ ─────────────────────────────────      │
│                                         │
│ TU INFORMACIÓN (Pre-cargada):          │
│                                         │
│ [Formulario completo con datos]        │
│ • Datos personales                     │
│ • Dirección                            │
│ • Info laboral                         │
│ • Cónyuge                              │
│ • PEP                                  │
│                                         │
│ [GUARDAR CAMBIOS]                      │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. Usuario puede:                       │
│    ✅ REVISAR datos pre-cargados        │
│    ✅ COMPLETAR campos faltantes        │
│    ✅ CORREGIR información incorrecta   │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. Al [GUARDAR CAMBIOS]:                │
│                                         │
│    ✅ Actualiza formulario específico   │
│    ✅ Actualiza BD personal (maestra)   │
│       (para próximos trámites)          │
│                                         │
│    Matrizador ve notificación:         │
│    "Juan Pérez actualizó su info"      │
└─────────────────────────────────────────┘
Actualización Bidireccional:
BD Personal (Maestra)  ←→  Formulario Específico

Cambios en link /uafe/TOKEN:
  1. Actualizan el formulario
  2. Actualizan la BD maestra
  3. Próximos formularios ya tienen datos nuevos

🔄 SUBSISTEMA 4: GENERACIÓN DE PDFs (MATRIZADOR)
Flujo:
┌─────────────────────────────────────────┐
│ 1. Matrizador ve dashboard:             │
│                                         │
│ Formulario #1234                       │
│ Compraventa Inmueble                   │
│                                         │
│ ✅ Juan Pérez - Revisado                │
│ ✅ María López - Revisado               │
│                                         │
│ Estado: ✅ Completo                     │
│                                         │
│ [GENERAR PDFs]                         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 2. Sistema genera:                      │
│    • form_juan_perez_1234567890.pdf     │
│    • form_maria_lopez_0987654321.pdf    │
│                                         │
│    Formato oficial UAFE                 │
│    Pre-llenado con toda la info         │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 3. Matrizador descarga:                 │
│    • PDFs individuales                  │
│    • ZIP con todos                      │
│    • Imprime directamente               │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│ 4. IMPORTANTE:                          │
│    Formulario SIGUE EDITABLE            │
│                                         │
│    Matrizador puede:                    │
│    • Editar datos en cualquier momento  │
│    • Regenerar PDFs con cambios         │
│    • No hay "cierre" definitivo         │
└─────────────────────────────────────────┘

🔐 SISTEMA DE SEGURIDAD CON PIN
Requisitos del PIN:
javascriptconst PIN_REQUIREMENTS = {
  length: 6,              // Exactamente 6 dígitos
  onlyNumbers: true,      // Solo 0-9
  noSequential: true,     // No "123456" o "654321"
  noRepeated: true,       // No "111111"
  notSameCedula: false    // Por simplicidad, no validamos esto
};

// ✅ VÁLIDOS:
"847392"
"502938"
"193847"

// ❌ INVÁLIDOS:
"123456"  // Secuencial
"654321"  // Secuencial inverso
"111111"  // Repetido
"12345"   // Muy corto
"1234567" // Muy largo
"abc123"  // Con letras
Protecciones Implementadas:
javascriptconst SECURITY_CONFIG = {
  // Intentos fallidos
  maxIntentosFallidos: 5,
  tiempoBloqueo: 15 * 60 * 1000, // 15 minutos
  
  // Sesiones
  duracionSesion: 30 * 60 * 1000, // 30 minutos
  extenderSiActivo: true,
  
  // Rate limiting
  maxIntentosPorIP: 10,  // Por hora
  maxCreacionesPorIP: 3   // Por día
};
Hashing:
javascript// Usar bcrypt (ya instalado en el proyecto)
import bcrypt from 'bcrypt';

// Al crear
const pinHash = await bcrypt.hash(pin, 10);

// Al verificar
const isValid = await bcrypt.compare(pinIngresado, pinHash);
```

### **Flujo de Bloqueo:**
```
Intento 1: ❌ Incorrecto
Intento 2: ❌ Incorrecto  
Intento 3: ❌ Incorrecto - "2 intentos restantes"
Intento 4: ❌ Incorrecto - "1 intento restante"
Intento 5: ❌ Incorrecto - "Cuenta bloqueada por 15 minutos"
         ↓
  🔒 BLOQUEADO
  Timer: 14:59, 14:58...
         ↓
  Después de 15 min:
  ✅ Desbloqueado automáticamente
  Contador de intentos: 0

🗄️ MODELO DE BASE DE DATOS (PRISMA)
Schema Completo:
prisma// ========================================
// SUBSISTEMA 1: BASE DE DATOS DE PERSONAS
// ========================================

model PersonaRegistrada {
  id                    String   @id @default(uuid())
  numeroIdentificacion  String   @unique
  tipoPersona           String   // "NATURAL" o "JURIDICA"
  
  // 🔐 AUTENTICACIÓN
  pinHash               String   // Hash bcrypt del PIN
  pinCreado             Boolean  @default(false)
  pinResetCount         Int      @default(0)
  
  // 🛡️ SEGURIDAD
  intentosFallidos      Int      @default(0)
  bloqueadoHasta        DateTime?
  ultimoAcceso          DateTime?
  ultimoIntentoFallido  DateTime?
  
  // 📄 DATOS DEL FORMULARIO UAFE
  datosPersonaNatural   Json?    // Estructura completa
  datosPersonaJuridica  Json?    // Estructura completa
  completado            Boolean  @default(false)
  
  // 📅 METADATA
  createdAt             DateTime @default(now())
  updatedAt             DateTime @updatedAt
  
  // 🔗 RELACIONES
  participaciones       ParticipanteFormulario[]
  sesiones              SesionPersonal[]
  auditoria             AuditoriaPersona[]
  
  @@map("personas_registradas")
  @@index([numeroIdentificacion])
  @@index([bloqueadoHasta])
}

// ========================================
// SESIONES TEMPORALES
// ========================================

model SesionPersonal {
  id              String   @id @default(uuid())
  personaId       String
  token           String   @unique
  
  // ⏰ EXPIRACIÓN
  expiraEn        DateTime
  ultimaActividad DateTime @default(now())
  
  // 🌐 TRACKING
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime @default(now())
  
  persona         PersonaRegistrada @relation(fields: [personaId], references: [id], onDelete: Cascade)
  
  @@map("sesiones_personales")
  @@index([token])
  @@index([personaId])
  @@index([expiraEn])
}

// ========================================
// SUBSISTEMA 2 y 3: FORMULARIOS ESPECÍFICOS
// ========================================

model FormularioUAFE {
  id              String   @id @default(uuid())
  token           String   @unique @db.VarChar(8)
  
  // TIPO DE FORMULARIO
  tipoFormulario  String   // "INMUEBLE" o "VEHICULO"
  
  // DATOS DEL ACTO (común)
  numeroMatriz    String   
  tipoActo        String   // "COMPRAVENTA", "PERMUTA", etc.
  valorContrato   Decimal  @db.Decimal(12, 2)
  
  // DATOS ESPECÍFICOS DE INMUEBLES
  avaluoMunicipal Decimal? @db.Decimal(12, 2)
  
  // DATOS ESPECÍFICOS DE VEHÍCULOS
  ciudadComercializacion  String?
  ciudadMatriculado       String?
  marcaVehiculo           String?
  modeloVehiculo          String?
  anioVehiculo            Int?
  
  // ESTADO
  estado          String   @default("borrador") 
  // Estados: "borrador", "enviado_revision", "completo"
  
  // AUDITORÍA
  createdBy       Int      
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
  
  // RELACIONES
  creador         User     @relation(fields: [createdBy], references: [id])
  participantes   ParticipanteFormulario[]
  
  @@map("formularios_uafe")
  @@index([token])
  @@index([numeroMatriz])
  @@index([tipoFormulario])
}

// TABLA INTERMEDIA: Personas en Formularios
model ParticipanteFormulario {
  id                    String   @id @default(uuid())
  formularioId          String
  personaId             String
  
  // ROL EN ESTE TRÁMITE
  rol                   String   // "COMPRADOR", "VENDEDOR"
  
  // ESTADO
  revisado              Boolean  @default(false)
  revisadoAt            DateTime?
  
  // SNAPSHOT de datos al crear
  snapshotDatos         Json
  
  // RELACIONES
  formulario            FormularioUAFE    @relation(fields: [formularioId], references: [id], onDelete: Cascade)
  persona               PersonaRegistrada @relation(fields: [personaId], references: [id])
  
  @@map("participantes_formulario")
  @@unique([formularioId, personaId])
  @@index([formularioId])
  @@index([personaId])
}

// ========================================
// REPORTES UAFE (Vehículos)
// ========================================

model TransaccionVehiculo {
  id                  String   @id @default(uuid())
  formularioId        String   
  
  // PERSONAS INVOLUCRADAS
  compradorCedula     String
  compradorNombre     String
  vendedorCedula      String
  vendedorNombre      String
  
  // DATOS DEL VEHÍCULO
  valorContrato       Decimal  @db.Decimal(12, 2)
  ciudadComercializ   String
  ciudadMatriculado   String
  marca               String?
  modelo              String?
  anio                Int?
  
  // FECHA
  fechaActo           DateTime
  
  // REPORTE UAFE
  reportadoUAFE       Boolean  @default(false)
  reportadoAt         DateTime?
  
  @@map("transacciones_vehiculos")
  @@index([compradorCedula])
  @@index([vendedorCedula])
  @@index([fechaActo])
  @@index([reportadoUAFE])
}

// ========================================
// AUDITORÍA
// ========================================

model AuditoriaPersona {
  id              String   @id @default(uuid())
  personaId       String
  
  // EVENTO
  tipo            String   
  // "REGISTRO", "LOGIN", "PIN_FALLIDO", "PIN_RESET", 
  // "BLOQUEO", "DESBLOQUEO", "ACTUALIZACION"
  descripcion     String
  
  // RESPONSABLE
  matrizadorId    Int?     // NULL si acción del usuario
  matrizador      User?    @relation(fields: [matrizadorId], references: [id])
  
  // TRACKING
  ipAddress       String?
  userAgent       String?
  
  createdAt       DateTime @default(now())
  
  persona         PersonaRegistrada @relation(fields: [personaId], references: [id], onDelete: Cascade)
  
  @@map("auditoria_personas")
  @@index([personaId])
  @@index([tipo])
  @@index([createdAt])
}

📦 ESTRUCTURA JSON: datosPersonaNatural
json{
  "identificacion": {
    "tipo": "CEDULA",
    "numero": "1234567890",
    "nacionalidad": "ECUATORIANA"
  },
  "datosPersonales": {
    "apellidos": "PÉREZ GONZÁLEZ",
    "nombres": "JUAN CARLOS",
    "genero": "MASCULINO",
    "estadoCivil": "CASADO",
    "nivelEstudio": "UNIVERSITARIO"
  },
  "contacto": {
    "email": "juan.perez@email.com",
    "telefono": "022345678",
    "celular": "0987654321"
  },
  "direccion": {
    "callePrincipal": "Av. 10 de Agosto",
    "numero": "N35-42",
    "calleSecundaria": "Villalengua",
    "provincia": "PICHINCHA",
    "canton": "QUITO",
    "parroquia": "IÑAQUITO"
  },
  "informacionLaboral": {
    "situacion": "PRIVADO",
    "relacionDependencia": true,
    "nombreEntidad": "EMPRESA XYZ S.A.",
    "direccionEmpresa": "Av. Amazonas y Naciones Unidas",
    "provinciaCanton": "PICHINCHA / QUITO",
    "profesionOcupacion": "INGENIERO COMERCIAL",
    "cargo": "GERENTE DE VENTAS",
    "ingresoMensual": 2500.00,
    "fechaIngreso": "2020-03-15"
  },
  "conyuge": {
    "apellidos": "LÓPEZ MORALES",
    "nombres": "MARÍA FERNANDA",
    "tipoIdentificacion": "CEDULA",
    "numeroIdentificacion": "0987654321",
    "nacionalidad": "ECUATORIANA",
    "genero": "FEMENINO",
    "nivelEstudio": "MAESTRIA",
    "estadoCivil": "CASADO",
    "email": "maria.lopez@email.com",
    "celular": "0991234567",
    "direccion": {
      "callePrincipal": "Av. 10 de Agosto",
      "numero": "N35-42",
      "calleSecundaria": "Villalengua"
    },
    "profesionOcupacion": "ARQUITECTA",
    "informacionLaboral": {
      "situacion": "PRIVADO",
      "relacionDependencia": true,
      "nombreEntidad": "CONSTRUCTORA ABC",
      "direccion": "Av. 6 de Diciembre",
      "provinciaCanton": "PICHINCHA / QUITO",
      "fechaIngreso": "2019-06-01"
    }
  },
  "pep": {
    "esPersonaExpuesta": false,
    "esFamiliarPEP": false,
    "esColaboradorPEP": false,
    "relacionFamiliar": null,
    "relacionLaboral": null
  },
  "beneficiarioFinal": {
    "apellidos": null,
    "nombres": null,
    "tipoIdentificacion": null,
    "numeroIdentificacion": null
  },
  "metadata": {
    "fechaRegistro": "2025-01-15T10:30:00Z",
    "ultimaActualizacion": "2025-02-10T14:20:00Z",
    "fuenteRegistro": "WEB_PUBLICA",
    "ipRegistro": "181.198.32.45"
  }
}

📦 ESTRUCTURA JSON: datosPersonaJuridica
json{
  "compania": {
    "razonSocial": "CONSTRUCTORA EJEMPLO S.A.",
    "ruc": "1791234567001",
    "objetoSocial": "CONSTRUCCIÓN DE OBRAS CIVILES Y EDIFICACIONES"
  },
  "direccionCompania": {
    "callePrincipal": "Av. República del Salvador",
    "numero": "N34-123",
    "calleSecundaria": "Suiza",
    "provincia": "PICHINCHA",
    "canton": "QUITO",
    "parroquia": "IÑAQUITO"
  },
  "contactoCompania": {
    "email": "info@constructoraejemplo.com",
    "telefono": "022567890",
    "celular": "0998765432"
  },
  "representanteLegal": {
    "apellidos": "GARCÍA TORRES",
    "nombres": "ROBERTO CARLOS",
    "tipoIdentificacion": "CEDULA",
    "numeroIdentificacion": "1712345678",
    "nacionalidad": "ECUATORIANA",
    "genero": "MASCULINO",
    "estadoCivil": "CASADO",
    "nivelEstudio": "UNIVERSITARIO",
    "email": "roberto.garcia@constructoraejemplo.com",
    "telefono": "022567890",
    "celular": "0998765432",
    "direccion": {
      "callePrincipal": "Calle Los Cipreses",
      "numero": "OE5-67",
      "calleSecundaria": "Los Álamos"
    },
    "informacionLaboral": {
      "situacion": "PRIVADO",
      "relacionDependencia": false,
      "profesionOcupacion": "INGENIERO CIVIL",
      "ingresoMensual": 5000.00
    },
    "conyuge": {
      "apellidos": "SÁNCHEZ RIVERA",
      "nombres": "ANDREA PATRICIA",
      "tipoIdentificacion": "CEDULA",
      "numeroIdentificacion": "1723456789",
      "nacionalidad": "ECUATORIANA",
      "genero": "FEMENINO",
      "nivelEstudio": "MAESTRIA",
      "estadoCivil": "CASADO",
      "email": "andrea.sanchez@email.com",
      "celular": "0987123456",
      "direccion": {
        "callePrincipal": "Calle Los Cipreses",
        "numero": "OE5-67",
        "calleSecundaria": "Los Álamos"
      },
      "profesionOcupacion": "CONTADORA",
      "informacionLaboral": {
        "situacion": "PRIVADO",
        "relacionDependencia": true,
        "nombreEntidad": "AUDITORA XYZ",
        "direccion": "Av. Amazonas y Colón",
        "provinciaCanton": "PICHINCHA / QUITO",
        "fechaIngreso": "2018-04-10"
      }
    },
    "pep": {
      "esPersonaExpuesta": false,
      "esFamiliarPEP": false,
      "esColaboradorPEP": false
    }
  },
  "socios": [
    {
      "nombresApellidos": "ROBERTO CARLOS GARCÍA TORRES",
      "numeroIdentificacion": "1712345678",
      "telefono": "0998765432",
      "celular": "0998765432"
    },
    {
      "nombresApellidos": "ANDREA PATRICIA SÁNCHEZ RIVERA",
      "numeroIdentificacion": "1723456789",
      "telefono": "0987123456",
      "celular": "0987123456"
    }
  ],
  "beneficiarioFinal": {
    "apellidos": null,
    "nombres": null
  }
}

🚗 FORMULARIOS DE VEHÍCULOS
Campos Específicos:
javascript{
  tipoFormulario: "VEHICULO",
  
  // Campos obligatorios UAFE
  ciudadComercializacion: "QUITO",
  ciudadMatriculado: "GUAYAQUIL",
  
  // Campos opcionales
  marcaVehiculo: "CHEVROLET",
  modeloVehiculo: "SAIL",
  anioVehiculo: 2020,
  placaVehiculo: "PCE-1234",
  numeroMotor: "ABC123XYZ",
  numeroChasis: "8LBET16H0BF123456"
}
Reporte Mensual UAFE:
sql-- Query para reporte de personas que compran/venden vehículos
SELECT 
  v.compradorCedula,
  v.compradorNombre,
  SUM(v.valorContrato) as total_compras,
  COUNT(*) as cantidad_vehiculos,
  v.ciudadComercializ
FROM transacciones_vehiculos v
WHERE v.fechaActo BETWEEN '2025-01-01' AND '2025-01-31'
  AND v.reportadoUAFE = false
GROUP BY v.compradorCedula, v.compradorNombre, v.ciudadComercializ
HAVING SUM(v.valorContrato) > 10000
ORDER BY total_compras DESC;

🌐 ENDPOINTS DE LA API
PÚBLICOS (Sin autenticación):
javascript// 1. Verificar si cédula existe
GET /api/personal/verificar-cedula/:cedula
Response: { 
  existe: true/false, 
  tipoPersona: "NATURAL" | "JURIDICA" | null 
}

// 2. Crear cuenta con PIN
POST /api/personal/registrar
Body: {
  cedula: "1234567890",
  tipoPersona: "NATURAL",
  pin: "847392",
  pinConfirmacion: "847392"
}
Response: { 
  success: true, 
  sessionToken: "...", 
  expiraEn: "2025-11-13T16:00:00Z" 
}

// 3. Login con PIN
POST /api/personal/login
Body: {
  cedula: "1234567890",
  pin: "847392"
}
Response: { 
  success: true, 
  sessionToken: "...", 
  expiraEn: "2025-11-13T16:00:00Z",
  intentosRestantes: 5
}

// 4. Obtener mi información
GET /api/personal/mi-informacion
Headers: { x-session-token: "..." }
Response: { 
  success: true, 
  data: {
    numeroIdentificacion: "1234567890",
    tipoPersona: "NATURAL",
    datosPersonaNatural: {...},
    completado: true,
    ultimaActualizacion: "2025-02-10T14:20:00Z"
  }
}

// 5. Actualizar mi información
PUT /api/personal/mi-informacion
Headers: { x-session-token: "..." }
Body: { 
  datosPersonaNatural: {...} 
}
Response: { 
  success: true, 
  message: "Información actualizada" 
}

// 6. Extender sesión
POST /api/personal/extender-sesion
Headers: { x-session-token: "..." }
Response: { 
  success: true, 
  nuevaExpiracion: "2025-11-13T16:30:00Z" 
}

// 7. Logout
POST /api/personal/logout
Headers: { x-session-token: "..." }
Response: { success: true }
PROTEGIDOS (Matrizador con JWT):
javascript// 8. Buscar persona por cédula
GET /api/personal/buscar/:cedula
Headers: { Authorization: "Bearer ..." }
Response: { 
  success: true, 
  existe: true,
  data: {
    id: "uuid",
    numeroIdentificacion: "1234567890",
    tipoPersona: "NATURAL",
    completado: true,
    ultimaActualizacion: "2025-02-10T14:20:00Z",
    datosPersonaNatural: {...}
  }
}

// 9. Resetear PIN
POST /api/personal/:personaId/resetear-pin
Headers: { Authorization: "Bearer ..." }
Body: { 
  motivo: "Cliente olvidó PIN y presentó cédula física" 
}
Response: { 
  success: true, 
  message: "PIN reseteado. Usuario puede crear nuevo PIN." 
}

// 10. Desbloquear usuario
POST /api/personal/:personaId/desbloquear
Headers: { Authorization: "Bearer ..." }
Response: { 
  success: true, 
  message: "Usuario desbloqueado" 
}

// 11. Ver historial de auditoría
GET /api/personal/:personaId/auditoria
Headers: { Authorization: "Bearer ..." }
Query: ?page=1&limit=20
Response: { 
  success: true, 
  eventos: [
    {
      tipo: "REGISTRO",
      descripcion: "Usuario creó su cuenta",
      createdAt: "2025-01-15T10:30:00Z",
      ipAddress: "181.198.32.45"
    },
    {
      tipo: "PIN_RESET",
      descripcion: "PIN reseteado por matrizador",
      matrizador: { nombre: "Juan Matrizador" },
      createdAt: "2025-02-10T09:15:00Z"
    }
  ],
  total: 15,
  page: 1
}

// 12. Crear formulario UAFE
POST /api/formularios-uafe
Headers: { Authorization: "Bearer ..." }
Body: {
  tipoFormulario: "INMUEBLE",
  numeroMatriz: "20251701018D00531",
  tipoActo: "COMPRAVENTA",
  valorContrato: 85000.00,
  avaluoMunicipal: 75000.00,
  comparecientes: [
    {
      cedula: "1234567890",
      rol: "COMPRADOR"
    },
    {
      cedula: "0987654321",
      rol: "VENDEDOR"
    }
  ]
}
Response: {
  success: true,
  data: {
    id: "uuid",
    token: "C8GHIWTZ",
    verificationURL: "https://notaria18quito.com.ec/uafe/C8GHIWTZ",
    qr: {
      base64: "data:image/png;base64,..."
    },
    participantes: [
      {
        cedula: "1234567890",
        nombre: "JUAN PÉREZ",
        rol: "COMPRADOR",
        estado: "completo"
      },
      {
        cedula: "0987654321",
        nombre: "MARÍA LÓPEZ",
        rol: "VENDEDOR",
        estado: "pendiente"
      }
    ]
  }
}

// 13. Listar formularios
GET /api/formularios-uafe
Headers: { Authorization: "Bearer ..." }
Query: ?page=1&limit=10&estado=borrador&tipoFormulario=INMUEBLE
Response: {
  success: true,
  formularios: [...],
  total: 45,
  page: 1
}

// 14. Obtener formulario específico
GET /api/formularios-uafe/:id
Headers: { Authorization: "Bearer ..." }
Response: {
  success: true,
  data: {
    id: "uuid",
    token: "C8GHIWTZ",
    tipoFormulario: "INMUEBLE",
    numeroMatriz: "...",
    participantes: [...],
    estado: "borrador"
  }
}

// 15. Generar PDFs
POST /api/formularios-uafe/:id/generar-pdfs
Headers: { Authorization: "Bearer ..." }
Response: {
  success: true,
  pdfs: [
    {
      compareciente: "JUAN PÉREZ",
      cedula: "1234567890",
      pdfUrl: "/downloads/form_juan_perez_1234567890.pdf"
    },
    {
      compareciente: "MARÍA LÓPEZ",
      cedula: "0987654321",
      pdfUrl: "/downloads/form_maria_lopez_0987654321.pdf"
    }
  ],
  zipUrl: "/downloads/formulario_C8GHIWTZ.zip"
}
```

---

## 🎨 COMPONENTES FRONTEND

### **Estructura de Archivos:**
```
frontend/src/
├── pages/
│   ├── RegistroPersonal.jsx          # Página pública /registro-personal
│   │   ├── VerificarCedula (Step 1)
│   │   ├── CrearPIN (Step 2a)
│   │   ├── IngresarPIN (Step 2b)
│   │   └── FormularioDatos (Step 3)
│   │
│   └── FormularioPublico.jsx         # Página pública /uafe/:token
│
├── components/
│   ├── personal/
│   │   ├── PINInput.jsx              # Input de 6 dígitos
│   │   ├── ValidadorPIN.jsx          # Feedback visual
│   │   ├── SesionTimer.jsx           # Countdown 30 min
│   │   ├── FormularioPersonaNatural.jsx
│   │   ├── FormularioPersonaJuridica.jsx
│   │   └── MensajeRecuperacionPIN.jsx
│   │
│   └── matrizador/
│       ├── GestionUsuarios/
│       │   ├── BuscarPersona.jsx
│       │   ├── ListaPersonas.jsx
│       │   ├── DetallePersona.jsx
│       │   ├── ResetearPIN.jsx
│       │   ├── DesbloquearUsuario.jsx
│       │   └── HistorialAuditoria.jsx
│       │
│       └── FormulariosUAFE/
│           ├── FormularioUAFEMain.jsx
│           ├── CrearFormulario.jsx
│           ├── AgregarCompareciente.jsx
│           ├── ListaFormularios.jsx
│           ├── DetallesFormulario.jsx
│           └── GenerarPDFs.jsx
│
├── services/
│   ├── personal-service.js           # API calls públicos
│   └── formularios-uafe-service.js   # API calls matrizador
│
└── hooks/
    ├── usePersonalAuth.js            # Hook para autenticación PIN
    ├── usePersonalSession.js         # Hook para sesión temporal
    └── useFormularioUAFE.js          # Hook para formularios
```

---

## 🔧 PANEL DE ADMINISTRACIÓN (MATRIZADOR)

### **Nueva Sección en Menú Lateral:**
```
Dashboard
Documentos
Usuarios
  ├─ Matrizadores
  ├─ Personal Notaría
  └─ 👥 Gestión de Usuarios UAFE  ← NUEVO
Formularios UAFE  ← NUEVO
  ├─ Crear Formulario
  ├─ Mis Formularios
  └─ Reportes UAFE
Reportes
Configuración
```

### **Pantalla: Gestión de Usuarios UAFE**
```
┌─────────────────────────────────────────┐
│ 👥 GESTIÓN DE USUARIOS UAFE             │
└─────────────────────────────────────────┘

[Buscar: ___________] [🔍]

Filtros: [Todos ▼] [Activos] [Bloqueados]

┌──────────────────────────────────────────┐
│ JUAN CARLOS PÉREZ GONZÁLEZ              │
│ 📇 1234567890                           │
│ 📅 Registrado: 15/01/2025               │
│ ⏰ Último acceso: Hace 2 días           │
│ 🔐 Intentos fallidos: 0/5               │
│ ✅ Estado: Activo                        │
│                                         │
│ [🔄 Resetear PIN] [📊 Ver Historial]    │
│ [✏️ Editar Datos]                       │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ PEDRO GÓMEZ SÁNCHEZ                     │
│ 📇 1122334455                           │
│ 📅 Registrado: 08/02/2025               │
│ ⏰ Último acceso: Hace 3 horas          │
│ 🔐 Intentos fallidos: 5/5 ❌            │
│ 🔒 Estado: Bloqueado (12 min)          │
│                                         │
│ [🔓 Desbloquear] [🔄 Resetear PIN]      │
└──────────────────────────────────────────┘
```

### **Modal: Resetear PIN**
```
┌──────────────────────────────────────────┐
│ ⚠️ RESETEAR PIN                         │
└──────────────────────────────────────────┘

Usuario: JUAN CARLOS PÉREZ GONZÁLEZ
Cédula: 1234567890

⚠️ IMPORTANTE:
¿Verificaste la identidad del usuario 
presencialmente con cédula física?

Motivo del reseteo:
[___________________________________]

Este reseteo quedará registrado en el
historial de auditoría.

[CANCELAR]  [SÍ, RESETEAR PIN]

⏱️ ESTIMACIÓN DE TIEMPO
Desarrollo por Módulo:
MóduloSubtareasTiempoBackend - Sistema PIN1-1.5 días• Modelos PrismaCrear schema completo2h• Endpoints públicosLogin, registro, mi-info3h• Middleware sesionesValidación, expiración2h• Endpoints matrizadorBuscar, resetear, auditoría2hFrontend - Público1 día• Componente PINInput6 dígitos, validación2h• Flujo crear cuentaVerificar cédula, crear PIN2h• Flujo loginIngresar PIN, errores2h• Formulario datosP. Natural y P. Jurídica2hFrontend - Matrizador1 día• Búsqueda personaInput, resultados2h• Resetear PINModal, confirmación2h• Historial auditoríaTabla, filtros2h• Formularios UAFECrear, listar, editar2hGeneración PDFs1 día• Plantilla P. NaturalLayout completo3h• Plantilla P. JurídicaLayout completo3h• Generación masivaZIP, descarga2hTesting y Ajustes0.5 días• Pruebas flujo completo2h• Ajustes UI/UX2h
TOTAL: 4.5-5 días de desarrollo

🔒 SEGURIDAD - CHECKLIST
Implementaciones Obligatorias:

 PIN hashing con bcrypt (salt rounds: 10)
 Validación formato PIN (6 dígitos, no secuencial, no repetido)
 Rate limiting por IP (10 intentos/hora)
 Bloqueo automático (5 intentos fallidos = 15 min)
 Sesiones con expiración (30 minutos)
 Tokens de sesión únicos (UUID v4)
 Limpieza automática (sesiones expiradas cada hora)
 Auditoría completa (todos los eventos registrados)
 HTTPS obligatorio (en producción)
 Headers de seguridad (helmet.js)
 Sanitización de inputs (validación estricta)
 CORS configurado (solo dominios permitidos)


📊 REPORTES UAFE
Reporte Mensual de Vehículos:
sql-- Personas que compraron/vendieron vehículos en el mes
SELECT 
  CASE 
    WHEN total_como_comprador > 0 THEN compradorCedula
    ELSE vendedorCedula
  END as cedula,
  CASE 
    WHEN total_como_comprador > 0 THEN compradorNombre
    ELSE vendedorNombre
  END as nombre,
  total_como_comprador,
  cantidad_como_comprador,
  total_como_vendedor,
  cantidad_como_vendedor,
  (total_como_comprador + total_como_vendedor) as total_general
FROM (
  SELECT 
    compradorCedula,
    compradorNombre,
    SUM(CASE WHEN rol = 'COMPRADOR' THEN valorContrato ELSE 0 END) as total_como_comprador,
    COUNT(CASE WHEN rol = 'COMPRADOR' THEN 1 END) as cantidad_como_comprador,
    SUM(CASE WHEN rol = 'VENDEDOR' THEN valorContrato ELSE 0 END) as total_como_vendedor,
    COUNT(CASE WHEN rol = 'VENDEDOR' THEN 1 END) as cantidad_como_vendedor,
    vendedorCedula,
    vendedorNombre
  FROM transacciones_vehiculos
  WHERE EXTRACT(MONTH FROM fechaActo) = EXTRACT(MONTH FROM CURRENT_DATE)
    AND EXTRACT(YEAR FROM fechaActo) = EXTRACT(YEAR FROM CURRENT_DATE)
  GROUP BY compradorCedula, compradorNombre, vendedorCedula, vendedorNombre
) subquery
WHERE total_como_comprador > 10000 OR total_como_vendedor > 10000
ORDER BY total_general DESC;
```

### **Dashboard de Reportes:**
```
┌─────────────────────────────────────────┐
│ 📊 REPORTES UAFE - VEHÍCULOS            │
└─────────────────────────────────────────┘

Período: [Noviembre 2025 ▼]

RESUMEN DEL MES:
- Total transacciones: 127
- Valor total: $1,847,500.00
- Personas sobre umbral: 8

┌──────────────────────────────────────────┐
│ TRANSACCIONES SOBRE $10,000             │
└──────────────────────────────────────────┘

JUAN PÉREZ (1234567890)
  Como comprador: 3 vehículos - $45,000
  Como vendedor: 1 vehículo - $15,000
  TOTAL: $60,000

MARÍA LÓPEZ (0987654321)
  Como comprador: 2 vehículos - $32,000
  TOTAL: $32,000

[Exportar Excel] [Enviar a UAFE]

🚀 PRÓXIMOS PASOS
Fase 1: MVP (Semana 1-2)

✅ Implementar modelos Prisma
✅ Backend sistema PIN
✅ Frontend registro público
✅ Panel matrizador básico

Fase 2: Formularios UAFE (Semana 3)

✅ Crear formularios (matrizador)
✅ Link de revisión (público)
✅ Integración BD personal ↔️ Formularios

Fase 3: PDFs y Reportes (Semana 4)

✅ Generación PDFs (P. Natural)
✅ Generación PDFs (P. Jurídica)
✅ Reportes UAFE (vehículos)

Fase 4: Testing y Deploy (Semana 5)

✅ Testing completo
✅ Ajustes UI/UX
✅ Deploy a producción
✅ Capacitación equipo


📝 NOTAS IMPORTANTES
Decisiones de Diseño:

PIN vs Código por Email/WhatsApp

✅ Elegimos PIN por simplicidad y rapidez
✅ Sin costos de envío de mensajes
✅ Recuperación presencial es más segura


Recuperación Presencial

✅ Máxima seguridad
✅ Sin vectores de ataque online
✅ Auditoría completa de reseteos


Actualización Bidireccional

✅ Cambios en formulario → BD maestra
✅ Próximos trámites ya tienen datos actualizados
✅ Usuario mantiene control de su información


Edición Perpetua

✅ Matrizador siempre puede editar
✅ Regeneración de PDFs ilimitada
✅ No hay "cierre" definitivo de formularios




✅ CHECKLIST DE IMPLEMENTACIÓN
Backend:

 Crear migración Prisma con todos los modelos
 Implementar endpoints públicos (7 endpoints)
 Implementar endpoints matrizador (8 endpoints)
 Middleware de validación de sesiones
 Rate limiting
 Sistema de auditoría
 Generador de tokens únicos
 Limpieza automática de sesiones expiradas

Frontend Público:

 Página /registro-personal
 Componente PINInput
 Validación de PIN en tiempo real
 Formulario Persona Natural
 Formulario Persona Jurídica
 Timer de sesión (30 min)
 Mensaje de recuperación presencial
 Página /uafe/:token

Frontend Matrizador:

 Sección "Gestión de Usuarios UAFE"
 Búsqueda de personas
 Modal resetear PIN
 Modal desbloquear usuario
 Historial de auditoría
 Sección "Formularios UAFE"
 Crear formulario (inmuebles/vehículos)
 Agregar comparecientes
 Ver estado de formularios
 Generar PDFs
 Reportes UAFE

PDFs:

 Plantilla Persona Natural (inmuebles)
 Plantilla Persona Jurídica (inmuebles)
 Plantilla Persona Natural (vehículos)
 Plantilla Persona Jurídica (vehículos)
 Generación masiva (ZIP)

Testing:

 Flujo completo registro → formulario → PDF
 Bloqueo por intentos fallidos
 Expiración de sesiones
 Reseteo de PIN
 Actualización bidireccional de datos
 Generación de reportes UAFE

