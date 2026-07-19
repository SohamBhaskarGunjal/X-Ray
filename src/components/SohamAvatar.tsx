import React, { useState } from 'react';

interface SohamAvatarProps {
  className?: string;
  showBorder?: boolean;
}

export default function SohamAvatar({ className = "w-10 h-10", showBorder = true }: SohamAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);

  return (
    <div 
      className={`relative overflow-hidden rounded-full flex-shrink-0 select-none ${className} ${
        showBorder ? 'ring-2 ring-primary/45 ring-offset-2 ring-offset-background shadow-lg shadow-primary/10' : ''
      }`}
      title="Soham Bhaskar Gunjal (SBG)"
    >
      {!imgFailed ? (
        <img
          src="https://github.com/SohamBhaskarGunjal.png"
          alt="Soham Bhaskar Gunjal"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
        />
      ) : (
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full object-cover"
        >
          {/* Background Gradient */}
          <defs>
            <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#15803d" /> {/* Vibrant Green */}
              <stop offset="60%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" /> {/* Deep Forest Green */}
            </linearGradient>
            
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2d2d2d" />
              <stop offset="100%" stopColor="#121212" />
            </linearGradient>

            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#f5d0a9" />
              <stop offset="100%" stopColor="#e2b185" />
            </linearGradient>

            <linearGradient id="glassGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1a1a1a" />
              <stop offset="100%" stopColor="#080808" />
            </linearGradient>

            <clipPath id="avatarClip">
              <circle cx="50" cy="50" r="50" />
            </clipPath>
          </defs>

          {/* Outer Clip for Circle Avatar */}
          <g clipPath="url(#avatarClip)">
            {/* Green Tropical Leaves Background */}
            <rect width="100" height="100" fill="url(#bgGrad)" />

            {/* Abstract stylized background leaves */}
            {/* Leaf 1 */}
            <path d="M10 20 C25 15, 30 40, 15 65 C5 50, 0 35, 10 20 Z" fill="#166534" opacity="0.6" />
            {/* Leaf 2 */}
            <path d="M85 10 C95 25, 80 50, 65 55 C60 40, 70 20, 85 10 Z" fill="#14532d" opacity="0.8" />
            {/* Leaf 3 */}
            <path d="M90 60 C100 75, 80 95, 70 90 C75 75, 80 65, 90 60 Z" fill="#15803d" opacity="0.5" />
            {/* Leaf 4 (Bamboo stems in background) */}
            <rect x="78" y="0" width="3" height="100" fill="#14532d" opacity="0.5" transform="rotate(15 78 50)" />
            <rect x="84" y="0" width="2" height="100" fill="#15803d" opacity="0.4" transform="rotate(12 84 50)" />
            <rect x="18" y="0" width="2.5" height="100" fill="#166534" opacity="0.4" transform="rotate(-10 18 50)" />

            {/* User Body / T-shirt */}
            <path d="M22 84 C22 72, 32 68, 50 68 C68 68, 78 72, 78 84 V100 H22 V84 Z" fill="#f8fafc" />
            {/* Neck Shadow on Collar */}
            <path d="M40 68 C40 73, 60 73, 60 68 C60 73, 40 73, 40 68 Z" fill="#cbd5e1" />
            
            {/* Neck */}
            <rect x="42" y="58" width="16" height="12" rx="2" fill="url(#skinGrad)" />
            {/* Neck shadow */}
            <path d="M42 58 C47 62, 53 62, 58 58 V64 C53 66, 47 66, 42 64 V58 Z" fill="#d49f70" opacity="0.4" />

            {/* Head / Face */}
            <path d="M31 38 C31 26, 69 26, 69 38 C69 51, 62 59, 50 59 C38 59, 31 51, 31 38 Z" fill="url(#skinGrad)" />

            {/* Hair (Swooping up to the right and sides) */}
            <path d="M31 34 C29 32, 28 26, 32 24 C36 22, 42 20, 50 20 C58 20, 66 21, 69 25 C72 28, 71 33, 69 35 C66 31, 62 29, 50 29 C38 29, 33 32, 31 34 Z" fill="url(#hairGrad)" />
            {/* Extra hair spikes and volume */}
            <path d="M31 26 C33 19, 41 16, 48 16 C56 16, 64 17, 68 22 C67 21, 63 19, 50 19 C38 19, 33 22, 31 26 Z" fill="#121212" />
            {/* Hair Sideburns */}
            <path d="M31 34 L31 40 L33 39 Z" fill="url(#hairGrad)" />
            <path d="M69 34 L69 40 L67 39 Z" fill="url(#hairGrad)" />

            {/* Ears */}
            <circle cx="30" cy="40" r="3.5" fill="#e2b185" />
            <circle cx="70" cy="40" r="3.5" fill="#e2b185" />

            {/* Sunglasses (Bold black frame) */}
            {/* Left Lens Frame */}
            <path d="M34 35 C34 32, 48 32, 48 35 C48 42, 34 42, 34 35 Z" fill="url(#glassGrad)" stroke="#0a0a0a" strokeWidth="1.5" />
            {/* Right Lens Frame */}
            <path d="M52 35 C52 32, 66 32, 66 35 C66 42, 52 42, 52 35 Z" fill="url(#glassGrad)" stroke="#0a0a0a" strokeWidth="1.5" />
            {/* Bridge */}
            <rect x="47" y="34" width="6" height="2" fill="#0a0a0a" />
            {/* Frame Outer Wings */}
            <path d="M31 34 C31 34, 34 33, 35 34" stroke="#0a0a0a" strokeWidth="1.5" />
            <path d="M69 34 C69 34, 66 33, 65 34" stroke="#0a0a0a" strokeWidth="1.5" />

            {/* Gloss/Specular Highlights on Sunglasses */}
            {/* Left Lens reflection */}
            <path d="M37 34 L43 40" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
            <path d="M39 33 L41 35" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.3" />
            {/* Right Lens reflection */}
            <path d="M55 34 L61 40" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.35" />
            <path d="M57 33 L59 35" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" opacity="0.3" />

            {/* Nose line */}
            <path d="M48 42 C48 42, 50 45, 52 42" stroke="#d49f70" strokeWidth="1" strokeLinecap="round" />

            {/* Mustache */}
            <path d="M43 47 C45 46, 48 46, 50 47 C52 46, 55 46, 57 47 C55 48, 45 48, 43 47 Z" fill="#2d2d2d" />

            {/* Mouth (Subtle friendly smile matching the photo) */}
            <path d="M44 50 C46 52, 54 52, 56 50" stroke="#da7b7b" strokeWidth="1.5" strokeLinecap="round" />

            {/* Subtle logo tag "SBG" at bottom right corner */}
            <g transform="translate(68, 86)">
              <rect width="24" height="10" rx="3" fill="#000000" fillOpacity="0.6" stroke="#00ffcc" strokeWidth="0.5" />
              <text x="12" y="7" fill="#00ffcc" fontSize="5" fontFamily="monospace" fontWeight="bold" textAnchor="middle" letterSpacing="0.2">SBG</text>
            </g>
          </g>
        </svg>
      )}
    </div>
  );
}
