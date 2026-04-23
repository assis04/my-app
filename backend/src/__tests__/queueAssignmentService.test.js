import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  pickNextAvailableSeller,
  assertSellerOnQueue,
  rotateQueueAfterAssignment,
} from '../services/queueAssignmentService.js';

function makeMockTx() {
  return {
    $executeRaw: vi.fn().mockResolvedValue(1),
    salesQueue: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn().mockResolvedValue({}),
    },
  };
}

describe('pickNextAvailableSeller', () => {
  it('retorna userId do primeiro disponível (order by position ASC)', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findMany.mockResolvedValue([
      { userId: 7, position: 1 },
    ]);
    const r = await pickNextAvailableSeller(3, tx);
    expect(r).toBe(7);
    expect(tx.salesQueue.findMany).toHaveBeenCalledWith({
      where: { filialId: 3, isAvailable: true },
      orderBy: { position: 'asc' },
      take: 1,
    });
  });

  it('lança 400 quando nenhum vendedor está disponível', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findMany.mockResolvedValue([]);
    await expect(pickNextAvailableSeller(3, tx)).rejects.toThrow(/Nenhum vendedor/);
  });
});

describe('assertSellerOnQueue', () => {
  it('retorna a entrada quando o vendedor está na fila', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findUnique.mockResolvedValue({ filialId: 3, userId: 7, position: 2 });
    const r = await assertSellerOnQueue(3, 7, tx);
    expect(r.userId).toBe(7);
  });

  it('lança 404 quando vendedor não está na fila', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findUnique.mockResolvedValue(null);
    await expect(assertSellerOnQueue(3, 99, tx)).rejects.toThrow(/não encontrado na fila/);
  });
});

describe('rotateQueueAfterAssignment', () => {
  it('quando atendente NÃO é o primeiro: primeiro perde a vez + atendente vai pro fim', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findMany.mockResolvedValue([
      { userId: 1, position: 1 }, // primeiro
      { userId: 2, position: 2 },
      { userId: 7, position: 3 }, // atendente escolhido
    ]);

    await rotateQueueAfterAssignment(3, 7, tx);

    // 2 updates de position + 1 $executeRaw de normalização
    expect(tx.salesQueue.update).toHaveBeenCalledTimes(2);
    // primeiro perde a vez (position = maxPos+1 = 4)
    expect(tx.salesQueue.update).toHaveBeenCalledWith({
      where: { filialId_userId: { filialId: 3, userId: 1 } },
      data: { position: 4 },
    });
    // atendente vai pro fim absoluto (position = maxPos+2 = 5)
    expect(tx.salesQueue.update).toHaveBeenCalledWith({
      where: { filialId_userId: { filialId: 3, userId: 7 } },
      data: expect.objectContaining({
        position: 5,
        lastAssignedAt: expect.any(Date),
        attendCount30d: { increment: 1 },
      }),
    });
    expect(tx.$executeRaw).toHaveBeenCalled();
  });

  it('quando atendente JÁ É o primeiro: apenas ele vai pro fim', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findMany.mockResolvedValue([
      { userId: 7, position: 1 }, // atendente escolhido = primeiro
      { userId: 2, position: 2 },
    ]);

    await rotateQueueAfterAssignment(3, 7, tx);

    expect(tx.salesQueue.update).toHaveBeenCalledTimes(1);
    expect(tx.salesQueue.update).toHaveBeenCalledWith({
      where: { filialId_userId: { filialId: 3, userId: 7 } },
      data: expect.objectContaining({
        position: 3, // maxPos + 1
        attendCount30d: { increment: 1 },
      }),
    });
  });

  it('fila com 1 só vendedor: apenas avança o attendCount + move pra posição 2', async () => {
    const tx = makeMockTx();
    tx.salesQueue.findMany.mockResolvedValue([{ userId: 7, position: 1 }]);
    await rotateQueueAfterAssignment(3, 7, tx);
    expect(tx.salesQueue.update).toHaveBeenCalledWith({
      where: { filialId_userId: { filialId: 3, userId: 7 } },
      data: expect.objectContaining({ position: 2 }),
    });
  });
});
