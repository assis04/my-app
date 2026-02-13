'use client'

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    try {
      // Tenta conectar ao backend na porta 3001
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email: email, 
          password: password 
        }),
      });

      const data = await response.json();

      if (response.ok) {
        console.log('Login sucesso:', data);
        localStorage.setItem('token', data.token);
        // Redireciona para a página desejada
        router.push('/dashboard'); 
      } else {
        setError(data.message || 'Erro ao fazer login');
      }

    } catch (err) {
      console.error('Erro na requisição:', err);
      setError('Não foi possível conectar ao servidor (Verifique se o backend está a rodar na porta 3000).');
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full max-w-3xl flex-col items-center justify-center py-10 px-4 bg-white dark:bg-black sm:items-center">
        
        <h1 className="text-3xl font-bold mb-6 text-black dark:text-white">Login</h1>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4 w-full max-w-md">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="flex flex-col gap-4 w-full max-w-md">
            <div className="flex flex-col">
              <label htmlFor="email" className="mb-1 font-medium text-gray-700 dark:text-gray-200">Email:</label>
              <input 
                type="email" 
                id="email" 
                name="email" 
                required 
                className="border p-3 rounded text-black w-full"
                placeholder="exemplo@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                placeholder="********"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            
            <button 
              type="submit" 
              className="bg-blue-600 text-white p-3 rounded hover:bg-blue-700 font-bold mt-4 transition-colors"
            >
              Entrar
            </button>
        </form>

      </main>
    </div>
  );
}