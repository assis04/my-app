import { useState, useEffect, useCallback } from 'react';
import { io } from 'socket.io-client';
import { getQueue, getLeadHistory, toggleAvailability, createQuickLead, createManualLead } from '@/services/captacaoApi';
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
    const socket = io('http://localhost:3001', {
      withCredentials: true
    });

    socket.on('connect', () => {
      // console.log('WebSocket conectado, ID:', socket.id);
      socket.emit('join_branch', branchId);
    });

    // Quando o backend avisar que a fila mudou, recarregamos
    socket.on('queue_update', (data) => {
      // console.log('Queue update recebido via WS:', data);
      fetchData();
    });

    return () => {
      socket.emit('leave_branch', branchId);
      socket.disconnect();
    };
  }, [branchId]); // Removido fetchData para evitar loop infinito das renderizações do react

  // Ação: Adicionar lead rápido
  const handleCreateLead = async (leadData) => {
    try {
      await createQuickLead(branchId, leadData);
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
      await createManualLead({ branch_id: branchId, ...leadData });
      return true;
    } catch (err) {
      setError(err.message || 'Erro ao criar lead manual.');
      throw err;
    }
  };

  // Ação: Alterar status do próprio vendedor logado
  const handleToggleMyStatus = async (isAvailable) => {
    try {
      // Usamos optimistic UI update
      setQueue(prev => prev.map(q => 
        q.id === user?.id ? { ...q, isAvailable } : q
      ));
      await toggleAvailability(branchId, isAvailable);
    } catch (err) {
      setError(err.message || 'Erro ao alterar status.');
      fetchData(); // rollback in case of error
      throw err;
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
    handleToggleMyStatus,
    myCurrentStatus: queue.find(q => q.id === user?.id)?.isAvailable ?? false
  };
}
