import * as roleService from '../services/roleService.js';

export async function createRole(req, res, next) {
  try {
    const role = await roleService.createRole(req.body, req.user?.role);
    res.status(201).json(role);
  } catch (error) {
    next(error);
  }
}

export async function getAssignableRoles(req, res, next) {
  try {
    const invokerRole = req.user?.role;
    const roles = await roleService.getAssignableRoles(invokerRole);
    res.json(roles);
  } catch (error) {
    next(error);
  }
}

export async function getAllRoles(req, res, next) {
  try {
    const roles = await roleService.getAllRoles();
    res.json(roles);
  } catch (error) {
    next(error);
  }
}

export async function updateRole(req, res, next) {
  try {
    const role = await roleService.updateRole(req.params.id, req.body, req.user?.role);
    res.json(role);
  } catch (error) {
    next(error);
  }
}

export async function deleteRole(req, res, next) {
  try {
    await roleService.deleteRole(req.params.id);
    res.json({ message: "Perfil removido com sucesso." });
  } catch (error) {
    next(error);
  }
}
