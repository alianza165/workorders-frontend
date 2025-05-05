'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState, useEffect } from "react";
import { useRouter } from 'next/navigation';
import { useAppContext } from '../context/AppContext';
import { useMessage } from '../context/MessageContext';
import { useAuth } from '../context/AuthContext';

export default function SignInPage() {
  const router = useRouter();
  const { message, messageType, clearMessage } = useMessage();
  const { login } = useAuth();
  const { theme, isOpen } = useAppContext();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const themeClass2 = theme === 'dark' ? 'text-white' : 'text-black';
  const logoClass2 = theme === 'dark' 
    ? 'https://ducaqjqbmh7lv.cloudfront.net/mysite/inverted_minilogo1.png' 
    : 'https://ducaqjqbmh7lv.cloudfront.net/mysite/minilogo1.png';
  const marginLeft = isOpen ? 'md:ml-60' : 'md:ml-10';

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => clearMessage(), 10000);
      return () => clearTimeout(timer);
    }
  }, [message, clearMessage]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:8000/api-token-auth/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          username: email,
          password: password
        }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      login(data.token, {
        id: data.user_id,
        email: data.email,
        profile: data.profile,
        username: data.username
      });
      router.push('/dashboard');
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Login failed');
    }
  };

  return (
    <div className={marginLeft}>
      <div className="sm:mx-auto sm:w-full sm:max-w-sm mt-10">
        <img
          alt="Your Company"
          src={logoClass2}
          className="mx-auto h-6 w-auto"
        />
        <h2 className={`md:mt-10 mt-4 text-center text-2xl font-bold leading-9 tracking-tight text-gray-900 ${themeClass2}`}>
          Sign in to your account
        </h2>
      </div>

      {message && (
        <p className={messageType === 'success' ? 'text-green-500 justify-center flex' : 'text-red-500 justify-center flex'}>
          {message}
        </p>
      )}

      <div className="md:mt-10 mt-4 sm:mx-auto sm:w-full sm:max-w-sm">
        <form onSubmit={handleSignIn} className="space-y-6">
          <div>
            <label htmlFor="email" className={`block text-sm font-medium leading-6 text-gray-900 ${themeClass2}`}>
              Email address
            </label>
            <div className="mt-2">
              <input
                id="email"
                name="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="password" className={`block text-sm font-medium leading-6 text-gray-900 ${themeClass2}`}>
                Password
              </label>
              <div className="text-sm">
                <Link href="#" className="font-semibold text-indigo-600 hover:text-indigo-500">
                  Forgot password?
                </Link>
              </div>
            </div>
            <div className="mt-2">
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="px-2 block w-full rounded-md border-0 py-1.5 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className={`flex w-full justify-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </div>

          {error && (
            <div className="flex mt-4 text-red-600 text-sm justify-center">
              {error}
            </div>
          )}
        </form>

        <p className="md:mt-10 mt-4 text-center text-sm text-gray-500">
          Not a member?{' '}
          <Link href="/signin/register" className="font-semibold leading-6 text-indigo-600 hover:text-indigo-500">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}