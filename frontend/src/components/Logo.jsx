const Logo = ({ size = 80, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      className={className}
      style={{ display: 'block' }}
    >
      {/* Background Circle */}
      <circle cx="50" cy="50" r="48" fill="url(#logoGradient)" />
      
      {/* Book/Pages */}
      <path 
        d="M25 35 L50 28 L75 35 L75 70 L50 77 L25 70 Z" 
        fill="#FFF7E8" 
        stroke="#46281A" 
        strokeWidth="2"
      />
      <path 
        d="M50 28 L50 77" 
        stroke="#46281A" 
        strokeWidth="2"
      />
      
      {/* Left page lines */}
      <line x1="30" y1="40" x2="45" y2="37" stroke="#9C7248" strokeWidth="1.5" />
      <line x1="30" y1="48" x2="45" y2="45" stroke="#9C7248" strokeWidth="1.5" />
      <line x1="30" y1="56" x2="45" y2="53" stroke="#9C7248" strokeWidth="1.5" />
      
      {/* Right page lines */}
      <line x1="55" y1="37" x2="70" y2="40" stroke="#9C7248" strokeWidth="1.5" />
      <line x1="55" y1="45" x2="70" y2="48" stroke="#9C7248" strokeWidth="1.5" />
      <line x1="55" y1="53" x2="70" y2="56" stroke="#9C7248" strokeWidth="1.5" />
      
      {/* Graduation Cap */}
      <polygon 
        points="50,15 30,25 50,35 70,25" 
        fill="#46281A"
      />
      <rect x="48" y="25" width="4" height="8" fill="#46281A" />
      <line x1="65" y1="27" x2="65" y2="40" stroke="#FFBF86" strokeWidth="2" />
      <circle cx="65" cy="42" r="3" fill="#FFBF86" />
      
      {/* Checkmark */}
      <circle cx="72" cy="65" r="12" fill="#5A9A5A" />
      <path 
        d="M66 65 L70 69 L78 61" 
        stroke="white" 
        strokeWidth="3" 
        fill="none" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />
      
      {/* Gradient Definition */}
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFBF86" />
          <stop offset="100%" stopColor="#9C7248" />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default Logo;
