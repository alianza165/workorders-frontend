'use client';

import { useAuth } from '../context/AuthContext';

export default function LogoutButton() {
  const { logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  return (
    <button 
      onClick={handleLogout}
      className="w-full text-left" // Ensures the button takes full width of its container
    >
      Sign out
    </button>
  );
}