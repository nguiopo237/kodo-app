import React, { useEffect } from 'react';
import { useNotification } from '../../context/NotificationContext';

const ConfirmerReception = () => {
  const { info } = useNotification();

  useEffect(() => {
    info('ℹ️ Page de confirmation de réception en cours de développement');
  }, []);

  return (
    <div className="page-container">
      <h1>📥 Confirmer la réception</h1>
      <p>Cette page est en cours de développement.</p>
    </div>
  );
};

export default ConfirmerReception;