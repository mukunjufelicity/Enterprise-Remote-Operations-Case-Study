import { useState, useEffect, useRef, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Github, FileCode, Terminal, BookOpen, TrendingUp, Bot, 
  ChevronRight, Download, Copy, Check, Search, Star, 
  GitFork, Eye, Clock, AlertCircle, ShieldCheck, Layers, 
  Users, ArrowRight, MessageSquare, Send, RefreshCw, Code2, Clipboard
} from "lucide-react";
import { CaseStudyFiles, FileName, ChatMessage } from "./types";

export default function App() {
  // State elements
  const [activeTab, setActiveTab] = useState<"code" | "dashboard" | "advisor">("code");
  const [activeFile, setActiveFile] = useState<FileName>("README.md");
  const [viewMode, setViewMode] = useState<"rendered" | "raw">("rendered");
  
  // Real storage container for loaded case study markdown files
  const [files, setFiles] = useState<CaseStudyFiles>({
    "README.md": `# Enterprise Remote Operations Optimization Case Study\nLoading data...`,
    "PROBLEM_STATEMENT.md": `# Problem Statement\nLoading data...`,
    "APPROACH.md": `# Strategic Approach\nLoading data...`,
    "EXECUTION.md": `# Tactical Execution\nLoading data...`,
    "RESULTS.md": `# Measured Outcomes\nLoading data...`,
    "LESSONS_LEARNED.md": `# Lessons Learned\nLoading data...`
  });
  
  const [isLoadingFiles, setIsLoadingFiles] = useState(true);
  const [isCopied, setIsCopied] = useState(false);
  const [isCloned, setIsCloned] = useState(false);
  const [showCloneDropdown, setShowCloneDropdown] = useState(false);
  const [clipboardFeedback, setClipboardFeedback] = useState<string | null>(null);

  // Chat states
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      role: "assistant",
      content: "Hello! I am the **Project and Operations Manager** behind this initiative. I helped design the Relay-Run protocol and consolidated our remote tracking tooling across NA, EMEA, and APAC.\n\nAsk me any questions about our workflow audits, calculated $1.2M financial savings, or how we resolved 24-hour delivery friction!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [userInput, setUserInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Suggested prompt templates for easy interaction
  const suggestedQuestions = [
    { text: "How did you save $1.2M annually?", category: "ROI" },
    { text: "What is the 'Relay-Run' schedule?", category: "Process" },
    { text: "Tell me about the 3-C Framework.", category: "Lessons" },
    { text: "What did the baseline process audit reveal?", category: "Discovery" }
  ];

  // Fetch the files directly from our real server API
  useEffect(() => {
    async function loadFiles() {
      try {
        const response = await fetch("/api/case-study/files");
        if (response.ok) {
          const data = await response.json();
          setFiles(data);
        } else {
          console.error("HTTP error loading files:", response.status);
        }
      } catch (err) {
        console.error("Failed to load operations files from backend:", err);
      } finally {
        setIsLoadingFiles(false);
      }
    }
    loadFiles();
  }, []);

  // Sync scroll to chat bottom
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isSending]);

  // Handle file downloading triggers
  const downloadFile = (fileName: FileName) => {
    const fileContent = files[fileName];
    const element = document.createElement("a");
    const blob = new Blob([fileContent], { type: "text/plain" });
    element.href = URL.createObjectURL(blob);
    element.download = fileName;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    triggerClipboardFeedback(`Downloaded ${fileName}`);
  };

  // Clipboard copies
  const handleCopyCode = (text: string, label: string = "Copied code") => {
    navigator.clipboard.writeText(text);
    triggerClipboardFeedback(label);
  };

  const triggerClipboardFeedback = (lbl: string) => {
    setClipboardFeedback(lbl);
    setTimeout(() => {
      setClipboardFeedback(null);
    }, 2500);
  };

  // Safe Advisor Chatbot Submission
  const handleSendMessage = async (customText?: string) => {
    const messageText = customText || userInput;
    if (!messageText.trim() || isSending) return;

    if (!customText) {
      setUserInput("");
    }

    const newUserMessage: ChatMessage = {
      id: "usr-" + Date.now(),
      role: "user",
      content: messageText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages((prev) => [...prev, newUserMessage]);
    setIsSending(true);

    try {
      const response = await fetch("/api/advisor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...chatMessages, newUserMessage].map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      if (response.ok) {
        const data = await response.json();
        const newAssistantMessage: ChatMessage = {
          id: "ast-" + Date.now(),
          role: "assistant",
          content: data.content,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        setChatMessages((prev) => [...prev, newAssistantMessage]);
      } else {
        throw new Error("API responded with an failure state.");
      }
    } catch (err) {
      console.error("Chat failure:", err);
      // Fallback message in case of server timeouts
      const errorMessage: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content: `I apologize, but I am experiencing an asynchronous network lag standard deviation. Under our operational rulebook, I suggest review of [RESULTS.md](https://example.com) or retrying your request so that I can provide proper consultation.`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsSending(false);
    }
  };

  // Markdown Custom Parser and Display generator
  const renderMarkdown = (markdownStr: string) => {
    const lines = markdownStr.split("\n");
    let inCodeBlock = false;
    let codeBlockContent: string[] = [];
    const elements: ReactNode[] = [];

    let listItems: string[] = [];
    let isInsideList = false;

    let inTable = false;
    let tableHeaders: string[] = [];
    let tableRows: string[][] = [];

    const flushList = (keyPrefix: string | number) => {
      if (listItems.length > 0) {
        elements.push(
          <ul id={`ul-${keyPrefix}`} key={`ul-${keyPrefix}`} className="list-disc pl-6 mb-4 space-y-1.5 text-slate-700">
            {listItems.map((item, idx) => (
              <li key={`li-${idx}`} className="text-sm md:text-base leading-relaxed">
                {parseInlineFormatting(item)}
              </li>
            ))}
          </ul>
        );
        listItems = [];
        isInsideList = false;
      }
    };

    const flushTable = (keyPrefix: string | number) => {
      if (inTable && tableHeaders.length > 0) {
        elements.push(
          <div key={`table-wrapper-${keyPrefix}`} className="overflow-x-auto my-6 border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-800 font-medium">
                <tr>
                  {tableHeaders.map((hdr, hIdx) => (
                    <th key={`th-${hIdx}`} className="px-4 py-3 border-b border-slate-200 text-xs uppercase tracking-wider">
                      {hdr.trim()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {tableRows.map((row, rIdx) => (
                  <tr key={`tr-${rIdx}`} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={`cell-${cIdx}`} className="px-4 py-2.5 whitespace-nowrap text-sm text-slate-600">
                        {parseInlineFormatting(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableHeaders = [];
        tableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Handle Code Blocks
      if (line.trim().startsWith("```")) {
        if (inCodeBlock) {
          // Close block
          const blockText = codeBlockContent.join("\n");
          elements.push(
            <div key={`code-${i}`} className="bg-slate-900 text-slate-200 rounded-lg p-4 my-4 font-mono text-xs overflow-auto relative group">
              <button 
                onClick={() => handleCopyCode(blockText, "Copied block")}
                className="absolute top-2.5 right-2.5 bg-slate-800 hover:bg-slate-700 rounded-md p-1.5 transition-colors text-slate-400 hover:text-white"
                title="Copy raw"
              >
                <Copy className="h-3.5 w-3.5" />
              </button>
              <pre className="whitespace-pre">{blockText}</pre>
            </div>
          );
          codeBlockContent = [];
          inCodeBlock = false;
        } else {
          // Flush any pending list or tables first
          flushList(i);
          flushTable(i);
          inCodeBlock = true;
        }
        continue;
      }

      if (inCodeBlock) {
        codeBlockContent.push(line);
        continue;
      }

      // Handle Tables
      if (line.trim().startsWith("|") && !inCodeBlock) {
        flushList(i);
        const parts = line.split("|").filter((_, idx, arr) => idx > 0 && idx < arr.length - 1);
        
        if (line.includes("---")) {
          // Table separator row, ignore
          continue;
        }

        if (!inTable) {
          inTable = true;
          tableHeaders = parts;
        } else {
          tableRows.push(parts);
        }
        continue;
      } else {
        if (inTable) {
          flushTable(i);
        }
      }

      // Handle Bullet Lists
      if ((line.trim().startsWith("* ") || line.trim().startsWith("- ")) && !inCodeBlock) {
        isInsideList = true;
        const textSlice = line.trim().slice(2);
        listItems.push(textSlice);
        continue;
      } else {
        if (isInsideList) {
          flushList(i);
        }
      }

      // Handle Headings
      if (line.trim().startsWith("#") && !inCodeBlock) {
        const level = line.match(/^#+/)?.[0].length || 1;
        const text = line.replace(/^#+\s*/, "");
        
        switch (level) {
          case 1:
            elements.push(
              <h1 id={`h1-${i}`} key={i} className="text-2xl md:text-3.5xl font-sans font-bold text-slate-900 border-b border-slate-200 pb-2.5 mb-5 mt-4 tracking-tight">
                {parseInlineFormatting(text)}
              </h1>
            );
            break;
          case 2:
            elements.push(
              <h2 id={`h2-${i}`} key={i} className="text-xl md:text-1.5xl font-sans font-semibold text-slate-800 border-b border-slate-100 pb-1.5 mb-4 mt-6 tracking-tight">
                {parseInlineFormatting(text)}
              </h2>
            );
            break;
          case 3:
            elements.push(
              <h3 id={`h3-${i}`} key={i} className="text-lg font-sans font-medium text-slate-800 mb-2 mt-5">
                {parseInlineFormatting(text)}
              </h3>
            );
            break;
          default:
            elements.push(
              <h4 id={`h4-${i}`} key={i} className="text-base font-sans font-semibold text-slate-700 mb-2 mt-4">
                {parseInlineFormatting(text)}
              </h4>
            );
            break;
        }
        continue;
      }

      // Blockquotes and special alerts
      if (line.trim().startsWith(">") && !inCodeBlock) {
        const text = line.replace(/^>\s*/, "");
        elements.push(
          <blockquote id={`quote-${i}`} key={i} className="border-l-4 border-amber-500 bg-amber-50/50 text-amber-900 px-4 py-3 rounded-r-lg my-4 text-sm md:text-base italic leading-relaxed">
            {parseInlineFormatting(text)}
          </blockquote>
        );
        continue;
      }

      // Horizontal rules
      if (line.trim() === "---" && !inCodeBlock) {
        elements.push(<hr id={`hr-${i}`} key={i} className="border-slate-200 my-6" />);
        continue;
      }

      // Standard Paragraph
      if (line.trim()) {
        elements.push(
          <p id={`p-${i}`} key={i} className="text-sm md:text-base leading-relaxed text-slate-600 mb-3.5">
            {parseInlineFormatting(line)}
          </p>
        );
      }
    }

    // Flush any leftover list or tables
    flushList("final");
    flushTable("final");

    return elements;
  };

  // Inline styling parser helper (bold, links, status badge boxes)
  const parseInlineFormatting = (text: string) => {
    // Basic formatting parser using regex parts
    const boldRegex = /\*\*(.*?)\*\*/g;
    const bulletSubRegex = /\[(.*?)\]\((.*?)\)/g;

    let parts: ReactNode[] = [];
    let lastIndex = 0;

    // Fast regex parser
    const formattedText = text.replace(boldRegex, "<strong>$1</strong>");
    
    // Parse deep-links and highlights manually or return standard spans
    if (!text.includes("**") && !text.includes("[")) {
      return text;
    }

    // Since react can output custom nodes, we split and build them
    const segments = text.split(/(\*\*.*?\*\*|\[.*?\]\(.*?\))/g);
    
    return segments.map((seg, idx) => {
      if (seg.startsWith("**") && seg.endsWith("**")) {
        const rawContent = seg.slice(2, -2);
        return <strong key={idx} className="font-semibold text-slate-900">{rawContent}</strong>;
      }
      
      if (seg.startsWith("[") && seg.includes("](")) {
        const linkText = seg.match(/\[(.*?)\]/)?.[1] || "File";
        const linkUrl = seg.match(/\((.*?)\)/)?.[1] || "#";
        
        // Internal navigation mapper inside our repo viewer
        if (linkUrl.startsWith("./") || linkUrl.includes(".md")) {
          const targetFile = linkUrl.replace("./", "") as FileName;
          return (
            <button
              key={idx}
              onClick={() => {
                if (Object.keys(files).includes(targetFile)) {
                  setActiveFile(targetFile);
                  setActiveTab("code");
                }
              }}
              className="text-blue-600 hover:underline cursor-pointer font-medium inline-flex items-center gap-0.5"
            >
              {linkText}
            </button>
          );
        }
        
        return (
          <a key={idx} href={linkUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 underline">
            {linkText}
          </a>
        );
      }

      return seg;
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans flex flex-col text-slate-800 antialiased selection:bg-blue-100">
      
      {/* Toast Clipboard Feedback */}
      <AnimatePresence>
        {clipboardFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-4 py-2 rounded-lg shadow-lg text-sm font-semibold flex items-center gap-2"
          >
            <Check className="h-4 w-4 text-emerald-400" />
            <span>{clipboardFeedback}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* GitHub Top Navigation Bar */}
      <header className="bg-slate-900 text-slate-200 border-b border-slate-800 shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Github className="h-6 w-6 text-white" />
            <span className="font-semibold text-white tracking-tight text-sm md:text-base">GitHub Enterprise Portfolio</span>
            <span className="px-2 py-0.5 bg-slate-800 text-slate-400 rounded text-xs border border-slate-700 font-mono hidden sm:inline">private</span>
          </div>

          <div className="flex items-center gap-4 text-xs md:text-sm">
            <div className="bg-slate-800 px-3 py-1.5 rounded-md border border-slate-700 text-slate-400 hidden md:flex items-center gap-2 w-64">
              <span className="text-slate-500">Search portfolio...</span>
              <kbd className="text-[10px] bg-slate-700 px-1 py-0.2 rounded border border-slate-600 ml-auto font-mono">/</kbd>
            </div>
            <a 
              href="mailto:wanjirumuhiu@gmail.com" 
              className="hover:text-white transition-colors cursor-pointer text-slate-300 border-l border-slate-700 pl-4 h-5 flex items-center"
            >
              Support Contact
            </a>
          </div>
        </div>
      </header>

      {/* Repository Main Info Header */}
      <section className="bg-white border-b border-slate-200 py-6 shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            
            {/* Repo Path Title */}
            <div className="flex flex-wrap items-center gap-2">
              <Github className="h-5 w-5 text-slate-500" />
              <span className="text-blue-600 hover:underline font-normal text-sm md:text-lg cursor-pointer">anonymous-org</span>
              <span className="text-slate-400 font-normal">/</span>
              <span className="font-semibold text-slate-900 text-sm md:text-lg hover:text-blue-700 transition-colors cursor-pointer">remote-ops-optimization-case-study</span>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-xs font-medium border border-slate-200">Public</span>
            </div>

            {/* Repo Stats Pins */}
            <div className="flex items-center gap-2 text-xs md:text-sm">
              <button 
                onClick={() => triggerClipboardFeedback("Starred repository!")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all text-slate-600 font-medium font-sans"
              >
                <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
                <span>Star</span>
                <span className="bg-slate-200/60 px-1.5 py-0.2 rounded text-[11px] text-slate-700 font-mono ml-0.5">142</span>
              </button>

              <button 
                onClick={() => triggerClipboardFeedback("Forked repository!")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-md transition-all text-slate-600 font-medium font-sans"
              >
                <GitFork className="h-3.5 w-3.5 text-slate-500" />
                <span>Fork</span>
                <span className="bg-slate-200/60 px-1.5 py-0.2 rounded text-[11px] text-slate-700 font-mono ml-0.5">24</span>
              </button>
            </div>
          </div>

          {/* Core Navigation Tabs */}
          <div className="flex items-center border-b border-slate-200 mt-6 gap-6 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setActiveTab("code")}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition-all relative border-b-2 cursor-pointer ${
                activeTab === "code" 
                  ? "border-amber-500 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <FileCode className="h-4 w-4" />
              <span>📁 Code Files</span>
            </button>

            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition-all relative border-b-2 cursor-pointer ${
                activeTab === "dashboard" 
                  ? "border-amber-500 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>📊 Exec ROI Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("advisor")}
              className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition-all relative border-b-2 cursor-pointer ${
                activeTab === "advisor" 
                  ? "border-amber-500 text-slate-900" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Bot className="h-4 w-4 text-indigo-500" />
              <span>🤖 Operations AI Advisor</span>
              <span className="px-1.5 py-0.2 bg-indigo-50 text-indigo-600 rounded text-[10px] font-bold border border-indigo-100 uppercase tracking-wide">Gemini</span>
            </button>
          </div>
        </div>
      </section>

      {/* Main Container Work Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-6 overflow-hidden flex flex-col">
        
        {/* TAB 1: CODE REPOSITORY FILES VIEW */}
        {activeTab === "code" && (
          <div className="flex-1 flex flex-col lg:flex-row gap-6 overflow-hidden min-h-0">
            
            {/* Left Sidebar Explorer */}
            <div className="lg:w-72 shrink-0 bg-white border border-slate-200 rounded-xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                <span className="font-bold text-slate-800 text-sm tracking-tight uppercase">Repository Files</span>
                <span className="text-[11px] text-slate-400 font-mono">6 files</span>
              </div>
              
              {/* Directory files buttons list */}
              <nav className="space-y-1 flex-1 overflow-y-auto pr-1">
                {(Object.keys(files) as FileName[]).map((fName) => (
                  <button
                    key={fName}
                    onClick={() => {
                      setActiveFile(fName);
                      // Scroll markdown render area to top
                      const docArea = document.getElementById("document-scroll-element");
                      if (docArea) docArea.scrollTop = 0;
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-all flex items-center justify-between group cursor-pointer ${
                      activeFile === fName
                        ? "bg-slate-100 text-slate-900 font-semibold"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <FileCode className={`h-4 w-4 shrink-0 ${
                        activeFile === fName ? "text-amber-500" : "text-slate-400 group-hover:text-slate-600"
                      }`} />
                      <span className="truncate text-xs md:text-sm tracking-tight">{fName}</span>
                    </div>
                    <ChevronRight className={`h-3.5 w-3.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 ${
                      activeFile === fName ? "opacity-100" : ""
                    }`} />
                  </button>
                ))}
              </nav>

              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-550 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-slate-400 shrink-0" />
                  <span>Use checkout ZIP below to import these files into local environments.</span>
                </div>
              </div>
            </div>

            {/* Right File Document Details */}
            <div className="flex-1 bg-white border border-slate-200 rounded-xl flex flex-col overflow-hidden">
              
              {/* Document Actions Bar */}
              <div className="bg-slate-50/75 border-b border-slate-200 px-4 py-3 flex items-center justify-between flex-wrap gap-2.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs text-slate-500 px-2 py-1 bg-slate-200/60 rounded border border-slate-300">UTF-8</span>
                  <span className="font-mono text-xs text-slate-500 font-normal">
                    {Math.round((files[activeFile]?.length || 0) / 102.4) / 10} KB file size
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {/* View Type selector */}
                  <div className="flex items-center bg-slate-200/80 rounded-md p-0.5 border border-slate-300 h-8">
                    <button
                      onClick={() => setViewMode("rendered")}
                      className={`px-3.5 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                        viewMode === "rendered" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      Rendered
                    </button>
                    <button
                      onClick={() => setViewMode("raw")}
                      className={`px-3.5 py-1 text-xs font-semibold rounded cursor-pointer transition-all ${
                        viewMode === "raw" ? "bg-white text-slate-950 shadow-sm" : "text-slate-600 hover:text-slate-800"
                      }`}
                    >
                      Raw Code
                    </button>
                  </div>

                  {/* Copy content button */}
                  <button
                    onClick={() => handleCopyCode(files[activeFile], `Copied contents of ${activeFile}`)}
                    className="h-8 w-8 hover:bg-slate-200 border border-slate-300 text-slate-600 hover:text-slate-900 rounded-md transition-colors flex items-center justify-center cursor-pointer"
                    title="Copy to clipboard"
                  >
                    <Clipboard className="h-4 w-4" />
                  </button>

                  {/* Physical download button */}
                  <button
                    onClick={() => downloadFile(activeFile)}
                    className="h-8 px-3 hover:bg-slate-250 border border-slate-300 text-slate-600 bg-white hover:text-slate-900 rounded-md transition-colors text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                    title="Download individual markdown file"
                  >
                    <Download className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Download</span>
                  </button>
                </div>
              </div>

              {/* Main Reading Screen Scroll Box */}
              <div 
                id="document-scroll-element"
                className="flex-1 overflow-y-auto p-6 md:p-8 markdown-body min-h-0"
              >
                {isLoadingFiles ? (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2.5">
                    <RefreshCw className="h-8 w-8 animate-spin text-slate-300" />
                    <p className="text-sm font-semibold">Reading markdown files from operational servers...</p>
                  </div>
                ) : viewMode === "rendered" ? (
                  // Customized HTML parsing from files
                  <div className="max-w-3.5xl mx-auto">
                    {renderMarkdown(files[activeFile])}
                  </div>
                ) : (
                  // Raw text mode
                  <div className="max-w-3.5xl mx-auto font-mono text-xs text-slate-700 whitespace-pre bg-slate-50 p-4 rounded-lg border border-slate-200 overflow-x-auto leading-relaxed">
                    {files[activeFile]}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: EXECUTIVE SUMMARY & HISTORIC ROI ANALYTICS DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="flex-1 overflow-y-auto space-y-6 min-h-0 pr-1 select-none">
            
            {/* Top overview metrics summary grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-white border border-slate-250 rounded-xl p-4 flex items-center gap-4">
                <div className="h-11 w-11 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                  <Clock className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-sans font-semibold tracking-wider text-slate-400 uppercase">Average Cycle-Time</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 text-xl tracking-tight">13.4 Days</span>
                    <span className="text-xs text-emerald-600 font-semibold font-sans">-40%</span>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-0.5">Cut from 22.4 legacy baseline</div>
                </div>
              </div>

              <div className="bg-white border border-slate-250 rounded-xl p-4 flex items-center gap-4">
                <div className="h-11 w-11 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center shrink-0">
                  <TrendingUp className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-sans font-semibold tracking-wider text-slate-400 uppercase">Annualized Savings</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 text-xl tracking-tight">$1.20M</span>
                    <span className="text-xs text-emerald-600 font-semibold font-sans">ROI</span>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-0.5">Verified clawback on redundant labor</div>
                </div>
              </div>

              <div className="bg-white border border-slate-250 rounded-xl p-4 flex items-center gap-4">
                <div className="h-11 w-11 bg-pink-50 text-pink-600 rounded-lg flex items-center justify-center shrink-0">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-sans font-semibold tracking-wider text-slate-400 uppercase">On-Time Milestones</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 text-xl tracking-tight">94.2%</span>
                    <span className="text-xs text-emerald-600 font-semibold font-sans">+26%</span>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-0.5">Up from an unstable 68.0%</div>
                </div>
              </div>

              <div className="bg-white border border-slate-250 rounded-xl p-4 flex items-center gap-4">
                <div className="h-11 w-11 bg-indigo-50 text-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-[11px] font-sans font-semibold tracking-wider text-slate-400 uppercase">Division E-NPS</div>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="font-bold text-slate-900 text-xl tracking-tight">+28</span>
                    <span className="text-xs text-emerald-600 font-semibold font-sans">+42pt</span>
                  </div>
                  <div className="text-[10px] text-slate-450 mt-0.5">Eradicated irregular midnight routines</div>
                </div>
              </div>

            </div>

            {/* Visual analytics plots columns */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* Graphic Chart: Cycle Time Reduction Over time */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="h-4 w-4 text-blue-600 font-semibold" />
                    <span className="font-semibold text-slate-900 text-sm tracking-tight uppercase">Lead Time Optimizations (Days)</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 font-sans">
                    End-to-end launch cycle time decreased systematically month-over-month.
                  </p>
                </div>

                <div className="h-44 flex items-end justify-between px-3 pt-6 border-b border-l border-slate-250 pb-2 relative font-mono text-xs">
                  {/* Grid background reference lines */}
                  <div className="absolute top-[25%] left-0 right-0 border-t border-slate-100/70 select-none pointer-events-none" />
                  <div className="absolute top-[50%] left-0 right-0 border-t border-slate-100/70 select-none pointer-events-none" />
                  <div className="absolute top-[75%] left-0 right-0 border-t border-slate-100/70 select-none pointer-events-none" />

                  {/* Bars */}
                  <div className="flex flex-col items-center gap-2 group cursor-pointer z-10 w-11">
                    <span className="text-slate-500 font-semibold select-all">22.4d</span>
                    <div className="w-full bg-slate-300 rounded-t h-[120px] shadow-sm group-hover:bg-slate-400 transition-colors" />
                    <span className="text-[10px] text-slate-400 mt-1 select-all">M0</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 group cursor-pointer z-10 w-11">
                    <span className="text-slate-500 font-semibold select-all">20.1d</span>
                    <div className="w-full bg-slate-250 rounded-t h-[106px] shadow-sm group-hover:bg-slate-350 transition-colors" />
                    <span className="text-[10px] text-slate-400 mt-1 select-all">M1</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 group cursor-pointer z-10 w-11">
                    <span className="text-slate-500 font-semibold select-all">17.5d</span>
                    <div className="w-full bg-blue-200 rounded-t h-[92px] shadow-sm group-hover:bg-blue-300 transition-colors" />
                    <span className="text-[10px] text-slate-400 mt-1 select-all">M3</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 group cursor-pointer z-10 w-11">
                    <span className="text-slate-500 font-semibold select-all">14.2d</span>
                    <div className="w-full bg-blue-300 rounded-t h-[76px] shadow-sm group-hover:bg-blue-400 transition-colors" />
                    <span className="text-[10px] text-slate-400 mt-1 select-all">M6</span>
                  </div>

                  <div className="flex flex-col items-center gap-2 group cursor-pointer z-10 w-11">
                    <span className="text-blue-600 font-bold select-all">13.4d</span>
                    <div className="w-full bg-blue-500 rounded-t h-[70px] shadow-sm group-hover:bg-blue-600 transition-colors" />
                    <span className="text-[10px] text-blue-500 font-semibold mt-1 select-all">M9</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 flex items-center justify-between text-xs text-slate-500">
                  <span className="flex items-center gap-1.5 font-sans">
                    <span className="h-2.5 w-2.5 rounded bg-blue-500 inline-block" />
                    Latest Target (14d limit)
                  </span>
                  <span className="text-emerald-600 font-semibold font-sans">40% Cycle Decrease</span>
                </div>
              </div>

              {/* Graphic allocation grid: Financial clawbacks breakdown */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <TrendingUp className="h-4 w-4 text-emerald-600 font-semibold" />
                    <span className="font-semibold text-slate-900 text-sm tracking-tight uppercase">Annualized Cost Clawback ($1.2M Total)</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 font-sans">
                    Detailed distribution model regarding waste savings and process restructuring metrics.
                  </p>
                </div>

                <div className="space-y-3.5 flex-1 flex flex-col justify-center">
                  
                  {/* Category 1 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1 font-sans">
                      <span className="font-semibold text-slate-700">Idle Supplier Capacity Standard</span>
                      <span className="font-mono text-slate-800 font-bold">$620K saved (74% Redux)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-500 h-2 rounded-full" style={{ width: "74%" }} />
                    </div>
                  </div>

                  {/* Category 2 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1 font-sans">
                      <span className="font-semibold text-slate-700">Air-Freight Cargo Reduction</span>
                      <span className="font-mono text-slate-800 font-bold">$300K saved (58% Redux)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-emerald-400 h-2 rounded-full" style={{ width: "58%" }} />
                    </div>
                  </div>

                  {/* Category 3 */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1 font-sans">
                      <span className="font-semibold text-slate-700">Administrative Program Overhead</span>
                      <span className="font-mono text-slate-800 font-bold">$280K saved (65% Redux)</span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2">
                      <div className="bg-teal-500 h-2 rounded-full" style={{ width: "65%" }} />
                    </div>
                  </div>

                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5 font-sans">
                  <span>Calculations validated by Logistics Finance Operations.</span>
                </div>
              </div>

              {/* Graphic Gauge: Target Milestones Compliance */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <ShieldCheck className="h-4 w-4 text-purple-600 font-semibold" />
                    <span className="font-semibold text-slate-900 text-sm tracking-tight uppercase">Milestone Predictability Gauge</span>
                  </div>
                  <p className="text-xs text-slate-500 mb-4 font-sans">
                    On-Time Launch milestone compliance moved into enterprise safety guidelines.
                  </p>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center py-2 relative">
                  
                  {/* Gauge Arc SVG Drawing */}
                  <svg className="h-28 w-48 shrink-0" viewBox="0 0 100 50">
                    {/* Background Arc */}
                    <path 
                      d="M 10,45 A 35,35 0 0,1 90,45" 
                      fill="none" 
                      stroke="#f1f5f9" 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                    />
                    {/* Old Baseline gauge (68%) */}
                    <path 
                      d="M 10,45 A 35,35 0 0,1 64.4,20" 
                      fill="none" 
                      stroke="#cbd5e1" 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                      className="opacity-60"
                    />
                    {/* Active Goal gauge (94.2%) */}
                    <path 
                      d="M 10,45 A 35,35 0 0,1 85.5,30" 
                      fill="none" 
                      stroke="#8b5cf6" 
                      strokeWidth="8" 
                      strokeLinecap="round" 
                    />
                  </svg>

                  <div className="text-center mt-2">
                    <div className="font-mono text-xl md:text-2xl font-bold text-slate-900 select-all">94.2%</div>
                    <div className="text-[10px] text-slate-450 uppercase font-semibold font-sans tracking-wide">Milestone on-time rate</div>
                  </div>

                  <div className="absolute top-[35%] left-[10%] text-[10px] text-slate-400 font-semibold font-sans">68% Baseline</div>
                  <div className="absolute top-[35%] right-[10%] text-[10px] text-purple-600 font-bold font-sans">94.2% Current</div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between font-sans">
                  <span>Operational alignment</span>
                  <span className="text-purple-600 font-bold bg-purple-50 px-2 py-0.5 rounded border border-purple-100 uppercase text-[10px]">Zone Safe</span>
                </div>
              </div>

            </div>

            {/* Core Implementation highlights box */}
            <div className="bg-slate-900 text-slate-200 border border-slate-800 rounded-xl p-6 relative overflow-hidden">
              {/* Highlight background light shapes */}
              <div className="absolute top-0 right-0 h-48 w-48 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 h-48 w-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

              <h3 className="text-lg md:text-xl font-bold text-white mb-3 flex items-center gap-2 relative">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
                <span>Strategic Implementation Retrospective & Executive Summary</span>
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm relative mt-4">
                
                <div className="space-y-1.5">
                  <div className="font-semibold text-white text-xs uppercase tracking-wide text-slate-400">01 / Process Consolidation</div>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans">
                    By retiring independent tracking silos (isolated local excel files, unlinked Trello lists) and aligning EMEA, APAC, and NA under a single, integrated Jira & Smartsheet Cloud Core, the team established a single source of truth that dissolved information gaps.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-white text-xs uppercase tracking-wide text-slate-400">02 / Asynchronous Relay Structure</div>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans">
                    The structured 3-point daily handoff protocol successfully established follow-the-sun continuous delivery cycles free from nighttime exhaustion. Standard operating overlapping intervals were kept for blocker-clearing and QA reviews.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="font-semibold text-white text-xs uppercase tracking-wide text-slate-400">03 / SLA-Enforced Accountability</div>
                  <p className="text-xs text-slate-350 leading-relaxed font-sans">
                    Strict RACI ownership thresholds coupled with immediate 4-hour timezone overlap blocker response margins replaced passive ticket handling, leading to milestone execution alignment escalating from 68% up to 94.2%.
                  </p>
                </div>

              </div>
            </div>

          </div>
        )}

        {/* TAB 3: WORKSPACE AI ADVISOR OPERATIONS CHATBOT */}
        {activeTab === "advisor" && (
          <div className="flex-1 bg-white border border-slate-205 rounded-xl flex flex-col overflow-hidden min-h-0">
            
            {/* Advisor Chat Panel Welcome Strip */}
            <div className="bg-slate-50 border-b border-slate-205 px-4 py-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="h-8.5 w-8.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-150 flex items-center justify-center font-bold">
                    <Bot className="h-5 w-5" />
                  </div>
                  <span className="absolute bottom-0 right-0 h-2.5 w-2.5 bg-emerald-500 rounded-full border-2 border-white" />
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-900 tracking-tight leading-none">Operations Manager Copilot</div>
                  <span className="text-[10px] text-slate-500 font-sans tracking-wide">Global Remote Operations Optimization Consult</span>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5">
                <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-120 font-mono font-bold uppercase">
                  Contextual API (On Disk)
                </span>
              </div>
            </div>

            {/* Chat conversation area scroll container */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 bg-slate-50/50">
              {chatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className="max-w-[85%] sm:max-w-[75%] flex flex-col gap-1">
                    
                    {/* User identifier strip */}
                    <div className={`flex items-center gap-1.5 text-[10px] text-slate-450 font-sans ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                      {msg.role === "user" ? (
                        <>
                          <span className="font-semibold text-slate-600">You (Executive Reviewer)</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      ) : (
                        <>
                          <span className="font-semibold text-indigo-600">Operations Project Manager (Author)</span>
                          <span>•</span>
                          <span>{msg.timestamp}</span>
                        </>
                      )}
                    </div>

                    {/* Chat Bubble card container */}
                    <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed shadow-sm ${
                      msg.role === "user"
                        ? "bg-slate-900 text-white rounded-tr-none"
                        : "bg-white border border-slate-200 text-slate-800 rounded-tl-none markdown-body"
                    }`}>
                      {msg.role === "user" ? (
                        <p>{msg.content}</p>
                      ) : (
                        // Assistant renders with simple Markdown parsing layout rules
                        <div>
                          {renderMarkdown(msg.content)}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ))}

              {isSending && (
                <div className="flex justify-start">
                  <div className="flex flex-col gap-1 max-w-[75%]">
                    <span className="text-[10px] text-slate-400 font-sans">AI Operations Advisor is analyzing...</span>
                    <div className="bg-white border border-slate-200 rounded-lg rounded-tl-none px-4 py-3 flex items-center gap-2.5">
                      <div className="flex gap-1.5">
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                        <span className="h-2 w-2 bg-slate-400 rounded-full animate-bounce" />
                      </div>
                      <span className="text-xs text-slate-450 font-sans">Validating case audit parameters...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Suggested prompts block */}
            <div className="bg-slate-50 border-t border-slate-150 p-3 shrink-0">
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <span className="text-xs text-slate-500 font-semibold font-sans whitespace-nowrap hidden sm:inline">Quick Inquiry Topics:</span>
                {suggestedQuestions.map((q, idx) => (
                  <button
                    key={idx}
                    disabled={isSending}
                    onClick={() => handleSendMessage(q.text)}
                    className="text-xs font-semibold whitespace-nowrap bg-white hover:bg-slate-100/80 text-slate-650 hover:text-slate-900 border border-slate-200 px-3 py-1.5 rounded-full shadow-sm transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
                  >
                    <span className="text-[10px] text-slate-400 mr-1 select-none">[{q.category}]</span>
                    {q.text}
                  </button>
                ))}
              </div>
            </div>

            {/* Send Interface Controls */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="bg-white border-t border-slate-205 p-3 flex gap-2.5 items-center shrink-0"
            >
              <input
                type="text"
                disabled={isSending}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                placeholder="Ask me detail questions regarding the ROI calculations or Relay-Run structures..."
                className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white text-sm px-4 py-2.5 rounded-xl border border-slate-200 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-800 outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!userInput.trim() || isSending}
                className="h-10 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 focus:outline-none select-none disabled:shadow-none cursor-pointer"
              >
                <span className="text-xs font-semibold hidden sm:inline">Ask Advisor</span>
                <Send className="h-4 w-4" />
              </button>
            </form>

          </div>
        )}

      </main>

      {/* GitHub Repository Clone & checkout metadata drawer */}
      <footer className="bg-white border-t border-slate-200 py-3 block shrink-0">
        <div className="max-w-7xl mx-auto px-4 md:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs md:text-sm text-slate-500 font-sans">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-800">Operational Repository Model</span>
            <span>•</span>
            <span>Created by Global Operations Lead</span>
          </div>

          <div className="flex items-center gap-3 relative">
            <span className="hidden md:inline font-mono text-[11px] text-slate-400">Checkout repository checkout details:</span>
            
            {/* Clone commands panel dropdown container */}
            <div className="relative">
              <button
                onClick={() => setShowCloneDropdown(!showCloneDropdown)}
                className="px-3 py-1.5 hover:bg-slate-100 border border-slate-200 rounded-md transition-colors text-xs font-semibold text-slate-650 flex items-center gap-1 cursor-pointer"
              >
                <Code2 className="h-3.5 w-3.5" />
                <span>Clone Repo...</span>
              </button>
              
              <AnimatePresence>
                {showCloneDropdown && (
                  <>
                    {/* Overlay */}
                    <div className="fixed inset-0 z-40" onClick={() => setShowCloneDropdown(false)} />
                    
                    {/* Floating block */}
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-10 right-0 z-50 bg-white border border-slate-250 w-72 sm:w-80 rounded-xl shadow-xl p-4 text-slate-800 flex flex-col"
                    >
                      <span className="font-bold text-xs tracking-tight uppercase mb-2 text-slate-500">Clone via HTTPS</span>
                      <div className="bg-slate-50 p-2 border border-slate-200 rounded-lg text-xs font-mono select-all flex items-center justify-between mb-3 leading-none text-slate-700">
                        <span className="truncate">git clone https://github.com/remote-ops-optimization.git</span>
                        <button 
                          onClick={() => {
                            handleCopyCode("git clone https://github.com/remote-ops-optimization.git", "Copied clone command");
                            setShowCloneDropdown(false);
                          }}
                          className="p-1 hover:bg-slate-200 rounded ml-1 text-slate-500 hover:text-slate-850 cursor-pointer shrink-0"
                          title="Copy command"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      </div>

                      <span className="font-bold text-xs tracking-tight uppercase mb-2 text-slate-500">Download Entire Pack</span>
                      <button
                        onClick={() => {
                          // Standard multi file download fallback action
                          (Object.keys(files) as FileName[]).forEach((f, idx) => {
                            setTimeout(() => downloadFile(f), idx * 250);
                          });
                          setShowCloneDropdown(false);
                        }}
                        className="w-full h-8.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>Download 6 Markdown Files (ZIP Target)</span>
                      </button>
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
