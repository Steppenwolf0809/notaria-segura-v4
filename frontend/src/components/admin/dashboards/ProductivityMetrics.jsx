import React from 'react';
import { Card, CardContent, Typography, Grid, Skeleton } from '@mui/material';
import BarChart from '../../charts/BarChart.jsx';

const ProductivityMetrics = ({ data, loading, onDrillDown }) => {
  const ranking = data?.ranking_matrizadores || [];
  const bars = ranking.map(r => ({ label: r.nombre, value: r.docs_procesados, meta: r }));
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1">Productividad (Top 10 matrizadores)</Typography>
        {loading ? <Skeleton height={240} /> : (
          <BarChart data={bars} onClick={(item) => onDrillDown?.(`assigned_to=${encodeURIComponent(item?.meta?.usuario_id || '')}`)} />
        )}
      </CardContent>
    </Card>
  );
};

export default ProductivityMetrics;

