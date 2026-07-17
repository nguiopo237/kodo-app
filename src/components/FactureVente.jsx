import React, { useEffect, useRef, useState, useCallback } from 'react';
import JsBarcode from 'jsbarcode';
import html2pdf from 'html2pdf.js';
import { formatCFA } from '../utils/formatters';
import { genererCodeBarre } from './EtiquetteProduit';
import './FactureVente.css';

export const genererNumeroFacture = (idVente) => {
  const idStr = String(idVente || 0).padStart(4, '0');
  return 'FACT-' + idStr;
};

export const genererCodeBarreFacture = (idVente) => {
  const idStr = String(idVente || 0).padStart(6, '0');
  return 'KDM' + idStr;
};

const LigneProduitFacture = ({ produit, index }) => {
  const barcodeRef = useRef(null);
  const codeBarre = genererCodeBarre(produit.idProduit);
  const montantTotal = produit.prixTotal || (produit.prixUnitaire * produit.quantite);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, codeBarre, {
          format: 'CODE128',
          lineColor: '#374151',
          width: 0.8,
          height: 20,
          displayValue: false,
          margin: 0,
          background: '#ffffff',
          fontSize: 8
        });
      } catch (e) {
        console.warn('Erreur génération code-barres produit:', e);
      }
    }
  }, [codeBarre]);

  return (
    <tr className="facture-ligne-produit">
      <td className="ligne-index">{index + 1}</td>
      <td className="ligne-barcode">
        <svg ref={barcodeRef} className="ligne-barcode-svg" />
      </td>
      <td className="ligne-nom">{produit.nomProduit || produit.nom || 'Produit'}</td>
      <td className="ligne-qte">{produit.quantite}</td>
      <td className="ligne-pu">{formatCFA(produit.prixUnitaire)}</td>
      <td className="ligne-total">{formatCFA(montantTotal)}</td>
    </tr>
  );
};

const FactureVente = ({ vente, utilisateur, onFermer, onImprimer }) => {
  const factureRef = useRef(null);
  const barcodeRef = useRef(null);
  const mountedRef = useRef(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);
  const numeroFacture = genererNumeroFacture(vente.idVente);
  const codeBarreFacture = genererCodeBarreFacture(vente.idVente);
  const dateFacture = new Date(vente.date || vente.dateVente || new Date()).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const totalVente = vente.totalVente || vente.total || 0;
  const produitsVendus = vente.produitsVendus || vente.produits || vente.items || [];
  const paiement = vente.typePaiement || vente.paiement || 'especes';
  const vendeur = vente.vendeurNom || utilisateur?.nomComplet || 'Vendeur';

  const getPaiementIcon = (type) => {
    const icons = {
      'especes': String.fromCharCode(55357, 56501),
      'carte': String.fromCharCode(55357, 56499),
      'mobile money': String.fromCharCode(55357, 56625),
      'mobile': String.fromCharCode(55357, 56625),
      'cheque': String.fromCharCode(55357, 56605),
      'virement': String.fromCharCode(55357, 57062)
    };
    return icons[type?.toLowerCase()] || String.fromCharCode(55357, 56496);
  };

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, codeBarreFacture, {
          format: 'CODE128',
          lineColor: '#1f2937',
          width: 2.5,
          height: 60,
          displayValue: true,
          fontSize: 16,
          margin: 10,
          background: '#ffffff',
          textAlign: 'center',
          textPosition: 'bottom',
          textMargin: 5
        });
      } catch (e) {
        console.warn('Erreur génération code-barres facture:', e);
      }
    }
  }, [codeBarreFacture]);

  const handlePrint = () => {
    if (onImprimer) onImprimer();
    window.print();
  };

  const handleDownloadPDF = useCallback(async () => {
    if (!factureRef.current) return;
    
    // Attendre que les barcodes SVG soient bien rendus
    await new Promise(resolve => setTimeout(resolve, 300));
    if (!mountedRef.current) return;
    
    setPdfLoading(true);
    setPdfProgress(0);
    
    const element = factureRef.current;
    const dateStr = new Date().toISOString().split('T')[0];
    
    const opt = {
      margin: [10, 10, 10, 10],
      filename: `facture_${numeroFacture}_${dateStr}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
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
    
    // Suivi de progression
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
      // Petit délai pour montrer 100%
      await new Promise(resolve => setTimeout(resolve, 400));
      if (!mountedRef.current) return;
    } catch (error) {
      console.error('Erreur génération PDF:', error);
    } finally {
      clearInterval(progressInterval);
      if (mountedRef.current) {
        setPdfLoading(false);
      }
    }
  }, [numeroFacture]);

  const nombreProduits = produitsVendus.reduce((sum, p) => sum + p.quantite, 0);

  if (!produitsVendus || produitsVendus.length === 0) {
    return null;
  }

  return (
    <div className="facture-overlay">
      <div className="facture-modal">
        <div className="facture-toolbar no-print">
          <div className="facture-toolbar-info">
            <strong>Facture {numeroFacture}</strong>
            <span>{produitsVendus.length} article(s) - {formatCFA(totalVente)}</span>
          </div>
          <div className="facture-toolbar-actions">
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
            <button 
              className="btn btn-primary" 
              onClick={handlePrint}
              disabled={pdfLoading}
            >
              🖨️ Imprimer
            </button>
            <button className="btn btn-secondary" onClick={onFermer}>
              ✕ Fermer
            </button>
          </div>
        </div>
        <div ref={factureRef} className="facture-contenu">
          <div className="facture-header">
            <div className="facture-logo-section">
              <div className="facture-logo">KM</div>
              <div className="facture-brand">
                <h1>KodoMarket</h1>
                <p className="facture-slogan">Votre marché, livré chez vous</p>
              </div>
            </div>
            <div className="facture-titre-section">
              <h2>FACTURE</h2>
              <div className="facture-numero">
                <span>N&deg; {numeroFacture}</span>
              </div>
              <svg ref={barcodeRef} className="facture-barcode" />
            </div>
          </div>
          <div className="facture-info">
            <div className="facture-info-entreprise">
              <h4>KodoMarket SARL</h4>
              <p>123 Rue du Commerce, Douala</p>
              <p>Cameroun</p>
              <p>contact@kodomarket.cm</p>
              <p>+237 6 00 00 00 00</p>
            </div>
            <div className="facture-info-vente">
              <div className="facture-info-row">
                <span className="info-label">Date</span>
                <span className="info-value">{dateFacture}</span>
              </div>
              <div className="facture-info-row">
                <span className="info-label">Vendeur</span>
                <span className="info-value">{vendeur}</span>
              </div>
              <div className="facture-info-row">
                <span className="info-label">Paiement</span>
                <span className="info-value paiement-badge">
                  {getPaiementIcon(paiement)} {paiement.charAt(0).toUpperCase() + paiement.slice(1)}
                </span>
              </div>
              <div className="facture-info-row">
                <span className="info-label">ID Vente</span>
                <span className="info-value">#{vente.idVente}</span>
              </div>
            </div>
          </div>
          <div className="facture-table-wrapper">
            <table className="facture-table">
              <thead>
                <tr>
                  <th className="th-index">#</th>
                  <th className="th-barcode">Code</th>
                  <th className="th-nom">Produit</th>
                  <th className="th-qte">Qte</th>
                  <th className="th-pu">Prix unit.</th>
                  <th className="th-total">Total</th>
                </tr>
              </thead>
              <tbody>
                {produitsVendus.map((produit, index) => (
                  <LigneProduitFacture 
                    key={produit.idProduit || index} 
                    produit={produit} 
                    index={index} 
                  />
                ))}
              </tbody>
            </table>
          </div>
          <div className="facture-resume">
            <div className="facture-resume-ligne">
              <span className="resume-label">Nombre d'articles</span>
              <span className="resume-value">{nombreProduits}</span>
            </div>
            <div className="facture-resume-ligne">
              <span className="resume-label">Total HT</span>
              <span className="resume-value">{formatCFA(totalVente)}</span>
            </div>
            <div className="facture-resume-ligne">
              <span className="resume-label">TVA (0%)</span>
              <span className="resume-value">0 FCFA</span>
            </div>
            <div className="facture-resume-ligne facture-resume-total">
              <span className="resume-label">Total TTC</span>
              <span className="resume-value total-ttc">{formatCFA(totalVente)}</span>
            </div>
          </div>
          <div className="facture-footer">
            <div className="facture-mentions">
              <p>Marchandise vendue en l'état. Aucun retour possible après 48h.</p>
              <p>Facture générée par KodoMarket - {new Date().getFullYear()}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FactureVente;
