import { motion } from "framer-motion";
import { Terminal, Zap, Users, Globe, Cpu, Shield } from "lucide-react";

const featuresData = [
  { icon: Terminal, title: "Multi-Language Support", desc: "Syntax highlighting and execution support for JavaScript, Python, Go, Rust, C++, and 15+ other languages." },
  { icon: Zap, title: "Real-time Sync", desc: "Experience zero-latency typing. Code changes and cursor movements are broadcasted instantly via WebSockets." },
  { icon: Users, title: "Collaborative Sharing", desc: "Invite your team with a simple room code. No complex setups or installations required." },
  { icon: Globe, title: "WebRTC Voice Chat", desc: "Built-in crystal clear voice communication. Talk through your logic while you code together." },
  { icon: Cpu, title: "AI-Powered Completion", desc: "Integrated smart suggestions help you write boiler-plate code faster and cleaner." },
  { icon: Shield, title: "Secure Workspaces", desc: "Rooms are ephemeral and secure. Row Level Security (RLS) ensures only room members access data." }
];

export const FeaturesGrid = () => {
  return (
    <section className="p-5 relative z-10 pointer-events-auto">
      <div className="text-center mb-16 px-4">
        <h1 className="text-4xl md:text-6xl font-bold text-center gradient-text pb-2">Features</h1>
        <p className="max-w-2xl mx-auto font-medium text-muted-foreground mt-4 text-lg">
          Effortlessly create code, diagrams, and collaborate with your team.
        </p>
      </div>

      <div className="relative max-w-7xl mx-auto px-6">
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
          <div className="hidden lg:block absolute top-0 left-1/3 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
          <div className="hidden lg:block absolute top-0 right-1/3 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {featuresData.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              viewport={{ once: true }}
              className="group relative p-8 rounded-2xl bg-[#0a0a0a] border border-white/5 hover:border-orange-500/30 transition-all duration-300 text-center"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 to-transparent rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="relative z-10 flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300 border border-white/10">
                  <feature.icon className="w-8 h-8 text-orange-500" />
                </div>
                <h4 className="text-lg font-bold text-foreground mb-3">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </div>
            </motion.div>
          ))}
          </div>
      </div>
    </section>
  );
};