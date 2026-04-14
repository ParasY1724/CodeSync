import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { EditorState } from "@codemirror/state";
import { EditorView, keymap, lineNumbers, highlightActiveLineGutter, highlightSpecialChars, drawSelection, dropCursor, highlightActiveLine } from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { css } from "@codemirror/lang-css";
import { html } from "@codemirror/lang-html";
import { python } from "@codemirror/lang-python";
import { cpp } from "@codemirror/lang-cpp";
import { go } from "@codemirror/lang-go";
import { rust } from "@codemirror/lang-rust";
import { java } from "@codemirror/lang-java";
import { php } from "@codemirror/lang-php";
import { markdown } from "@codemirror/lang-markdown";
import { json } from "@codemirror/lang-json";
import { sql } from "@codemirror/lang-sql";
import { xml } from "@codemirror/lang-xml";
import { yaml } from "@codemirror/lang-yaml";
import { syntaxHighlighting, HighlightStyle } from "@codemirror/language";
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import { tags } from "@lezer/highlight";
import { Play, X, Terminal, Loader2, CheckCircle2, XCircle, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { CursorPosition } from "@/hooks/useCursorSync";
import { useCodeRunner, ExecutionStatus } from "@/hooks/useCodeRunner"; // Hook import

interface CodeEditorPanelProps {
  activeFile: string;
  fileContent: string;
  onContentChange: (content: string) => void;
  cursors: CursorPosition[];
  onCursorMove: (line: number, col: number) => void;
}

// --- Theme & Language Logic (Kept exactly as original) ---
const codesyncTheme = EditorView.theme({
  "&": { backgroundColor: "#0F111A", color: "#e4e4e7", fontSize: "14px", fontFamily: "'JetBrains Mono', monospace" },
  ".cm-content": { caretColor: "#a855f7", padding: "16px 0" },
  ".cm-cursor, .cm-dropCursor": { borderLeftColor: "#a855f7", borderLeftWidth: "2px" },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection": { backgroundColor: "rgba(100, 100, 255, 0.3)" },
  ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
  ".cm-activeLineGutter": { backgroundColor: "rgba(255, 255, 255, 0.03)" },
  ".cm-gutters": { backgroundColor: "transparent", color: "#52525b", border: "none", paddingRight: "8px" },
  ".cm-lineNumbers .cm-gutterElement": { padding: "0 8px 0 16px", minWidth: "40px" },
  ".cm-tooltip": { backgroundColor: "#1e1e2e", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "8px" },
  ".cm-tooltip-autocomplete": { "& > ul > li": { padding: "4px 8px" }, "& > ul > li[aria-selected]": { backgroundColor: "rgba(168, 85, 247, 0.3)" } },
});

const codesyncSyntax = HighlightStyle.define([
  { tag: tags.keyword, color: "#c084fc" },
  { tag: tags.string, color: "#4ade80" },
  { tag: tags.number, color: "#fb923c" },
  { tag: tags.comment, color: "#71717a", fontStyle: "italic" },
  { tag: tags.function(tags.variableName), color: "#60a5fa" },
  { tag: tags.variableName, color: "#e4e4e7" },
  { tag: tags.typeName, color: "#22d3ee" },
  { tag: tags.propertyName, color: "#f472b6" },
  { tag: tags.operator, color: "#a1a1aa" },
  { tag: tags.punctuation, color: "#71717a" },
  { tag: tags.tagName, color: "#f472b6" },
  { tag: tags.attributeName, color: "#c084fc" },
  { tag: tags.className, color: "#22d3ee" },
]);

const getLanguage = (filename: string) => {
  const ext = filename.split('.').pop()?.toLowerCase() || '';
  switch (ext) {
    case 'css': case 'scss': case 'sass': case 'less': return css();
    case 'html': case 'htm': return html();
    case 'xml': case 'svg': return xml();
    case 'js': case 'jsx': case 'mjs': case 'cjs': return javascript({ jsx: true });
    case 'ts': case 'tsx': case 'mts': case 'cts': return javascript({ jsx: true, typescript: true });
    case 'py': case 'pyw': return python();
    case 'c': case 'h': case 'cpp': case 'cxx': case 'cc': return cpp();
    case 'go': return go();
    case 'rs': return rust();
    case 'java': case 'kt': return java();
    case 'php': return php();
    case 'md': case 'markdown': return markdown();
    case 'json': return json();
    case 'sql': return sql();
    case 'yaml': case 'yml': return yaml();
    default: return javascript({ jsx: true, typescript: true });
  }
};

// --- Status Badge Component ---
const StatusBadge = ({ status }: { status: ExecutionStatus }) => {
  if (!status) return null;
  const config = {
    AC: { color: "text-green-400 bg-green-400/10 border-green-400/20", icon: CheckCircle2, text: "Accepted" },
    RE: { color: "text-red-400 bg-red-400/10 border-red-400/20", icon: XCircle, text: "Runtime Error" },
    CE: { color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", icon: AlertCircle, text: "Compilation Error" },
    PENDING: { color: "text-blue-400 bg-blue-400/10 border-blue-400/20", icon: Loader2, text: "Running..." },
    WA: { color: "text-red-400 bg-red-400/10 border-red-400/20", icon: Loader2, text: "WA" },

  }[status] || { color: "text-gray-400", icon: Clock, text: "Unknown" };

  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${config.color}`}>
      <Icon className={`w-3.5 h-3.5 ${status === 'PENDING' ? 'animate-spin' : ''}`} />
      {config.text}
    </div>
  );
};

const CodeEditorPanel = ({ 
  activeFile, 
  fileContent,
  onContentChange,
  cursors,
  onCursorMove
}: CodeEditorPanelProps) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
  
  // Terminal Logic
  const [showTerminal, setShowTerminal] = useState(true);
  const [activeTab, setActiveTab] = useState<"input" | "output">("input");
  const [stdInput, setStdInput] = useState("");
  const [expectedOutput, setExpectedOutput] = useState("");
  
  const contentRef = useRef(fileContent);
  const isUpdatingRef = useRef(false);

  // Use the Hook
  const { isRunning, result, runCode } = useCodeRunner();

  // Handle Editor Updates
  useEffect(() => {
    contentRef.current = fileContent;
  }, [fileContent]);

  const handleCursorUpdate = useCallback((line: number, col: number) => {
    setCursorPos({ line, col });
    onCursorMove(line, col);
  }, [onCursorMove]);

  const handleContentChange = useCallback((newContent: string) => {
    if (isUpdatingRef.current) return;
    contentRef.current = newContent;
    onContentChange(newContent);
  }, [onContentChange]);

  // CodeMirror Initialization
  const extensions = useMemo(() => [
    lineNumbers(), highlightActiveLineGutter(), highlightSpecialChars(), history(),
    drawSelection(), dropCursor(), highlightActiveLine(), closeBrackets(), autocompletion(),
    keymap.of([...defaultKeymap, ...historyKeymap, ...completionKeymap, ...closeBracketsKeymap]),
    getLanguage(activeFile), codesyncTheme, syntaxHighlighting(codesyncSyntax),
    EditorView.updateListener.of((update) => {
      if (update.selectionSet) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        handleCursorUpdate(line.number, pos - line.from + 1);
      }
      if (update.docChanged) handleContentChange(update.state.doc.toString());
    }),
  ], [activeFile, handleCursorUpdate, handleContentChange]);

  useEffect(() => {
    if (!editorRef.current) return;
    const state = EditorState.create({
      doc: fileContent || `// ${activeFile}\n\n// Start coding here...`,
      extensions,
    });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    return () => viewRef.current?.destroy();
  }, [activeFile]);

  // Sync Content
  useEffect(() => {
    if (!viewRef.current || isUpdatingRef.current) return;
    const currentContent = viewRef.current.state.doc.toString();
    if (currentContent !== fileContent && fileContent) {
      isUpdatingRef.current = true;
      viewRef.current.dispatch({ changes: { from: 0, to: currentContent.length, insert: fileContent } });
      isUpdatingRef.current = false;
    }
  }, [fileContent]);

  // --- Run Handler ---
  const handleRun = () => {
    const lang = activeFile.endsWith(".py") ? "py" : activeFile.endsWith(".cpp") ? "cpp" : null;
    if (!lang) {
      alert("Only Python (.py) and C++ (.cpp) are currently supported.");
      return;
    }
    
    setShowTerminal(true);
    setActiveTab("output");
    runCode(lang, contentRef.current, stdInput, expectedOutput);
  };

  return (
    <div className="h-full flex flex-col bg-editor-bg">
      {/* Tab bar */}
      <div className="h-10 flex items-center justify-between px-2 border-b border-white/5 bg-black/20">
        <div className="flex items-center gap-1">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-t-lg bg-white/5 border-t border-x border-white/10">
            <span className="text-sm text-foreground">{activeFile.split("/").pop() || activeFile}</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {/* Status Badge in header if not running */}
          {result?.status && !isRunning && <StatusBadge status={result.status} />}
          
          <span className="text-xs text-muted-foreground hidden sm:block">
            Ln {cursorPos.line}, Col {cursorPos.col}
          </span>
          <Button
            variant="gradient"
            size="sm"
            onClick={handleRun}
            disabled={isRunning}
            className={`h-7 px-3 text-xs text-white border-0 ${isRunning ? 'bg-purple-900/50' : 'bg-purple-600 hover:bg-purple-700'}`}
          >
            <Play className={`w-3 h-3 mr-1 ${isRunning ? 'animate-pulse' : ''}`} />
            {isRunning ? 'Running...' : 'Run'}
          </Button>
        </div>
      </div>

      {/* Editor Area with Cursors */}
      <div className={`flex-1 relative overflow-hidden transition-all duration-300 ${showTerminal ? 'h-1/2' : 'h-full'}`}>
        <div ref={editorRef} className="h-full overflow-auto scrollbar-thin" />
        
        {/* Collaborative Cursors Overlay */}
        {cursors.map((cursor) => {
          const lineHeight = 22; const gutterWidth = 56; const charWidth = 8.4;
          const top = (cursor.line - 1) * lineHeight;
          const left = (cursor.col - 1) * charWidth + gutterWidth;
          return (
            <div key={cursor.userId} className="absolute pointer-events-none z-10" style={{ top: `${top}px`, left: `${left}px` }}>
              <div className="w-0.5 h-5" style={{ backgroundColor: cursor.color }} />
              <div className="absolute -top-5 left-0 px-2 py-0.5 rounded text-xs font-medium whitespace-nowrap text-white" style={{ backgroundColor: cursor.color }}>
                {cursor.displayName}
              </div>
            </div>
          );
        })}
      </div>

      {/* Terminal / Input Panel */}
      <AnimatePresence>
        {showTerminal && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "40%", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-white/10 bg-[#0F111A] flex flex-col overflow-hidden shadow-2xl"
          >
            {/* Terminal Tabs */}
            <div className="h-9 flex items-center justify-between px-3 border-b border-white/5 bg-black/40 flex-shrink-0">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                   <Terminal className="w-4 h-4 text-codesync-purple" />
                   <span className="text-xs font-semibold text-foreground mr-2">Terminal</span>
                </div>
                <button 
                  onClick={() => setActiveTab("input")} 
                  className={`text-xs px-2 py-1 rounded transition-colors ${activeTab === "input" ? "text-purple-400 bg-purple-400/10" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Input / Expected
                </button>
                <button 
                  onClick={() => setActiveTab("output")} 
                  className={`text-xs px-2 py-1 rounded flex items-center gap-2 transition-colors ${activeTab === "output" ? "text-green-400 bg-green-400/10" : "text-gray-500 hover:text-gray-300"}`}
                >
                  Output
                  {result?.status && <span className={`w-1.5 h-1.5 rounded-full ${result.status === 'AC' ? 'bg-green-400' : 'bg-red-400'}`} />}
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={() => setShowTerminal(true)} className="p-1 rounded hover:bg-white/10 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Terminal Content */}
            <div className="flex-1 overflow-hidden p-0 font-mono text-xs">
               {activeTab === "input" ? (
                 <div className="grid grid-cols-2 gap-4 h-full p-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-gray-500 font-medium">Standard Input (stdin)</label>
                        <textarea 
                           value={stdInput} onChange={(e) => setStdInput(e.target.value)}
                           className="flex-1 bg-black/20 border border-white/10 rounded p-3 text-gray-300 outline-none resize-none focus:border-purple-500/50"
                           placeholder="Enter program input here..." 
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-gray-500 font-medium">Expected Output (Optional)</label>
                        <textarea 
                           value={expectedOutput} onChange={(e) => setExpectedOutput(e.target.value)}
                           className="flex-1 bg-black/20 border border-white/10 rounded p-3 text-gray-300 outline-none resize-none focus:border-purple-500/50"
                           placeholder="Enter expected output for validation..." 
                        />
                    </div>
                 </div>
               ) : (
                 <div className="h-full p-4 overflow-y-auto space-y-4">
                    {isRunning && (
                       <div className="flex items-center gap-3 text-blue-400 animate-pulse p-3 bg-blue-500/5 rounded border border-blue-500/10">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span>Executing code on remote judge...</span>
                       </div>
                    )}
                    
                    {!isRunning && result && (
                       <>
                         <div className="flex justify-between items-center border-b border-white/5 pb-2">
                            <span className="text-gray-500">Verdict</span>
                            <StatusBadge status={result.status} />
                         </div>
                         <div className="space-y-1">
                            <div className="text-gray-500">Output</div>
                            <div className={`p-3 rounded border ${result.status === 'RE' ? 'bg-red-950/20 border-red-500/20 text-red-300' : 'bg-black/30 border-white/10 text-gray-300'}`}>
                               <pre className="whitespace-pre-wrap">{result.output || result.error || "(No output generated)"}</pre>
                            </div>
                         </div>
                       </>
                    )}
                    
                    {!isRunning && !result && <div className="text-gray-500 italic">Ready to run.</div>}
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default CodeEditorPanel;