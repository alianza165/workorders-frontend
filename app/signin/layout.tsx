'use client';

import Image from 'next/image';
import { useAppContext } from '../context/AppContext';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const { theme, isOpen } = useAppContext();

  const themeClass = theme === 'dark' ? 'bg-black' : 'bg-white';
  const marginLeft = isOpen ? 'md:ml-60' : 'md:ml-10';

  return (
    <section className={`${themeClass} ${marginLeft} transition-all duration-300 m-auto overflow-hidden`}>
      <div className={`m-auto grid grid-cols-1 lg:grid-cols-2 px-6 lg:px-8 lg:mx-0 lg:max-w-none`}>
        <div>
          {children}
        </div>
        <div>
          <Image
            src="https://ducaqjqbmh7lv.cloudfront.net/mysite/login.avif"
            className="w-[70rem] max-w-none shadow-xl ring-1 ring-gray-400/10 max-h-screen object-cover lg:-ml-0 hidden sm:block"
            width={5000}
            height={5000}
            alt="Background image"
            priority
          />
        </div>
      </div>
    </section>
  );
}