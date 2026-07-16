import React, { useState, useEffect } from 'react';
import { dashboardService } from '../../services/dashboardService';
import './GestionUtilisateurs.css';

const GestionUtilisateurs = () => {
  const [utilisateurs, setUtilisateurs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('tous');

  // Formulaire d'ajout/modification
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    nomComplet: '',
    email: '',
    role: 'vendeur',
    localisation: '',
    actif: true
  });

  // Charger les utilisateurs
  const chargerUtilisateurs = () => {
    setLoading(true);
    setTimeout(() => {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      setUtilisateurs(users);
      setLoading(false);
    }, 500);
  };

  useEffect(() => {
    chargerUtilisateurs();
  }, []);

  // Filtrer les utilisateurs
  const utilisateursFiltres = utilisateurs.filter(user => {
    const matchSearch = user.nomComplet.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                        user.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchRole = filterRole === 'tous' || user.role === filterRole;
    return matchSearch && matchRole;
  });

  // Gestion du formulaire
  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  // Ajouter un utilisateur
  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password || !formData.nomComplet) {
      alert('Veuillez remplir tous les champs obligatoires');
      return;
    }

    try {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      
      // Vérifier si l'utilisateur existe déjà
      if (users.find(u => u.username === formData.username)) {
        alert('Ce nom d\'utilisateur existe déjà');
        return;
      }

      const newId = Math.max(...users.map(u => u.idUser), 0) + 1;
      
      const newUser = {
        idUser: newId,
        username: formData.username,
        password: formData.password,
        nomComplet: formData.nomComplet,
        email: formData.email || '',
        role: formData.role,
        localisation: formData.localisation || '',
        actif: formData.actif,
        dateCreation: new Date().toISOString().split('T')[0]
      };

      users.push(newUser);
      dashboardService.saveData('utilisateurs', users);
      
      setShowModal(false);
      resetForm();
      chargerUtilisateurs();
      alert('✅ Utilisateur ajouté avec succès !');
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Modifier un utilisateur
  const handleEdit = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      nomComplet: user.nomComplet,
      email: user.email || '',
      role: user.role,
      localisation: user.localisation || '',
      actif: user.actif !== undefined ? user.actif : true
    });
    setShowEditModal(true);
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    
    if (!formData.nomComplet) {
      alert('Veuillez remplir le nom complet');
      return;
    }

    try {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      const index = users.findIndex(u => u.idUser === selectedUser.idUser);
      
      if (index !== -1) {
        const updatedUser = {
          ...users[index],
          nomComplet: formData.nomComplet,
          email: formData.email || '',
          role: formData.role,
          localisation: formData.localisation || '',
          actif: formData.actif
        };
        
        // Mettre à jour le mot de passe si fourni
        if (formData.password) {
          updatedUser.password = formData.password;
        }
        
        users[index] = updatedUser;
        dashboardService.saveData('utilisateurs', users);
        
        setShowEditModal(false);
        resetForm();
        chargerUtilisateurs();
        alert('✅ Utilisateur modifié avec succès !');
      }
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Supprimer un utilisateur
  const handleDelete = (user) => {
    if (user.role === 'admin') {
      alert('❌ Impossible de supprimer l\'administrateur principal');
      return;
    }
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const confirmDelete = () => {
    try {
      const data = dashboardService.loadData();
      const users = data.utilisateurs || [];
      
      // Vérifier si l'utilisateur a des ventes
      const ventes = data.ventes || [];
      const hasVentes = ventes.some(v => v.idVendeur === selectedUser.idUser);
      
      if (hasVentes) {
        if (!window.confirm(`Cet utilisateur a ${ventes.filter(v => v.idVendeur === selectedUser.idUser).length} vente(s). Voulez-vous vraiment le supprimer ?`)) {
          return;
        }
      }
      
      const filteredUsers = users.filter(u => u.idUser !== selectedUser.idUser);
      dashboardService.saveData('utilisateurs', filteredUsers);
      
      setShowDeleteModal(false);
      setSelectedUser(null);
      chargerUtilisateurs();
      alert('✅ Utilisateur supprimé avec succès !');
    } catch (error) {
      alert('❌ Erreur: ' + error.message);
    }
  };

  // Réinitialiser le formulaire
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      nomComplet: '',
      email: '',
      role: 'vendeur',
      localisation: '',
      actif: true
    });
    setSelectedUser(null);
  };

  // Statistiques
  const stats = {
    total: utilisateurs.length,
    admins: utilisateurs.filter(u => u.role === 'admin').length,
    vendeurs: utilisateurs.filter(u => u.role === 'vendeur').length,
    actifs: utilisateurs.filter(u => u.actif !== false).length
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Chargement des utilisateurs...</p>
      </div>
    );
  }

  return (
    <div className="gestion-utilisateurs">
      {/* En-tête */}
      <div className="page-header">
        <div className="header-title">
          <h1>👥 Gestion des utilisateurs</h1>
          <p>Gérez les comptes administrateurs et vendeurs</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          + Nouvel utilisateur
        </button>
      </div>

      {/* Statistiques */}
      <div className="stats-cards">
        <div className="stat-card">
          <div className="stat-icon">👤</div>
          <div className="stat-content">
            <h3>Total utilisateurs</h3>
            <div className="stat-value">{stats.total}</div>
          </div>
        </div>
        <div className="stat-card admin">
          <div className="stat-icon">🛡️</div>
          <div className="stat-content">
            <h3>Administrateurs</h3>
            <div className="stat-value">{stats.admins}</div>
          </div>
        </div>
        <div className="stat-card vendeur">
          <div className="stat-icon">🛒</div>
          <div className="stat-content">
            <h3>Vendeurs</h3>
            <div className="stat-value">{stats.vendeurs}</div>
          </div>
        </div>
        <div className="stat-card actif">
          <div className="stat-icon">✅</div>
          <div className="stat-content">
            <h3>Comptes actifs</h3>
            <div className="stat-value">{stats.actifs}</div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>🔍 Rechercher</label>
            <input
              type="text"
              placeholder="Nom, email ou identifiant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group">
            <label>👤 Rôle</label>
            <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}>
              <option value="tous">Tous les rôles</option>
              <option value="admin">Administrateur</option>
              <option value="vendeur">Vendeur</option>
            </select>
          </div>
          <div className="filter-actions">
            <button className="btn btn-secondary" onClick={() => {
              setSearchTerm('');
              setFilterRole('tous');
            }}>
              Réinitialiser
            </button>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Utilisateur</th>
              <th>Rôle</th>
              <th>Email</th>
              <th>Localisation</th>
              <th>Statut</th>
              <th>Date création</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {utilisateursFiltres.length > 0 ? (
              utilisateursFiltres.map(user => (
                <tr key={user.idUser}>
                  <td>
                    <div className="user-cell">
                      <div className={`user-avatar ${user.role === 'admin' ? 'admin' : 'vendeur'}`}>
                        {user.nomComplet?.charAt(0) || user.username.charAt(0)}
                      </div>
                      <div className="user-info">
                        <strong>{user.nomComplet || user.username}</strong>
                        <small>@{user.username}</small>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {user.role === 'admin' ? '🛡️ Admin' : '🛒 Vendeur'}
                    </span>
                  </td>
                  <td>{user.email || '-'}</td>
                  <td>{user.localisation || '-'}</td>
                  <td>
                    <span className={`status-badge ${user.actif !== false ? 'actif' : 'inactif'}`}>
                      {user.actif !== false ? '✅ Actif' : '❌ Inactif'}
                    </span>
                  </td>
                  <td className="date-cell">{user.dateCreation || '-'}</td>
                  <td>
                    <div className="action-buttons">
                      <button 
                        className="btn-action edit"
                        onClick={() => handleEdit(user)}
                        title="Modifier"
                      >
                        ✏️
                      </button>
                      {user.role !== 'admin' && (
                        <button 
                          className="btn-action delete"
                          onClick={() => handleDelete(user)}
                          title="Supprimer"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="empty-row">
                  <div className="empty-state">
                    <div className="empty-icon">👤</div>
                    <h3>Aucun utilisateur trouvé</h3>
                    <p>Ajustez vos filtres ou créez un nouvel utilisateur</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Ajout Utilisateur */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>➕ Ajouter un utilisateur</h2>
              <button className="modal-close" onClick={() => {
                setShowModal(false);
                resetForm();
              }}>×</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nom d'utilisateur *</label>
                    <input
                      type="text"
                      name="username"
                      value={formData.username}
                      onChange={handleInputChange}
                      placeholder="ex: vendeur1"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Mot de passe *</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Mot de passe"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom complet *</label>
                    <input
                      type="text"
                      name="nomComplet"
                      value={formData.nomComplet}
                      onChange={handleInputChange}
                      placeholder="Jean Dupont"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      placeholder="email@exemple.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Rôle *</label>
                    <select name="role" value={formData.role} onChange={handleInputChange} required>
                      <option value="vendeur">🛒 Vendeur</option>
                      <option value="admin">🛡️ Administrateur</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Localisation</label>
                    <input
                      type="text"
                      name="localisation"
                      value={formData.localisation}
                      onChange={handleInputChange}
                      placeholder="Douala, Cameroun"
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="actif"
                        checked={formData.actif}
                        onChange={handleInputChange}
                      />
                      <span>Compte actif</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowModal(false);
                  resetForm();
                }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Ajouter l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Modification Utilisateur */}
      {showEditModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>✏️ Modifier l'utilisateur</h2>
              <button className="modal-close" onClick={() => {
                setShowEditModal(false);
                resetForm();
              }}>×</button>
            </div>
            <form onSubmit={handleUpdate}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-group">
                    <label>Nom d'utilisateur</label>
                    <input
                      type="text"
                      value={selectedUser.username}
                      disabled
                      className="disabled-input"
                    />
                    <small>Le nom d'utilisateur ne peut pas être modifié</small>
                  </div>
                  <div className="form-group">
                    <label>Nouveau mot de passe</label>
                    <input
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Laisser vide pour garder l'actuel"
                    />
                  </div>
                  <div className="form-group">
                    <label>Nom complet *</label>
                    <input
                      type="text"
                      name="nomComplet"
                      value={formData.nomComplet}
                      onChange={handleInputChange}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label>Email</label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group">
                    <label>Rôle</label>
                    <select name="role" value={formData.role} onChange={handleInputChange}>
                      <option value="vendeur">🛒 Vendeur</option>
                      <option value="admin">🛡️ Administrateur</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>Localisation</label>
                    <input
                      type="text"
                      name="localisation"
                      value={formData.localisation}
                      onChange={handleInputChange}
                    />
                  </div>
                  <div className="form-group full-width">
                    <label className="checkbox-label">
                      <input
                        type="checkbox"
                        name="actif"
                        checked={formData.actif}
                        onChange={handleInputChange}
                      />
                      <span>Compte actif</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {
                  setShowEditModal(false);
                  resetForm();
                }}>
                  Annuler
                </button>
                <button type="submit" className="btn btn-primary">
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Suppression Utilisateur */}
      {showDeleteModal && selectedUser && (
        <div className="modal-overlay">
          <div className="modal modal-sm">
            <div className="modal-header">
              <h2>🗑️ Supprimer l'utilisateur</h2>
              <button className="modal-close" onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}>×</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation">
                <div className="warning-icon">⚠️</div>
                <div className="warning-content">
                  <h3>Supprimer "{selectedUser.nomComplet}" ?</h3>
                  <p>Cette action est irréversible.</p>
                  {selectedUser.role === 'vendeur' && (
                    <div className="warning-message">
                      <strong>Attention:</strong> Ce vendeur a peut-être des ventes associées.
                      La suppression ne supprimera pas ses ventes.
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}>
                Annuler
              </button>
              <button type="button" className="btn btn-danger" onClick={confirmDelete}>
                Supprimer définitivement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionUtilisateurs;