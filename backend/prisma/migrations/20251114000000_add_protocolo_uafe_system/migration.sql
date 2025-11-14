-- CreateTable: ProtocoloUAFE (información del trámite)
CREATE TABLE "protocolos_uafe" (
    "id" TEXT NOT NULL,
    "numeroProtocolo" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "actoContrato" TEXT NOT NULL,
    "avaluoMunicipal" DECIMAL(12,2),
    "valorContrato" DECIMAL(12,2) NOT NULL,
    "formaPago" JSONB NOT NULL,
    "createdBy" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "protocolos_uafe_pkey" PRIMARY KEY ("id")
);

-- CreateTable: PersonaProtocolo (relación N:N entre personas y protocolos)
CREATE TABLE "personas_protocolo" (
    "id" TEXT NOT NULL,
    "protocoloId" TEXT NOT NULL,
    "personaCedula" TEXT NOT NULL,
    "calidad" TEXT NOT NULL,
    "actuaPor" TEXT NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "completadoAt" TIMESTAMP(3),
    "respuestaFormulario" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "personas_protocolo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: SesionFormularioUAFE (sesiones temporales)
CREATE TABLE "sesiones_formulario_uafe" (
    "id" TEXT NOT NULL,
    "personaProtocoloId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "ultimaActividad" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sesiones_formulario_uafe_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Unique index on numeroProtocolo
CREATE UNIQUE INDEX "protocolos_uafe_numeroProtocolo_key" ON "protocolos_uafe"("numeroProtocolo");

-- CreateIndex: Indexes for ProtocoloUAFE
CREATE INDEX "protocolos_uafe_numeroProtocolo_idx" ON "protocolos_uafe"("numeroProtocolo");
CREATE INDEX "protocolos_uafe_createdBy_idx" ON "protocolos_uafe"("createdBy");
CREATE INDEX "protocolos_uafe_createdAt_idx" ON "protocolos_uafe"("createdAt");

-- CreateIndex: Unique constraint for PersonaProtocolo (one person per protocol)
CREATE UNIQUE INDEX "personas_protocolo_protocoloId_personaCedula_key" ON "personas_protocolo"("protocoloId", "personaCedula");

-- CreateIndex: Indexes for PersonaProtocolo
CREATE INDEX "personas_protocolo_protocoloId_idx" ON "personas_protocolo"("protocoloId");
CREATE INDEX "personas_protocolo_personaCedula_idx" ON "personas_protocolo"("personaCedula");
CREATE INDEX "personas_protocolo_completado_idx" ON "personas_protocolo"("completado");

-- CreateIndex: Unique index on session token
CREATE UNIQUE INDEX "sesiones_formulario_uafe_token_key" ON "sesiones_formulario_uafe"("token");

-- CreateIndex: Indexes for SesionFormularioUAFE
CREATE INDEX "sesiones_formulario_uafe_token_idx" ON "sesiones_formulario_uafe"("token");
CREATE INDEX "sesiones_formulario_uafe_personaProtocoloId_idx" ON "sesiones_formulario_uafe"("personaProtocoloId");
CREATE INDEX "sesiones_formulario_uafe_expiraEn_idx" ON "sesiones_formulario_uafe"("expiraEn");

-- AddForeignKey: ProtocoloUAFE -> User
ALTER TABLE "protocolos_uafe" ADD CONSTRAINT "protocolos_uafe_createdBy_fkey" FOREIGN KEY ("createdBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: PersonaProtocolo -> ProtocoloUAFE (with CASCADE delete)
ALTER TABLE "personas_protocolo" ADD CONSTRAINT "personas_protocolo_protocoloId_fkey" FOREIGN KEY ("protocoloId") REFERENCES "protocolos_uafe"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey: PersonaProtocolo -> PersonaRegistrada
ALTER TABLE "personas_protocolo" ADD CONSTRAINT "personas_protocolo_personaCedula_fkey" FOREIGN KEY ("personaCedula") REFERENCES "personas_registradas"("numeroIdentificacion") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey: SesionFormularioUAFE -> PersonaProtocolo (with CASCADE delete)
ALTER TABLE "sesiones_formulario_uafe" ADD CONSTRAINT "sesiones_formulario_uafe_personaProtocoloId_fkey" FOREIGN KEY ("personaProtocoloId") REFERENCES "personas_protocolo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
