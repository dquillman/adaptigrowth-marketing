import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface FaqItem {
    question: string;
    answer: React.ReactNode;
}

const faqItems: FaqItem[] = [
    {
        question: "Why do I sometimes see the same question more than once?",
        answer: (
            <div className="space-y-4">
                <p>
                    ExamCoach may repeat a question to confirm mastery, not guessing.
                    Answering a question correctly once doesn't always prove understanding — consistency does.
                </p>
                <p>
                    The PMP exam evaluates your ability to apply concepts reliably across scenarios, and ExamCoach is designed to mirror that behavior.
                </p>
                <div>
                    <h4 className="font-semibold text-slate-300 mb-1">About the questions</h4>
                    <p>
                        All questions are original and written to PMP standards. They are modeled on real exam patterns and domains — not copied from actual PMP exam questions.
                    </p>
                </div>
                <p>
                    Seeing a repeated question is a signal that the system is validating understanding, not a limitation in the question pool.
                </p>
            </div>
        ),
    },
    {
        question: "Are these real PMP exam questions?",
        answer: (
            <div className="space-y-4">
                <p>No. ExamCoach does not use real PMP exam questions.</p>
                <p>
                    All questions are original, written to PMP standards, and designed to reflect the structure, difficulty, and reasoning patterns of the real exam. This allows you to practice thinking the way the PMP exam requires without relying on memorization or copyrighted material.
                </p>
                <p>
                    The goal is mastery of concepts and decision-making — not recall of specific questions.
                </p>
            </div>
        ),
    },
    {
        question: "What is Smart Practice?",
        answer: (
            <div className="space-y-4">
                <p>Smart Practice adapts to you.</p>
                <p>Instead of showing questions randomly, it prioritizes:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Concepts you've struggled with</li>
                    <li>Areas where consistency hasn't been proven yet</li>
                    <li>Patterns that indicate partial understanding</li>
                </ul>
                <p>
                    This means Smart Practice may feel harder at times — by design. It focuses your effort where it matters most, rather than where you're already comfortable.
                </p>
            </div>
        ),
    },
    {
        question: "Why do some quizzes feel harder than expected?",
        answer: (
            <div className="space-y-4">
                <p>Because difficulty isn't fixed — it's contextual.</p>
                <p>ExamCoach adjusts question selection based on:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Your recent answers</li>
                    <li>How consistently you apply concepts</li>
                    <li>The domain you're practicing</li>
                </ul>
                <p>
                    If a quiz feels harder, it usually means the system is testing depth of understanding, not surface knowledge. That's intentional — and closer to how the real PMP exam behaves.
                </p>
            </div>
        ),
    },
    {
        question: "What is a thinking trap?",
        answer: (
            <div className="space-y-4">
                <p>A thinking trap is a common but incorrect way of reasoning that feels right in the moment.</p>
                <p>The PMP exam frequently tests these traps — for example:</p>
                <ul className="list-disc pl-5 space-y-1">
                    <li>Choosing the most active response instead of the most appropriate one</li>
                    <li>Solving the symptom instead of addressing the process</li>
                    <li>Acting too early when analysis is required</li>
                </ul>
                <p>
                    ExamCoach highlights thinking traps to help you recognize and correct these patterns before exam day.
                </p>
            </div>
        ),
    },
    {
        question: "Is ExamCoach designed to work on a phone?",
        answer: (
            <div className="space-y-4">
                <p>Not at this time.</p>
                <p>
                    ExamCoach is currently designed for desktop and larger screens, where complex questions, explanations, and review workflows can be presented clearly and without compromise.
                </p>
                <p>
                    While some parts of the app may load on a phone, the experience is not optimized for small screens and may feel cramped or incomplete. For best results, we strongly recommend using a desktop or laptop.
                </p>
                <p>
                    Mobile support is something we may explore in the future, but for now our focus is on providing the best possible learning experience on larger screens.
                </p>
            </div>
        ),
    },
];

export default function Faq() {
    const [openIndex, setOpenIndex] = useState<number | null>(0);

    const toggle = (index: number) => {
        setOpenIndex(openIndex === index ? null : index);
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 pb-24">
            <div className="max-w-3xl mx-auto px-6 py-12">

                {/* Header */}
                <div className="mb-12">
                    <h1 className="text-3xl font-bold text-white mb-2">Frequently Asked Questions</h1>
                    <p className="text-slate-400">How ExamCoach works — clearly and intentionally.</p>
                </div>

                {/* FAQ Accordion */}
                <div className="space-y-3">
                    {faqItems.map((item, index) => {
                        const isOpen = openIndex === index;

                        return (
                            <div
                                key={index}
                                className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden"
                            >
                                <button
                                    onClick={() => toggle(index)}
                                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-slate-750 transition-colors"
                                >
                                    <span className="font-medium text-white pr-4">{item.question}</span>
                                    {isOpen
                                        ? <ChevronUp className="w-5 h-5 text-slate-400 shrink-0" />
                                        : <ChevronDown className="w-5 h-5 text-slate-400 shrink-0" />
                                    }
                                </button>
                                {isOpen && (
                                    <div className="px-6 pb-5 border-t border-slate-700/50">
                                        <div className="text-sm text-slate-400 leading-relaxed pt-4">
                                            {item.answer}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <p className="text-sm text-slate-500 mt-10 text-center italic">
                    If something feels unexpected, it's usually intentional — and designed to prepare you for the real exam.
                </p>

            </div>
        </div>
    );
}
