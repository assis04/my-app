import { describe, it, expect } from 'vitest';
import { createUserSchema, updateUserSchema } from '../validators/userValidator.js';
import { createEquipeSchema, updateEquipeSchema } from '../validators/equipeValidator.js';
import { createFilialSchema, updateFilialSchema } from '../validators/filialValidator.js';
import { createRoleSchema, updateRoleSchema } from '../validators/roleValidator.js';

// Testes dos schemas Zod dos endpoints administrativos (RH/ADM).
// Foco: garantir que tipos errados, valores out-of-range e payloads vazios
// são rejeitados antes de bater no service. Cobre os gaps levantados pelo
// /hm-engineer audit de 2026-04-30.

describe('createUserSchema', () => {
  const validPayload = {
    nome: 'João Silva',
    email: 'joao@empresa.com',
    password: 'segura12345',
    roleId: 3,
  };

  it('aceita payload válido completo', () => {
    const r = createUserSchema.safeParse(validPayload);
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('joao@empresa.com');
  });

  it('rejeita nome ausente', () => {
    const r = createUserSchema.safeParse({ ...validPayload, nome: undefined });
    expect(r.success).toBe(false);
  });

  it('rejeita nome com 1 caractere', () => {
    const r = createUserSchema.safeParse({ ...validPayload, nome: 'J' });
    expect(r.success).toBe(false);
  });

  it('rejeita nome > 200 caracteres', () => {
    const r = createUserSchema.safeParse({ ...validPayload, nome: 'A'.repeat(201) });
    expect(r.success).toBe(false);
  });

  it('rejeita email malformado', () => {
    const r = createUserSchema.safeParse({ ...validPayload, email: 'naoeumemail' });
    expect(r.success).toBe(false);
  });

  it('normaliza email para lowercase + trim', () => {
    const r = createUserSchema.safeParse({ ...validPayload, email: '  Joao@Empresa.COM ' });
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('joao@empresa.com');
  });

  it('rejeita senha < 8 caracteres', () => {
    const r = createUserSchema.safeParse({ ...validPayload, password: '1234567' });
    expect(r.success).toBe(false);
  });

  it('aceita roleId como string numérica (do select do front)', () => {
    const r = createUserSchema.safeParse({ ...validPayload, roleId: '3' });
    expect(r.success).toBe(true);
    expect(r.data.roleId).toBe(3);
  });

  it('rejeita roleId não-positivo', () => {
    const r = createUserSchema.safeParse({ ...validPayload, roleId: 0 });
    expect(r.success).toBe(false);
  });

  it('rejeita nome como objeto ou array', () => {
    const r1 = createUserSchema.safeParse({ ...validPayload, nome: { x: 1 } });
    const r2 = createUserSchema.safeParse({ ...validPayload, nome: ['a', 'b'] });
    expect(r1.success).toBe(false);
    expect(r2.success).toBe(false);
  });

  it('descarta campos extras silenciosamente (sem mass assignment)', () => {
    const r = createUserSchema.safeParse({ ...validPayload, ativo: true, mustChangePassword: false });
    expect(r.success).toBe(true);
    expect(r.data.mustChangePassword).toBeUndefined();
  });

  it('filialId aceita null/undefined/string vazia → null', () => {
    for (const val of [null, undefined, '']) {
      const r = createUserSchema.safeParse({ ...validPayload, filialId: val });
      expect(r.success).toBe(true);
      expect(r.data.filialId).toBeFalsy();
    }
  });
});

describe('updateUserSchema', () => {
  it('aceita update parcial só com nome', () => {
    const r = updateUserSchema.safeParse({ nome: 'Novo Nome' });
    expect(r.success).toBe(true);
  });

  it('rejeita body completamente vazio', () => {
    const r = updateUserSchema.safeParse({});
    expect(r.success).toBe(false);
    expect(r.error.issues[0].message).toMatch(/pelo menos um campo/i);
  });

  it('rejeita senha curta no update', () => {
    const r = updateUserSchema.safeParse({ password: 'curta' });
    expect(r.success).toBe(false);
  });

  it('aceita ativo: false (desativar usuário)', () => {
    const r = updateUserSchema.safeParse({ ativo: false });
    expect(r.success).toBe(true);
  });
});

describe('createEquipeSchema', () => {
  it('aceita só nome (campos opcionais)', () => {
    const r = createEquipeSchema.safeParse({ nome: 'Vendas SP' });
    expect(r.success).toBe(true);
    expect(r.data.membroIds).toEqual([]);
  });

  it('rejeita nome ausente', () => {
    const r = createEquipeSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('rejeita nome null (cobre o TypeError em nome.trim())', () => {
    const r = createEquipeSchema.safeParse({ nome: null });
    expect(r.success).toBe(false);
  });

  it('aceita liderId/filialId como string numérica do select', () => {
    const r = createEquipeSchema.safeParse({ nome: 'Vendas', liderId: '5', filialId: '2' });
    expect(r.success).toBe(true);
    expect(r.data.liderId).toBe(5);
    expect(r.data.filialId).toBe(2);
  });

  it('membroIds normaliza array misto (strings + numbers + lixo)', () => {
    const r = createEquipeSchema.safeParse({
      nome: 'Vendas',
      membroIds: ['1', 2, '3', null, '', 'lixo', 4],
    });
    expect(r.success).toBe(true);
    expect(r.data.membroIds).toEqual([1, 2, 3, 4]);
  });

  it('rejeita membroIds com mais de 200 itens', () => {
    const r = createEquipeSchema.safeParse({
      nome: 'Vendas',
      membroIds: Array.from({ length: 201 }, (_, i) => i + 1),
    });
    expect(r.success).toBe(false);
  });
});

describe('updateEquipeSchema', () => {
  it('aceita ativo:false sem outros campos', () => {
    const r = updateEquipeSchema.safeParse({ ativo: false });
    expect(r.success).toBe(true);
  });

  it('rejeita body vazio', () => {
    const r = updateEquipeSchema.safeParse({});
    expect(r.success).toBe(false);
  });
});

describe('createFilialSchema', () => {
  it('aceita só nome', () => {
    const r = createFilialSchema.safeParse({ nome: 'Centro' });
    expect(r.success).toBe(true);
  });

  it('rejeita nome string vazia (espaços só)', () => {
    const r = createFilialSchema.safeParse({ nome: '  ' });
    expect(r.success).toBe(false);
  });

  it('rejeita nome null', () => {
    const r = createFilialSchema.safeParse({ nome: null });
    expect(r.success).toBe(false);
  });

  it('endereço aceita string longa até 300 chars', () => {
    const r = createFilialSchema.safeParse({ nome: 'Centro', endereco: 'A'.repeat(300) });
    expect(r.success).toBe(true);
  });

  it('rejeita endereço > 300', () => {
    const r = createFilialSchema.safeParse({ nome: 'Centro', endereco: 'A'.repeat(301) });
    expect(r.success).toBe(false);
  });

  it('managerId aceita coerção de string → number ou null', () => {
    const r1 = createFilialSchema.safeParse({ nome: 'Centro', managerId: '5' });
    expect(r1.data.managerId).toBe(5);
    const r2 = createFilialSchema.safeParse({ nome: 'Centro', managerId: '' });
    expect(r2.data.managerId).toBeNull();
  });
});

describe('updateFilialSchema', () => {
  it('rejeita body vazio', () => {
    const r = updateFilialSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('aceita partial só com endereco', () => {
    const r = updateFilialSchema.safeParse({ endereco: 'Rua Nova, 100' });
    expect(r.success).toBe(true);
  });
});

describe('createRoleSchema', () => {
  it('aceita payload válido', () => {
    const r = createRoleSchema.safeParse({
      nome: 'Vendedor Pleno',
      permissions: ['crm:leads:read', 'crm:leads:update'],
    });
    expect(r.success).toBe(true);
  });

  it('aceita só nome (permissions vira array vazio)', () => {
    const r = createRoleSchema.safeParse({ nome: 'Junior' });
    expect(r.success).toBe(true);
    expect(r.data.permissions).toEqual([]);
  });

  it('rejeita permissions > 100 itens', () => {
    const r = createRoleSchema.safeParse({
      nome: 'Operador',
      permissions: Array.from({ length: 101 }, (_, i) => `perm:${i}`),
    });
    expect(r.success).toBe(false);
  });

  it('rejeita permissions com elemento não-string', () => {
    const r = createRoleSchema.safeParse({
      nome: 'Operador',
      permissions: ['crm:leads:read', 123, null],
    });
    expect(r.success).toBe(false);
  });

  it('NOTA: validação semântica das permissions (lista canônica) fica no service', () => {
    // Schema aceita strings arbitrárias com ≤100 chars; roleService.validatePermissions
    // rejeita as que não estão em VALID_PERMISSIONS. Defesa em camadas.
    const r = createRoleSchema.safeParse({
      nome: 'Operador',
      permissions: ['totalmente:inventada:permission'],
    });
    expect(r.success).toBe(true);
  });
});

describe('updateRoleSchema', () => {
  it('rejeita body vazio', () => {
    const r = updateRoleSchema.safeParse({});
    expect(r.success).toBe(false);
  });

  it('aceita partial só com permissions', () => {
    const r = updateRoleSchema.safeParse({ permissions: ['crm:leads:read'] });
    expect(r.success).toBe(true);
  });
});