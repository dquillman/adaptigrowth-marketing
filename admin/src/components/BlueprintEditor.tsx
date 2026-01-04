import { useState } from 'react';

interface BlueprintItem {
    domain: string;
    weight: number;
}

interface BlueprintEditorProps {
    blueprint: BlueprintItem[];
    onChange: (newBlueprint: BlueprintItem[]) => void;
}

export default function BlueprintEditor({ blueprint, onChange }: BlueprintEditorProps) {
    const [newItem, setNewItem] = useState({ domain: '', weight: 0 });

    const totalWeight = blueprint.reduce((sum, item) => sum + (parseInt(item.weight as any) || 0), 0);

    const handleAdd = () => {
        if (!newItem.domain) return;
        onChange([...blueprint, { ...newItem, weight: newItem.weight || 0 }]);
        setNewItem({ domain: '', weight: 0 });
    };

    const handleDelete = (index: number) => {
        const newBlueprint = [...blueprint];
        newBlueprint.splice(index, 1);
        onChange(newBlueprint);
    };

    const handleUpdate = (index: number, field: keyof BlueprintItem, value: string | number) => {
        const newBlueprint = [...blueprint];
        newBlueprint[index] = { ...newBlueprint[index], [field]: value };
        onChange(newBlueprint);
    };

    return (
        <div className="space-y-6 bg-slate-900/50 rounded-2xl p-6 border border-white/5">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-white font-display">Blueprint Configuration</h3>
                <div className={`px-3 py-1 rounded-full text-xs font-bold border ${totalWeight === 100 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                    Total Weight: {totalWeight}%
                </div>
            </div>

            <div className="space-y-3">
                {blueprint.map((item, index) => (
                    <div key={index} className="flex gap-4 items-center group">
                        <div className="flex-1">
                            <input
                                type="text"
                                value={item.domain}
                                onChange={(e) => handleUpdate(index, 'domain', e.target.value)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-brand-500 transition-colors"
                                placeholder="Domain Name"
                            />
                        </div>
                        <div className="w-32 flex items-center gap-2">
                            <input
                                type="number"
                                value={item.weight}
                                onChange={(e) => handleUpdate(index, 'weight', parseInt(e.target.value) || 0)}
                                className="w-full bg-slate-950 border border-white/10 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-brand-500 text-center"
                                min="0" max="100"
                            />
                            <span className="text-slate-500">%</span>
                        </div>
                        <button
                            onClick={() => handleDelete(index)}
                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                            title="Remove Domain"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>
                ))}
            </div>

            {/* Add New */}
            <div className="flex gap-4 items-center pt-4 border-t border-white/5">
                <input
                    type="text"
                    value={newItem.domain}
                    onChange={(e) => setNewItem({ ...newItem, domain: e.target.value })}
                    className="flex-1 bg-slate-800/50 border border-white/5 rounded-lg px-4 py-2 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:text-white transition-colors"
                    placeholder="Add new domain..."
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <input
                    type="number"
                    value={newItem.weight || ''}
                    onChange={(e) => setNewItem({ ...newItem, weight: parseInt(e.target.value) || 0 })}
                    className="w-24 bg-slate-800/50 border border-white/5 rounded-lg px-3 py-2 text-slate-300 placeholder-slate-500 focus:outline-none focus:border-brand-500 focus:text-white text-center"
                    placeholder="%"
                    min="0" max="100"
                    onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                />
                <button
                    onClick={handleAdd}
                    disabled={!newItem.domain}
                    className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold hover:bg-brand-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    Add
                </button>
            </div>
        </div>
    );
}
