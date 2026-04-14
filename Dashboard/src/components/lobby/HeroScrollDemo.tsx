import { motion } from "framer-motion";
import { ContainerScroll } from "@/components/ui/scroll-anim";

const FeatureLabel = ({ 
  top, left, label, subLabel, side = "right", delay = 0, showLine = true
}: { 
  top: string, left: string, label: string, subLabel?: string, side?: "left" | "right", delay?: number, showLine?: boolean 
}) => {
  const isRight = side === "right";
  return (
    <motion.div 
      initial={{ opacity: 0, x: isRight ? -30 : 30, scale: 0.9 }}
      whileInView={{ opacity: 1, x: 0, scale: 1 }}
      viewport={{ margin: "-20% 0px -20% 0px", once: true }}
      transition={{ duration: 0.6, delay: delay, ease: "easeOut" }}
      className={`absolute z-50 flex items-start gap-0 hidden md:flex pointer-events-none ${isRight ? 'flex-row' : 'flex-row-reverse'}`}
      style={{ top, left }}
    >
      <div className="relative mt-[6px] flex-shrink-0">
        <div className="w-3 h-3 bg-orange-500 rounded-full shadow-[0_0_10px_rgba(249,115,22,1)] z-10 relative border border-white/50" />
        <div className="absolute inset-0 bg-orange-500 rounded-full animate-ping opacity-75" />
      </div>
      {showLine && (
        <svg width="80" height="40" viewBox="0 0 80 40" className={`flex-shrink-0 -mt-[6px] ${!isRight && 'rotate-180 transform'}`} style={{ overflow: 'visible' }}>
          <path d="M 0 12 L 30 12 L 45 28 L 80 28" fill="none" stroke="url(#orange-gradient)" strokeWidth="2" strokeLinecap="round" className="drop-shadow-[0_0_3px_rgba(249,115,22,0.5)]" />
          <defs>
            <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="1" />
              <stop offset="100%" stopColor="#f97316" stopOpacity="0.2" />
            </linearGradient>
          </defs>
        </svg>
      )}
      <div className={`mt-4 glass-card px-4 py-2 border-orange-500/50 bg-black/80 backdrop-blur-md shadow-2xl min-w-[160px] ${isRight ? 'border-l-2 text-left' : 'border-r-2 text-right'}`}>
        <div className="flex items-center gap-2 mb-1 justify-between">
           <span className="text-sm font-bold text-white leading-none tracking-wide">{label}</span>
           <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
        </div>
        {subLabel && <div className="text-[11px] text-gray-400 font-mono tracking-tight">{subLabel}</div>}
      </div>
    </motion.div>
  );
};

export const HeroScrollDemo = () => {
  return (
    <div className="flex flex-col overflow-visible relative z-10 pointer-events-auto">
      <ContainerScroll
        titleComponent={
          <>
            <h1 className="text-4xl font-semibold text-foreground tracking-tight">
            Try the Real-Time<br />
              <span className="text-4xl md:text-[6rem] font-bold mt-1 leading-none gradient-text">Collaborative IDE</span>
            </h1>
          </>
        }
      >
        <div className="relative w-full h-full bg-[#111] rounded-[2rem] border border-white/10 shadow-2xl">
          <div className="w-full h-full rounded-[2rem] overflow-hidden">
              <img src={"https://instasize.com/api/image/d671c25b64515cdbba976cbf017e6bfbcc663d12fac9f83f40e798f0ec2c345f.png"} alt="IDE Screenshot" className="w-full h-full object-cover object-left-top opacity-90" />
          </div>
          <FeatureLabel top="20%" left="18%" side="left" label="File System" subLabel="Tree View • CRUD Ops" delay={0.3} />
          <FeatureLabel top="15%" left="60%" side="right" label="Smart Execution" subLabel="Auto-detect Runtime" delay={0.5} />
          <FeatureLabel top="40%" left="82%" side="right" label="Voice Channels" subLabel="Spatial Audio Sync" delay={0.7} />
            <FeatureLabel top="70%" left="82%" side="right" label="Team Chat" subLabel="Rich Text & Snippets" delay={0.9} />
          <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)] pointer-events-none" />
        </div>
      </ContainerScroll>
    </div>
  );
};