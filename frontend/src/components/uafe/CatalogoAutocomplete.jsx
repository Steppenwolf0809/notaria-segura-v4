import { Autocomplete, TextField, Typography, Box } from '@mui/material';

/**
 * Autocomplete vinculado a catálogos UAFE.
 * Fuerza selección del catálogo (no freeSolo).
 * Busca por label, código, o texto parcial.
 *
 * @param {Array} options - [{ codigo, label, ...extra }]
 * @param {string} value - valor actual (label o codigo)
 * @param {function} onChange - (option) => void — recibe el objeto completo o null
 * @param {string} label
 * @param {string} [placeholder]
 * @param {string} [size='small']
 * @param {boolean} [required=false]
 * @param {boolean} [disabled=false]
 * @param {object} [sx]
 */
export default function CatalogoAutocomplete({ options, value, onChange, label, placeholder, size = 'small', required = false, disabled = false, sx }) {
  // Find current option by label, codigo, or canton name
  const currentOption = options.find(o => {
    if (!value) return false;
    const v = value.toUpperCase();
    return o.label === value || o.codigo === value
      || o.label.toUpperCase() === v
      || o.codigo.toUpperCase() === v
      || (o.canton && o.canton.toUpperCase() === v);
  }) || null;

  return (
    <Autocomplete
      size={size}
      disabled={disabled}
      options={options}
      value={currentOption}
      onChange={(_, newValue) => onChange(newValue)}
      getOptionLabel={(option) => typeof option === 'string' ? option : option.label}
      isOptionEqualToValue={(option, val) => option.codigo === val?.codigo}
      filterOptions={(opts, { inputValue }) => {
        const q = (inputValue || '').toUpperCase().trim();
        if (!q) return opts.slice(0, 50); // Show first 50 when empty
        return opts.filter(o =>
          o.label.toUpperCase().includes(q)
          || o.codigo.toUpperCase().includes(q)
          || (o.provincia && o.provincia.toUpperCase().includes(q))
          || (o.canton && o.canton.toUpperCase().includes(q))
        );
      }}
      renderOption={(props, option) => {
        const { key, ...rest } = props;
        return (
          <Box component="li" key={key} {...rest} sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
            <Typography variant="body2" sx={{ fontSize: '0.82rem' }}>{option.label}</Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary', flexShrink: 0 }}>{option.codigo}</Typography>
          </Box>
        );
      }}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          placeholder={placeholder}
          required={required}
        />
      )}
      sx={{ ...sx }}
      noOptionsText="Sin resultados"
      openOnFocus
      clearOnEscape
      autoHighlight
    />
  );
}
