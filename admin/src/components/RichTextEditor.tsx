import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

interface RichTextEditorProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    minHeight?: string;
}

export default function RichTextEditor({ value, onChange, placeholder, minHeight = "200px" }: RichTextEditorProps) {
    const [tab, setTab] = useState<'write' | 'preview'>('write');

    return (
        <div className="w-full bg-slate-950 border border-white/10 rounded-xl overflow-hidden focus-within:border-brand-500 transition-colors">
            <div className="flex bg-slate-900/50 border-b border-white/5">
                <button
                    type="button"
                    onClick={() => setTab('write')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'write' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                    Write
                </button>
                <button
                    type="button"
                    onClick={() => setTab('preview')}
                    className={`flex-1 py-2 text-xs font-bold uppercase tracking-wider transition-colors ${tab === 'preview' ? 'bg-slate-800 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                    Preview
                </button>
            </div>

            <div className="p-0 relative">
                {tab === 'write' ? (
                    <textarea
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        className="w-full bg-slate-950 text-white px-4 py-3 focus:outline-none resize-y font-mono text-sm"
                        style={{ minHeight }}
                        placeholder={placeholder || "Type markdown here... (**bold**, *italic*, - list)"}
                    />
                ) : (
                    <div className="prose prose-invert prose-sm max-w-none p-4 overflow-y-auto bg-slate-900/30" style={{ minHeight }}>
                        {value ? <ReactMarkdown>{value}</ReactMarkdown> : <span className="text-slate-500 italic">Nothing to preview</span>}
                    </div>
                )}
            </div>

            <div className="px-3 py-1 bg-slate-900/30 border-t border-white/5 flex justify-end">
                <a href="https://www.markdownguide.org/basic-syntax/" target="_blank" rel="noopener noreferrer" className="text-[10px] text-slate-500 hover:text-brand-400 flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Markdown Supported
                </a>
            </div>
        </div>
    );
}
