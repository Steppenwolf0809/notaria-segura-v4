// Nota: evitamos dependencias externas (dayjs) para no requerir instalación.

export const EcuadorPatterns = {
  cedula: /\b\d{10}\b/g,
  ruc: /\b\d{13}001\b/g,
  passport: /\b[A-Z0-9]{6,15}\b/g,
  plate: /\b[A-Z]{3}[-]?\d{3,4}\b/g,
  plateOld: /\b[A-Z]{2}[-]?\d{4,5}\b/g,
  phone: /\b(\+593|0)[0-9]{8,9}\b/g,
  email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,

  // Fechas
  dateSpanish: /\b\d{1,2}\s+DE\s+[A-ZÁÉÍÓÚÑ]+\s+DEL?\s+\d{4}\b/gi,
  dateNumeric: /\b\d{1,2}\/\d{1,2}\/\d{4}\b/g,
  dateSlashReverse: /\b\d{4}\/\d{1,2}\/\d{1,2}\b/g,
  dateDashReverse: /\b\d{4}-\d{1,2}-\d{1,2}\b/g,

  // Montos
  amount: /\$\s*[\d,]+\.?\d*/g,
  amountWords: /\b(UN|DOS|TRES|CUATRO|CINCO|SEIS|SIETE|OCHO|NUEVE|DIEZ|ONCE|DOCE|TRECE|CATORCE|QUINCE|DIECISEIS|DIECISIETE|DIECIOCHO|DIECINUEVE|VEINTE|VEINTIUN|TREINTA|CUARENTA|CINCUENTA|SESENTA|SETENTA|OCHENTA|NOVENTA|CIEN|CIENTO|DOSCIENTOS|TRESCIENTOS|CUATROCIENTOS|QUINIENTOS|SEISCIENTOS|SETECIENTOS|OCHOCIENTOS|NOVECIENTOS|MIL|MILLON|MILLONES)\s+(DOLARES?|USD)\b/gi,

  // Nombres y títulos
  personName: /\b[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+){1,4}\b/g,
  nameFull: /\b[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s]{2,50}\b/g,
  titles: /\b(DR|DRA|ING|ECON|AB|LIC|MSC|PHD|MD)\.\s*[A-ZÁÉÍÓÚÑ]/g,

  // Vehículos
  vehicleBrands: /\b(TOYOTA|CHEVROLET|NISSAN|HYUNDAI|KIA|FORD|MAZDA|MITSUBISHI|SUZUKI|VOLKSWAGEN|RENAULT|PEUGEOT|CITROEN|FIAT|BMW|MERCEDES|AUDI|VOLVO|JEEP|LAND\s+ROVER|SUBARU|ISUZU|DAIHATSU|GREAT\s+WALL|JAC|CHERY|GEELY|BYD|DFSK|FOTON|JMC|DONGFENG|CHANGHE|CHANA)\b/gi,
  engineNumber: /\b[A-Z0-9]{6,17}\b/g,
  chassisNumber: /\b[A-HJ-NPR-Z0-9]{17}\b/g,
  vehicleYear: /\b(19|20)\d{2}\b/g,

  // Entidades y notaría
  companyTypes: /\b(CIA\.\s*LTDA|COMPAÑIA\s+LIMITADA|S\.A\.|SOCIEDAD\s+ANONIMA|FUNDACION|CORPORACION|COOPERATIVA|CONSORCIO)\b/gi,
  notaryNumbers: /(PRIMERA|SEGUNDA|TERCERA|CUARTA|QUINTA|SEXTA|SEPTIMA|OCTAVA|NOVENA|DECIMA|UNDECIMA|DUODECIMA|DECIMOTERCERA|DECIMOCUARTA|DECIMOQUINTA|DECIMOSEXTA|DECIMOSEPTIMA|DECIMOCTAVA|DECIMONOVENA|VIGESIMA)\s+NOTARIA/gi,

  // Ubicaciones
  provinces: /\b(AZUAY|BOLIVAR|CAÑAR|CARCHI|COTOPAXI|CHIMBORAZO|EL\s+ORO|ESMERALDAS|GUAYAS|IMBABURA|LOJA|LOS\s+RIOS|MANABI|MORONA\s+SANTIAGO|NAPO|PASTAZA|PICHINCHA|TUNGURAHUA|ZAMORA\s+CHINCHIPE|GALAPAGOS|SUCUMBIOS|ORELLANA|SANTO\s+DOMINGO|SANTA\s+ELENA)\b/gi,
  cantons: /\b(QUITO|GUAYAQUIL|CUENCA|AMBATO|MANTA|PORTOVIEJO|MACHALA|SANTO\s+DOMINGO|ELOY\s+ALFARO|LOJA|RIOBAMBA|ESMERALDAS|IBARRA|MILAGRO|LA\s+LIBERTAD|BABAHOYO|GUARANDA|TULCAN|LATACUNGA|PUYO|MACAS|TENA|NUEVA\s+LOJA|FRANCISCO\s+DE\s+ORELLANA|ZAMORA|AZOGUES|PASAJE|DAULE|SAMBORONDON|CAYAMBE|SANGOLQUI|OTAVALO|SALINAS)\b/gi,

  // Documento (números)
  escrituraNumber: /ESCRITURA\s+N[°º]?\s*[:\s]*(\d{4,18}P?\d{0,10})/gi,
  escrituraCompleteNumber: /(\d{11,18}P\d{4,6})/g,
  repertorioNumber: /REPERTORIO\s+N[°º]?\s*(\d+)/gi,
  folioNumber: /FOLIO\s+N[°º]?\s*(\d+)/gi,

  // Artículo 29
  articulo29: /ARTICULO\s+29|ART\.\s*29|ARTICLE\s+29/gi,
  valorOperacion: /VALOR\s+DE\s+LA\s+OPERACION|VALOR\s+OPERACION|PRECIO\s+DE\s+VENTA/gi,
  formaPago: /FORMA\s+DE\s+PAGO|MODALIDAD\s+DE\s+PAGO|CONDICIONES\s+DE\s+PAGO/gi,

  // Direcciones
  address: /\b(CALLE|AVENIDA|AV\.|PASAJE|SECTOR|BARRIO|CIUDADELA|CONJUNTO|URBANIZACION|VILLA|CONDOMINIOS?)\s+[A-ZÁÉÍÓÚÑ0-9\s\-\.]{5,50}/gi,
  addressNumber: /\b(N[°º]?\s*\d+[\-\d]*|#\s*\d+[\-\d]*|NUMERO\s+\d+)\b/gi,
  fullAddress: /(CALLE|AV\.|AVENIDA)\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+N?[°º]?\s*(\d+[\-\d]*)\s+Y\s+(CALLE|AV\.|AVENIDA)?\s*([A-ZÁÉÍÓÚÑ\s]+)/gi,
  simpleAddress: /(CALLE|AVENIDA|AV\.)\s+([A-ZÁÉÍÓÚÑ\s]+?)\s+Y\s+([A-ZÁÉÍÓÚÑ\s]+)/gi,
  addressLocation: /(?:DIRECCION|UBICADO\s+EN|INMUEBLE\s+UBICADO\s+EN)[:\s]+([A-ZÁÉÍÓÚÑ\s\d\-\.]+)/gi,

  // Nacionalidades
  nationalityLabel: /\bNACIONALIDAD\b\s*[:\-]?\s*([A-ZÁÉÍÓÚÑ\s]{3,30})/gi,
  nationalityWords: /\b(ECUATORIANO|ECUATORIANA|COLOMBIANO|COLOMBIANA|PERUANO|PERUANA|VENEZOLANO|VENEZOLANA|CHILENO|CHILENA|ARGENTINO|ARGENTINA|ESPAÑOL|ESPAÑOLA|ESTADOUNIDENSE|MEXICANO|MEXICANA|BRASILEÑO|BRASILEÑA|ITALIANO|ITALIANA|FRANCES|FRANCESA|ALEMAN|ALEMANA|CUBANO|CUBANA|URUGUAYO|URUGUAYA|PARAGUAYO|PARAGUAYA|BOLIVIANO|BOLIVIANA)\b/gi,
};

export const PatternValidator = {
  validateCedula(cedula) {
    if (!/^\d{10}$/.test(cedula)) return false;
    const digits = cedula.split('').map(Number);
    const province = parseInt(cedula.substring(0, 2));
    if (province < 1 || province > 24) return false;
    const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2];
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      let product = digits[i] * coefficients[i];
      if (product >= 10) product -= 9;
      sum += product;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === digits[9];
  },
  validateRUC(ruc) {
    if (!/^\d{13}001$/.test(ruc)) return false;
    const cedula = ruc.substring(0, 10);
    return this.validateCedula(cedula);
  },
  validatePlate(plate) {
    const cleaned = String(plate).replace('-', '');
    return /^[A-Z]{3}\d{3,4}$/.test(cleaned) || /^[A-Z]{2}\d{4,5}$/.test(cleaned);
  },
  validatePhone(phone) {
    return /^(\+593|0)[0-9]{8,9}$/.test(phone);
  },
  validateEmail(email) {
    return /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$/.test(email);
  },
  validatePassport(passport) {
    return /^[A-Z0-9]{6,15}$/.test(String(passport).toUpperCase());
  },
  validateChassisNumber(chassis) {
    return /^[A-HJ-NPR-Z0-9]{17}$/.test(String(chassis).toUpperCase());
  },
  validateYear(year) {
    const yearNum = parseInt(year);
    const currentYear = new Date().getFullYear();
    return yearNum >= 1900 && yearNum <= currentYear + 1;
  },
};

export const DateParser = {
  spanishMonths: {
    'ENERO': 1, 'FEBRERO': 2, 'MARZO': 3, 'ABRIL': 4, 'MAYO': 5, 'JUNIO': 6,
    'JULIO': 7, 'AGOSTO': 8, 'SEPTIEMBRE': 9, 'OCTUBRE': 10, 'NOVIEMBRE': 11, 'DICIEMBRE': 12,
  },
  parseSpanishDate(dateStr) {
    try {
      const cleaned = String(dateStr).replace(/\s+/g, ' ').trim().toUpperCase();
      const match = cleaned.match(/(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚÑ]+)\s+DEL?\s+(\d{4})/);
      if (match) {
        const [, day, monthName, year] = match;
        const monthNum = this.spanishMonths[monthName];
        if (monthNum) {
          const date = new Date(parseInt(year), monthNum - 1, parseInt(day));
          return isNaN(date.getTime()) ? null : date;
        }
      }
      // Fallback sin dayjs: intentar variante "DE"
      const alt = cleaned.match(/(\d{1,2})\s+DE\s+([A-ZÁÉÍÓÚÑ]+)\s+DE\s+(\d{4})/);
      if (alt) {
        const [, d, m, y] = alt;
        const monthNorm = m.replace('Á','A').replace('É','E').replace('Í','I').replace('Ó','O').replace('Ú','U');
        const monthNum = this.spanishMonths[m] || this.spanishMonths[monthNorm];
        if (monthNum) {
          const date = new Date(parseInt(y), monthNum - 1, parseInt(d));
          return isNaN(date.getTime()) ? null : date;
        }
      }
      return null;
    } catch {
      return null;
    }
  },
  parseNumericDate(dateStr) {
    try {
      const s = String(dateStr).trim();
      // dd/mm/yyyy o d/m/yyyy
      let m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
      if (m) {
        const [, d, mo, y] = m;
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
        return isNaN(date.getTime()) ? null : date;
      }
      // yyyy/mm/dd
      m = s.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
      if (m) {
        const [, y, mo, d] = m;
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
        return isNaN(date.getTime()) ? null : date;
      }
      // yyyy-mm-dd
      m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
      if (m) {
        const [, y, mo, d] = m;
        const date = new Date(parseInt(y), parseInt(mo) - 1, parseInt(d));
        return isNaN(date.getTime()) ? null : date;
      }
      return null;
    } catch {
      return null;
    }
  },
  parseAnyDate(dateStr) {
    return this.parseSpanishDate(dateStr) || this.parseNumericDate(dateStr);
  },
};

export const FieldExtractor = {
  extractAllFields(text) {
    const fields = [];
    const txt = String(text || '');

    // Cédulas
    Array.from(txt.matchAll(EcuadorPatterns.cedula)).forEach((m) => {
      const value = m[0];
      if (PatternValidator.validateCedula(value)) {
        fields.push({ fieldName: 'cedula', value, confidence: 0.95, type: 'cedula', validationStatus: 'valid' });
      }
    });

    // RUC
    Array.from(txt.matchAll(EcuadorPatterns.ruc)).forEach((m) => {
      const value = m[0];
      if (PatternValidator.validateRUC(value)) {
        fields.push({ fieldName: 'ruc', value, confidence: 0.95, type: 'ruc', validationStatus: 'valid' });
      }
    });

    // Placas
    Array.from(txt.matchAll(EcuadorPatterns.plate)).forEach((m) => {
      const value = m[0];
      if (PatternValidator.validatePlate(value)) {
        fields.push({ fieldName: 'placa', value, confidence: 0.9, type: 'plate', validationStatus: 'valid' });
      }
    });

    // Fechas (en español)
    Array.from(txt.matchAll(EcuadorPatterns.dateSpanish)).forEach((m) => {
      const value = m[0];
      const date = DateParser.parseSpanishDate(value);
      if (date) {
        fields.push({ fieldName: 'fecha', value, confidence: 0.9, type: 'date', validationStatus: 'valid' });
      }
    });

    // Montos
    Array.from(txt.matchAll(EcuadorPatterns.amount)).forEach((m) => {
      fields.push({ fieldName: 'monto', value: m[0], confidence: 0.85, type: 'amount', validationStatus: 'unknown' });
    });

    // Marcas vehículo
    Array.from(txt.matchAll(EcuadorPatterns.vehicleBrands)).forEach((m) => {
      fields.push({ fieldName: 'marca_vehiculo', value: String(m[0]).toUpperCase(), confidence: 0.9, type: 'vehicle_brand', validationStatus: 'valid' });
    });

    // Teléfonos
    Array.from(txt.matchAll(EcuadorPatterns.phone)).forEach((m) => {
      const value = m[0];
      if (PatternValidator.validatePhone(value)) {
        fields.push({ fieldName: 'telefono', value, confidence: 0.85, type: 'phone', validationStatus: 'valid' });
      }
    });

    // Emails
    Array.from(txt.matchAll(EcuadorPatterns.email)).forEach((m) => {
      const value = m[0];
      if (PatternValidator.validateEmail(value)) {
        fields.push({ fieldName: 'email', value, confidence: 0.9, type: 'email', validationStatus: 'valid' });
      }
    });

    // Nacionalidad (etiquetada)
    const natLabeled = Array.from(txt.matchAll(EcuadorPatterns.nationalityLabel));
    natLabeled.forEach((match) => {
      const value = (match[1] || '').trim();
      if (value) fields.push({ fieldName: 'nacionalidad', value, confidence: 0.88, type: 'nationality', validationStatus: 'valid' });
    });

    // Nacionalidad suelta
    if (natLabeled.length === 0) {
      Array.from(txt.matchAll(EcuadorPatterns.nationalityWords)).forEach((m) => {
        const value = (m[0] || '').trim();
        if (value) fields.push({ fieldName: 'nacionalidad', value, confidence: 0.8, type: 'nationality', validationStatus: 'unknown' });
      });
    }

    return fields;
  },
};
