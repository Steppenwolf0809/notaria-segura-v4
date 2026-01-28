-- CreateTable
CREATE TABLE "formulario_uafe_asignaciones" (
    "id" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "numeroMatriz" TEXT NOT NULL,
    "actoContrato" TEXT NOT NULL,
    "calidadPersona" TEXT NOT NULL,
    "actuaPor" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "expiraEn" TIMESTAMP(3),
    "matrizadorId" INTEGER NOT NULL,
    "respuestaId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completadoEn" TIMESTAMP(3),

    CONSTRAINT "formulario_uafe_asignaciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "formulario_uafe_respuestas" (
    "id" TEXT NOT NULL,
    "asignacionId" TEXT NOT NULL,
    "personaId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "numeroMatriz" TEXT NOT NULL,
    "actoContrato" TEXT NOT NULL,
    "avaluoMunicipal" DOUBLE PRECISION,
    "valorContrato" DOUBLE PRECISION,
    "formaPagoCheque" BOOLEAN NOT NULL DEFAULT false,
    "formaPagoEfectivo" BOOLEAN NOT NULL DEFAULT false,
    "formaPagoTransferencia" BOOLEAN NOT NULL DEFAULT false,
    "formaPagoTarjeta" BOOLEAN NOT NULL DEFAULT false,
    "montoCheque" DOUBLE PRECISION,
    "montoEfectivo" DOUBLE PRECISION,
    "montoTransferencia" DOUBLE PRECISION,
    "montoTarjeta" DOUBLE PRECISION,
    "bancoCheque" TEXT,
    "bancoTransferencia" TEXT,
    "bancoTarjeta" TEXT,
    "calidad" TEXT NOT NULL,
    "actuaPor" TEXT NOT NULL,
    "tipoIdentificacion" TEXT NOT NULL,
    "numeroIdentificacion" TEXT NOT NULL,
    "nacionalidad" TEXT NOT NULL,
    "estadoCivil" TEXT NOT NULL,
    "genero" TEXT NOT NULL,
    "nivelEstudio" TEXT NOT NULL,
    "callePrincipal" TEXT NOT NULL,
    "numeroDomicilio" TEXT,
    "calleSecundaria" TEXT,
    "situacionLaboral" TEXT NOT NULL,
    "relacionDependencia" BOOLEAN,
    "nombreEntidad" TEXT,
    "fechaIngreso" TIMESTAMP(3),
    "direccionLaboral" TEXT,
    "provinciaLaboral" TEXT,
    "cantonLaboral" TEXT,
    "profesionOcupacion" TEXT,
    "cargo" TEXT,
    "ingresoMensual" DOUBLE PRECISION,
    "tieneConyugue" BOOLEAN NOT NULL DEFAULT false,
    "conyugeApellidos" TEXT,
    "conyugeNombres" TEXT,
    "conyugeTipoId" TEXT,
    "conyugeNumeroId" TEXT,
    "conyugeNacionalidad" TEXT,
    "conyugeEstadoCivil" TEXT,
    "conyugeGenero" TEXT,
    "conyugeNivelEstudio" TEXT,
    "conyugeCorreo" TEXT,
    "conyugeCelular" TEXT,
    "conyugeCallePrincipal" TEXT,
    "conyugeNumero" TEXT,
    "conyugeCalleSecundaria" TEXT,
    "conyugeProfesion" TEXT,
    "conyugeSituacionLaboral" TEXT,
    "conyugeRelacionDependencia" BOOLEAN,
    "conyugeNombreEntidad" TEXT,
    "conyugeFechaIngreso" TIMESTAMP(3),
    "conyugeDireccionLaboral" TEXT,
    "conyugeProvinciaLaboral" TEXT,
    "conyugeCantonLaboral" TEXT,
    "tieneBeneficiario" BOOLEAN NOT NULL DEFAULT false,
    "beneficiarioApellidos" TEXT,
    "beneficiarioNombres" TEXT,
    "beneficiarioTipoId" TEXT,
    "beneficiarioNumeroId" TEXT,
    "beneficiarioNacionalidad" TEXT,
    "beneficiarioEstadoCivil" TEXT,
    "beneficiarioGenero" TEXT,
    "beneficiarioNivelEstudio" TEXT,
    "beneficiarioProfesion" TEXT,
    "beneficiarioDireccion" TEXT,
    "beneficiarioCorreo" TEXT,
    "beneficiarioTelefono" TEXT,
    "beneficiarioCelular" TEXT,
    "esPEP" BOOLEAN NOT NULL DEFAULT false,
    "esFamiliarPEP" BOOLEAN NOT NULL DEFAULT false,
    "relacionPEP" TEXT,
    "esColaboradorPEP" BOOLEAN NOT NULL DEFAULT false,
    "tipoColaborador" TEXT,
    "completadoEn" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ipAddress" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "formulario_uafe_respuestas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "formulario_uafe_asignaciones_token_key" ON "formulario_uafe_asignaciones"("token");

-- CreateIndex
CREATE UNIQUE INDEX "formulario_uafe_asignaciones_respuestaId_key" ON "formulario_uafe_asignaciones"("respuestaId");

-- CreateIndex
CREATE INDEX "formulario_uafe_asignaciones_token_idx" ON "formulario_uafe_asignaciones"("token");

-- CreateIndex
CREATE INDEX "formulario_uafe_asignaciones_personaId_idx" ON "formulario_uafe_asignaciones"("personaId");

-- CreateIndex
CREATE INDEX "formulario_uafe_asignaciones_matrizadorId_idx" ON "formulario_uafe_asignaciones"("matrizadorId");

-- CreateIndex
CREATE INDEX "formulario_uafe_asignaciones_estado_idx" ON "formulario_uafe_asignaciones"("estado");

-- CreateIndex
CREATE INDEX "formulario_uafe_asignaciones_numeroMatriz_idx" ON "formulario_uafe_asignaciones"("numeroMatriz");

-- CreateIndex
CREATE UNIQUE INDEX "formulario_uafe_respuestas_asignacionId_key" ON "formulario_uafe_respuestas"("asignacionId");

-- CreateIndex
CREATE INDEX "formulario_uafe_respuestas_personaId_idx" ON "formulario_uafe_respuestas"("personaId");

-- CreateIndex
CREATE INDEX "formulario_uafe_respuestas_asignacionId_idx" ON "formulario_uafe_respuestas"("asignacionId");

-- CreateIndex
CREATE INDEX "formulario_uafe_respuestas_numeroMatriz_idx" ON "formulario_uafe_respuestas"("numeroMatriz");

-- CreateIndex
CREATE INDEX "formulario_uafe_respuestas_completadoEn_idx" ON "formulario_uafe_respuestas"("completadoEn");

-- AddForeignKey
ALTER TABLE "formulario_uafe_asignaciones" ADD CONSTRAINT "formulario_uafe_asignaciones_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas_registradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulario_uafe_asignaciones" ADD CONSTRAINT "formulario_uafe_asignaciones_matrizadorId_fkey" FOREIGN KEY ("matrizadorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulario_uafe_asignaciones" ADD CONSTRAINT "formulario_uafe_asignaciones_respuestaId_fkey" FOREIGN KEY ("respuestaId") REFERENCES "formulario_uafe_respuestas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "formulario_uafe_respuestas" ADD CONSTRAINT "formulario_uafe_respuestas_personaId_fkey" FOREIGN KEY ("personaId") REFERENCES "personas_registradas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
