import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getQueue, getLeadHistory, toggleAvailability, createQuickLead, createManualLead } from '@/services/crmApi';
import { getSocketUrl } from '@/services/api';
import { useAuth } from '@/contexts/AuthContext';

export function useSalesQueue(branchId) {
  const { user } = useAuth();
  const [queue, setQueue] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carrega os dados iniciais
  const fetchData = useCallback(async () => {
    if (!branchId) return;
    try {
      setLoading(true);
      setError(null);
      const [queueData, historyData] = await Promise.all([
        getQueue(branchId),
        getLeadHistory(branchId)
      ]);
      setQueue(queueData);
      setHistory(historyData);
    } catch (err) {
      setError(err.message || 'Erro ao carregar os dados da fila.');
    } finally {
      setLoading(false);
    }
  }, [branchId]);

    // Efeito principal: WebSocket + fetch inicial
  useEffect(() => {
    if (!branchId) return;

    fetchData();

    // Inicia conexão websocket
    const socket = io(getSocketUrl(), {
      withCredentials: true
    });

    socket.on('connect', () => {
      socket.emit('join_branch', branchId);
    });

    socket.on('queue_update', () => {
      fetchData();
    });

    return () => {
      socket.emit('leave_branch', branchId);
      socket.disconnect();
    };
  }, [branchId, fetchData]);

  // Ação: Adicionar lead rápido
  const handleCreateLead = async (leadData) => {
    try {
      // Se for FormData (contém arquivo), não podemos dar spread
      const payload = leadData instanceof FormData 
        ? leadData 
        : { branch_id: branchId, ...leadData };
        
      if (leadData instanceof FormData && !leadData.has('branch_id')) {
        leadData.append('branch_id', branchId);
      }

      await createQuickLead(branchId, payload);
      // O WebSocket fará o fetchData rodar automaticamente para todos
      return true;
    } catch (err) {
      setError(err.message || 'Erro ao criar lead rápido.');
      throw err;
    }
  };

  // Ação: Adicionar lead manual para um vendedor específico
  const handleCreateManualLead = async (leadData) => {
    try {
      const payload = leadData instanceof FormData 
        ? leadData 
        : { branch_id: branchId, ...leadData };

      if (leadData instanceof FormData && !leadData.has('branch_id')) {
        leadData.append('branch_id', branchId);
      }

      await createManualLead(payload);
      return true;
    } catch (err) {
      setError(err.message || 'Erro ao criar lead manual.');
      throw err;
    }
  };

  // Ação: Alterar status de um vendedor (o próprio ou outro, se tiver permissão)
  const handleToggleAgentStatus = async (targetUserId, isAvailable) => {
    try {
      // Usamos optimistic UI update
      setQueue(prev => prev.map(q => 
        q.id === targetUserId ? { ...q, isAvailable } : q
      ));
      await toggleAvailability(branchId, isAvailable, targetUserId);
    } catch (err) {
      const msg = typeof err === 'string' ? err : err.message || 'Erro ao alterar status.';
      setError(msg);
      fetchData(); // rollback in case of error
      throw new Error(msg); // Lança como Error object para o componente poder ler .message
    }
  };

  return {
    queue,
    history,
    loading,
    error,
    refetch: fetchData,
    handleCreateLead,
    handleCreateManualLead,
    handleToggleMyStatus: (isAvailable) => handleToggleAgentStatus(user?.id, isAvailable),
    handleToggleAgentStatus,
    myCurrentStatus: queue.find(q => q.id === user?.id)?.isAvailable ?? false
  };
}
