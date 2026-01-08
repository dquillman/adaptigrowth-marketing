import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, CheckCircle, BookOpen, Brain, Clock } from 'lucide-react';
import { useAuth } from '../../App';
import { StudyPlanService } from '../../services/StudyPlanService';
import type { StudyPlan, DailyTask } from '../../types/StudyPlan';
import { useNavigate } from 'react-router-dom';
import MockExamConfigModal from '../../components/planner/MockExamConfigModal';

export default function StudySchedule() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [plan, setPlan] = useState<StudyPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [showExamConfig, setShowExamConfig] = useState(false);

    useEffect(() => {
        if (!user) return;

        const loadPlan = async () => {
            try {
                const currentPlan = await StudyPlanService.getCurrentPlan(user.uid);
                if (!currentPlan) {
                    navigate('/app/planner/setup');
                    return;
                }
                setPlan(currentPlan);
            } catch (error) {
                console.error("Failed to load plan", error);
            } finally {
                setLoading(false);
            }
        };

        loadPlan();
    }, [user, navigate]);

    if (loading) return <div className="p-8 text-center text-slate-400">Loading your personalized roadmap...</div>;
    if (!plan) return null;

    // Group tasks by date
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Sort tasks
    const sortedTasks = [...plan.tasks].sort((a, b) => a.date.getTime() - b.date.getTime());

    const todaysTasks = sortedTasks.filter(t => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() === today.getTime();
    });

    const upcomingTasks = sortedTasks.filter(t => {
        const d = new Date(t.date);
        d.setHours(0, 0, 0, 0);
        return d.getTime() > today.getTime();
    }).slice(0, 10); // Show next 10

    const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
        if (!plan || !user) return;

        // Optimistic update
        setPlan(prev => {
            if (!prev) return null;
            return {
                ...prev,
                tasks: prev.tasks.map(t =>
                    t.id === taskId ? { ...t, completed: !currentStatus } : t
                )
            };
        });

        try {
            await StudyPlanService.markTaskComplete(plan.id!, taskId, !currentStatus);
        } catch (error) {
            console.error("Failed to update task", error);
            // Revert on failure
            setPlan(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    tasks: prev.tasks.map(t =>
                        t.id === taskId ? { ...t, completed: currentStatus } : t
                    )
                };
            });
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-6xl mx-auto text-slate-100">
            <header className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold font-display text-white mb-2">My Study Plan</h1>
                    <p className="text-slate-400 flex items-center gap-2">
                        <CalendarIcon className="w-4 h-4" />
                        Target Exam Date: <span className="text-emerald-400 font-bold">{plan.examDate.toLocaleDateString()}</span>
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700 text-sm">
                        {plan.weeklyHours} hours / week
                    </div>
                    <button
                        onClick={() => navigate('/app/planner/setup', {
                            state: {
                                editMode: true,
                                currentSettings: {
                                    examDate: plan.examDate,
                                    weeklyHours: plan.weeklyHours
                                }
                            }
                        })}
                        className="bg-slate-700 hover:bg-slate-600 px-4 py-2 rounded-lg text-sm font-medium transition-colors border border-slate-600 hover:border-slate-500"
                    >
                        Edit Settings
                    </button>
                </div>
            </header>

            {/* Today's Mission */}
            <section className="mb-12">
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-indigo-500 rounded-full"></span>
                    Today's Mission
                </h2>

                {todaysTasks.length === 0 ? (
                    <div className="bg-slate-800/50 border border-slate-700 rounded-xl p-8 text-center text-slate-400">
                        <CheckCircle className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                        <p>No tasks scheduled for today. Enjoy your break!</p>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {todaysTasks.map(task => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onToggleComplete={() => handleToggleComplete(task.id, task.completed)}
                                onStartMock={() => setShowExamConfig(true)}
                            />
                        ))}
                    </div>
                )}
            </section>

            {/* Upcoming */}
            <section>
                <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <span className="w-2 h-8 bg-slate-600 rounded-full"></span>
                    Upcoming
                </h2>
                <div className="grid gap-4 opacity-75">
                    {upcomingTasks.map(task => (
                        <TaskCard key={task.id} task={task} isUpcoming />
                    ))}
                </div>
            </section>

            <MockExamConfigModal
                isOpen={showExamConfig}
                onClose={() => setShowExamConfig(false)}
                onStart={(config) => {
                    setShowExamConfig(false);
                    navigate('/app/simulator', {
                        state: config
                    });
                }}
            />
        </div>
    );
}

function TaskCard({ task, isUpcoming = false, onToggleComplete, onStartMock }: { task: DailyTask, isUpcoming?: boolean, onToggleComplete?: () => void, onStartMock?: () => void }) {
    const navigate = useNavigate();

    const handleAction = () => {
        if (task.activityType === 'mock-exam') {
            if (onStartMock) onStartMock();
        } else if (task.activityType === 'quiz') {
            navigate('/app/quiz');
        } else {
            // For reading/review, toggle complete
            if (onToggleComplete) {
                onToggleComplete();
            }
        }
    };

    return (
        <div className={`
            flex items-center gap-4 p-4 rounded-xl border transition-all
            ${isUpcoming ? 'bg-slate-900 border-slate-800' : 'bg-slate-800 border-slate-700 hover:border-indigo-500/50'}
        `}>
            {/* Icon based on Type */}
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 
                ${task.activityType === 'quiz' ? 'bg-purple-500/10 text-purple-400' :
                    task.activityType === 'mock-exam' ? 'bg-red-500/10 text-red-400' : 'bg-blue-500/10 text-blue-400'}
            `}>
                {task.activityType === 'quiz' ? <Brain className="w-5 h-5" /> :
                    task.activityType === 'mock-exam' ? <Clock className="w-5 h-5" /> : <BookOpen className="w-5 h-5" />}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded border 
                        ${task.domain === 'People' ? 'bg-pink-500/10 text-pink-400 border-pink-500/20' :
                            task.domain === 'Process' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                                task.domain === 'Mixed' ? 'bg-slate-500/10 text-slate-400 border-slate-500/20' :
                                    'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}
                    `}>
                        {task.domain}
                    </span>
                    {isUpcoming && <span className="text-xs text-slate-500">{task.date.toLocaleDateString()}</span>}
                </div>
                <h3 className="font-bold text-slate-200 truncate">{task.topic}</h3>
                <p className="text-xs text-slate-400 mt-1">
                    {task.activityType === 'reading'
                        ? "Read a chapter or watch a video lesson on this topic."
                        : task.activityType === 'quiz' ? "Take a quick quiz to test your retention."
                            : "Full length simulation to build endurance. Block out 4 hours."}
                </p>
            </div>

            <div className="flex items-center gap-4 text-slate-500 text-sm">
                <div className="flex items-center gap-1" title="Estimated duration">
                    <Clock className="w-4 h-4" />
                    {task.durationMinutes}m
                </div>
                {!isUpcoming && (
                    <button
                        onClick={handleAction}
                        className={`w-6 h-6 rounded-full border-2 border-slate-600 transition-colors flex items-center justify-center group
                            ${task.activityType === 'reading' ? 'hover:border-emerald-500 hover:bg-emerald-500/10' : 'hover:border-indigo-500 hover:bg-indigo-500/10'}
                        `}
                        title={task.activityType === 'reading' ? "Mark as Complete" : "Start Activity"}
                    >
                        {task.activityType === 'reading' ? (
                            <CheckCircle className={`w-4 h-4 text-emerald-500 transition-opacity ${task.completed ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} />
                        ) : (
                            <div className="w-2 h-2 bg-indigo-500 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                        )}

                    </button>
                )}
            </div>
        </div>
    );
}
