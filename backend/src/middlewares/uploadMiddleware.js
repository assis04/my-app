import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Garantir que a pasta de uploads exista
const uploadDir = 'uploads/plantas';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Aceitar apenas imagens e PDFs por enquanto
  const allowedTypes = /jpeg|jpg|png|pdf/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Apenas arquivos de imagem (JPG, PNG) ou PDF são permitidos para a planta.'));
  }
};

export const uploadPlanta = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limite de 5MB
  fileFilter: fileFilter
});

// MIMEs aceitos validados pelos magic bytes (não pelo header HTTP).
// Atacante não consegue forjar bytes iniciais sem invalidar o arquivo real.
const ALLOWED_UPLOAD_MIMES = new Set(['image/jpeg', 'image/png', 'application/pdf']);

/**
 * Validação por conteúdo do arquivo (magic bytes) — defesa em profundidade
 * sobre o `fileFilter` do multer (que só inspeciona ext + Content-Type do cliente).
 *
 * Roda DEPOIS do multer salvar em disco. Se rejeitar, apaga o arquivo antes
 * de devolver 400. Se o request não tiver `req.file` (campo opcional), passa.
 */
export async function validateUploadedFileMagicBytes(req, res, next) {
  if (!req.file) return next();

  try {
    const { fileTypeFromFile } = await import('file-type');
    const detected = await fileTypeFromFile(req.file.path);

    if (!detected || !ALLOWED_UPLOAD_MIMES.has(detected.mime)) {
      await fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(400).json({
        message: 'Arquivo inválido — conteúdo não corresponde a JPG, PNG ou PDF.',
      });
    }

    return next();
  } catch (err) {
    // Falha ao inspecionar — apaga e devolve 500 (não vaza detalhes).
    await fs.promises.unlink(req.file.path).catch(() => {});
    return next(err);
  }
}
