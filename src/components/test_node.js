import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatCFA } from '../utils/formatters';
import { genererCodeBarre } from './EtiquetteProduit';
import './FactureVente.css';

export const genererNumeroFacture = (idVente) => {
  const idStr = String(idVente || 0).padStart(4, '0');
  return 'FACT-' + ;
};
