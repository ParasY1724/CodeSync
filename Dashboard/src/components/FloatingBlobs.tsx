import React, { useState, useEffect } from 'react';
import { motion } from "framer-motion";
import { 
  Code, FileJson, GitBranch, Terminal, Globe, 
  Database, Cloud, Laptop, Server, Braces, 
  MessageSquareCode, Bug
} from 'lucide-react';

/* --- Helper Component for Individual Icons --- */
const FloatingIcon = ({ icon: Icon, color, size, duration, delay, position }: any) => {
  return (
    <motion.div
      // Added z-50 to ensure icons pop above the background layer when hovered, 
      // but 'pointer-events-auto' is critical here.
      className="absolute pointer-events-auto cursor-pointer z-0 hover:z-50"
      style={{
        top: `${position.top}%`,
        left: `${position.left}%`,
      }}
      initial={{ opacity: 0.2, scale: 1 }}
      // When hovered, go to full opacity and scale up slightly
      whileHover={{ opacity: 1, scale: 1.2, transition: { duration: 0.2 } }}
      animate={{ 
        y: [0, -15, 0],
        rotate: [0, 10, -10, 0],
      }}
      transition={{
        y: { duration, repeat: Infinity, repeatType: 'reverse', ease: "easeInOut" },
        rotate: { duration, repeat: Infinity, repeatType: 'reverse', ease: "easeInOut" }
      }}
    >
      <Icon size={size} color={color} strokeWidth={1.5} />
    </motion.div>
  );
};

/* --- Main Component --- */
const FloatingBlobs = () => {
  const iconList = [Code, GitBranch, Terminal, Database, Bug, Cloud, MessageSquareCode, FileJson, Server, Braces, Laptop, Globe];
  const colors = ['#f97316', '#f59e0b', '#dc2626', '#fb923c', '#d97706']; // Warm palette
  const sizes = [24, 32, 40, 48]; 
  
  const [leftIcons, setLeftIcons] = useState<{top: number, left: number}[]>([]);
  const [rightIcons, setRightIcons] = useState<{top: number, left: number}[]>([]);

  useEffect(() => {
    const generateSide = (count: number, minLeft: number, maxLeft: number) => {
      const positions: {top: number, left: number}[] = [];
      let attempts = 0;
      
      while (positions.length < count && attempts < 100) {
        // Spread icons more evenly across the vertical height (5% to 95%)
        const top = Math.random() * 90 + 5; 
        const left = Math.random() * (maxLeft - minLeft) + minLeft;
        
        const overlap = positions.some(pos => {
          const dist = Math.sqrt(Math.pow(pos.top - top, 2) + Math.pow(pos.left - left, 2));
          return dist < 12; 
        });

        if (!overlap) {
          positions.push({ top, left });
        }
        attempts++;
      }
      return positions;
    };

    setLeftIcons(generateSide(15, 2, 20));   
    setRightIcons(generateSide(10, 80, 95)); 
    
  }, []);

  return (
    // Fixed position, z-0 to sit behind content, pointer-events-none for the container
    // so it doesn't block scrolling, but children have pointer-events-auto
    <div className="fixed inset-0 overflow-hidden pointer-events-none bg-[#0a0a0a] z-0">
       
       {/* 1. Base Dark Overlay */}
       <div className="absolute inset-0 bg-black/20" />

      {/* --- Gradients --- */}
      <div 
        className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] opacity-40"
        style={{
          background: "radial-gradient(ellipse at top, rgba(249, 115, 22, 0.4) 0%, rgba(251, 146, 60, 0.1) 40%, transparent 70%)"
        }}
      />

      <motion.div
        className="absolute w-[700px] h-[700px] rounded-full bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent blur-[100px]"
        style={{ top: "-20%", left: "-10%" }}
        animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.5, 0.3] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute w-[600px] h-[600px] rounded-full bg-gradient-to-tl from-red-600/10 to-transparent blur-[120px]"
        style={{ bottom: "-20%", right: "-10%" }}
        animate={{ scale: [1, 1.2, 1] }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 5. Center Vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(0,0,0,0.4)_0%,rgba(0,0,0,0)_60%)]" />

      {/* --- Floating Icons --- */}
      <div className="hidden sm:block">
        {leftIcons.map((pos, i) => (
          <FloatingIcon
            key={`left-${i}`}
            icon={iconList[i % iconList.length]}
            color={colors[i % colors.length]}
            size={sizes[i % sizes.length]}
            duration={Math.random() * 4 + 3}
            delay={Math.random() * 2}
            position={pos}
          />
        ))}
      </div>

      <div className="hidden sm:block">
        {rightIcons.map((pos, i) => (
          <FloatingIcon
            key={`right-${i}`}
            icon={iconList[(i + 5) % iconList.length]}
            color={colors[(i + 2) % colors.length]}
            size={sizes[(i + 1) % sizes.length]}
            duration={Math.random() * 4 + 3}
            delay={Math.random() * 2}
            position={pos}
          />
        ))}
      </div>
    </div>
  );
};

export default FloatingBlobs;