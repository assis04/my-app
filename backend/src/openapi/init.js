/**
 * Patcheia o Zod global com `.openapi()` — DEVE ser importado uma vez,
 * antes de qualquer schema usar `.openapi()`. Importar este arquivo no topo
 * do entry-point do registry.
 *
 * Spec: https://github.com/asteasolutions/zod-to-openapi
 */
import { extendZodWithOpenApi } from '@asteasolutions/zod-to-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);
