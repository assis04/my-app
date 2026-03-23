import { useState } from 'react';
import { api } from '@/services/api';
import { usePermissions } from '@/hooks/usePermissions';
import { SYSTEM_MODULES } from '@/lib/permissions';

export function useRoleForm(role, onClose, onRefresh) {
  const isEditing = !!role;
  const { isAdmin } = usePermissions();

  const [formData, setFormData] = useState({ 
    nome: role?.nome || '', 
    descricao: role?.descricao || '' 
  });
  const [selectedPermissions, setSelectedPermissions] = useState(role?.permissions || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePermission = (key) => {
    setSelectedPermissions(prev =>
      prev.includes(key) ? prev.filter(p => p !== key) : [...prev, key]
    );
    if (error) setError('');
  };

  const toggleCategory = (modules) => {
    const keys = modules.map(m => m.key);
    const allSelected = keys.every(k => selectedPermissions.includes(k));
    if (allSelected) {
      setSelectedPermissions(prev => prev.filter(p => !keys.includes(p)));
    } else {
      setSelectedPermissions(prev => [...new Set([...prev, ...keys])]);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.nome) {
      setError("O nome do perfil é obrigatório.");
      return;
    }

    setLoading(true);

    const totalPermissions = SYSTEM_MODULES.reduce((acc, curr) => acc + curr.modules.length, 0);
    if (!isAdmin && selectedPermissions.length >= totalPermissions) {
      setError('Somente o ADM pode criar perfis com acesso total a todos os módulos.');
      setLoading(false);
      return;
    }

    const payload = { ...formData, permissions: selectedPermissions };

    try {
      if (isEditing) {
        await api(`/roles/${role.id}`, { method: 'PUT', body: payload });
      } else {
        await api('/roles', { body: payload });
      }
      onRefresh();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : err.message || 'Erro inesperado. Verifique se o nome já não existe.');
    } finally {
      setLoading(false);
    }
  };

  const isADM = isEditing && role.nome === 'ADM';

  return {
    isEditing,
    formData,
    selectedPermissions,
    loading,
    error,
    isADM,
    handleInputChange,
    togglePermission,
    toggleCategory,
    handleSubmit
  };
}
