import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { dashboardService } from '../../services/dashboardService';
import html2pdf from 'html2pdf.js';
import { pushNotificationService } from '../../services/pushNotificationService';
import './ProfilVendeur.css';

const ProfilVendeur = () => {
  const { user, updateUser } = useAuth();
  const { success, error: showError } = useNotification();
  const fileInputRef = useRef(null);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalVentes: 0, totalCA: 0, totalProduits: 0, moyenneVente: 0, joursActif: 0, meilleurMois: "" });
  const [formData, setFormData] = useState({ prenom: "", nom: "", email: "", telephone: "", localisation: "", bio: "" });
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfProgress, setPdfProgress] = useState(0);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushPermission, setPushPermission] = useState('default');

  useEffect(() => { if (user) {
    setFormData({ prenom: user.prenom || "", nom: user.nom || "", email: user.email || "", telephone: user.telephone || "", localisation: user.localisation || "", bio: user.bio || "" });
    setPhotoPreview(user.photo || null);
  } }, [user]);

  useEffect(() => { chargerStats(); }, []);

  useEffect(() => {
    if (pushNotificationService.isSupported()) {
      setPushPermission(pushNotificationService.getPermissionStatus());
      // Restaurer la préférence utilisateur depuis localStorage
      const savedPref = localStorage.getItem('kodomarket_push_enabled');
      if (savedPref === 'true' && pushNotificationService.getPermissionStatus() === 'granted') {
        setPushEnabled(true);
      } else {
        setPushEnabled(pushNotificationService.getPermissionStatus() === 'granted');
      }
    }
  }, []);

  const chargerStats = () => {
    setLoading(true);
    setTimeout(() => {
      try {
        const data = dashboardService.loadData();
        const ventes = data.ventes || [];
        const mesVentes = ventes.filter(v => v.idVendeur === user?.idUser);
        const totalVentes = mesVentes.length;
        const totalCA = mesVentes.reduce((sum, v) => sum + v.totalVente, 0);
        const totalProduits = mesVentes.reduce((sum, v) => sum + (v.produitsVendus?.length || 0), 0);
        const moyenneVente = totalVentes > 0 ? Math.round(totalCA / totalVentes) : 0;
        const dateCreation = user?.dateCreation ? new Date(user.dateCreation + "T00:00:00") : new Date();
        const joursActif = Math.floor((new Date() - dateCreation) / (1000 * 60 * 60 * 24)) || 1;
        const ventesParMois = {};
        mesVentes.forEach(v => { const m = new Date(v.date).toLocaleDateString("fr-FR", { month: "long", year: "numeric" }); ventesParMois[m] = (ventesParMois[m] || 0) + v.totalVente; });
        let meilleurMois = "-"; let maxCA = 0;
        Object.entries(ventesParMois).forEach(([m, ca]) => { if (ca > maxCA) { maxCA = ca; meilleurMois = m; } });
        setStats({ totalVentes, totalCA, totalProduits, moyenneVente, joursActif, meilleurMois });
      } catch (err) { console.error("Erreur stats:", err); }
      setLoading(false);
    }, 400);
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files[0]; if (!file) return;
    if (!file.type.startsWith("image/")) { showError("Choisir une image valide"); return; }
    if (file.size > 2 * 1024 * 1024) { showError("Image max 2 Mo"); return; }
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setPhotoPreview(e.target.result);
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = () => { setPhotoPreview(null); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleChange = (e) => { const { name, value } = e.target; setFormData(prev => ({ ...prev, [name]: value })); };
  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.prenom.trim() || !formData.nom.trim()) { showError("Prenom et nom obligatoires"); return; }
    setSaving(true);
    try {
      const updatedData = { ...user, prenom: formData.prenom.trim(), nom: formData.nom.trim(), nomComplet: formData.prenom.trim() + " " + formData.nom.trim(), email: formData.email.trim(), telephone: formData.telephone.trim(), localisation: formData.localisation.trim(), bio: formData.bio.trim() };
      if (photoFile) updatedData.photo = photoPreview;
      else if (photoPreview === null && user.photo) delete updatedData.photo;
      await updateUser(updatedData);
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      const index = users.findIndex(u => u.idUser === user.idUser);
      if (index !== -1) {
        users[index] = { ...users[index], ...updatedData };
        if (data.utilisateurs[index]?.password) users[index].password = data.utilisateurs[index].password;
        await dashboardService.saveData("utilisateurs", users);
      }
      setEditMode(false); setPhotoFile(null);
      success("✅ Profil mis à jour avec succès !");
    } catch (err) { showError("Erreur: " + err.message); }
    setSaving(false);
  };

  const handleCancel = () => {
    setFormData({ prenom: user?.prenom || "", nom: user?.nom || "", email: user?.email || "", telephone: user?.telephone || "", localisation: user?.localisation || "", bio: user?.bio || "" });
    setPhotoPreview(user?.photo || null); setPhotoFile(null); setEditMode(false);
  };

  const handleExportPDF = async () => {
    setPdfLoading(true);
    setPdfProgress(0);
    await new Promise(r => setTimeout(r, 300));
    // Cibler uniquement le corps du profil (stats + sidebar, sans les boutons)
    const element = document.querySelector('.profil-body');
    if (!element) { setPdfLoading(false); return; }
    let prog = 0;
    const progInt = setInterval(() => { prog = Math.min(prog + 20, 90); setPdfProgress(prog); }, 300);
    try {
      const opt = {
        margin: [10, 10, 10, 10],
        filename: 'statistiques_vendeur_' + new Date().toISOString().split('T')[0] + '.pdf',
        image: { type: 'jpeg', quality: 0.95 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
      };
      await html2pdf().set(opt).from(element).save();
      clearInterval(progInt);
      setPdfProgress(100);
      pushNotificationService.notifierExportPDF('statistiques vendeur');
      success('📄 PDF des statistiques téléchargé !');
    } catch (err) {
      clearInterval(progInt);
      showError('❌ Erreur export PDF: ' + err.message);
    }
    setPdfLoading(false);
  };

  const handleTogglePush = async () => {
    if (pushEnabled) {
      setPushEnabled(false);
      localStorage.setItem('kodomarket_push_enabled', 'false');
      success('🔕 Notifications push désactivées');
      return;
    }
    const result = await pushNotificationService.requestPermission();
    setPushPermission(result);
    if (result === 'granted') {
      setPushEnabled(true);
      localStorage.setItem('kodomarket_push_enabled', 'true');
      pushNotificationService.sendNotification('🔔 Notifications activées', {
        body: 'Vous recevrez désormais les alertes importantes en temps réel.',
        requireInteraction: false
      });
      success('✅ Notifications push activées !');
    } else {
      showError('❌ Permission refusée. Activez les notifications dans les paramètres de votre navigateur.');
    }
  };

  const formatCFA = (montant) => { if (!montant && montant !== 0) return "0 FCFA"; return montant.toLocaleString("fr-FR") + " FCFA"; };
  const getInitiales = () => { const p = user?.prenom || ""; const n = user?.nom || ""; return (p.charAt(0) + n.charAt(0)).toUpperCase() || user?.nomComplet?.charAt(0) || "U"; };

  const getGradeColor = () => {
    if (stats.totalVentes >= 100) return { level: "⭐ Expert", color: "#f59e0b" };
    if (stats.totalVentes >= 50) return { level: "🏆 Avance", color: "#3b82f6" };
    if (stats.totalVentes >= 10) return { level: "📈 Intermediaire", color: "#10b981" };
    return { level: "🌱 Debutant", color: "#6b7280" };
  };

  const getPerfBadge = () => {
    if (stats.totalCA >= 5000000) return { label: "💰 VIP", color: "#f59e0b" };
    if (stats.totalCA >= 1000000) return { label: "🥇 Or", color: "#3b82f6" };
    if (stats.totalCA >= 500000) return { label: "🥈 Argent", color: "#10b981" };
    return { label: "🥉 Bronze", color: "#6b7280" };
  };

  const grade = getGradeColor();
  const perf = getPerfBadge();

  const renderLoading = () => (
    React.createElement("div", { className: "loading-container" },
      React.createElement("div", { className: "loading-spinner" }),
      React.createElement("p", null, "Chargement du profil..."))
  );

  if (loading) return renderLoading();

  return React.createElement('div', { className: 'profil-vendeur' },
    React.createElement('div', { className: 'profil-header' },
      React.createElement('div', { className: 'profil-header-bg' }),
      React.createElement('div', { className: 'profil-header-content' },
        React.createElement('div', { className: 'profil-photo-section' },
          React.createElement('div', { className: 'profil-photo-wrapper' },
            photoPreview
              ? React.createElement('img', { src: photoPreview, alt: 'Photo', className: 'profil-photo-img', key: 'img' })
              : React.createElement('div', { className: 'profil-photo-placeholder', key: 'ph' }, getInitiales()),
            editMode && React.createElement('div', { className: 'profil-photo-overlay', onClick: () => fileInputRef.current?.click(), key: 'overlay' },
              React.createElement('span', null, '📷'),
              React.createElement('span', { className: 'overlay-text' }, 'Changer')
            )
          ),
          React.createElement('input', { ref: fileInputRef, type: 'file', accept: 'image/*', onChange: handlePhotoSelect, className: 'photo-input-hidden' }),
          editMode && photoPreview && React.createElement('button', { className: 'btn-remove-photo', onClick: handleRemovePhoto, key: 'remove' }, '🗑️')
        ),
        React.createElement('div', { className: 'profil-header-info' },
          React.createElement('h1', null, (user?.prenom || '') + ' ' + (user?.nom || user?.nomComplet || 'Vendeur')),
          React.createElement('p', { className: 'profil-username' }, '@' + (user?.username || '')),
          React.createElement('div', { className: 'profil-badges-row' },
            React.createElement('span', { className: 'profil-badge', style: {background: grade.color + '20', color: grade.color, border: '1px solid ' + grade.color + '40'} }, grade.level),
            React.createElement('span', { className: 'profil-badge', style: {background: perf.color + '20', color: perf.color, border: '1px solid ' + perf.color + '40'} }, perf.label),
            React.createElement('span', { className: 'profil-badge role-badge-vendeur' }, '🛒 Vendeur')
          )
        ),
        !editMode && React.createElement(React.Fragment, null,
          React.createElement('button', { className: 'btn btn-export-pdf', onClick: handleExportPDF, disabled: pdfLoading, key: 'pdf' }, pdfLoading ? '⏳ ' + pdfProgress + '%' : '📄 PDF Statistiques'),
          React.createElement('button', { className: 'btn btn-edit-profile', onClick: () => setEditMode(true), key: 'edit' }, '✏️ Modifier')
        )
      )
    ),
    React.createElement('div', { className: 'profil-body' },
      React.createElement('div', { className: 'profil-main' },
        editMode
          ? React.createElement('div', { className: 'card edit-card' },
              React.createElement('div', { className: 'card-header' },
                React.createElement('h2', null, '✏️ Modifier mes informations')
              ),
              React.createElement('form', { onSubmit: handleSave },
                React.createElement('div', { className: 'edit-form-grid' },
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Prénom *'),
                    React.createElement('input', { type: 'text', name: 'prenom', value: formData.prenom, onChange: handleChange, placeholder: 'Prénom', required: true, disabled: saving })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Nom *'),
                    React.createElement('input', { type: 'text', name: 'nom', value: formData.nom, onChange: handleChange, placeholder: 'Nom', required: true, disabled: saving })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Email'),
                    React.createElement('input', { type: 'email', name: 'email', value: formData.email, onChange: handleChange, placeholder: 'email@exemple.com', disabled: saving })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Téléphone'),
                    React.createElement('input', { type: 'tel', name: 'telephone', value: formData.telephone, onChange: handleChange, placeholder: '+237 6XX XXX XXX', disabled: saving })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Localisation'),
                    React.createElement('input', { type: 'text', name: 'localisation', value: formData.localisation, onChange: handleChange, placeholder: 'Douala, Cameroun', disabled: saving })
                  ),
                  React.createElement('div', { className: 'form-group' },
                    React.createElement('label', null, 'Identifiant'),
                    React.createElement('input', { type: 'text', value: user?.username || '', disabled: true, className: 'input-disabled' }),
                    React.createElement('small', null, 'Non modifiable')
                  ),
                  React.createElement('div', { className: 'form-group full-width' },
                    React.createElement('label', null, 'Bio'),
                    React.createElement('textarea', { name: 'bio', value: formData.bio, onChange: handleChange, placeholder: 'Présentation...', rows: 3, disabled: saving })
                  )
                ),
                React.createElement('div', { className: 'edit-actions' },
                  React.createElement('button', { type: 'button', className: 'btn btn-secondary', onClick: handleCancel, disabled: saving }, 'Annuler'),
                  React.createElement('button', { type: 'submit', className: 'btn btn-primary', disabled: saving }, saving ? '⏳ Enregistrement...' : '💾 Enregistrer')
                )
              )
            )
          : React.createElement('div', { className: 'card' },
              React.createElement('div', { className: 'card-header' },
                React.createElement('h2', null, '👤 Informations personnelles')
              ),
              React.createElement('div', { className: 'info-grid' },
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Prénom'), React.createElement('span', { className: 'info-value' }, user?.prenom || '-')),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Nom'), React.createElement('span', { className: 'info-value' }, user?.nom || '-')),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Identifiant'), React.createElement('span', { className: 'info-value' }, '@' + (user?.username || ''))),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Email'), React.createElement('span', { className: 'info-value' }, user?.email || '-')),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Téléphone'), React.createElement('span', { className: 'info-value' }, user?.telephone || '-')),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Localisation'), React.createElement('span', { className: 'info-value' }, user?.localisation || '-')),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Rôle'), React.createElement('span', { className: 'info-value' }, React.createElement('span', { className: 'role-badge' }, '🛒 Vendeur'))),
                React.createElement('div', { className: 'info-item' }, React.createElement('span', { className: 'info-label' }, 'Membre depuis'), React.createElement('span', { className: 'info-value' }, user?.dateCreation || '-'))
              )
            ),
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' },
            React.createElement('h2', null, '📊 Mes statistiques')
          ),
          React.createElement('div', { className: 'stats-detailed-grid' },
            React.createElement('div', { className: 'stat-item-detailed' }, React.createElement('div', { className: 'stat-detailed-icon' }, '💰'), React.createElement('div', { className: 'stat-detailed-body' }, React.createElement('span', { className: 'stat-detailed-label' }, 'CA total'), React.createElement('span', { className: 'stat-detailed-value' }, formatCFA(stats.totalCA)))),
            React.createElement('div', { className: 'stat-item-detailed' }, React.createElement('div', { className: 'stat-detailed-icon' }, '📊'), React.createElement('div', { className: 'stat-detailed-body' }, React.createElement('span', { className: 'stat-detailed-label' }, 'Ventes'), React.createElement('span', { className: 'stat-detailed-value' }, stats.totalVentes))),
            React.createElement('div', { className: 'stat-item-detailed' }, React.createElement('div', { className: 'stat-detailed-icon' }, '📦'), React.createElement('div', { className: 'stat-detailed-body' }, React.createElement('span', { className: 'stat-detailed-label' }, 'Produits vendus'), React.createElement('span', { className: 'stat-detailed-value' }, stats.totalProduits))),
            React.createElement('div', { className: 'stat-item-detailed' }, React.createElement('div', { className: 'stat-detailed-icon' }, '📈'), React.createElement('div', { className: 'stat-detailed-body' }, React.createElement('span', { className: 'stat-detailed-label' }, 'Panier moyen'), React.createElement('span', { className: 'stat-detailed-value' }, formatCFA(stats.moyenneVente)))),
            React.createElement('div', { className: 'stat-item-detailed' }, React.createElement('div', { className: 'stat-detailed-icon' }, '📅'), React.createElement('div', { className: 'stat-detailed-body' }, React.createElement('span', { className: 'stat-detailed-label' }, 'Jours actifs'), React.createElement('span', { className: 'stat-detailed-value' }, stats.joursActif + ' jours'))),
            React.createElement('div', { className: 'stat-item-detailed' }, React.createElement('div', { className: 'stat-detailed-icon' }, '🏆'), React.createElement('div', { className: 'stat-detailed-body' }, React.createElement('span', { className: 'stat-detailed-label' }, 'Meilleur mois'), React.createElement('span', { className: 'stat-detailed-value' }, stats.meilleurMois || '-')))
          )
        )
      ),
      React.createElement('div', { className: 'profil-sidebar' },
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' }, React.createElement('h2', null, '🏅 Grade')),
          React.createElement('div', { className: 'grade-card-body' },
            React.createElement('div', { className: 'grade-icon', style: { background: grade.color + '20', color: grade.color } }, grade.level.split(' ')[0]),
            React.createElement('h3', { className: 'grade-title', style: { color: grade.color } }, grade.level),
            React.createElement('div', { className: 'grade-progress' },
              React.createElement('div', { className: 'grade-progress-bar' },
                React.createElement('div', { className: 'grade-progress-fill', style: { width: Math.min((stats.totalVentes/100)*100, 100) + '%', background: grade.color } })
              ),
              React.createElement('span', { className: 'grade-progress-text' }, stats.totalVentes + ' / 100 ventes')
            ),
            React.createElement('p', { className: 'grade-next' },
              stats.totalVentes < 10 ? '🌱 10 ventes pour Intermédiaire' :
              stats.totalVentes < 50 ? '📈 50 ventes pour Avancé' :
              stats.totalVentes < 100 ? '🏆 100 ventes pour Expert' :
              '⭐ Niveau maximum !'
            )
          )
        ),
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' }, React.createElement('h2', null, '💎 Performance')),
          React.createElement('div', { className: 'perf-card-body' },
            React.createElement('div', { className: 'perf-badge-large', style: { background: perf.color + '20', color: perf.color, border: '2px solid ' + perf.color } }, perf.label),
            React.createElement('div', { className: 'perf-stats' },
              React.createElement('div', { className: 'perf-row' }, React.createElement('span', null, 'CA total'), React.createElement('strong', null, formatCFA(stats.totalCA))),
              React.createElement('div', { className: 'perf-row' }, React.createElement('span', null, 'Moyenne/vente'), React.createElement('strong', null, formatCFA(stats.moyenneVente))),
              React.createElement('div', { className: 'perf-row' }, React.createElement('span', null, 'CA journalier'), React.createElement('strong', null, formatCFA(stats.joursActif > 0 ? Math.round(stats.totalCA/stats.joursActif) : 0)))
            )
          )
        ),
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' }, React.createElement('h2', null, '🔔 Notifications push')),
          React.createElement('div', { className: 'push-card-body' },
            React.createElement('div', { className: 'push-status' },
              React.createElement('span', { className: 'push-status-icon' }, pushEnabled ? '🔊' : '🔇'),
              React.createElement('span', null, pushEnabled ? 'Activées' : 'Désactivées')
            ),
            React.createElement('p', { className: 'push-description' },
              pushEnabled
                ? 'Vous recevrez des notifications pour les ventes, objectifs et alertes importantes.'
                : 'Activez les notifications pour être alerté en temps réel de votre activité.'
            ),
            React.createElement('button', {
              className: 'btn push-toggle-btn ' + (pushEnabled ? 'push-on' : 'push-off'),
              onClick: handleTogglePush,
              disabled: pushPermission === 'denied'
            },
              pushPermission === 'denied'
                ? '🔒 Bloqué (paramètres navigateur)'
                : (pushEnabled ? '🔕 Désactiver' : '🔔 Activer les notifications')
            ),
            pushPermission === 'denied' && React.createElement('p', { className: 'push-denied-hint' },
              'Les notifications sont bloquées par votre navigateur. Autorisez-les dans les paramètres du site.'
            )
          )
        ),
        React.createElement('div', { className: 'card' },
          React.createElement('div', { className: 'card-header' }, React.createElement('h2', null, '🔐 Compte')),
          React.createElement('div', { className: 'account-info' },
            React.createElement('div', { className: 'account-row' }, React.createElement('span', { className: 'account-label' }, 'Statut'), React.createElement('span', { className: 'account-status ' + (user?.actif !== false ? 'actif' : 'inactif') }, user?.actif !== false ? '✅ Actif' : '❌ Inactif')),
            React.createElement('div', { className: 'account-row' }, React.createElement('span', { className: 'account-label' }, 'Membre depuis'), React.createElement('span', null, user?.dateCreation || '-')),
            React.createElement('div', { className: 'account-row' }, React.createElement('span', { className: 'account-label' }, 'Connexion'), React.createElement('span', null, new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }))),
            React.createElement('div', { className: 'account-row' }, React.createElement('span', { className: 'account-label' }, 'Photo'), React.createElement('span', null, user?.photo ? '📸 ' + Math.round((user.photo.length * 0.75) / 1024) + ' Ko' : 'Aucune photo'))
          )
        )
      )
    )
  );
};

export default ProfilVendeur;