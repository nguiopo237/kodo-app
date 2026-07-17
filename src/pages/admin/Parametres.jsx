import React, { useState } from 'react';
import { backupService } from '../../services/backupService';
import { syncService } from '../../services/syncService';
import { dataService } from '../../services/dataService';
import { useNotification } from '../../context/NotificationContext';
import { formatCFA } from '../../utils/formatters';
import './Parametres.css';

const Parametres = () => {
  const { success, error: showError, info } = useNotification();
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetSummary, setResetSummary] = useState(null);

  const handleExport = () => {
    backupService.exporterDonnees();
    success('✅ Fichier de sauvegarde téléchargé !');
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    backupService.importerDonnees(file)
      .then(() => {
        success('✅ Données importées avec succès ! Rechargement...');
        setTimeout(() => window.location.reload(), 1500);
      })
      .catch((error) => {
        showError('❌ ' + error.message);
      })
      .finally(() => setLoading(false));
  };

  const handleOpenResetModal = () => {
    const summary = dataService.getResetSummary();
    setResetSummary(summary);
    setShowResetModal(true);
  };

  const handleConfirmReset = async () => {
    setShowResetModal(false);
    await dataService.reinitialiser();
    success('🔄 Données réinitialisées ! Redémarrage...');
    setTimeout(() => window.location.reload(), 1500);
  };

  const handleCancelReset = () => {
    setShowResetModal(false);
    setResetSummary(null);
  };

  const handleShare = () => {
    const link = syncService.genererLienPartage();
    setShareLink(link);
    navigator.clipboard.writeText(link);
    info('🔗 Lien de partage copié dans le presse-papier !');
  };

  return (
    <div className="page-container">
      <h1>⚙️ Gestion des données</h1>
      
      <div className="settings-grid">
        {/* Export */}
        <div className="setting-card">
          <div className="setting-icon">📤</div>
          <h3>Exporter les données</h3>
          <p>Sauvegarder toutes vos données en fichier JSON</p>
          <button className="btn btn-primary" onClick={handleExport}>
            Télécharger la sauvegarde
          </button>
        </div>

        {/* Import */}
        <div className="setting-card">
          <div className="setting-icon">📥</div>
          <h3>Importer des données</h3>
          <p>Restaurer une sauvegarde précédente</p>
          <input
            type="file"
            accept=".json"
            onChange={handleImport}
            disabled={loading}
            className="file-input"
          />
          {loading && <span>Chargement...</span>}
        </div>

        {/* Partage */}
        <div className="setting-card">
          <div className="setting-icon">🔗</div>
          <h3>Partager les données</h3>
          <p>Créer un lien pour partager avec un ami</p>
          <button className="btn btn-info" onClick={handleShare}>
            Créer un lien de partage
          </button>
          {shareLink && (
            <div className="share-link">
              <input type="text" value={shareLink} readOnly />
              <small>Lien copié automatiquement</small>
            </div>
          )}
        </div>

        {/* Réinitialisation */}
        <div className="setting-card danger">
          <div className="setting-icon">⚠️</div>
          <h3>Réinitialiser</h3>
          <p>⚠️ Supprimer toutes les données métier</p>
          <p className="setting-note">Les utilisateurs et catégories sont conservés</p>
          <button className="btn btn-danger" onClick={handleOpenResetModal}>
            Réinitialiser tout
          </button>
        </div>
      </div>

      {/* Modal de confirmation de réinitialisation */}
      {showResetModal && resetSummary && (
        <div className="modal-overlay" onClick={handleCancelReset}>
          <div className="modal modal-reset" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirmer la réinitialisation</h2>
              <button className="modal-close" onClick={handleCancelReset}>×</button>
            </div>

            <div className="modal-body">
              <p className="reset-warning">
                Cette action va <strong>supprimer définitivement</strong> toutes les données
                métier suivantes. Les utilisateurs et catégories seront conservés.
              </p>

              <div className="reset-summary">
                {resetSummary.produits > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">📦</span>
                    <span className="summary-label">Produits</span>
                    <span className="summary-count">{resetSummary.produits}</span>
                  </div>
                )}
                {resetSummary.ventes > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">🧾</span>
                    <span className="summary-label">Ventes</span>
                    <span className="summary-count">{resetSummary.ventes}</span>
                  </div>
                )}
                {resetSummary.transport > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">🚚</span>
                    <span className="summary-label">Envois transport</span>
                    <span className="summary-count">{resetSummary.transport}</span>
                  </div>
                )}
                {resetSummary.depenses > 0 && (
                  <div className="summary-row">
                    <span className="summary-icon">💸</span>
                    <span className="summary-label">Dépenses</span>
                    <span className="summary-count">{resetSummary.depenses}</span>
                  </div>
                )}

                {resetSummary.produits === 0 && resetSummary.ventes === 0 && resetSummary.transport === 0 && resetSummary.depenses === 0 && (
                  <div className="summary-empty">
                    <p>Aucune donnée métier à supprimer.</p>
                  </div>
                )}
              </div>

              {resetSummary.totalCA > 0 && (
                <div className="reset-totals">
                  <div className="totals-row">
                    <span>Chiffre d'affaires total :</span>
                    <strong>{formatCFA(resetSummary.totalCA)}</strong>
                  </div>
                  <div className="totals-row">
                    <span>Total dépenses :</span>
                    <strong>{formatCFA(resetSummary.totalDepenses)}</strong>
                  </div>
                </div>
              )}

              <p className="reset-note">
                <strong>⚠️ Action irréversible.</strong> Exportez vos données avant
                si vous souhaitez les conserver.
              </p>
            </div>

            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={handleCancelReset}
              >
                Annuler
              </button>
              <button
                className="btn btn-danger"
                onClick={handleConfirmReset}
              >
                🗑️ Réinitialiser
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Parametres;