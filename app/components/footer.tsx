import Link from 'next/link';
import Image from 'next/image';
import { useAppContext } from '../context/AppContext';

export default function Footer() {
  const { theme, isOpen } = useAppContext();

  const themeClass2 = theme === 'dark' ? 'text-white bg-black' : 'text-black bg-white';
  const logoClass = theme === 'dark' 
    ? 'https://ducaqjqbmh7lv.cloudfront.net/mysite/logo_dark1.png' 
    : 'https://ducaqjqbmh7lv.cloudfront.net/mysite/logo.png';
  const marginLeft = isOpen ? 'md:ml-60' : 'md:ml-10';

  return (
    <footer className={`border-t px-8 pt-8 h-56 ${themeClass2} ${marginLeft} transition-all duration-300`}>
      <div className='flex justify-center'>
        <Image 
          src={logoClass} 
          width={150} 
          height={40} 
          alt="Company Logo"
          priority
        />
      </div>
      <div className='flex justify-center items-center'>
        <p className='py-8 font-thin'>© {new Date().getFullYear()} Epoch Labs Inc. All rights reserved.</p>
      </div>
      <div className='flex justify-center items-center'> 
        <div className="mx-auto grid grid-cols-3 gap-y-8 divide-x-2 divide-slate-400">
          <div className="flex items-center">
            <Link href="/projects" passHref legacyBehavior>
              <a className='pr-8 font-bold text-slate-700 italic text-md hover:underline'>
                Products
              </a>
            </Link>
          </div>
          <div className="flex items-center">
            <Link href="/" passHref legacyBehavior>
              <a className='pl-8 font-bold text-slate-700 italic text-md hover:underline'>
                Home
              </a>
            </Link>
          </div> 
          <div className="flex items-center">
            <Link href="/privacypolicy" passHref legacyBehavior>
              <a className='pl-8 font-bold text-slate-700 italic text-md hover:underline'>
                Privacy Policy
              </a>
            </Link>
          </div> 
        </div>
      </div>
    </footer>
  );
}