export const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';

  // Log de erros para debug no console (Apenas erros não esperados da nossa aplicação - isOperational)
  if (!err.isOperational) {
    console.error(`[UNHANDLED ERROR] 💥:`, err);
  }

  // Se for erro de violação de chave primária do Prisma
  let errorMsg = err.message;
  let statusCode = err.statusCode;

  if (err.code === 'P2002') {
    errorMsg = "Registro duplicado: Você está tentando salvar um dado que já existe no sistema.";
    statusCode = 409;
  }
  
  if (err.code === 'P2003') {
    errorMsg = "Existem outros registros dependendo desta informação, você não pode excluí-la no momento.";
    statusCode = 409;
  }

  if (err.code === 'P2025') {
    errorMsg = "Registro não encontrado no banco de dados.";
    statusCode = 404;
  }

  if (err.code === 'P2024') {
    errorMsg = "O servidor demorou muito para responder (Database Timeout). Tente novamente.";
    statusCode = 504;
  }

  // Se for erro operacional (validado por nós), logamos de forma informativa mas sem stack trace poluido
  if (err.isOperational) {
    console.log(`[Validation Error] ℹ️: ${errorMsg}`);
  }

  res.status(statusCode).json({
    status: err.status,
    message: errorMsg,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};
