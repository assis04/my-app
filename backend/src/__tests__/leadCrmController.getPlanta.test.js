import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import path from 'path';
import fs from 'fs';

// Testa GET /api/crm/leads/:id/planta — substitui o express.static legado.
// Exigências: filial isolation (delegada a getLeadById), 404 quando lead
// não tem planta ou arquivo sumiu do disco, e bloqueio de path-traversal.

const mockGetLeadById = vi.fn();

vi.mock('../services/leadCrmService.js', () => ({
  createLead: vi.fn(),
  listLeads: vi.fn(),
  getLeadById: mockGetLeadById,
  updateLead: vi.fn(),
  deleteLead: vi.fn(),
  transferLeads: vi.fn(),
  updateEtapaLote: vi.fn(),
}));

vi.mock('../services/leadTransitionService.js', () => ({
  transitionStatus: vi.fn(),
  setTemperatura: vi.fn(),
  reactivateLead: vi.fn(),
}));

vi.mock('../services/leadHistoryService.js', () => ({
  listByLeadPaginated: vi.fn(),
}));

const { getPlanta } = await import('../controllers/leadCrmController.js');

const UPLOADS_ROOT = path.resolve('uploads', 'plantas');

function mockRes() {
  const res = {};
  res.setHeader = vi.fn().mockReturnValue(res);
  res.sendFile = vi.fn((p, cb) => { if (cb) cb(); return res; });
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

function mockReq({ id = '42', user = { id: 1, role: 'ADM', permissions: ['*'] } } = {}) {
  return { params: { id }, user };
}

const TEST_PREFIX = 'vitest-getplanta-';
let realFile;

beforeEach(() => {
  vi.clearAllMocks();

  if (!fs.existsSync(UPLOADS_ROOT)) {
    fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  }
  realFile = path.join(UPLOADS_ROOT, `${TEST_PREFIX}${Date.now()}.pdf`);
  fs.writeFileSync(realFile, '%PDF-1.7 dummy');
});

afterEach(() => {
  // Apaga TODOS os arquivos do teste (não só o último realFile) — alguns
  // testes criam um segundo arquivo com extensão diferente.
  if (fs.existsSync(UPLOADS_ROOT)) {
    for (const name of fs.readdirSync(UPLOADS_ROOT)) {
      if (name.startsWith(TEST_PREFIX)) {
        try { fs.unlinkSync(path.join(UPLOADS_ROOT, name)); } catch { /* já apagado */ }
      }
    }
  }
});

describe('leadCrmController.getPlanta', () => {
  it('responde 404 quando o Lead não tem planta anexada', async () => {
    mockGetLeadById.mockResolvedValue({ id: 42, plantaPath: null });
    const res = mockRes();
    const next = vi.fn();

    await getPlanta(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: expect.stringMatching(/sem planta/i) });
    expect(res.sendFile).not.toHaveBeenCalled();
    expect(next).not.toHaveBeenCalled();
  });

  it('rejeita path traversal (caminho fora de uploads/plantas)', async () => {
    mockGetLeadById.mockResolvedValue({ id: 42, plantaPath: '../../../etc/passwd' });
    const res = mockRes();
    const next = vi.fn();

    await getPlanta(mockReq(), res, next);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ message: expect.stringMatching(/inválido/i) });
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('rejeita absolute path fora do diretório esperado', async () => {
    const evil = path.resolve('uploads', 'outras-coisas', 'segredo.txt');
    mockGetLeadById.mockResolvedValue({ id: 42, plantaPath: evil });
    const res = mockRes();
    await getPlanta(mockReq(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('responde 404 quando arquivo não existe em disco mesmo dentro do diretório certo', async () => {
    const ghost = path.join(UPLOADS_ROOT, 'inexistente-99999.pdf');
    mockGetLeadById.mockResolvedValue({ id: 42, plantaPath: ghost });
    const res = mockRes();
    await getPlanta(mockReq(), res, vi.fn());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ message: expect.stringMatching(/não encontrado/i) });
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('serve o arquivo com headers de segurança quando tudo OK', async () => {
    mockGetLeadById.mockResolvedValue({ id: 42, plantaPath: realFile });
    const res = mockRes();
    await getPlanta(mockReq(), res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="planta-42.pdf"',
    );
    expect(res.sendFile).toHaveBeenCalledWith(path.resolve(realFile));
    expect(res.status).not.toHaveBeenCalled();
  });

  it('propaga erros de getLeadById (403 cross-filial, 404 lead inexistente) via next', async () => {
    const accessError = Object.assign(new Error('Acesso negado'), { statusCode: 403 });
    mockGetLeadById.mockRejectedValue(accessError);

    const res = mockRes();
    const next = vi.fn();
    await getPlanta(mockReq(), res, next);

    expect(next).toHaveBeenCalledWith(accessError);
    expect(res.sendFile).not.toHaveBeenCalled();
  });

  it('aceita extensão diferente (jpg) e usa no Content-Disposition', async () => {
    const jpgPath = path.join(UPLOADS_ROOT, `${TEST_PREFIX}${Date.now()}.jpg`);
    fs.writeFileSync(jpgPath, 'binary');

    mockGetLeadById.mockResolvedValue({ id: 7, plantaPath: jpgPath });
    const res = mockRes();
    await getPlanta(mockReq({ id: '7' }), res, vi.fn());

    expect(res.setHeader).toHaveBeenCalledWith(
      'Content-Disposition',
      'inline; filename="planta-7.jpg"',
    );
  });
});
