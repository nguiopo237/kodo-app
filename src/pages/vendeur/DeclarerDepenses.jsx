import React, { useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';

const DeclarerDepenses = () => {
  const { info } = useNotification();

  useEffect(() => {
    info('ℹ️ Page de déclaration de dépenses en cours de développement');
  }, []);

  return (
    <div className="page-container">
      <h1>💸 Déclarer des dépenses</h1>
      <p>Cette page est en cours de développement.</p>
    </div>
  );
};

export default DeclarerDepenses;