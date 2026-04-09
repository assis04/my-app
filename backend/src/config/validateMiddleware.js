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
      const firstMessage = result.error.errors[0]?.message || 'Dados inválidos.';
      return res.status(400).json({
        message: firstMessage,
        errors: result.error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
        })),
      });
    }

    // Sobrescreve com os dados parseados (inclui defaults e coerções)
    req[source] = result.data;
    next();
  };
}
