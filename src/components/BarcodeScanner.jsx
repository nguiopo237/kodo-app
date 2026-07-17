import React, { useEffect, useRef, useState, useCallback } from 'react';
import Quagga from 'quagga';
import './BarcodeScanner.css';

const BarcodeScanner = ({ onDetect, onClose }) => {
  const scannerRef = useRef(null);
  const [status, setStatus] = useState('initialisation');
  const [lastCode, setLastCode] = useState(null);
  const [error, setError] = useState(null);
  const scanningRef = useRef(false);

  const handleDetected = useCallback((result) => {
    const code = result?.codeResult?.code;
    if (!code || scanningRef.current) return;

    scanningRef.current = true;
    setLastCode(code);

    setTimeout(() => {
      try { Quagga.stop(); } catch(e) {}
      if (onDetect) onDetect(code);
    }, 600);
  }, [onDetect]);

  useEffect(() => {
    let mounted = true;

    const initScanner = async () => {
      try {
        if (!mounted) return;
        setStatus('camera');

        Quagga.init({
          inputStream: {
            name: 'Live',
            type: 'LiveStream',
            target: scannerRef.current,
            constraints: {
              width: { min: 640, ideal: 800 },
              height: { min: 480, ideal: 600 },
              facingMode: 'environment',
              aspectRatio: { min: 1, max: 2 }
            }
          },
          locator: { patchSize: 'medium', halfSample: true },
          numOfWorkers: navigator.hardwareConcurrency || 2,
          decoder: { readers: ['code_128_reader'] },
          locate: true
        }, (err) => {
          if (err) {
            if (!mounted) return;
            console.error('Erreur init Quagga:', err);
            setError('Impossible d\'acceder a la camera. Verifiez les permissions.');
            setStatus('erreur');
            return;
          }
          if (!mounted) return;
          Quagga.start();
          setStatus('pret');
        });

        Quagga.onDetected(handleDetected);
      } catch (e) {
        if (!mounted) return;
        console.error('Erreur scanner:', e);
        setError('Erreur lors de l\'initialisation du scanner.');
        setStatus('erreur');
      }
    };

    initScanner();

    return () => {
      mounted = false;
      try { Quagga.stop(); } catch(e) {}
    };
  }, [handleDetected]);

  return (
    <div className="scanner-overlay" onClick={(e) => {
      if (e.target === e.currentTarget) onClose();
    }}>
      <div className="scanner-container">
        <div className="scanner-header">
          <h2>📷 Scanner un code-barres</h2>
          <button className="scanner-close" onClick={onClose}>x</button>
        </div>

        <div className="scanner-viewport">
          <div ref={scannerRef} className="scanner-video" />

          <div className="scanner-frame">
            <div className="scanner-corner scanner-corner-tl"></div>
            <div className="scanner-corner scanner-corner-tr"></div>
            <div className="scanner-corner scanner-corner-bl"></div>
            <div className="scanner-corner scanner-corner-br"></div>
            <div className="scanner-line"></div>
          </div>

          {status === 'initialisation' && (
            <div className="scanner-overlay-message">
              <div className="scanner-spinner"></div>
              <p>Initialisation de la camera...</p>
            </div>
          )}

          {status === 'camera' && (
            <div className="scanner-overlay-message">
              <div className="scanner-spinner"></div>
              <p>Acces a la camera...</p>
            </div>
          )}

          {status === 'erreur' && (
            <div className="scanner-overlay-message scanner-error">
              <div className="scanner-error-icon">⚠️</div>
              <p>{error || 'Erreur inconnue'}</p>
              <button className="scanner-retry-btn" onClick={onClose}>
                Fermer
              </button>
            </div>
          )}
        </div>

        {lastCode && (
          <div className="scanner-result">
            <div className="scanner-result-success">✅</div>
            <div className="scanner-result-info">
              <span>Code detecte :</span>
              <strong>{lastCode}</strong>
            </div>
          </div>
        )}

        <div className="scanner-footer">
          <div className="scanner-hint">
            <span className="scanner-hint-icon">💡</span>
            <span>Placez le code-barres dans le cadre</span>
          </div>
          <button className="scanner-cancel-btn" onClick={onClose}>
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
};

export default BarcodeScanner;
