import * as equipeService from '../services/equipeService.js';

export async function listEquipes(req, res, next) {
  try {
    const equipes = await equipeService.listEquipes();
    return res.json(equipes);
  } catch (error) {
    next(error);
  }
}

export async function getEquipe(req, res, next) {
  try {
    const equipe = await equipeService.getEquipe(req.params.id);
    return res.json(equipe);
  } catch (error) {
    next(error);
  }
}

export async function createEquipe(req, res, next) {
  try {
    const equipe = await equipeService.createEquipe(req.body);
    return res.status(201).json(equipe);
  } catch (error) {
    next(error);
  }
}

export async function updateEquipe(req, res, next) {
  try {
    const equipe = await equipeService.updateEquipe(req.params.id, req.body);
    return res.json(equipe);
  } catch (error) {
    next(error);
  }
}

export async function deleteEquipe(req, res, next) {
  try {
    await equipeService.deleteEquipe(req.params.id);
    return res.json({ message: 'Equipe removida com sucesso.' });
  } catch (error) {
    next(error);
  }
}
