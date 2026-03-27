"use client";

import { motion } from "framer-motion";
import { 
  FileSignature, 
  Send, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Plus,
  Search,
  Filter,
  MoreVertical,
  ExternalLink
} from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

const MOCK_SIGNATURES = [
  { id: '1', title: 'HR Contract - Abel', recipient: 'abel@example.com', status: 'PENDING', date: '2026-03-26' },
];

export default function SignaturesPage() {
  const [filter, setFilter] = useState('ALL');
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Poll for document updates every 15s to keep ERP UI synced with Documenso
  useEffect(() => {
    const fetchDocuments = async () => {
      try {
        const res = await fetch("/api/documenso/documents");
        if (res.ok) {
          const data = await res.json();
          setDocuments(data.documents || []);
        } else {
          setDocuments([]);
        }
      } catch (e) {
        setDocuments([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchDocuments();
    const interval = setInterval(fetchDocuments, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleCreateAgreement = () => {
    // Call our ERP bridging endpoint which will seamlessly redirect us
    window.location.href = "/api/documenso/sso-redirect";
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      {/* Premium Header */}
      <div className="relative overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-amber-500/10 via-amber-600/5 to-transparent border border-amber-500/10 p-10">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 text-amber-600 text-[10px] font-bold uppercase tracking-widest border border-amber-500/20">
              <Sparkles className="w-3 h-3" />
              Integrated Documenso
            </div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">
              Agreements & <span className="text-amber-600">Signatures</span>
            </h1>
            <p className="text-slate-500 max-w-md text-sm leading-relaxed">
              Manage your legal documents and track signature status in real-time without leaving the portal.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => window.location.href = "/api/documenso/sso-redirect"}
              className="flex items-center gap-2 px-6 py-4 rounded-2xl border border-slate-200 bg-white/50 text-slate-700 hover:bg-white hover:border-amber-300 transition-all font-bold tracking-tight shadow-sm"
            >
              <ExternalLink className="w-4 h-4 text-amber-500" />
              Manage Archive
            </button>
            
            <button 
              onClick={handleCreateAgreement} 
              className="group flex items-center gap-3 bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl shadow-slate-900/20 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Plus className="w-5 h-5 text-amber-400 group-hover:rotate-90 transition-transform" />
              <span className="font-bold tracking-tight">Create Agreement</span>
            </button>
          </div>
        </div>
        
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl" />
      </div>

      {/* Stats Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          label="Pending Sync" 
          value={documents.filter(d => d.status === 'PENDING').length} 
          icon={Clock} 
          color="amber" 
          description="Waiting for signatures"
        />
        <StatCard 
          label="Finalized" 
          value={documents.filter(d => d.status === 'COMPLETED').length} 
          icon={CheckCircle2} 
          color="emerald" 
          description="Legally signed documents"
        />
        <StatCard 
          label="Drafts" 
          value={documents.filter(d => d.status === 'DRAFT').length} 
          icon={FileSignature} 
          color="blue" 
          description="Drafting in progress"
        />
      </div>

      {/* Main Content Area */}
      <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[2rem] p-8 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-2 bg-slate-100/50 p-1 rounded-xl w-fit">
            <TabButton active={filter === 'ALL'} onClick={() => setFilter('ALL')}>All</TabButton>
            <TabButton active={filter === 'PENDING'} onClick={() => setFilter('PENDING')}>Pending</TabButton>
            <TabButton active={filter === 'COMPLETED'} onClick={() => setFilter('COMPLETED')}>Completed</TabButton>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search documents..." 
                className="bg-white border-border/40 focus:border-amber-500/40 focus:ring-amber-500/10 rounded-xl pl-10 pr-4 py-2 text-sm w-64 transition-all outline-none border"
              />
            </div>
            <button className="p-2.5 rounded-xl border border-border/40 hover:bg-white transition-colors">
              <Filter className="w-4 h-4 text-slate-600" />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-100">
                <th className="pb-4 px-4 font-black">Document Details</th>
                <th className="pb-4 px-4 font-black">Recipient</th>
                <th className="pb-4 px-4 font-black">Status</th>
                <th className="pb-4 px-4 font-black">Created Date</th>
                <th className="pb-4 px-4 font-black text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {isLoading && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm font-medium">Loading documents from Documenso...</td>
                </tr>
              )}
              {!isLoading && documents.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 text-sm font-medium">No documents found.</td>
                </tr>
              )}
              {!isLoading && documents
                .filter(sig => filter === 'ALL' || sig.status === filter)
                .map((sig: any) => (
                <tr key={sig.id} className="group hover:bg-slate-50/50 transition-colors cursor-pointer" onClick={() => window.location.href = `/api/documenso/view?id=${sig.id}`}>
                  <td className="py-5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                        <FileSignature className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700">{sig.title}</span>
                    </div>
                  </td>
                  <td className="py-5 px-4 text-sm text-slate-500">{sig.recipient || 'Multiple recipients'}</td>
                  <td className="py-5 px-4">
                    <StatusBadge status={sig.status} />
                  </td>
                  <td className="py-5 px-4 text-sm text-slate-400 font-medium">{sig.date ? new Date(sig.date).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-5 px-4 text-right">
                    <button className="p-2 rounded-lg hover:bg-white hover:shadow-sm text-slate-400 hover:text-amber-600 transition-all">
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color, description }: any) {
  const colors: any = {
    amber: "bg-amber-500 shadow-amber-500/20",
    emerald: "bg-emerald-500 shadow-emerald-500/20",
    blue: "bg-blue-500 shadow-blue-500/20"
  };

  return (
    <div className="relative group p-6 rounded-[2rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl text-white shadow-lg", colors[color])}>
          <Icon className="w-5 h-5" />
        </div>
        <span className="text-3xl font-black text-slate-900">{value}</span>
      </div>
      <div>
        <p className="text-sm font-black text-slate-700 uppercase tracking-tighter">{label}</p>
        <p className="text-[11px] text-slate-400 mt-0.5">{description}</p>
      </div>
    </div>
  );
}

function TabButton({ children, active, onClick }: any) {
  return (
    <button 
      onClick={onClick}
      className={cn(
        "px-6 py-1.5 rounded-lg text-xs font-bold transition-all",
        active ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
      )}
    >
      {children}
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: any = {
    PENDING: "bg-amber-50 text-amber-600 border-amber-100",
    COMPLETED: "bg-emerald-50 text-emerald-600 border-emerald-100",
    DRAFT: "bg-slate-50 text-slate-500 border-slate-200"
  };

  return (
    <span className={cn("px-3 py-1 rounded-full text-[10px] font-black tracking-widest border", styles[status])}>
      {status}
    </span>
  );
}

function Sparkles(props: any) {
  return (
    <svg 
      {...props}
      xmlns="http://www.w3.org/2000/svg" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
      <path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
    </svg>
  );
}
