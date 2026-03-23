import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import { api } from '@/services/api';

export function useUserForm(userObj, onClose, onRefresh) {
  const { user: currentUser } = useAuth();
  const { isAdmin } = usePermissions();
  const isEditing = !!userObj;

  const [roles, setRoles] = useState([]);
  const [filiais, setFiliais] = useState([]);
  const [isInitializing, setIsInitializing] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    nome: userObj?.nome || '',
    email: userObj?.email || '',
    password: '',
    roleId: userObj?.roleId || '',
    filialId: userObj?.filialId || '',
    ativo: userObj?.ativo ?? true
  });

  useEffect(() => {
    async function fetchDependencies() {
      try {
        setIsInitializing(true);
        let [fetchedRoles, fetchedFiliais] = await Promise.all([
          api('/roles/assignable'),
          api('/filiais')
        ]);
        
        if (!isAdmin) {
          fetchedRoles = fetchedRoles.filter(r => r.nome !== 'ADM' && r.nome !== 'RH');
        }

        setRoles(fetchedRoles);
        setFiliais(fetchedFiliais);
      } catch (err) {
        console.error("Erro ao carregar dependências do formulário:", err);
        setError("Não foi possível carregar os perfis ou filiais. Feche o formulário e tente novamente.");
      } finally {
        setIsInitializing(false);
      }
    }
    
    fetchDependencies();
  }, [isAdmin]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    setError('');

    if (!formData.roleId || !formData.filialId || !formData.nome || !formData.email) {
       setError("Por favor, preencha todos os campos obrigatórios.");
       return;
    }

    if (!isEditing && !formData.password) {
       setError("A senha é obrigatória para novos usuários.");
       return;
    }

    const selectedRole = roles.find(r => r.id === parseInt(formData.roleId));
    
    if (selectedRole?.nome === 'ADM') {
      const confirmAdm = window.confirm("CUIDADO TEMERÁRIO: Você está atribuindo poderes de Super Administrador. Deseja prosseguir?");
      if (!confirmAdm) return;
    }

    setLoading(true);
    
    const payload = {
      nome: formData.nome,
      email: formData.email,
      roleId: parseInt(formData.roleId),
      filialId: parseInt(formData.filialId),
      ativo: formData.ativo
    };
    
    if (formData.password) {
      payload.password = formData.password;
    }

    try {
      if (isEditing) {
        await api(`/users/${userObj.id}`, { method: 'PUT', body: payload });
      } else {
        await api('/users/create', { body: payload });
      }
      
      onRefresh();
      onClose();
    } catch (err) {
      setError(typeof err === "string" ? err : err.message || 'Erro inesperado ao salvar usuário.');
    } finally {
      setLoading(false);
    }
  };

  return {
    isEditing,
    roles,
    filiais,
    isInitializing,
    loading,
    error,
    formData,
    handleInputChange,
    handleSubmit
  };
}
