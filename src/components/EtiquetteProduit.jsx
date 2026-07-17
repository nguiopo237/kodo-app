import React, { useEffect, useRef } from 'react';
import JsBarcode from 'jsbarcode';
import { formatCFA } from '../utils/formatters';
import './EtiquetteProduit.css';

/**
 * Genere un code-barres unique a partir de l'ID produit.
 * Format: KODO-{ID} (ex: KODO-0042)
 */
export const genererCodeBarre = (idProduit) => {
  const idStr = String(idProduit || 0).padStart(4, '0');
  return `KODO-${idStr}`;
};

/**
 * Composant d'etiquette produit unique avec code-barres.
 */
const EtiquetteProduit = ({ produit, taille = 'standard' }) => {
  const barcodeRef = useRef(null);
  const codeBarre = genererCodeBarre(produit.idProduit);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, codeBarre, {
          format: 'CODE128',
          lineColor: '#000',
          width: taille === 'petit' ? 1.2 : 2,
          height: taille === 'petit' ? 25 : 50,
          displayValue: true,
          fontSize: taille === 'petit' ? 10 : 16,
          margin: 0,
          background: '#ffffff'
        });
      } catch (e) {
        console.warn('Erreur generation code-barres:', e);
      }
    }
  }, [codeBarre, taille]);

  const tailleClass = taille === 'petit' ? 'label-small' : '';

  return (
    <div className={`barcode-label ${tailleClass}`}>
      <div className="label-header">
        <span className="label-categorie">{produit.categorie}</span>
      </div>
      <div className="label-nom">{produit.nomProduit}</div>
      {taille !== 'petit' && (
        <div className="label-prix">
          <span className="label-prix-valeur">{formatCFA(produit.prixBoutique || 0)}</span>
        </div>
      )}
      <svg ref={barcodeRef} className="label-barcode" />
      <div className="label-code">{codeBarre}</div>
      {taille !== 'petit' && (
        <div className="label-footer">
          <span>Stock: {produit.quantiteRestante || 0}</span>
          <span>ID: {produit.idProduit}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Affiche plusieurs etiquettes en grille pour impression batch.
 */
export const ImprimerEtiquettes = ({ produits, taille = 'standard', onClose }) => {
  const printRef = useRef(null);

  const handleImprimer = () => {
    window.print();
  };

  return (
    <div className="print-container">
      <div className="print-toolbar no-print">
        <div className="print-toolbar-info">
          <strong>{produits.length} etiquette(s)</strong>
          <span>Taille: {taille === 'petit' ? 'Petite (40x30mm)' : 'Standard (60x40mm)'}</span>
        </div>
        <div className="print-toolbar-actions">
          <button className="btn btn-secondary" onClick={onClose}>Fermer</button>
          <button className="btn btn-primary" onClick={handleImprimer}>
            🖨️ Imprimer
          </button>
        </div>
      </div>

      <div ref={printRef} className={`print-grid ${taille === 'petit' ? 'print-grid-small' : ''}`}>
        {produits.map((produit, index) => (
          <EtiquetteProduit key={produit.idProduit || index} produit={produit} taille={taille} />
        ))}
      </div>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { margin: 0; padding: 5mm; }
          .print-container { box-shadow: none; margin: 0; padding: 0; }
          .print-grid {
            display: grid;
            gap: 3mm;
            padding: 0;
          }
          .print-grid { grid-template-columns: repeat(3, 1fr); }
          .print-grid-small { grid-template-columns: repeat(4, 1fr); gap: 2mm; }
          .barcode-label {
            break-inside: avoid;
            box-shadow: none;
            border: 1px solid #ccc;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </div>
  );
};

export default EtiquetteProduit;
