'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    password: '',
    role_id: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('http://localhost:3001/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: formData.nome,
          email: formData.email,
          password: formData.password,
          role_id: parseInt(formData.role_id) || 1,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Registro sucesso:', data);
        router.push('/login');
      } else {
        setError(data.message || data.error || 'Erro ao registrar');
      }

    } catch (err) {
      console.error('Erro na requisição:', err);
      setError('Não foi possível conectar ao servidor (Verifique se o backend está a rodar na porta 3001).');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-10 px-4 bg-white dark:bg-black sm:items-center">
        
        <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">Register</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full max-w-md">
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} className="flex flex-col gap-4 w-full max-w-md">
            <div className="flex flex-col">
              <label htmlFor="nome" className="mb-1 font-medium text-gray-700 dark:text-gray-200">Nome:</label>
              <input 
                type="text" 
                id="nome" 
                name="nome" 
                required 
                className="border p-3 rounded text-black w-full"
                placeholder="Seu nome completo"
                value={formData.nome}
                onChange={handleChange}
              />
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 font-medium text-gray-700 dark:text-gray-200">Email:</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                className="border p-3 rounded text-black w-full"
                placeholder="exemplo@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>
            
            <div className="flex flex-col">
              <label htmlFor="password" className="mb-1 font-medium text-gray-700 dark:text-gray-200">Senha:</label>
              <input 
                type="password" 
                id="password" 
                name="password" 
                required 
                className="border p-3 rounded text-black w-full"
                placeholder="Mínimo 8 caracteres (maiúscula, minúscula, número, caractere especial)"
                value={formData.password}
                onChange={handleChange}
              />
              <small className="text-gray-600 dark:text-gray-400 mt-1">
                Deve conter: maiúscula, minúscula, número e caractere especial
              </small>
            </div>

            <div className="flex flex-col">
              <label htmlFor="role_id" className="mb-1 font-medium text-gray-700 dark:text-gray-200">Role (Perfil):</label>
              <input 
                type="number" 
                id="role_id" 
                name="role_id" 
                className="border p-3 rounded text-black w-full"
                placeholder="ID do role (ex: 1)"
                value={formData.role_id}
                onChange={handleChange}
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 font-bold mt-4 transition-colors disabled:bg-gray-400"
            >
              {loading ? 'Registrando...' : 'Registrar'}
            </button>

            <p className="text-center text-gray-600 dark:text-gray-400 mt-4">
              Já tem conta? <a href="/login" className="text-blue-600 hover:underline">Faça login aqui</a>
            </p>
        </form>

      </main>
    </div>
  );
}
