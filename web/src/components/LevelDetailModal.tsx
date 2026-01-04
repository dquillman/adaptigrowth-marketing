import { X, Trophy, Star, Shield, Crown, Zap, Medal } from 'lucide-react';
import LevelBadge from './LevelBadge';

interface LevelDetailModalProps {
    isOpen: boolean;
    onClose: () => void;
    level: number;
    currentXp: number;
    nextLevelXp: number;
    prevLevelXp: number;
    examName: string;
}

export default function LevelDetailModal({
    isOpen,
    onClose,
    level,
    currentXp,
    nextLevelXp,
    prevLevelXp,
    examName
}: LevelDetailModalProps) {
    if (!isOpen) return null;

    const levelRange = nextLevelXp - prevLevelXp;
    const progress = Math.min(100, Math.max(0, ((currentXp - prevLevelXp) / levelRange) * 100));
    const xpNeeded = Math.round(nextLevelXp - currentXp);

    // Derived Badges based on Level
    const allBadges = [
        { level: 1, name: "Novice", icon: Star, color: "text-slate-400", bg: "bg-slate-400/10", border: "border-slate-400/20" },
        { level: 5, name: "Apprentice", icon: Shield, color: "text-emerald-400", bg: "bg-emerald-400/10", border: "border-emerald-400/20" },
        { level: 10, name: "Proficient", icon: Zap, color: "text-blue-400", bg: "bg-blue-400/10", border: "border-blue-400/20" },
        { level: 20, name: "Specialist", icon: Medal, color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/20" },
        { level: 30, name: "Expert", icon: Trophy, color: "text-amber-400", bg: "bg-amber-400/10", border: "border-amber-400/20" },
        { level: 50, name: "Master", icon: Crown, color: "text-rose-400", bg: "bg-rose-400/10", border: "border-rose-400/20" },
    ];

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-200 relative">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Header Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand-900/50 to-transparent pointer-events-none" />

                <div className="p-8 pt-10 text-center relative">
                    {/* Main Badge */}
                    <div className="flex justify-center mb-6 scale-125">
                        <LevelBadge level={level} xp={currentXp} size="lg" />
                    </div>

                    <h2 className="text-2xl font-bold text-white font-display mb-1">
                        Level {level} {examName}
                    </h2>
                    <p className="text-slate-400 text-sm mb-8">
                        Total XP: <span className="text-white font-mono">{currentXp.toLocaleString()}</span>
                    </p>

                    {/* Progress Bar */}
                    <div className="mb-8">
                        <div className="flex justify-between text-xs font-bold text-slate-500 mb-2 uppercase tracking-wide">
                            <span>Lvl {level}</span>
                            <span>{Math.round(progress)}%</span>
                            <span>Lvl {level + 1}</span>
                        </div>
                        <div className="h-4 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                            <div
                                className="h-full bg-gradient-to-r from-brand-600 to-brand-400 shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all duration-1000 ease-out relative"
                                style={{ width: `${progress}%` }}
                            >
                                <div className="absolute inset-0 bg-white/20 animate-pulse-slow" />
                            </div>
                        </div>
                        <p className="text-xs text-center mt-3 text-slate-400">
                            <span className="text-brand-400 font-bold">{xpNeeded.toLocaleString()} XP</span> to reach Level {level + 1}
                        </p>
                    </div>

                    {/* Badges Grid */}
                    <div className="text-left bg-slate-800/50 rounded-xl p-5 border border-slate-700/50">
                        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Trophy className="w-4 h-4 text-brand-400" />
                            Earned Badges
                        </h3>

                        <div className="grid grid-cols-3 gap-3">
                            {allBadges.map((badge) => {
                                const isUnlocked = level >= badge.level;
                                const Icon = badge.icon;

                                return (
                                    <div
                                        key={badge.level}
                                        className={`flex flex-col items-center justify-center p-3 rounded-lg border transition-all ${isUnlocked
                                            ? `${badge.bg} ${badge.border} opacity-100`
                                            : "bg-slate-800 border-slate-700/50 opacity-40 grayscale"
                                            }`}
                                    >
                                        <Icon className={`w-6 h-6 mb-2 ${isUnlocked ? badge.color : "text-slate-500"}`} />
                                        <span className={`text-xs font-medium ${isUnlocked ? "text-white" : "text-slate-500"}`}>
                                            {badge.name}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
