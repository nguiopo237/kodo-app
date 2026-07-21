import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import { useUtilisateurs, useInvalidateQueries, queryKeys } from '../../hooks/useDataQueries';
import * as roleService from '../../services/roleService';
import bcrypt from 'bcryptjs';
import './GestionUtilisateurs.css';

const GestionUtilisateurs = () => {
  const { hasPermission } = useAuth();
  const { data: allUtilisateurs, isLoading } = useUtilisateurs();
  const invalidate = useInvalidateQueries();
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('tous');
  const { success, error: showError, warning } = useNotification();

  const [formData, setFormData] = useState({
    username: '', password: '', prenom: '', nom: '',
    email: '', role: 'vendeur', localisation: '', actif: true
  });

  const peutVoirUtilisateurs = hasPermission('utilisateurs:lire');

  useEffect(() => {
    if (!peutVoirUtilisateurs) {
      warning('⛔ Vous n\'avez pas la permission de gérer les utilisateurs.');
    }
  }, [peutVoirUtilisateurs, warning]);

  const utilisateurs = allUtilisateurs || [];

  const utilisateursFiltres = utilisateurs.filter(user => {
    const s = searchTerm.toLowerCase();
    const matchSearch = user.nomComplet.toLowerCase().includes(s) ||
      user.username.toLowerCase().includes(s) ||
      (user.email || '').toLowerCase().includes(s);
    const matchRole = filterRole === 'tous' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.username || !formData.password || !formData.prenom || !formData.nom) {
      showError('Veuillez remplir tous les champs obligatoires'); return;
    }
    try {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      if (users.find(u => u.username === formData.username)) {
        showError('Ce nom d\'utilisateur existe deja'); return;
      }
      const newId = Math.max(...users.map(u => u.idUser), 0) + 1;
      const hashedPassword = bcrypt.hashSync(formData.password, 8);
      users.push({
        idUser: newId,
        username: formData.username,
        password: hashedPassword,
        prenom: formData.prenom.trim(),
        nom: formData.nom.trim(),
        nomComplet: formData.prenom.trim() + ' ' + formData.nom.trim(),
        email: formData.email || '',
        role: formData.role,
        localisation: formData.localisation || '',
        actif: formData.actif,
        dateCreation: new Date().toISOString().split('T')[0]
      });
      dashboardService.saveData('utilisateurs', users);
      invalidate(queryKeys.utilisateurs);
      setShowModal(false);
      resetForm();
      success('Utilisateur ajoute avec succes !');
    } catch (error) { showError(error.message); }
  };

  const handleEdit = (user) => {
    setSelectedUser(user);
    const parts = (user.nomComplet || '').split(' ');
    setFormData({
      username: user.username, password: '',
      prenom: user.prenom || parts[0] || '',
      nom: user.nom || parts.slice(1).join(' ') || '',
      email: user.email || '', role: user.role,
      localisation: user.localisation || '',
      actif: user.actif !== undefined ? user.actif : true
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!formData.prenom || !formData.nom) {
      showError('Veuillez remplir le prenom et le nom'); return;
    }
    try {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      const index = users.findIndex(u => u.idUser === selectedUser.idUser);
      if (index !== -1) {
        const updateData = {
          ...users[index],
          prenom: formData.prenom.trim(),
          nom: formData.nom.trim(),
          nomComplet: formData.prenom.trim() + ' ' + formData.nom.trim(),
          email: formData.email || '', role: formData.role,
          localisation: formData.localisation || '',
          actif: formData.actif,
        };
        if (formData.password) {
          updateData.password = bcrypt.hashSync(formData.password, 8);
        }
        users[index] = updateData;
        dashboardService.saveData('utilisateurs', users);
        invalidate(queryKeys.utilisateurs);
        setShowEditModal(false);
        resetForm();
        success('Utilisateur modifie avec succes !');
      }
    } catch (error) { showError(error.message); }
  };

  const handleDelete = (user) => {
    if (user.role === 'admin') {
      showError('Impossible de supprimer l\'administrateur principal'); return;
    }
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    try {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      const filtered = users.filter(u => u.idUser !== selectedUser.idUser);
      dashboardService.saveData('utilisateurs', filtered);
      invalidate(queryKeys.utilisateurs);
      setShowDeleteModal(false);
      setSelectedUser(null);
      success('Utilisateur supprime avec succes !');
    } catch (error) { showError(error.message); }
  };

  const resetForm = () => {
    setFormData({ username: '', password: '', prenom: '', nom: '',
      email: '', role: 'vendeur', localisation: '', actif: true });
    setSelectedUser(null);
  };

  const stats = {
    total: utilisateurs.length,
    admins: utilisateurs.filter(u => u.role === 'admin' || u.role === 'super_admin').length,
    vendeurs: utilisateurs.filter(u => u.role === 'vendeur').length,
    actifs: utilisateurs.filter(u => u.actif !== false).length
  };

  const allRoles = roleService.getAllRoles();

  if (!peutVoirUtilisateurs) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3>Permission refus&eacute;e</h3>
        <p>Vous n&rsquo;avez pas la permission de g&eacute;rer les utilisateurs.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acc&egrave;s n&eacute;cessaire.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="gestion-utilisateurs">
      <div className="page-header">
        <div className="header-title">
          <h1>Gestion des utilisateurs</h1>
          <p>Gerez les comptes et les permissions de la plateforme</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nouvel utilisateur
        </button>
      </div>

      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">Total</div>
          <div className="stat-content">
            <h3>Total utilisateurs</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card admin">
          <div className="stat-icon">Admin</div>
          <div className="stat-content">
            <h3>Administrateurs</h3>
            <div className="stat-value">{stats.admins}</div>
          </div>
        </div>
        <div className="stat-card vendeur">
          <div className="stat-icon">Vendeur</div>
          <div className="stat-content">
            <h3>Vendeurs</h3>
            <div className="stat-value">{stats.vendeurs}</div>
          </div>
        </div>
        <div className="stat-card actif">
          <div className="stat-icon">Actif</div>
          <div className="stat-content">
            <h3>Comptes actifs</h3>
            <div className="stat-value">{stats.actifs}</div>
          </div>
        </div>
      </div>

      <div className="roles-showcase">
        <h3>Roles disponibles</h3>
        <div className="roles-grid">
          {allRoles.map(role => {
            const permCount = roleService.getRolePermissions(role.id).length;
            return (
              <div key={role.id} className="role-card-pill"
                style={{ opacity: role.isBuiltIn ? 1 : 0.85 }}>
                <span className="role-card-icon" style={{backgroundColor: role.bgColor, color: role.color}}>
                  {role.icon}
                </span>
                <div className="role-card-info">
                  <strong>{role.label}</strong>
                  <span>{role.description}</span>
                  <small style={{color: '#94a3b8', fontSize: '0.7rem', marginTop: '2px'}}>
                    {permCount} permissions
                    {role.isBuiltIn ? ' · Integre' : ' · Personnalise'}
                  </small>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Rechercher</label>
            <input type="text" placeholder="Nom, email ou identifiant..."
              value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="filter-group">
            <label>Role</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="tous">Tous les roles</option>
              {allRoles.map(r => (
                <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
              ))}
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={() => { setSearchTerm(''); setFilterRole('tous'); }}>
              Reinitialiser
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Role</th>
              <th>Email</th>
              <th>Localisation</th>
              <th>Statut</th>
              <th>Date creation</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilisateursFiltres.length > 0 ? (
              utilisateursFiltres.map(user => {
                const roleMeta = roleService.getRoleMetadata(user.role);
                return (
                  <tr key={user.idUser}>
                    <td>
                      <div className="user-cell">
                        <div className={'user-avatar ' + (user.role === 'admin' ? 'admin' : 'vendeur')}>
                          {user.nomComplet?.charAt(0) || user.username.charAt(0)}
                        </div>
                        <div className="user-info">
                          <strong>{user.nomComplet || user.username}</strong>
                          <small>@{user.username}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className={'role-badge role-badge--' + user.role}>
                        {roleMeta.icon} {roleMeta.label}
                      </span>
                    </td>
                    <td>{user.email || '-'}</td>
                    <td>{user.localisation || '-'}</td>
                    <td>
                      <span className={'status-badge ' + (user.actif !== false ? 'actif' : 'inactif')}>
                        {user.actif !== false ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="date-cell">{user.dateCreation || '-'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="btn-action edit" onClick={() => handleEdit(user)} title="Modifier">✏️</button>
                        {user.role !== 'admin' && (
                          <button className="btn-action delete" onClick={() => handleDelete(user)} title="Supprimer">🗑️</button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="7" className="empty-row">
                  <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <h3>Aucun utilisateur trouve</h3>
                    <p>Ajustez vos filtres ou creez un nouvel utilisateur</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Ajouter un utilisateur</h2>
              <button className="modal-close" onClick={() => { setShowModal(false); resetForm(); }}>x</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nom d'utilisateur *</label>
                    <input type="text" name="username" value={formData.username}
                      onChange={handleInputChange} placeholder="ex: vendeur1" required />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe *</label>
                    <input type="password" name="password" value={formData.password}
                      onChange={handleInputChange} placeholder="Mot de passe" required />
                  </div>
                  <div className="form-group">
                    <label>Prenom *</label>
                    <input type="text" name="prenom" value={formData.prenom}
                      onChange={handleInputChange} placeholder="Jean" required />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input type="text" name="nom" value={formData.nom}
                      onChange={handleInputChange} placeholder="Dupont" required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email}
                      onChange={handleInputChange} placeholder="email@exemple.com" />
                  </div>
                  <div className="form-group">
                    <label>Role *</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} required>
                      {allRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Localisation</label>
                    <input type="text" name="localisation" value={formData.localisation}
                      onChange={handleInputChange} placeholder="Douala, Cameroun" />
                  </div>
                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input type="checkbox" name="actif" checked={formData.actif} onChange={handleInputChange} />
                      <span>Compte actif</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowModal(false); resetForm(); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">Ajouter l'utilisateur</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>Modifier l'utilisateur</h2>
              <button className="modal-close" onClick={() => { setShowEditModal(false); resetForm(); }}>x</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nom d'utilisateur</label>
                    <input type="text" value={selectedUser.username} disabled className="disabled-input" />
                    <small>Le nom d'utilisateur ne peut pas etre modifie</small>
                  </div>
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input type="password" name="password" value={formData.password}
                      onChange={handleInputChange} placeholder="Laisser vide pour garder l'actuel" />
                  </div>
                  <div className="form-group">
                    <label>Prenom *</label>
                    <input type="text" name="prenom" value={formData.prenom} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Nom *</label>
                    <input type="text" name="nom" value={formData.nom} onChange={handleInputChange} required />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input type="email" name="email" value={formData.email} onChange={handleInputChange} />
                  </div>
                  <div className="form-group">
                    <label>Role</label>
                    <select name="role" value={formData.role} onChange={handleInputChange}>
                      {allRoles.map(r => (
                        <option key={r.id} value={r.id}>{r.icon} {r.label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Localisation</label>
                    <input type="text" name="localisation" value={formData.localisation} onChange={handleInputChange} />
                  </div>
                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input type="checkbox" name="actif" checked={formData.actif} onChange={handleInputChange} />
                      <span>Compte actif</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); resetForm(); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">Mettre a jour</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>Supprimer l'utilisateur</h2>
              <button className="modal-close" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}>x</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Supprimer "{selectedUser.nomComplet}" ?</h3>
                  <p>Cette action est irreversible.</p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => { setShowDeleteModal(false); setSelectedUser(null); }}>Annuler</button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>Supprimer definitivement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUtilisateurs;