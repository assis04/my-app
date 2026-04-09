import * as userService from "../services/userService.js";

export async function createUserByAdminOrHR(req, res, next) {
  try {
    const user = await userService.createUserByAdminOrHR(req.body, req.user);
    return res.status(201).json({ message: 'Usuário criado com sucesso', user });
  } catch (error) {
    next(error);
  }
}

export async function listUsers(req, res, next) {
  try {
    const { page, limit } = req.query;
    const users = await userService.listUsers({ page, limit });
    return res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req, res, next) {
  try {
    const updatedUser = await userService.updateUser(req.params.id, req.body, req.user);
    return res.json({ message: 'Usuário atualizado com sucesso.', user: { id: updatedUser.id } });
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req, res, next) {
  try {
    await userService.deleteUser(req.params.id, req.user);
    return res.json({ message: 'Usuário removido com sucesso.' });
  } catch (error) {
    next(error);
  }
}
