import { Button } from "@/components/ui/button";

export const AboutSection = () => {
  return (
    <section className="py-24 relative z-10 max-w-7xl mx-auto px-6">
        <h1 className="text-5xl md:text-7xl text-center font-bold mb-16 gradient-text opacity-90">
          About Us
        </h1>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div className="relative h-64 lg:h-96 rounded-2xl overflow-hidden border border-white/10 shadow-2xl bg-[#0F0F0F]">
             {/* Mock IDE Window Content instead of Image */}
          <div className="w-full h-full bg-[#1e1e1e] flex flex-col font-mono text-sm relative">
            {/* Window Bar */}
            <div className="h-8 bg-[#2d2d2d] flex items-center px-4 gap-2 border-b border-[#3d3d3d]">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <div className="ml-4 text-gray-400 text-xs">main.tsx — CodeSync</div>
            </div>
            {/* Editor Area */}
            <div className="flex-1 p-6 text-gray-300">
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">1</div>
                 <div><span className="text-purple-400">import</span> React <span className="text-purple-400">from</span> <span className="text-green-400">'react'</span>;</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">2</div>
                 <div><span className="text-purple-400">import</span> {"{ useRealtime }"} <span className="text-purple-400">from</span> <span className="text-green-400">'@CodeSync/collab'</span>;</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">3</div>
                 <div>&nbsp;</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">4</div>
                 <div><span className="text-purple-400">export default function</span> <span className="text-blue-400">CollaborativeEditor</span>() {"{"}</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">5</div>
                 <div className="pl-4"><span className="text-gray-500">// Join the session instantly</span></div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">6</div>
                 <div className="pl-4"><span className="text-purple-400">const</span> {"{ peers, cursor }"} = <span className="text-yellow-400">useRealtime</span>();</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">7</div>
                 <div>&nbsp;</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">8</div>
                 <div className="pl-4"><span className="text-purple-400">return</span> (</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">9</div>
                 <div className="pl-8">&lt;<span className="text-red-400">Canvas</span> peers={"{"}peers{"}"} /&gt;</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">10</div>
                 <div className="pl-4">);</div>
               </div>
               <div className="flex">
                 <div className="text-gray-600 select-none mr-4 text-right w-8">11</div>
                 <div>{"}"}</div>
               </div>

               {/* Mock Cursor */}
               <div className="absolute top-[160px] left-[200px] flex flex-col items-start z-20">
                  <div className="w-0.5 h-5 bg-orange-500 animate-pulse"></div>
                  <div className="px-2 py-0.5 bg-orange-500 text-[10px] text-white rounded rounded-tl-none">Pred</div>
               </div>
            </div>
          </div>
          </div>

          <div className="space-y-6">
            <h2 className="text-3xl font-bold sm:text-4xl text-foreground">
              What is CodeSync IDE?
            </h2>

            <p className="text-lg text-muted-foreground leading-relaxed">
            CodeSync IDE is an innovative platform designed to make pair programming, 
              code reviews, and team documentation effortless. Leveraging intuitive 
              tools and advanced real-time capabilities, CodeSync IDE enhances your 
              ability to build complex software together.
            </p>
            <p className="text-lg text-muted-foreground leading-relaxed">
              It provides seamless collaboration features, secure workspaces, 
              and AI-driven insights, making it the go-to solution for individuals 
              and teams aiming to turn their concepts into functional code.
            </p>

            <Button variant="outline" className="border-orange-500 text-orange-500 hover:bg-orange-500 hover:text-white" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
              Start Coding Now
            </Button>
          </div>
        </div>
      </section>
  );
};