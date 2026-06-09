import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, AlertTriangle, AlertOctagon, Info, 
  DollarSign, Clock, Zap, FileText, CheckCircle2, 
  Activity, BookOpen, ExternalLink, RefreshCw 
} from 'lucide-react';

export default function RunbookDisplayPanel({ result, isLoading }) {
  const [checkedSteps, setCheckedSteps] = useState({});
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'markdown'

  // Reset checked steps when a new result is loaded
  useEffect(() => {
    setCheckedSteps({});
  }, [result]);

  const toggleStep = (index) => {
    setCheckedSteps(prev => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  // 1. Loading Skeleton State
  if (isLoading) {
    return (
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden h-full flex flex-col justify-between min-h-[580px] animate-pulse">
        <div className="space-y-6">
          {/* Header Skeleton */}
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div className="flex items-center space-x-3 w-1/2">
              <div className="w-10 h-10 bg-slate-800 rounded-xl"></div>
              <div className="space-y-2 w-full">
                <div className="h-4 bg-slate-800 rounded w-3/4"></div>
                <div className="h-3 bg-slate-800 rounded w-1/2"></div>
              </div>
            </div>
            <div className="h-8 bg-slate-800 rounded-full w-24"></div>
          </div>

          {/* Metric Cards Grid Skeleton */}
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-slate-900/60 border border-white/5 rounded-xl p-3 h-20"></div>
            ))}
          </div>

          {/* Root Cause Alert Skeleton */}
          <div className="bg-slate-900/40 border border-white/5 rounded-xl p-4 h-24"></div>

          {/* Checklist Skeleton */}
          <div className="space-y-3">
            <div className="h-3 bg-slate-800 rounded w-1/4"></div>
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3">
                <div className="w-4 h-4 bg-slate-800 rounded"></div>
                <div className="h-3 bg-slate-800 rounded w-5/6"></div>
              </div>
            ))}
          </div>
        </div>
        <div className="h-10 bg-slate-800 rounded-xl w-full mt-6"></div>
      </div>
    );
  }

  // 2. Empty State
  if (!result) {
    return (
      <div className="glass-card rounded-2xl p-6 relative overflow-hidden h-full flex flex-col items-center justify-center text-center min-h-[580px] group border-dashed border-white/10">
        <div className="absolute -bottom-20 -right-20 w-40 h-40 bg-indigo-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="bg-slate-900/80 border border-white/5 text-slate-400 p-4 rounded-2xl mb-4 transition-transform group-hover:scale-110 duration-300">
          <Activity size={32} className="text-violet-400 animate-pulse" />
        </div>
        <h3 className="font-semibold text-white text-base">Awaiting Log Analysis</h3>
        <p className="text-xs text-slate-400 max-w-sm mt-2 leading-relaxed">
          Paste a log stream in the input console on the left or select a demo incident to trigger AI analysis and runbook generation.
        </p>
      </div>
    );
  }

  // Extract values from result
  const { 
    severity = 'info', 
    summary = 'No summary provided',
    root_cause = 'Root cause analysis pending.',
    fix_steps = [],
    costs = { downtime: '$0/hr', SLA: 'Low', compute: 'Normal', MTTR: '30m' },
    detailed_runbook = ''
  } = result;

  // Severity styling configuration
  const severityConfig = {
    critical: {
      color: 'bg-red-500/10 text-red-400 border-red-500/30',
      badgeColor: 'bg-red-500 text-white',
      badgeGlow: 'shadow-lg shadow-red-500/30 border-red-400/50',
      icon: AlertOctagon,
      title: 'CRITICAL SEVERITY',
      glowClass: 'glow-critical'
    },
    warning: {
      color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
      badgeColor: 'bg-amber-500 text-slate-950',
      badgeGlow: 'shadow-lg shadow-amber-500/30 border-amber-400/50',
      icon: AlertTriangle,
      title: 'MAJOR INCIDENT',
      glowClass: 'glow-warning'
    },
    info: {
      color: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
      badgeColor: 'bg-blue-500 text-white',
      badgeGlow: 'shadow-lg shadow-blue-500/30 border-blue-400/50',
      icon: Info,
      title: 'INFO PIPELINE',
      glowClass: 'glow-info'
    }
  };

  const currentSev = severityConfig[severity.toLowerCase()] || severityConfig.info;
  const SeverityIcon = currentSev.icon;

  // Dynamic checklist progress calculation
  const totalSteps = fix_steps.length;
  const completedSteps = Object.values(checkedSteps).filter(Boolean).length;
  const progressPercent = totalSteps ? Math.round((completedSteps / totalSteps) * 100) : 0;

  // Custom Inline Markdown renderer helper
  function parseInlineStyles(text) {
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    const matches = text.split(regex);
    
    return matches.map((part, idx) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-bold text-slate-100">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return <code key={idx} className="bg-white/10 text-violet-300 font-mono px-1 py-0.5 rounded text-[11px] font-semibold">{part.slice(1, -1)}</code>;
      }
      return part;
    });
  }

  // Render Full Claude Runbook Markdown helper
  function renderMarkdown(md) {
    if (!md) return <p className="text-slate-400 italic">No detailed runbook markdown loaded.</p>;
    const lines = md.split('\n');
    let inCodeBlock = false;
    let codeContent = [];
    const renderedElements = [];
    let listItems = [];
    
    const flushList = (key) => {
      if (listItems.length > 0) {
        renderedElements.push(
          <ul key={`list-${key}`} className="list-disc pl-5 mb-4 text-slate-300 space-y-1 text-xs">
            {listItems}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          renderedElements.push(
            <pre key={`code-${index}`} className="bg-black/60 border border-white/5 p-3.5 rounded-xl overflow-x-auto text-[11px] text-slate-200 font-mono mb-4 leading-relaxed">
              <code>{codeContent.join('\n')}</code>
            </pre>
          );
          codeContent = [];
          inCodeBlock = false;
        } else {
          flushList(index);
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent.push(line);
        return;
      }

      const trimmed = line.trim();

      if (trimmed.startsWith('### ')) {
        flushList(index);
        renderedElements.push(
          <h4 key={`h3-${index}`} className="text-[11px] font-semibold text-violet-400 mt-4 mb-1.5 uppercase tracking-wide">
            {trimmed.replace('### ', '')}
          </h4>
        );
      } else if (trimmed.startsWith('## ')) {
        flushList(index);
        renderedElements.push(
          <h3 key={`h2-${index}`} className="text-sm font-semibold text-white mt-5 mb-2 border-b border-white/5 pb-1">
            {trimmed.replace('## ', '')}
          </h3>
        );
      } else if (trimmed.startsWith('# ')) {
        flushList(index);
        renderedElements.push(
          <h2 key={`h1-${index}`} className="text-base font-bold text-white mt-6 mb-3 border-b border-white/10 pb-1.5">
            {trimmed.replace('# ', '')}
          </h2>
        );
      } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const text = trimmed.substring(2);
        listItems.push(<li key={`li-${index}`} className="text-[12px] text-slate-300">{parseInlineStyles(text)}</li>);
      } else if (trimmed.length > 0) {
        flushList(index);
        renderedElements.push(
          <p key={`p-${index}`} className="text-[12px] text-slate-300 mb-3.5 leading-relaxed">
            {parseInlineStyles(trimmed)}
          </p>
        );
      } else {
        flushList(index);
      }
    });

    flushList(lines.length);
    return <div className="space-y-1">{renderedElements}</div>;
  }

  return (
    <div className="glass-card rounded-2xl p-6 relative overflow-hidden h-full flex flex-col justify-between min-h-[580px]">
      {/* Background glow base */}
      <div className={`absolute -top-24 -right-24 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20 ${
        severity === 'critical' ? 'bg-red-500' : severity === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
      }`}></div>

      <div>
        {/* Main Header Panel */}
        <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${currentSev.color}`}>
              <SeverityIcon size={20} className={currentSev.glowClass} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="font-semibold text-white text-sm">Incident Diagnostics</h3>
                <span className="text-[10px] text-slate-400 font-mono">ID: AI-RNBK-{Math.abs(summary.length)}</span>
              </div>
              <p className="text-[11px] text-slate-400 truncate max-w-xs">{summary}</p>
            </div>
          </div>
          <div className={`text-[10px] font-bold tracking-wider px-3 py-1 rounded-full border ${currentSev.badgeColor} ${currentSev.badgeGlow}`}>
            {currentSev.title}
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex space-x-1 border-b border-white/5 pb-3 mb-4">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'summary' 
                ? 'bg-white/10 text-white border border-white/10' 
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Activity size={14} />
            <span>Interactive Runbook</span>
          </button>
          <button
            onClick={() => setActiveTab('markdown')}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'markdown' 
                ? 'bg-white/10 text-white border border-white/10' 
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <BookOpen size={14} />
            <span>Raw Claude Runbook</span>
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'summary' ? (
          <div className="space-y-4">
            {/* 1. Metrics Grid */}
            <div className="grid grid-cols-4 gap-2">
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide flex items-center gap-1">
                  <DollarSign size={10} className="text-red-400" />
                  Downtime Cost
                </span>
                <span className="text-xs font-semibold text-white mt-1">{costs.downtime || '$12,500/hr'}</span>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide flex items-center gap-1">
                  <Clock size={10} className="text-violet-400" />
                  Est. MTTR
                </span>
                <span className="text-xs font-semibold text-white mt-1">{costs.MTTR || '20m'}</span>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide flex items-center gap-1">
                  <Zap size={10} className="text-amber-400" />
                  SLA Breach
                </span>
                <span className={`text-xs font-semibold mt-1 ${
                  costs.SLA === 'High' ? 'text-red-400' : costs.SLA === 'Medium' ? 'text-amber-400' : 'text-green-400'
                }`}>{costs.SLA || 'Medium'}</span>
              </div>
              <div className="bg-slate-900/50 border border-white/5 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wide flex items-center gap-1">
                  <RefreshCw size={10} className="text-blue-400 animate-spin-slow" />
                  Compute Impact
                </span>
                <span className="text-xs font-semibold text-white mt-1">{costs.compute || 'Normal'}</span>
              </div>
            </div>

            {/* 2. Root Cause Summary Alert */}
            <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3">
              <span className="text-[10px] uppercase font-bold text-violet-400 tracking-wider font-mono block mb-1">
                Root Cause Analysis
              </span>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {root_cause}
              </p>
            </div>

            {/* 3. Action Checklist Section */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono flex items-center gap-1.5">
                  <ShieldCheck size={12} className="text-green-400" />
                  Resolution Action Checklist
                </span>
                <span className="text-[10px] text-slate-400 font-mono bg-slate-900 px-2 py-0.5 rounded border border-white/5">
                  {completedSteps}/{totalSteps} Completed ({progressPercent}%)
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden mb-3 border border-white/5">
                <div 
                  className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full transition-all duration-500 ease-out" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>

              <div className="space-y-2 max-h-[170px] overflow-y-auto pr-1">
                {fix_steps.map((step, idx) => {
                  const isChecked = !!checkedSteps[idx];
                  return (
                    <div 
                      key={idx}
                      onClick={() => toggleStep(idx)}
                      className={`flex items-start space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                        isChecked 
                          ? 'bg-green-500/5 border-green-500/20 text-slate-500' 
                          : 'bg-slate-950/40 border-white/5 text-slate-200 hover:border-violet-500/30'
                      }`}
                    >
                      <div className="mt-0.5 shrink-0">
                        {isChecked ? (
                          <div className="bg-green-500 text-slate-950 rounded p-0.5">
                            <CheckCircle2 size={12} className="stroke-[3]" />
                          </div>
                        ) : (
                          <div className="w-4.5 h-4.5 border border-white/20 rounded-md hover:border-violet-400 transition-colors"></div>
                        )}
                      </div>
                      <span className={`text-xs select-none transition-all leading-normal ${
                        isChecked ? 'line-through text-slate-400 font-normal' : 'font-medium'
                      }`}>
                        {parseInlineStyles(step)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* Markdown Runbook Tab */
          <div className="max-h-[350px] overflow-y-auto pr-2 bg-slate-950/50 rounded-xl p-4 border border-white/5 font-mono">
            {renderMarkdown(detailed_runbook)}
          </div>
        )}
      </div>

      {/* Footer / Meta Actions */}
      <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center text-[10px] text-slate-500">
        <span className="font-mono">Model: Claude-3.5-Sonnet-Runbook-v1</span>
        <button
          onClick={() => {
            const blob = new Blob([detailed_runbook], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `runbook-incident-${Math.abs(summary.length)}.md`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center space-x-1 text-slate-400 hover:text-white transition-colors"
          title="Export Runbook Markdown"
        >
          <ExternalLink size={10} />
          <span>Export Markdown</span>
        </button>
      </div>
    </div>
  );
}
