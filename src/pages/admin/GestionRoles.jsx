import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNotification } from '../../context/NotificationContext';
import * as roleService from '../../services/roleService';
import './GestionRoles.css';

const GestionRoles = () => {
  const { hasPermission } = useAuth();
  const { success, error: showError, warning } = useNotification();
  const [roles, setRoles] = useState([]);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [editRoleId, setEditRoleId] = useState(null);
  const [roleForm, setRoleForm] = useState({ id: '', label: '', icon: '🔄', description: '', color: '#6b7280', bgColor: '#f3f4f6', level: 1 });

  const [showPermModal, setShowPermModal] = useState(false);
  const [permRoleId, setPermRoleId] = useState(null);
  const [permRoleName, setPermRoleName] = useState('');
  const [permSelections, setPermSelections] = useState([]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteRoleId, setDeleteRoleId] = useState(null);
  const [deleteRoleLabel, setDeleteRoleLabel] = useState('');
  const [importing, setImporting] = useState(false);

  const ICONS = ['👑', '🛡️', '🛒', '🚚', '📊', '🔄', '⭐', '💎', '🎯', '🔧', '📋', '🗂️', '🔐', '⚡', '🎨'];
  const COLORS = [
    { color: '#7c3aed', bg: '#ede9fe', name: 'Violet' },
    { color: '#2563eb', bg: '#dbeafe', name: 'Bleu' },
    { color: '#059669', bg: '#d1fae5', name: 'Vert' },
    { color: '#d97706', bg: '#fef3c7', name: 'Ambre' },
    { color: '#dc2626', bg: '#fee2e2', name: 'Rouge' },
    { color: '#0891b2', bg: '#cffafe', name: 'Cyan' },
    { color: '#8b5cf6', bg: '#ede9fe', name: 'Pourpre' },
    { color: '#ec4899', bg: '#fce7f3', name: 'Rose' },
    { color: '#f97316', bg: '#ffedd5', name: 'Orange' },
    { color: '#6b7280', bg: '#f3f4f6', name: 'Gris' },
  ];

  const chargerRoles = () => {
    const allRoles = roleService.getAllRoles();
    setRoles(allRoles);
  };

  const peutGererRoles = hasPermission('utilisateurs:changer_role');

  useEffect(() => {
    if (!peutGererRoles) {
      warning('⛔ Vous n\'avez pas la permission de gérer les rôles et permissions.');
    }
  }, [peutGererRoles, warning]);

  useEffect(() => { chargerRoles(); }, []);

  const resetRoleForm = () => {
    setRoleForm({ id: '', label: '', icon: '🔄', description: '', color: '#6b7280', bgColor: '#f3f4f6', level: 1 });
    setEditRoleId(null);
  };

  const handleOpenAddRole = () => { resetRoleForm(); setShowRoleModal(true); };
  const handleOpenEditRole = (role) => {
    setEditRoleId(role.id);
    setRoleForm({ id: role.id, label: role.label, icon: role.icon || '🔄', description: role.description || '', color: role.color || '#6b7280', bgColor: role.bgColor || '#f3f4f6', level: role.level || 1 });
    setShowRoleModal(true);
  };

  const handleRoleFormChange = (e) => {
    const { name, value } = e.target;
    setRoleForm(prev => ({ ...prev, [name]: value }));
  };

  const handleColorSelect = (color, bg) => {
    setRoleForm(prev => ({ ...prev, color, bgColor: bg }));
  };

  const handleSubmitRole = (e) => {
    e.preventDefault();
    try {
      if (editRoleId) {
        if (roleService.isBuiltInRole(editRoleId)) { showError('Les roles integres ne peuvent pas etre modifies'); return; }
        roleService.updateRole(editRoleId, {
          label: roleForm.label, icon: roleForm.icon, description: roleForm.description,
          color: roleForm.color, bgColor: roleForm.bgColor, level: parseInt(roleForm.level) || 1,
        });
        success('Role "' + roleForm.label + '" mis a jour !');
      } else {
        if (!roleForm.id || !roleForm.label) { showError('Veuillez remplir l identifiant et le label du role'); return; }
        roleService.addRole({
          id: roleForm.id.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
          label: roleForm.label, icon: roleForm.icon, description: roleForm.description,
          color: roleForm.color, bgColor: roleForm.bgColor, level: parseInt(roleForm.level) || 1,
        });
        success('Nouveau role "' + roleForm.label + '" cree !');
      }
      setShowRoleModal(false);
      resetRoleForm();
      chargerRoles();
    } catch (err) { showError(err.message); }
  };

  const handleOpenDeleteRole = (role) => {
    if (role.isBuiltIn) { showError('Impossible de supprimer un role integre du systeme'); return; }
    setDeleteRoleId(role.id); setDeleteRoleLabel(role.label); setShowDeleteModal(true);
  };

  const confirmDeleteRole = () => {
    try {
      roleService.deleteRole(deleteRoleId);
      success('Role "' + deleteRoleLabel + '" supprime !');
      setShowDeleteModal(false); setDeleteRoleId(null); chargerRoles();
    } catch (err) { showError(err.message); }
  };

  const handleOpenPermissions = (role) => {
    setPermRoleId(role.id); setPermRoleName(role.label);
    setPermSelections([...roleService.getRolePermissions(role.id)]);
    setShowPermModal(true);
  };

  const togglePermission = (permKey) => {
    setPermSelections(prev => prev.includes(permKey) ? prev.filter(p => p !== permKey) : [...prev, permKey]);
  };

  const toggleGroup = (groupPerms, currentState) => {
    const allGranted = groupPerms.every(p => currentState.includes(p));
    if (allGranted) {
      setPermSelections(prev => prev.filter(p => !groupPerms.includes(p)));
    } else {
      setPermSelections(prev => {
        const newPerms = [...prev];
        groupPerms.forEach(p => { if (!newPerms.includes(p)) newPerms.push(p); });
        return newPerms;
      });
    }
  };

  const savePermissions = () => {
    try {
      roleService.updateRolePermissions(permRoleId, permSelections);
      success('Permissions mises a jour pour "' + permRoleName + '" !');
      setShowPermModal(false); chargerRoles();
    } catch (err) { showError(err.message); }
  };

  const countGranted = (role) => roleService.getRolePermissions(role.id).length;
  const countTotal = () => Object.values(roleService.PERMISSIONS).length;

  if (!peutGererRoles) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🚫</div>
        <h3>Permission refus&eacute;e</h3>
        <p>Vous n&rsquo;avez pas la permission de g&eacute;rer les r&ocirc;les et permissions.<br />Contactez l&rsquo;administrateur pour obtenir l&rsquo;acc&egrave;s n&eacute;cessaire.</p>
      </div>
    );
  }

  return (
    <div className="gestion-roles">
      <div className="page-header">
        <div className="header-title">
          <h1>Gestion des roles &amp; permissions</h1>
          <p>Creez, modifiez et configurez les roles et leurs permissions</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-primary" onClick={handleOpenAddRole}>+ Nouveau role</button>
        </div>
      </div>

      <div className="stats-cards">
        <div className="stat-card total">
          <div className="stat-icon" style={{ fontSize: '2rem' }}>🎭</div>
          <div className="stat-content">
            <h3>Roles disponibles</h3>
            <div className="stat-value">{roles.length}</div>
          </div>
        </div>
        <div className="stat-card builtin">
          <div className="stat-icon" style={{ fontSize: '2rem' }}>⚙️</div>
          <div className="stat-content">
            <h3>Roles integres</h3>
            <div className="stat-value">{roles.filter(r => r.isBuiltIn).length}</div>
          </div>
        </div>
        <div className="stat-card custom">
          <div className="stat-icon" style={{ fontSize: '2rem' }}>✨</div>
          <div className="stat-content">
            <h3>Roles personnalises</h3>
            <div className="stat-value">{roles.filter(r => !r.isBuiltIn).length}</div>
          </div>
        </div>
        <div className="stat-card perms">
          <div className="stat-icon" style={{ fontSize: '2rem' }}>🔑</div>
          <div className="stat-content">
            <h3>Permissions totales</h3>
            <div className="stat-value">{countTotal()}</div>
          </div>
        </div>
      </div>

      {/* Section Backup / Restore */}
      <div className="backup-section" style={{ marginBottom: '25px', background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(12px)', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.18)', padding: '20px 25px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '1.1rem', color: '#1f2937', fontWeight: 700 }}>💾 Sauvegarde des roles</h3>
            <p style={{ margin: 0, color: '#6b7280', fontSize: '0.85rem' }}>Exportez ou importez la configuration complete des roles personnalises</p>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                try {
                  roleService.exportRolesConfig();
                  success('Configuration des roles exportee !');
                } catch (err) {
                  showError(err.message);
                }
              }}
              title="Exporter la configuration"
            >
              📤 Exporter
            </button>
            <label className="btn btn-info" style={{ padding: '10px 24px', background: '#eff6ff', color: '#2563eb', border: '2px solid #bfdbfe', borderRadius: '10px', fontWeight: 600, fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.3s ease', display: 'inline-flex', alignItems: 'center', gap: '6px', opacity: importing ? 0.6 : 1 }}>
              📥 Importer
              <input
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                disabled={importing}
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setImporting(true);
                  try {
                    const result = await roleService.importRolesFromFile(file);
                    success('Configuration importee : ' + result.customRolesNew + ' roles personnalises synchronises !');
                    chargerRoles();
                  } catch (err) {
                    showError('Erreur : ' + err.message);
                  }
                  setImporting(false);
                  e.target.value = '';
                }}
              />
            </label>
            {importing && <span style={{ color: '#6b7280', fontSize: '0.85rem' }}>Chargement...</span>}
          </div>
        </div>
      </div>

      <div className="roles-grid">
        {roles.map(role => {
          const permCount = countGranted(role);
          const totalPerms = countTotal();
          const pct = Math.round((permCount / totalPerms) * 100);
          return (
            <div key={role.id} className={'role-card ' + (role.isBuiltIn ? 'builtin' : 'custom')}>
              <div className="role-card-header">
                <div className="role-card-icon" style={{ backgroundColor: role.bgColor, color: role.color }}>{role.icon}</div>
                <div className="role-card-title">
                  <h3>{role.label}</h3>
                  <span className="role-badge-tag" style={{ backgroundColor: role.color + '22', color: role.color, padding: '3px 10px', borderRadius: '100px', fontSize: '0.7rem', fontWeight: 600 }}>
                    {role.isBuiltIn ? 'Integre' : 'Personnalise'}
                  </span>
                </div>
              </div>
              <div className="role-card-meta">
                <p className="role-description">{role.description || 'Aucune description'}</p>
                <div className="role-id-badge">
                  <code style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '3px 10px', borderRadius: '6px' }}>{role.id}</code>
                </div>
              </div>
              <div className="role-perm-bar">
                <div className="perm-bar-label" style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: '#6b7280', marginBottom: '6px' }}>
                  <span>Permissions</span>
                  <span className="perm-count" style={{ fontWeight: 600 }}>{permCount}/{totalPerms}</span>
                </div>
                <div className="perm-bar-track" style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '10px', overflow: 'hidden' }}>
                  <div className="perm-bar-fill" style={{ height: '100%', borderRadius: '10px', transition: 'width 0.5s ease', width: pct + '%', backgroundColor: role.color }}></div>
                </div>  
              </div>
              <div className="role-card-actions" style={{ display: 'flex', gap: '8px', padding: '16px 20px', borderTop: '1px solid #f1f5f9' }}>
                <button className="btn-action config" onClick={() => handleOpenPermissions(role)} style={{ flex: 1, padding: '8px 14px', background: '#eff6ff', color: '#2563eb', border: 'none', borderRadius: '10px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem', transition: 'all 0.2s ease' }}>Permissions</button>
                {!role.isBuiltIn ? (
                  <>
                    <button className="btn-action edit" onClick={() => handleOpenEditRole(role)} style={{ width: '38px', height: '38px', background: '#f0fdf4', color: '#16a34a', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏️</button>
                    <button className="btn-action delete" onClick={() => handleOpenDeleteRole(role)} style={{ width: '38px', height: '38px', background: '#fef2f2', color: '#dc2626', border: 'none', borderRadius: '10px', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🗑️</button>
                  </>
                ) : (
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', padding: '8px 0' }}>Lecture seuledddd</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showRoleModal && (
        <div className="modal-overlay" onClick={() => { setShowRoleModal(false); resetRoleForm(); }}>
          <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '560px' }}>
            <div className="modal-header">
              <h2>{editRoleId ? 'Modifier le role' : 'Nouveau role'}</h2>
              <button className="modal-close" onClick={() => { setShowRoleModal(false); resetRoleForm(); }}>x</button>
            </div>
            <form onSubmit={handleSubmitRole}>
              <div className="modal-body">
                {!editRoleId && (
                  <div className="form-group">
                    <label>Identifiant unique *</label>
                    <input type="text" name="id" value={roleForm.id} onChange={handleRoleFormChange} placeholder="ex: superviseur, assistant, manager" required />
                    <small>Lettres minuscules, chiffres et underscores uniquement</small>
                  </div>
                )}
                <div className="form-group">
                  <label>Label du role *</label>
                  <input type="text" name="label" value={roleForm.label} onChange={handleRoleFormChange} placeholder="ex: Superviseur, Assistant" required />
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea name="description" value={roleForm.description} onChange={handleRoleFormChange} placeholder="Decrivez ce role..." rows="2" />
                </div>
                <div className="form-group">
                  <label>Icone</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {ICONS.map(icon => (
                      <button key={icon} type="button" onClick={() => handleRoleFormChange({ target: { name: 'icon', value: icon } })}
                        style={{ width: '40px', height: '40px', fontSize: '1.3rem', border: '2px solid ' + (roleForm.icon === icon ? '#8b5cf6' : '#e5e7eb'), borderRadius: '10px', background: roleForm.icon === icon ? '#ede9fe' : '#fff', cursor: 'pointer', transition: 'all 0.2s ease' }}>
                        {icon}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Couleur</label>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {COLORS.map(c => (
                      <button key={c.color} type="button" onClick={() => handleColorSelect(c.color, c.bg)}
                        style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: c.bg, color: c.color, border: '3px solid ' + (roleForm.color === c.color ? c.color : 'transparent'), cursor: 'pointer', fontSize: '1.1rem', fontWeight: 700, transition: 'all 0.2s ease' }}
                        title={c.name}>
                        {roleForm.color === c.color ? '✓' : ''}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group">
                  <label>Niveau hierarchique (1-5)</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {[1, 2, 3, 4, 5].map(lvl => (
                      <button key={lvl} type="button" onClick={() => setRoleForm(prev => ({ ...prev, level: lvl }))}
                        style={{ width: '44px', height: '44px', borderRadius: '12px', border: '2px solid ' + (parseInt(roleForm.level) === lvl ? '#8b5cf6' : '#e5e7eb'), background: parseInt(roleForm.level) === lvl ? '#ede9fe' : '#fff', cursor: 'pointer', fontWeight: 700, fontSize: '1rem', transition: 'all 0.2s ease' }}>
                        {lvl}
                      </button>
                    ))}
                  </div>
                  <small style={{ color: '#94a3b8', fontSize: '0.75rem', marginTop: '4px', display: 'block' }}>Plus le niveau est eleve, plus le role a d acces</small>
                </div>
                <div className="role-preview" style={{ marginTop: '16px', padding: '16px', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #e2e8f0' }}>
                  <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '8px' }}>Apercu</label>
                  <div className="preview-badge" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 16px', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 600, backgroundColor: roleForm.bgColor, color: roleForm.color }}>
                    {roleForm.icon} {roleForm.label || 'Nouveau role'}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => { setShowRoleModal(false); resetRoleForm(); }}>Annuler</button>
                <button type="submit" className="btn btn-primary">{editRoleId ? 'Mettre a jour' : 'Creer le role'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showPermModal && (
        <div className="modal-overlay" onClick={() => setShowPermModal(false)}>
          <div className="modal modal-perms" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h2>Permissions - {permRoleName}</h2>
              <button className="modal-close" onClick={() => setShowPermModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: '20px', color: '#6b7280' }}>
                Cochez les permissions a attribuer a ce role.<br />
                <strong style={{ color: '#1f2937' }}>{permSelections.length}/{countTotal()}</strong> permissions selectionnees.
              </p>
              <div className="permissions-groups" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {Object.entries(roleService.PERMISSION_GROUPS).map(([groupName, groupPerms]) => {
                  const groupGranted = groupPerms.filter(p => permSelections.includes(p));
                  const allGranted = groupGranted.length === groupPerms.length;
                  const someGranted = groupGranted.length > 0 && !allGranted;
                  return (
                    <div key={groupName} style={{ background: '#f8fafc', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
                      <div className="perm-group-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f1f5f9', borderBottom: '1px solid #e5e7eb' }}>
                        <h4 style={{ margin: 0, fontSize: '0.85rem', color: '#374151', fontWeight: 700 }}>{groupName}</h4>
                        <button type="button" onClick={() => toggleGroup(groupPerms, permSelections)}
                          style={{ padding: '4px 12px', borderRadius: '8px', border: 'none', cursor: 'pointer', fontWeight: 600, fontSize: '0.75rem', background: allGranted ? '#d1fae5' : someGranted ? '#fef3c7' : '#f1f5f9', color: allGranted ? '#065f46' : someGranted ? '#92400e' : '#6b7280' }}>
                          {allGranted ? 'Tout retirer' : someGranted ? 'Partiel' : 'Tout ajouter'}
                        </button>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', padding: '8px' }}>
                        {groupPerms.map(permKey => {
                          const label = roleService.PERMISSION_LABELS[permKey] || permKey;
                          const granted = permSelections.includes(permKey);
                          return (
                            <label key={permKey} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 10px', borderRadius: '8px', cursor: 'pointer', background: granted ? '#ede9fe' : 'transparent', transition: 'background 0.2s ease' }}>
                              <input type="checkbox" checked={granted} onChange={() => togglePermission(permKey)} style={{ accentColor: '#8b5cf6', width: '16px', height: '16px' }} />
                              <span style={{ fontSize: '0.82rem', fontWeight: granted ? 600 : 400, color: granted ? '#5b21b6' : '#374151', flex: 1 }}>{label}</span>
                              <code style={{ fontSize: '0.65rem', color: '#94a3b8', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{permKey}</code>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowPermModal(false)}>Annuler</button>
              <button type="button" className="btn btn-primary" onClick={savePermissions}>Enregistrer les permissions</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal modal-sm" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2>Supprimer le role</h2>
              <button className="modal-close" onClick={() => setShowDeleteModal(false)}>x</button>
            </div>
            <div className="modal-body">
              <div className="delete-confirmation" style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div style={{ fontSize: '3.5rem', flexShrink: 0 }}>⚠️</div>
                <div>
                  <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Supprimer &ldquo;{deleteRoleLabel}&rdquo; ?</h3>
                  <p style={{ color: '#6b7280', margin: '0 0 12px 0', fontSize: '0.9rem' }}>Cette action est irreversible. Les utilisateurs ayant ce role devront se voir attribuer un nouveau role.</p>
                  <div style={{ background: '#fef3c7', borderLeft: '4px solid #f59e0b', padding: '12px 16px', borderRadius: '8px', color: '#92400e', fontSize: '0.85rem' }}>
                    <strong>Note :</strong> Les utilisateurs avec ce role ne seront pas automatiquement supprimes, mais ils perdront leurs acces jusqu a ce qu un nouveau role leur soit attribue.
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Annuler</button>
              <button type="button" className="btn btn-danger" onClick={confirmDeleteRole}>Supprimer definitivement</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default GestionRoles;
