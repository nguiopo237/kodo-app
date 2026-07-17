import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { genererCodeBarre } from './EtiquetteProduit';

const BarcodeCell = ({ produit }) => {
  const barcodeRef = useRef(null);
  const codeBarre = produit.codeBarre || genererCodeBarre(produit.idProduit);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, codeBarre, {
          format: 'CODE128',
          lineColor: '#1f2937',
          width: 1,
          height: 30,
          displayValue: false,
          margin: 0,
          background: '#ffffff'
        });
      } catch (e) {
        console.warn('Erreur generation code-barres:', e);
      }
    }
  }, [codeBarre]);

  return (
    <div className="barcode-cell">
      <svg ref={barcodeRef} className="barcode-cell-svg" />
      <small className="barcode-code">{codeBarre}</small>
    </div>
  );
};

export default BarcodeCell;
