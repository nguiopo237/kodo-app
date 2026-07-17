import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import html2pdf from 'html2pdf.js';
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
  const mountedRef = useRef(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const handleImprimer = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (!printRef.current) return;

    // Attendre que les barcodes SVG soient bien rendus
    await new Promise(resolve => setTimeout(resolve, 500));
    if (!mountedRef.current) return;

    setPdfLoading(true);
    setPdfProgress(0);

    const element = printRef.current;
    const dateStr = new Date().toISOString().split('T')[0];
    const count = produits.length;

    const opt = {
      margin: [5, 5, 5, 5],
      filename: `etiquettes_${count}produits_${dateStr}.pdf`,
      image: { type: 'jpeg', quality: 0.95 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false,
        width: element.scrollWidth,
        height: element.scrollHeight
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    let lastProgress = 0;
    const progressInterval = setInterval(() => {
      lastProgress = Math.min(lastProgress + 15, 90);
      if (mountedRef.current) {
        setPdfProgress(lastProgress);
      }
    }, 200);

    try {
      await html2pdf().set(opt).from(element).save();

      clearInterval(progressInterval);
      if (!mountedRef.current) return;

      setPdfProgress(100);
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!mountedRef.current) return;
    } catch (error) {
      console.error('Erreur génération PDF étiquettes:', error);
    } finally {
      clearInterval(progressInterval);
      if (mountedRef.current) {
        setPdfLoading(false);
      }
    }
  };

  return (
    <div className="print-container">
      <div className="print-toolbar no-print">
        <div className="print-toolbar-info">
          <strong>{produits.length} étiquette(s)</strong>
          <span>Taille: {taille === 'petit' ? 'Petite (40×30mm)' : 'Standard (60×40mm)'}</span>
        </div>
        <div className="print-toolbar-actions">
          <button className="btn btn-secondary" onClick={onClose} disabled={pdfLoading}>Fermer</button>
          <button 
            className="btn btn-download" 
            onClick={handleDownloadPDF}
            disabled={pdfLoading}
          >
            {pdfLoading ? (
              <>
                <span className="pdf-spinner"></span>
                Génération... {pdfProgress}%
              </>
            ) : (
              '📥 Télécharger PDF'
            )}
          </button>
          <button className="btn btn-primary" onClick={handleImprimer} disabled={pdfLoading}>
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
