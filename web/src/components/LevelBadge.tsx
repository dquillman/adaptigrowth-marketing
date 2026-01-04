

interface LevelBadgeProps {
    level: number;
    xp: number;
    size?: 'sm' | 'md' | 'lg';
}

export default function LevelBadge({ level, xp, size = 'md' }: LevelBadgeProps) {
    const sizeClasses = {
        sm: 'w-8 h-8 text-xs',
        md: 'w-12 h-12 text-sm',
        lg: 'w-16 h-16 text-base'
    };

    // Calculate progress to next level
    // Level L starts at (L-1)^2 * 100
    // Next Level L+1 starts at L^2 * 100
    const prevLevelXp = Math.pow(level - 1, 2) * 100;
    const nextLevelXp = Math.pow(level, 2) * 100;
    const levelRange = nextLevelXp - prevLevelXp;
    const progress = Math.min(100, Math.max(0, ((xp - prevLevelXp) / levelRange) * 100));

    return (
        <div className="relative flex items-center justify-center group cursor-help">
            {/* Outer Ring (Progress) */}
            <div className={`${sizeClasses[size]} relative rounded-full flex items-center justify-center bg-slate-800 border-2 border-slate-700 overflow-visible`}>
                <svg className="absolute inset-0 w-full h-full -rotate-90 pointer-events-none overflow-visible" viewBox="0 0 36 36">
                    {/* Background Circle */}
                    <path
                        className="text-slate-700"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    />
                    {/* Progress Circle */}
                    <path
                        className="text-amber-400 drop-shadow-[0_0_2px_rgba(251,191,36,0.5)] transition-all duration-1000 ease-out"
                        strokeDasharray={`${progress}, 100`}
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                    />
                </svg>

                {/* Inner Level Number */}
                <div className="absolute inset-0 flex items-center justify-center font-bold text-white font-display z-10">
                    {level}
                </div>
            </div>

            {/* Tooltip */}
            <div className="absolute top-full mt-2 hidden group-hover:block bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-slate-300 w-32 z-50 text-center shadow-xl">
                <p className="font-bold text-white mb-1">Level {level}</p>
                <p>{xp} XP Total</p>
                <p className="text-amber-400">{Math.round(nextLevelXp - xp)} XP to Lvl {level + 1}</p>
            </div>
        </div>
    );
}
