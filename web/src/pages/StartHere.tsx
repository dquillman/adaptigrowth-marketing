import { Link } from 'react-router-dom';
import { ChevronLeft, PlayCircle } from 'lucide-react';

interface VideoCardProps {
    number: number;
    title: string;
    videoUrl?: string;
}

function VideoCard({ number, title, videoUrl }: VideoCardProps) {
    return (
        <div className="bg-slate-800/50 rounded-2xl border border-slate-700/50 overflow-hidden">
            <div className="p-4 border-b border-slate-700/50">
                <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-full bg-brand-500/20 text-brand-400 flex items-center justify-center text-sm font-bold">
                        {number}
                    </span>
                    <h3 className="font-bold text-white">{title}</h3>
                </div>
            </div>
            <div className="aspect-video bg-slate-900 flex items-center justify-center">
                {videoUrl ? (
                    <iframe
                        src={videoUrl}
                        title={title}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    />
                ) : (
                    <div className="text-center text-slate-500">
                        <PlayCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Video coming soon</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function StartHere() {
    // Video URLs - update these when videos are hosted
    const videos = [
        {
            number: 1,
            title: "What ExamCoach Is & Why It's Different",
            videoUrl: undefined, // Replace with actual URL
        },
        {
            number: 2,
            title: "How ExamCoach Trains Your Thinking",
            videoUrl: undefined, // Replace with actual URL
        },
        {
            number: 3,
            title: "How to Use ExamCoach (2-Minute Start)",
            videoUrl: undefined, // Replace with actual URL
        },
    ];

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 font-sans selection:bg-brand-500/30">
            {/* Header */}
            <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
                <div className="mx-auto max-w-3xl px-6 h-20 flex items-center justify-between">
                    <Link to="/app" className="text-slate-400 hover:text-white transition-colors group flex items-center gap-2">
                        <div className="p-2 rounded-lg bg-slate-800 border border-slate-700 group-hover:border-slate-500 transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </div>
                        <span className="font-bold">Back to Dashboard</span>
                    </Link>
                    <h1 className="text-xl font-bold font-display text-white">
                        Start Here
                    </h1>
                </div>
            </header>

            <div className="mx-auto max-w-3xl px-6 py-12">
                {/* Intro */}
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold font-display text-white mb-4">New to ExamCoach?</h2>
                    <p className="text-lg text-slate-400 max-w-xl mx-auto">
                        Watch these short videos to understand how ExamCoach works and how to get the most out of your preparation.
                    </p>
                </div>

                {/* Video Cards */}
                <div className="space-y-6">
                    {videos.map((video) => (
                        <VideoCard
                            key={video.number}
                            number={video.number}
                            title={video.title}
                            videoUrl={video.videoUrl}
                        />
                    ))}
                </div>

                {/* CTA */}
                <div className="mt-12 text-center">
                    <Link
                        to="/app"
                        className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-8 py-4 rounded-xl font-bold hover:from-brand-500 hover:to-brand-400 transition-all shadow-lg hover:shadow-brand-500/25 group"
                    >
                        Start Practicing
                        <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                    </Link>
                </div>
            </div>
        </div>
    );
}
