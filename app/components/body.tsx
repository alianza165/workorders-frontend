"use client"

import { useRef } from "react";
import Image from 'next/image';
import Feature from './feature';
import Link from 'next/link';
import { useAppContext } from '../context/AppContext';

export default function Body() {
  const videoRefs = [
    useRef(null),
    useRef(null),
    useRef(null)
  ];
  const { theme, isOpen } = useAppContext();

  const themeClass = theme === 'dark' ? 'text-white bg-black' : 'text-black bg-white';
  const bgImage = theme === 'dark' ? 'https://ducaqjqbmh7lv.cloudfront.net/mysite/dark_blur2.jpg' : 'https://ducaqjqbmh7lv.cloudfront.net/mysite/tech1.png';
  const marginLeft = isOpen ? 'md:ml-60' : 'md:ml-10';

  return (
    <div className={`${marginLeft} transition-all duration-300 min-h-screen`}>
      <Feature theme={theme}/>
      <div 
        className="bg-fixed bg-cover bg-center py-20"
        style={{ backgroundImage: `url(${bgImage})` }}
      >
        <div className="container mx-auto px-4">
          <div className="flex justify-center">
            <Link href="/projects">
              <button className="border p-2 text-center text-white w-32 relative skew-x-6 bg-black hover:bg-gray-800 transition-colors">
                View All
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}