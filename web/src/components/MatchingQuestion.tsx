import { useState, useCallback } from 'react';
import { GripVertical, Check, X, ArrowRight } from 'lucide-react';

/**
 * EC-119: Drag-and-Drop Matching Question
 *
 * Presents a set of terms on the left and definitions/descriptions on the right.
 * Users drag right-side items to reorder them to match the left-side terms.
 * On mobile, tap-to-swap is used instead of drag for accessibility.
 */

export interface MatchPair {
    term: string;
    definition: string;
}

interface MatchingQuestionProps {
    pairs: MatchPair[];
    locked: boolean;               // true after submit (showExplanation)
    correctOrder: number[];        // correct mapping: correctOrder[i] = index into shuffled definitions
    shuffledDefinitions: string[]; // pre-shuffled definitions
    currentOrder: number[];        // current user ordering
    onReorder: (newOrder: number[]) => void;
}

export default function MatchingQuestion({
    pairs,
    locked,
    correctOrder,
    shuffledDefinitions,
    currentOrder,
    onReorder,
}: MatchingQuestionProps) {
    const [dragIdx, setDragIdx] = useState<number | null>(null);
    const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);
    const [tapSelected, setTapSelected] = useState<number | null>(null);

    const handleDragStart = useCallback((idx: number) => {
        if (locked) return;
        setDragIdx(idx);
    }, [locked]);

    const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
        e.preventDefault();
        setDragOverIdx(idx);
    }, []);

    const handleDrop = useCallback((targetIdx: number) => {
        if (dragIdx === null || dragIdx === targetIdx || locked) return;
        const newOrder = [...currentOrder];
        const temp = newOrder[dragIdx];
        newOrder[dragIdx] = newOrder[targetIdx];
        newOrder[targetIdx] = temp;
        onReorder(newOrder);
        setDragIdx(null);
        setDragOverIdx(null);
    }, [dragIdx, currentOrder, onReorder, locked]);

    const handleTap = useCallback((idx: number) => {
        if (locked) return;
        if (tapSelected === null) {
            setTapSelected(idx);
        } else {
            if (tapSelected !== idx) {
                const newOrder = [...currentOrder];
                const temp = newOrder[tapSelected];
                newOrder[tapSelected] = newOrder[idx];
                newOrder[idx] = temp;
                onReorder(newOrder);
            }
            setTapSelected(null);
        }
    }, [tapSelected, currentOrder, onReorder, locked]);

    return (
        <div className="space-y-3">
            {/* Instructions */}
            <p className="text-sm text-slate-400 mb-4">
                {locked
                    ? 'Review the correct matches below.'
                    : 'Match each term to its description. Drag to reorder, or tap two items to swap.'}
            </p>

            {pairs.map((pair, i) => {
                const defIdx = currentOrder[i];
                const definition = shuffledDefinitions[defIdx];
                const isCorrectMatch = locked && defIdx === correctOrder[i];
                const isWrongMatch = locked && defIdx !== correctOrder[i];
                const isDragging = dragIdx === i;
                const isDragOver = dragOverIdx === i && dragIdx !== i;
                const isTapHighlight = tapSelected === i;

                let rightBorder = 'border-slate-700';
                let rightBg = 'bg-slate-800/40';
                if (isTapHighlight && !locked) {
                    rightBorder = 'border-brand-500';
                    rightBg = 'bg-brand-500/10';
                }
                if (isDragOver && !locked) {
                    rightBorder = 'border-brand-400';
                    rightBg = 'bg-brand-400/10';
                }
                if (isCorrectMatch) {
                    rightBorder = 'border-emerald-500/60';
                    rightBg = 'bg-emerald-500/5';
                }
                if (isWrongMatch) {
                    rightBorder = 'border-red-500/40';
                    rightBg = 'bg-red-500/5';
                }

                return (
                    <div key={i} className="flex flex-col sm:flex-row gap-2 sm:gap-3 items-stretch">
                        {/* Left: Term (fixed) */}
                        <div className="flex-1 p-3 sm:p-4 rounded-xl border-2 border-slate-600 bg-slate-800/60 flex items-center gap-3">
                            <span className="w-6 h-6 rounded-md bg-indigo-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
                                {i + 1}
                            </span>
                            <span className="text-sm sm:text-base text-slate-200 font-medium">
                                {pair.term}
                            </span>
                        </div>

                        {/* Arrow */}
                        <div className="hidden sm:flex items-center justify-center flex-shrink-0">
                            <ArrowRight className="w-4 h-4 text-slate-600" />
                        </div>

                        {/* Right: Definition (draggable / tappable) */}
                        <div
                            draggable={!locked}
                            onDragStart={() => handleDragStart(i)}
                            onDragOver={(e) => handleDragOver(e, i)}
                            onDrop={() => handleDrop(i)}
                            onDragEnd={() => { setDragIdx(null); setDragOverIdx(null); }}
                            onClick={() => handleTap(i)}
                            className={`flex-1 p-3 sm:p-4 rounded-xl border-2 transition-colors duration-300 flex items-center gap-3 ${
                                locked ? '' : 'cursor-grab active:cursor-grabbing'
                            } ${isDragging ? 'opacity-50' : ''} ${rightBorder} ${rightBg}`}
                        >
                            {!locked && (
                                <GripVertical className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            )}
                            {locked && isCorrectMatch && (
                                <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                            )}
                            {locked && isWrongMatch && (
                                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                            )}
                            <span className={`text-sm sm:text-base ${
                                isCorrectMatch ? 'text-emerald-300' :
                                isWrongMatch ? 'text-red-300/80' :
                                'text-slate-300'
                            }`}>
                                {definition}
                            </span>
                        </div>
                    </div>
                );
            })}

            {/* Correct answers shown after submit for wrong matches */}
            {locked && currentOrder.some((d, i) => d !== correctOrder[i]) && (
                <div className="mt-4 p-4 bg-slate-800/60 rounded-xl border border-slate-700">
                    <p className="text-sm font-medium text-slate-300 mb-2">Correct matches:</p>
                    <div className="space-y-1.5">
                        {pairs.map((pair, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm">
                                <span className="text-indigo-400 font-medium">{pair.term}</span>
                                <ArrowRight className="w-3 h-3 text-slate-500 flex-shrink-0" />
                                <span className="text-emerald-400">{pair.definition}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Utility: shuffle definitions and compute the correct order mapping.
 * Returns { shuffledDefinitions, correctOrder } where correctOrder[i] is the
 * index into shuffledDefinitions that should be at position i for a correct answer.
 */
export function shuffleMatchPairs(pairs: MatchPair[]): {
    shuffledDefinitions: string[];
    correctOrder: number[];
    initialOrder: number[];
} {
    // Create indices and shuffle them
    const indices = pairs.map((_, i) => i);
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const shuffledDefinitions = indices.map(i => pairs[i].definition);

    // correctOrder[i] = position in shuffledDefinitions that contains pairs[i].definition
    const correctOrder = pairs.map((_, i) => {
        return indices.indexOf(i);
    });

    // initialOrder starts as [0, 1, 2, ...] — user hasn't reordered yet
    const initialOrder = shuffledDefinitions.map((_, i) => i);

    return { shuffledDefinitions, correctOrder, initialOrder };
}
