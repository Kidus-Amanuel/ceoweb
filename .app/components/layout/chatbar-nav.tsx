"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  ChevronRight,
  Sparkles,
  Bot,
  TrendingUp,
  BarChart3,
  AlertTriangle,
  Lightbulb,
  Target,
  Zap,
  PieChart,
  MessageSquare,
} from "lucide-react";
import { useLayoutStore } from "@/store/layout-store";
import { useChatStore } from "@/store/chat-store";
import { cn } from "@/lib/utils";
import { AIInsight } from "@/types/layout";

const aiInsights: AIInsight[] = [
  {
    id: "1",
    type: "prediction",
    title: "Revenue Forecast",
    description:
      "Based on current trends, Q3 revenue is projected to increase by 18% to ETB 52M.",
    impact: "high",
  },
  {
    id: "2",
    type: "alert",
    title: "Maintenance Alert",
    description:
      "3 vehicles require immediate maintenance to avoid downtime costs.",
    impact: "high",
  },
  {
    id: "3",
    type: "recommendation",
    title: "Inventory Optimization",
    description:
      "Consider increasing stock of key components by 15% to meet projected demand.",
    impact: "medium",
  },
];

export function ChatbarNav() {
  const {
    rightSidebarOpen,
    rightSidebarWidth,
    toggleRightSidebar,
    setRightSidebarWidth,
  } = useLayoutStore();

  const { activeConversationId, messages, sendMessage } = useChatStore();

  const [inputValue, setInputValue] = useState("");
  const [isResizing, setIsResizing] = useState(false);
  const [showInsights, setShowInsights] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // We'll use a specific "AI Agent" conversation if it exists
  const conversationId = activeConversationId || "ai-1";
  const currentMessages = useMemo(
    () => messages[conversationId] || [],
    [messages, conversationId],
  );

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [currentMessages]);

  const handleSend = () => {
    if (!inputValue.trim()) return;
    sendMessage(conversationId, inputValue);
    setInputValue("");
  };

  const handleResizeStart = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);

    const startX = e.clientX;
    const startWidth = rightSidebarWidth;

    const handleMouseMove = (e: MouseEvent) => {
      const delta = startX - e.clientX;
      const newWidth = startWidth + delta;
      setRightSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case "prediction":
        return <TrendingUp className="w-4 h-4" />;
      case "alert":
        return <AlertTriangle className="w-4 h-4" />;
      case "recommendation":
        return <Lightbulb className="w-4 h-4" />;
      case "forecast":
        return <BarChart3 className="w-4 h-4" />;
      default:
        return <Zap className="w-4 h-4" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-600 bg-red-50";
      case "medium":
        return "text-amber-600 bg-amber-50";
      case "low":
        return "text-green-600 bg-green-50";
      default:
        return "text-gray-600 bg-gray-50";
    }
  };

  if (!rightSidebarOpen) return null;

  return (
    <motion.aside
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: rightSidebarWidth, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: [0.25, 1, 0.5, 1] }}
      className={cn(
        "relative flex flex-col bg-white border-l border-border h-screen shrink-0 z-30",
        isResizing && "select-none",
      )}
    >
      {/* Resize Handle */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize z-10 hover:bg-primary/20 transition-colors"
        onMouseDown={handleResizeStart}
      />

      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50 bg-[#F7F7F7]/50 backdrop-blur-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shadow-lg shadow-black/10">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-sm tracking-tight text-foreground">
              CEO AI
            </h3>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">
                Strategic Intelligence
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={toggleRightSidebar}
          className="p-1.5 hover:bg-black/5 rounded-md transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>

      {/* AI Insights Panel */}
      <div className="px-4 py-3 border-b border-border/50">
        <button
          onClick={() => setShowInsights(!showInsights)}
          className="flex items-center justify-between w-full text-xs font-bold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
        >
          <span className="flex items-center gap-2">
            <Target className="w-3.5 h-3.5" />
            AI Strategy Insights
          </span>
          <span className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-[9px]">
            {aiInsights.length} Active
          </span>
        </button>

        <AnimatePresence>
          {showInsights && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="mt-3 overflow-hidden"
            >
              <div className="flex gap-3 pb-2 overflow-x-auto custom-scrollbar">
                {aiInsights.map((insight) => (
                  <div
                    key={insight.id}
                    className="flex-shrink-0 w-52 p-3 rounded-xl bg-secondary/30 border border-border/50 text-[11px] hover:border-border transition-all cursor-default"
                  >
                    <div className="flex items-start gap-2.5">
                      <div
                        className={cn(
                          "p-1.5 rounded-lg shrink-0",
                          getImpactColor(insight.impact),
                        )}
                      >
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-foreground leading-tight">
                          {insight.title}
                        </p>
                        <p className="text-muted-foreground mt-1 leading-normal line-clamp-2">
                          {insight.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar bg-slate-50/30">
        {currentMessages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/5 flex items-center justify-center">
              <MessageSquare className="w-6 h-6 text-primary/40" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold">
                Start a Strategic Dialogue
              </p>
              <p className="text-xs text-muted-foreground">
                Ask me about your fleet, revenue forecasts, or operational
                risks.
              </p>
            </div>
          </div>
        )}
        {currentMessages.map((message) => (
          <motion.div
            key={message.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3",
              message.senderId === "me" && "flex-row-reverse",
            )}
          >
            {message.senderId !== "me" && (
              <div className="w-8 h-8 rounded-lg bg-black flex items-center justify-center shrink-0 shadow-lg shadow-black/10">
                <Bot className="w-4 h-4 text-white" />
              </div>
            )}
            <div
              className={cn(
                "space-y-1.5 max-w-[85%]",
                message.senderId === "me" && "items-end",
              )}
            >
              <div
                className={cn(
                  "p-3 rounded-2xl text-[13px] leading-relaxed shadow-sm",
                  message.senderId === "me"
                    ? "bg-primary text-primary-foreground rounded-tr-none"
                    : "bg-white border border-border/50 text-foreground rounded-tl-none",
                )}
              >
                {message.content}
              </div>
              <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-tighter px-1">
                {new Date(message.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="px-4 py-2 border-t border-border/50 bg-[#F7F7F7]/50">
        <p className="text-[10px] font-bold text-muted-foreground uppercase opacity-50 mb-2">
          Quick Analysis
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Predictions", icon: PieChart, tag: "Predictive" },
            { label: "Forecast", icon: TrendingUp, tag: "Financial" },
            { label: "Risks", icon: AlertTriangle, tag: "Operational" },
            { label: "Optimize", icon: Zap, tag: "Fleet" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => sendMessage(conversationId, action.label)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-border/50 rounded-xl text-[10px] font-semibold hover:border-primary/50 hover:bg-primary/5 transition-all text-muted-foreground hover:text-primary active:scale-95 shadow-sm"
            >
              <action.icon className="w-3 h-3" />
              {action.label}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50 bg-white">
        <div className="relative group">
          <textarea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Search insights or ask CEO AI..."
            className="w-full pr-12 pl-4 py-3 bg-secondary/50 border border-transparent rounded-2xl resize-none text-[13px] focus:outline-none focus:ring-2 focus:ring-black/5 focus:bg-white focus:border-border transition-all min-h-[90px] placeholder:text-muted-foreground/50"
            rows={2}
          />
          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className="absolute right-2.5 bottom-2.5 p-2 bg-black text-white rounded-xl hover:bg-black/90 transition-all disabled:opacity-30 disabled:grayscale active:scale-95 shadow-lg shadow-black/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center justify-between mt-2.5 px-1">
          <p className="text-[9px] text-muted-foreground font-medium uppercase tracking-widest opacity-40">
            Powered by CEO Strategic Engine
          </p>
          <kbd className="text-[9px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded border border-border/50">
            Enter ↵
          </kbd>
        </div>
      </div>
    </motion.aside>
  );
}
