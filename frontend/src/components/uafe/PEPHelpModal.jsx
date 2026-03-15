import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Alert,
  Chip,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import GavelIcon from '@mui/icons-material/Gavel';
import SecurityIcon from '@mui/icons-material/Security';
import LocationCityIcon from '@mui/icons-material/LocationCity';
import PublicIcon from '@mui/icons-material/Public';

// ── Categorias PEP segun Art. 30 Reglamento UAFE ──────────────────
export const PEP_CATEGORIES = {
  'Poder Ejecutivo': {
    icon: AccountBalanceIcon,
    color: { light: '#1565c0', dark: '#64b5f6' },
    bg: { light: '#e3f2fd', dark: 'rgba(25,118,210,0.15)' },
    cargos: [
      'Presidente de la Republica',
      'Vicepresidente de la Republica',
      'Ministros y Ministras de Estado',
      'Viceministros y Viceministras',
      'Subsecretarios y Subsecretarias de Estado',
      'Embajadores y Consules',
      'Servidores publicos con grado 5 a 10 de la Norma Jerarquica del Servicio (NJS)',
      'Asesores de la Presidencia y Vicepresidencia',
      'Secretarios Nacionales y Directores de entidades adscritas al Ejecutivo',
    ],
  },
  'Justicia y Control': {
    icon: GavelIcon,
    color: { light: '#6a1b9a', dark: '#ce93d8' },
    bg: { light: '#f3e5f5', dark: 'rgba(106,27,154,0.15)' },
    cargos: [
      'Jueces y Juezas de la Corte Nacional de Justicia',
      'Jueces y Juezas de Cortes Provinciales',
      'Fiscal General del Estado y Fiscales Provinciales',
      'Contralor General del Estado',
      'Procurador General del Estado',
      'Defensor del Pueblo',
      'Superintendentes (Bancos, Companias, Economia Popular, Comunicacion, Ordenamiento Territorial)',
      'Miembros del Consejo Nacional Electoral (CNE)',
      'Miembros del Tribunal Contencioso Electoral (TCE)',
      'Miembros del Consejo de Participacion Ciudadana y Control Social (CPCCS)',
      'Miembros del Consejo de la Judicatura',
      'Asambleistas Nacionales y Provinciales',
    ],
  },
  'Fuerzas Armadas y Policia': {
    icon: SecurityIcon,
    color: { light: '#2e7d32', dark: '#81c784' },
    bg: { light: '#e8f5e9', dark: 'rgba(46,125,50,0.15)' },
    cargos: [
      'Oficiales Generales y Almirantes de las Fuerzas Armadas',
      'Oficiales con rango de Teniente Coronel o superior (FF.AA.)',
      'Oficiales con rango de Teniente Coronel de Policia o superior',
      'Comandantes Generales de las Fuerzas Armadas y Policia Nacional',
      'Director General de Inteligencia',
    ],
  },
  'GADs y Sector Publico': {
    icon: LocationCityIcon,
    color: { light: '#e65100', dark: '#ffb74d' },
    bg: { light: '#fff3e0', dark: 'rgba(230,81,0,0.15)' },
    cargos: [
      'Alcaldes y Vicealcaldes Municipales',
      'Prefectos y Viceprefectos Provinciales',
      'Concejales Municipales',
      'Consejeros Provinciales',
      'Presidentes de Juntas Parroquiales',
      'Gerentes y Directores de Empresas Publicas',
      'Miembros de Directorios de Empresas Publicas y Banca Publica',
      'Rectores y Vicerrectores de Universidades Publicas',
    ],
  },
  'Organismos Internacionales': {
    icon: PublicIcon,
    color: { light: '#37474f', dark: '#b0bec5' },
    bg: { light: '#eceff1', dark: 'rgba(55,71,79,0.2)' },
    cargos: [
      'Directores, subdirectores y miembros de directorio de organismos internacionales',
      'Representantes de Ecuador ante organismos internacionales',
      'Funcionarios de rango equivalente en organizaciones internacionales (ONU, OEA, BID, CAF, etc.)',
    ],
  },
};

export default function PEPHelpModal({ isOpen, onClose }) {
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const isDark = theme.palette.mode === 'dark';

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return PEP_CATEGORIES;

    const term = search.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const result = {};

    for (const [cat, data] of Object.entries(PEP_CATEGORIES)) {
      const catMatch = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term);
      const matchingCargos = data.cargos.filter((c) =>
        c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(term)
      );

      if (catMatch || matchingCargos.length > 0) {
        result[cat] = {
          ...data,
          cargos: catMatch ? data.cargos : matchingCargos,
        };
      }
    }

    return result;
  }, [search]);

  const totalResults = Object.values(filteredCategories).reduce(
    (sum, cat) => sum + cat.cargos.length,
    0
  );

  const handleAccordionChange = (panel) => (_event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const isSearching = search.trim().length > 0;
  const modeKey = isDark ? 'dark' : 'light';

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 2,
          maxHeight: isMobile ? '100%' : '85vh',
        },
      }}
    >
      <DialogTitle
        sx={{
          bgcolor: isDark ? '#1a1a2e' : '#1e293b',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          py: 1.5,
          px: 2.5,
        }}
      >
        <Box>
          <Typography variant="subtitle1" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            Clasificacion de Cargos PEP
          </Typography>
          <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Art. 30 — Reglamento General a la Ley Organica de Prevencion de Lavado de Activos (UAFE)
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small" sx={{ color: '#fff' }}>
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {/* Legal notice */}
        <Alert
          severity="info"
          sx={{
            borderRadius: 0,
            '& .MuiAlert-message': { fontSize: '0.8rem' },
          }}
        >
          La condicion de <strong>Persona Expuesta Politicamente (PEP)</strong> se mantiene hasta{' '}
          <strong>2 anos despues</strong> de haber cesado en sus funciones. Aplica tambien a{' '}
          <strong>conyuge, parientes hasta el segundo grado de consanguinidad o afinidad</strong>, y
          colaborador cercano.
        </Alert>

        {/* Search */}
        <Box sx={{ px: 2, py: 1.5 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Buscar cargo... (ej: alcalde, fiscal, coronel)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                bgcolor: isDark ? 'action.hover' : '#f8fafc',
              },
            }}
          />
          {isSearching && (
            <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5, display: 'block' }}>
              {totalResults} {totalResults === 1 ? 'resultado' : 'resultados'} encontrados
            </Typography>
          )}
        </Box>

        {/* Categories accordion */}
        <Box sx={{ px: 1, pb: 2 }}>
          {Object.keys(filteredCategories).length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography color="text.secondary">
                No se encontraron cargos para &ldquo;{search}&rdquo;
              </Typography>
            </Box>
          ) : (
            Object.entries(filteredCategories).map(([category, data]) => {
              const Icon = data.icon;
              const catColor = data.color[modeKey];
              const catBg = data.bg[modeKey];
              return (
                <Accordion
                  key={category}
                  expanded={isSearching || expanded === category}
                  onChange={handleAccordionChange(category)}
                  disableGutters
                  elevation={0}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px !important',
                    mb: 1,
                    '&:before': { display: 'none' },
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      bgcolor: catBg,
                      minHeight: 48,
                      '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                        gap: 1.5,
                        my: 0.5,
                      },
                    }}
                  >
                    <Icon sx={{ color: catColor, fontSize: 22 }} />
                    <Typography sx={{ fontWeight: 600, fontSize: '0.875rem', color: catColor }}>
                      {category}
                    </Typography>
                    <Chip
                      label={data.cargos.length}
                      size="small"
                      sx={{
                        height: 20,
                        fontSize: '0.7rem',
                        fontWeight: 600,
                        bgcolor: catColor,
                        color: '#fff',
                      }}
                    />
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    {data.cargos.map((cargo, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          px: 2,
                          py: 0.75,
                          borderTop: idx > 0 ? '1px solid' : 'none',
                          borderColor: 'divider',
                          '&:hover': { bgcolor: 'action.hover' },
                        }}
                      >
                        <Box
                          sx={{
                            width: 6,
                            height: 6,
                            borderRadius: '50%',
                            bgcolor: catColor,
                            mt: 0.8,
                            flexShrink: 0,
                          }}
                        />
                        <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                          {cargo}
                        </Typography>
                      </Box>
                    ))}
                  </AccordionDetails>
                </Accordion>
              );
            })
          )}
        </Box>
      </DialogContent>
    </Dialog>
  );
}
