import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma before importing the service
const mockPrisma = {
  user: { findUnique: vi.fn() },
  task: { findMany: vi.fn(), count: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
};

vi.mock('../config/prisma.js', () => ({ default: mockPrisma }));

const { TaskService } = await import('../services/taskService.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TaskService.createTask', () => {
  it('should allow a regular user to create a task for themselves', async () => {
    const creator = { id: 10 };
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      role: { nome: 'VENDEDOR' },
      equipeLiderada: [],
    });
    mockPrisma.task.create.mockResolvedValue({ id: 1, titulo: 'Test', createdById: 10, assignedToUserId: 10 });

    const result = await TaskService.createTask(
      { titulo: 'Test', assignedToUserId: 10 },
      creator
    );

    expect(result.id).toBe(1);
    expect(mockPrisma.task.create).toHaveBeenCalled();
  });

  it('should reject a regular user creating a task for someone else', async () => {
    const creator = { id: 10 };
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      role: { nome: 'VENDEDOR' },
      equipeLiderada: [],
    });

    await expect(
      TaskService.createTask({ titulo: 'Test', assignedToUserId: 99 }, creator)
    ).rejects.toThrow('Você só pode criar tarefas para si mesmo.');
  });

  it('should allow ADM to create task for any user', async () => {
    const creator = { id: 1 };
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 1,
      role: { nome: 'ADM' },
      equipeLiderada: [],
    });
    mockPrisma.task.create.mockResolvedValue({ id: 2, titulo: 'Delegated', assignedToUserId: 99 });

    const result = await TaskService.createTask(
      { titulo: 'Delegated', assignedToUserId: 99 },
      creator
    );
    expect(result.id).toBe(2);
  });

  it('should reject a regular user assigning task to equipe', async () => {
    const creator = { id: 10 };
    mockPrisma.user.findUnique.mockResolvedValue({
      id: 10,
      role: { nome: 'VENDEDOR' },
      equipeLiderada: [],
    });

    await expect(
      TaskService.createTask({ titulo: 'Team task', assignedToEquipeId: 5 }, creator)
    ).rejects.toThrow('Apenas Administradores ou Gerentes');
  });
});

describe('TaskService.updateTaskStatus', () => {
  it('should allow the creator to update status', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 1, createdById: 10, assignedToUserId: null });
    mockPrisma.user.findUnique.mockResolvedValue({ role: { nome: 'VENDEDOR' } });
    mockPrisma.task.update.mockResolvedValue({ id: 1, status: 'CONCLUIDA' });

    const result = await TaskService.updateTaskStatus(1, 'CONCLUIDA', 10);
    expect(result.status).toBe('CONCLUIDA');
  });

  it('should reject invalid status', async () => {
    await expect(
      TaskService.updateTaskStatus(1, 'INVALIDO', 10)
    ).rejects.toThrow('Status inválido');
  });

  it('should reject unauthorized user', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 1, createdById: 10, assignedToUserId: 20 });
    mockPrisma.user.findUnique.mockResolvedValue({ role: { nome: 'VENDEDOR' } });

    await expect(
      TaskService.updateTaskStatus(1, 'CONCLUIDA', 99)
    ).rejects.toThrow('permissão');
  });
});

describe('TaskService.deleteTask', () => {
  it('should allow the creator to delete', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 1, createdById: 10 });
    mockPrisma.task.delete.mockResolvedValue({ id: 1 });

    const result = await TaskService.deleteTask(1, 10, 'VENDEDOR');
    expect(result.id).toBe(1);
  });

  it('should allow ADM to delete any task', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 1, createdById: 99 });
    mockPrisma.task.delete.mockResolvedValue({ id: 1 });

    const result = await TaskService.deleteTask(1, 10, 'ADM');
    expect(result.id).toBe(1);
  });

  it('should reject non-creator non-ADM', async () => {
    mockPrisma.task.findUnique.mockResolvedValue({ id: 1, createdById: 99 });

    await expect(
      TaskService.deleteTask(1, 10, 'VENDEDOR')
    ).rejects.toThrow('permissão');
  });
});
