
import React from 'react';

interface AdPlaceholderProps {
    className?: string;
    imageId?: string;
}

const AdPlaceholder: React.FC<AdPlaceholderProps> = ({ className = '', imageId = '1' }) => {
    const imageUrl = `https://picsum.photos/seed/${imageId}/800/200`;

    return (
        <a 
            href="https://google.com" 
            target="_blank" 
            rel="noopener noreferrer"
            className={`block rounded-2xl overflow-hidden group focus:outline-none focus:ring-4 focus:ring-cyan-400 focus:ring-offset-4 focus:ring-offset-transparent ${className}`}
            aria-label="Advertisement"
        >
            <div className="relative bg-slate-200/50 aspect-[4/1]">
                 <img 
                    src={imageUrl} 
                    alt="Advertisement" 
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                 />
                 <div className="absolute inset-0 bg-black/20"></div>
                 <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                    Ad
                 </div>
            </div>
        </a>
    );
};

export default AdPlaceholder;
