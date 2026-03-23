import * as filialService from '../services/filialService.js';

export async function listFiliais(req, res, next) {
  try {
    const filiais = await filialService.listFiliais();
    return res.status(200).json(filiais);
  } catch (error) {
    next(error);
  }
}

export async function getFilial(req, res, next) {
  try {
    const filial = await filialService.getFilial(req.params.id);
    return res.json(filial);
  } catch (error) {
    next(error);
  }
}

export async function createFilial(req, res, next) {
  try {
    const filial = await filialService.createFilial(req.body);
    return res.status(201).json(filial);
  } catch (error) {
    next(error);
  }
}

export async function updateFilial(req, res, next) {
  try {
    const filial = await filialService.updateFilial(req.params.id, req.body);
    return res.json(filial);
  } catch (error) {
    next(error);
  }
}

export async function deleteFilial(req, res, next) {
  try {
    await filialService.deleteFilial(req.params.id);
    return res.json({ message: 'Filial removida com sucesso.' });
  } catch (error) {
    next(error);
  }
}
