import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';

export default function QuestionEditor() {
    const [formData, setFormData] = useState({
        examId: 'pmp_2024',
        domain: '',
        objectiveId: '',
        stem: '',
        options: ['', '', '', ''],
        correctAnswer: '0',
        explanation: '',
        difficulty: 1,
        status: 'draft',
        imageUrl: '' // Add imageUrl to state
    });
    const [submissionStatus, setSubmissionStatus] = useState<string>('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmissionStatus('Submitting...');
        try {
            await addDoc(collection(db, 'questions'), {
                ...formData,
                difficulty: Number(formData.difficulty),
                lastUpdated: new Date()
            });
            setSubmissionStatus('Success: Question added!');
            // Reset form or redirect
        } catch (error) {
            console.error('Error adding question: ', error);
            setSubmissionStatus('Error: ' + (error as Error).message);
        }
    };

    const updateOption = (index: number, value: string) => {
        const newOptions = [...formData.options];
        newOptions[index] = value;
        setFormData({ ...formData, options: newOptions });
    };

    return (
        <div className="max-w-4xl mx-auto bg-white p-8 rounded-lg shadow">
            <h2 className="text-2xl font-bold mb-6">Add New Question</h2>
            {submissionStatus && (
                <div className={`p-4 mb-4 rounded ${submissionStatus.startsWith('Success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {submissionStatus}
                </div>
            )}
            <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Exam ID</label>
                        <input
                            type="text"
                            value={formData.examId}
                            onChange={(e) => setFormData({ ...formData, examId: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Domain</label>
                        <input
                            type="text"
                            value={formData.domain}
                            onChange={(e) => setFormData({ ...formData, domain: e.target.value })}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                        />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Question Stem</label>
                    <textarea
                        value={formData.stem}
                        onChange={(e) => setFormData({ ...formData, stem: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                </div>

                <div className="space-y-4">
                    <label className="block text-sm font-medium text-gray-700">Options</label>
                    {formData.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-4">
                            <input
                                type="radio"
                                name="correctAnswer"
                                checked={formData.correctAnswer === index.toString()}
                                onChange={() => setFormData({ ...formData, correctAnswer: index.toString() })}
                            />
                            <input
                                type="text"
                                value={option}
                                onChange={(e) => updateOption(index, e.target.value)}
                                placeholder={`Option ${index + 1}`}
                                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                            />
                        </div>
                    ))}
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Explanation</label>
                    <textarea
                        value={formData.explanation}
                        onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
                        rows={3}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700">Image URL (Optional)</label>
                    <input
                        type="text"
                        value={formData.imageUrl || ''}
                        onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                        placeholder="https://..."
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 border p-2"
                    />
                    {formData.imageUrl && (
                        <div className="mt-2">
                            <p className="text-xs text-gray-500 mb-1">Preview:</p>
                            <img
                                src={formData.imageUrl}
                                alt="Question visualization"
                                className="w-full h-48 object-cover rounded-lg border border-gray-300"
                                onError={(e) => (e.currentTarget.style.display = 'none')}
                            />
                        </div>
                    )}
                </div>

                <button
                    type="submit"
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                    Save Question
                </button>
            </form>
        </div>
    );
}
