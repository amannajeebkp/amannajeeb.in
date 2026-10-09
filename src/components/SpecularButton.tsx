import { useRef, useCallback, useState, useEffect } from 'react';
import './SpecularButton.css';

interface SpecularButtonProps {
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  radius?: number;
  tint?: string;
  tintOpacity?: number;
  blur?: number;
  textColor?: string;
  lineColor?: string;
  baseColor?: string;
  intensity?: number;
  shineSize?: number;
  shineFade?: number;
  thickness?: number;
  speed?: number;
  followMouse?: boolean;
  proximity?: number;
  autoAnimate?: boolean;
  onClick?: () => void;
  className?: string;
}

const SpecularButton: React.FC<SpecularButtonProps> = ({
  children,
  size = 'md',
  radius = 18,
  tint = '#ffffff',
  tintOpacity = 0,
  blur = 0,
  textColor = '#f5f5f5',
  lineColor = '#ffffff',
  baseColor = '#525252',
  intensity = 1,
  shineSize = 10,
  shineFade = 40,
  thickness = 1,
  speed = 0.35,
  followMouse = true,
  proximity: _proximity = 250,
  autoAnimate = false,
  onClick,
  className = '',
}) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [shinePos, setShinePos] = useState({ x: 50, y: 50 });
  const [isHovering, setIsHovering] = useState(false);
  const animRef = useRef<number>(0);
  const angleRef = useRef(0);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!followMouse || !btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setShinePos({ x, y });
  }, [followMouse]);

  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    setShinePos({ x: 50, y: 50 });
  }, []);

  useEffect(() => {
    if (!autoAnimate || !isHovering) {
      cancelAnimationFrame(animRef.current);
      return;
    }
    const animate = () => {
      angleRef.current += speed;
      const rad = (angleRef.current * Math.PI) / 180;
      const x = 50 + Math.cos(rad) * 30;
      const y = 50 + Math.sin(rad) * 30;
      setShinePos({ x, y });
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [autoAnimate, isHovering, speed]);

  const sizeClasses = {
    sm: 'specular-btn--sm',
    md: 'specular-btn--md',
    lg: 'specular-btn--lg',
  };

  return (
    <button
      ref={btnRef}
      className={`specular-btn ${sizeClasses[size]} ${className}`}
      style={{
        '--btn-radius': `${radius}px`,
        '--btn-tint': tint,
        '--btn-tint-opacity': tintOpacity,
        '--btn-blur': `${blur}px`,
        '--btn-text': textColor,
        '--btn-line': lineColor,
        '--btn-base': baseColor,
        '--btn-intensity': intensity,
        '--btn-shine-size': shineSize,
        '--btn-shine-fade': shineFade,
        '--btn-thickness': `${thickness}px`,
        '--btn-x': shinePos.x,
        '--btn-y': shinePos.y,
        '--btn-opacity': isHovering ? 1 : 0,
      } as React.CSSProperties}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
    >
      <span className="specular-btn__shine" />
      <span className="specular-btn__border" />
      <span className="specular-btn__text">{children}</span>
    </button>
  );
};

export default SpecularButton;
