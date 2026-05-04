/**
 * Middleware genérico de validação Zod.
 * Uso: router.post('/leads', validate(createLeadSchema), controller.create)
 *
 * @param {import('zod').ZodSchema} schema
 * @param {'body' | 'query' | 'params'} source — onde ler os dados (default: 'body')
 */
export function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      // Zod 4 expõe `issues`. Versões antigas tinham `errors`. Aceitar ambos
      // mantém o middleware resiliente a futuros upgrades.
      const issues = result.error.issues || result.error.errors || [];
      const firstMessage = issues[0]?.message || 'Dados inválidos.';
      return res.status(400).json({
        message: firstMessage,
        errors: issues.map(err => ({
          field: Array.isArray(err.path) ? err.path.join('.') : '',
          message: err.message,
        })),
      });
    }

    // Sobrescreve com os dados parseados (inclui defaults e coerções)
    req[source] = result.data;
    next();
  };
}