/**
 * publicLeadController — handler do POST /api/public/leads.
 *
 * Recebe um lead de origem externa (landing page) já validado pelo
 * publicLeadSchema. Usa `req.apiKey` (anexado pelo apiKeyMiddleware)
 * pra resolver filialId default e source.
 *
 * O lead é criado com:
 *  - origemExterna: true
 *  - assignmentStrategy: 'external' (sem atribuir pré-vendedor automaticamente)
 *  - preVendedorId: null (entra como "Não Definido", conforme decisão de produto)
 *  - filialId: vem da api_key (ou null se a key não tem filial associada)
 *
 * Response 201 retorna apenas o ID do lead criado e mensagem — não vaza
 * detalhes internos pro formulário público.
 */
import * as leadCrmService from '../services/leadCrmService.js';

export async function create(req, res, next) {
  try {
    const { apiKey } = req;
    if (!apiKey) {
      return res.status(401).json({ message: 'Autenticação inválida.' });
    }

    // Compõe identificador de origem: api_key.source (default) + body.source (override opcional).
    const source = req.body.source || apiKey.source || apiKey.name;

    // user=null pra origem externa; service não exige actor humano em 'external'.
    const lead = await leadCrmService.createLead(
      {
        nome: req.body.nome,
        sobrenome: req.body.sobrenome || '',
        celular: req.body.celular,
        email: req.body.email || null,
        cep: req.body.cep || null,
        origemCanal: req.body.origemCanal || '',
        // Qualificação inicial declarada no form da landing
        investimento: req.body.investimento || null,
        ambientes: req.body.ambientes || null,
        origemExterna: true,
        fonte: source,
        filialId: apiKey.filialId, // pode ser null — lead fica "Não Definido"
        preVendedorId: null,
      },
      null, // user — externo, sem actor humano
      { assignmentStrategy: 'external' },
    );

    // Resposta minimal — não expor estrutura interna pra origem externa.
    return res.status(201).json({
      id: lead.id,
      message: 'Lead recebido com sucesso.',
    });
  } catch (error) {
    next(error);
  }
}
