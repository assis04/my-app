import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';

// Mockamos a importação dinâmica de `file-type` em vez de gravar fixtures
// reais em disco — testa a lógica do middleware (decisão + cleanup) sem
// acoplar a uma versão específica da biblioteca.
const mockFileTypeFromFile = vi.fn();
vi.mock('file-type', () => ({
  fileTypeFromFile: mockFileTypeFromFile,
}));

const { validateUploadedFileMagicBytes } = await import('../middlewares/uploadMiddleware.js');

let tmpDir;
let tmpFiles;

function makeTempFile(content = 'dummy') {
  const filePath = path.join(tmpDir, `upload-${Date.now()}-${Math.random().toString(36).slice(2)}.tmp`);
  fs.writeFileSync(filePath, content);
  tmpFiles.push(filePath);
  return filePath;
}

function makeMockRes() {
  const res = { statusCode: 200, body: null };
  res.status = vi.fn((code) => { res.statusCode = code; return res; });
  res.json = vi.fn((payload) => { res.body = payload; return res; });
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'upload-test-'));
  tmpFiles = [];
});

afterEach(() => {
  for (const f of tmpFiles) {
    try { fs.unlinkSync(f); } catch { /* já apagado pelo middleware */ }
  }
  try { fs.rmdirSync(tmpDir); } catch { /* não-vazio se algum teste falhou */ }
});

describe('validateUploadedFileMagicBytes', () => {
  it('chama next() sem checar quando req.file é ausente', async () => {
    const next = vi.fn();
    const res = makeMockRes();
    await validateUploadedFileMagicBytes({ file: undefined }, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith();
    expect(mockFileTypeFromFile).not.toHaveBeenCalled();
  });

  it('aceita PDF legítimo', async () => {
    const filePath = makeTempFile('%PDF-1.7\n...');
    mockFileTypeFromFile.mockResolvedValue({ mime: 'application/pdf', ext: 'pdf' });

    const next = vi.fn();
    const res = makeMockRes();
    await validateUploadedFileMagicBytes({ file: { path: filePath } }, res, next);

    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
    expect(fs.existsSync(filePath)).toBe(true); // não deve apagar arquivo válido
  });

  it('aceita JPEG e PNG legítimos', async () => {
    for (const mime of ['image/jpeg', 'image/png']) {
      const filePath = makeTempFile('binary-bytes');
      mockFileTypeFromFile.mockResolvedValue({ mime, ext: mime.split('/')[1] });
      const next = vi.fn();
      const res = makeMockRes();
      await validateUploadedFileMagicBytes({ file: { path: filePath } }, res, next);
      expect(next).toHaveBeenCalledOnce();
      expect(res.status).not.toHaveBeenCalled();
    }
  });

  it('rejeita HTML disfarçado de PDF (ext .pdf, mime forjado)', async () => {
    const filePath = makeTempFile('<html><script>evil()</script></html>');
    mockFileTypeFromFile.mockResolvedValue({ mime: 'text/html', ext: 'html' });

    const next = vi.fn();
    const res = makeMockRes();
    await validateUploadedFileMagicBytes({ file: { path: filePath } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.message).toMatch(/inválido/i);
    expect(fs.existsSync(filePath)).toBe(false); // arquivo apagado
  });

  it('rejeita arquivo cujo conteúdo não é detectável (binário aleatório)', async () => {
    const filePath = makeTempFile(Buffer.from([0x00, 0x01, 0x02]));
    mockFileTypeFromFile.mockResolvedValue(undefined);

    const next = vi.fn();
    const res = makeMockRes();
    await validateUploadedFileMagicBytes({ file: { path: filePath } }, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(fs.existsSync(filePath)).toBe(false);
  });

  it('rejeita executáveis e formatos não permitidos (zip, exe)', async () => {
    for (const mime of ['application/zip', 'application/x-msdownload', 'image/svg+xml']) {
      const filePath = makeTempFile('whatever');
      mockFileTypeFromFile.mockResolvedValue({ mime, ext: 'x' });
      const next = vi.fn();
      const res = makeMockRes();
      await validateUploadedFileMagicBytes({ file: { path: filePath } }, res, next);
      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(fs.existsSync(filePath)).toBe(false);
    }
  });

  it('passa erro adiante e apaga arquivo se file-type lançar', async () => {
    const filePath = makeTempFile('content');
    const detectionError = new Error('falha ao inspecionar');
    mockFileTypeFromFile.mockRejectedValue(detectionError);

    const next = vi.fn();
    const res = makeMockRes();
    await validateUploadedFileMagicBytes({ file: { path: filePath } }, res, next);

    expect(next).toHaveBeenCalledWith(detectionError);
    expect(res.status).not.toHaveBeenCalled();
    expect(fs.existsSync(filePath)).toBe(false);
  });
});
