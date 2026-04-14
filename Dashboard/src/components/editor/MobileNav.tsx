import { Files, Code2, MessageSquare, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: "files" | "editor" | "chat";
  onTabChange: (tab: "files" | "editor" | "chat") => void;
  onlineCount: number;
}

const MobileNav = ({ activeTab, onTabChange, onlineCount }: MobileNavProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 h-14 glass-card rounded-none border-x-0 border-b-0 z-50 flex items-center justify-around px-4 md:hidden">
      <button
        onClick={() => onTabChange("files")}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
          activeTab === "files" ? "text-codesync-purple" : "text-muted-foreground"
        )}
      >
        <Files className="w-5 h-5" />
        <span className="text-xs">Files</span>
      </button>
      
      <button
        onClick={() => onTabChange("editor")}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
          activeTab === "editor" ? "text-codesync-purple" : "text-muted-foreground"
        )}
      >
        <Code2 className="w-5 h-5" />
        <span className="text-xs">Editor</span>
      </button>
      
      <button
        onClick={() => onTabChange("chat")}
        className={cn(
          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors relative",
          activeTab === "chat" ? "text-codesync-purple" : "text-muted-foreground"
        )}
      >
        <div className="relative">
          <MessageSquare className="w-5 h-5" />
          {onlineCount > 1 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-codesync-lime text-background text-[10px] font-bold rounded-full flex items-center justify-center">
              {onlineCount}
            </span>
          )}
        </div>
        <span className="text-xs">Chat</span>
      </button>
    </div>
  );
};

export default MobileNav;
