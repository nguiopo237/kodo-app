import React from 'react';
import { dataService } from '../services/dataService';

const DataManagement = () => {
  const handleExport = () => {
    dataService.exporter();
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    dataService.importer(file)
      .then(() => {
        alert('✅ Données importées avec succès !');
        window.location.reload();
      })
      .catch((error) => {
        alert('❌ Erreur: ' + error.message);
      });
  };

  const handleReset = async () => {
    await dataService.reinitialiser();
    window.location.reload();
  };

  return (
    <div className="data-management">
      <h3>💾 Gestion des données</h3>
      <div className="buttons">
        <button className="btn-export" onClick={handleExport}>
          📤 Exporter
        </button>
        <button className="btn-import">
          📥 Importer
          <input type="file" accept=".json" onChange={handleImport} />
        </button>
        <button className="btn-reset" onClick={handleReset}>
          🔄 Réinitialiser
        </button>
      </div>
    </div>
  );
};

export default DataManagement;