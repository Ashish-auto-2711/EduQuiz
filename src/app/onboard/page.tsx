'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { AlertCircle, Check, Book, Sparkles, Compass } from 'lucide-react';

const SUBJECT_OPTIONS = ['Chemistry', 'Physics', 'Biology', 'Mathematics', 'English', 'Social Science'];
const SKILL_LEVELS = [
  { value: 'BEGINNER', label: 'Beginner', desc: 'Starting out or reviewing the basics' },
  { value: 'INTERMEDIATE', label: 'Intermediate', desc: 'Decent conceptual understanding' },
  { value: 'ADVANCED', label: 'Advanced', desc: 'Preparing for competitive exams (NEET/JEE)' },
];

export default function OnboardPage() {
  const router = useRouter();
  const { data: session, update } = useSession();

  const [username, setUsername] = useState('');
  const [skillLevel, setSkillLevel] = useState('BEGINNER');
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [bio, setBio] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const toggleSubject = (subject: string) => {
    if (selectedSubjects.includes(subject)) {
      setSelectedSubjects(selectedSubjects.filter((s) => s !== subject));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username) {
      setError('Please select a username');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const resp = await fetch('/api/user/onboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          skillLevel,
          favoriteSubjects: selectedSubjects,
          bio,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        setError(data.error || 'Failed to complete onboarding');
        setLoading(false);
      } else {
        // Update session so NextAuth knows the user now has a username
        await update({ username: data.user.username });
        
        // Go to dashboard
        router.push('/dashboard');
        router.refresh();
      }
    } catch (err: any) {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center radial-glow px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8 glass-panel p-10 rounded-2xl shadow-2xl relative">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-full bg-indigo-500/10 text-indigo-400 mb-4 animate-bounce">
            <Sparkles size={32} />
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight gradient-text">Welcome to EduQuiz!</h2>
          <p className="mt-2 text-sm text-slate-400">
            Let's customize your learning profile before you take your first quiz.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            <AlertCircle size={18} className="shrink-0" />
            <p>{error}</p>
          </div>
        )}

        <form className="mt-8 space-y-8" onSubmit={handleSubmit}>
          <div className="space-y-6">
            {/* Username Selection */}
            <div>
              <label htmlFor="user" className="block text-sm font-semibold text-slate-300 mb-2">
                Choose a Unique Username
              </label>
              <input
                id="user"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s+/g, ''))}
                className="block w-full px-4 py-3 border border-slate-800 bg-slate-900/60 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                placeholder="e.g. topper123"
              />
              <p className="mt-1.5 text-xs text-slate-500">Only lowercase letters, numbers, and dashes allowed.</p>
            </div>

            {/* Skill Level Dropdown */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Select Your Skill Level
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {SKILL_LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    onClick={() => setSkillLevel(level.value)}
                    className={`flex flex-col text-left p-4 rounded-xl border transition-all ${
                      skillLevel === level.value
                        ? 'border-indigo-500 bg-indigo-500/10 text-white shadow-lg shadow-indigo-500/10'
                        : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 text-slate-400'
                    }`}
                  >
                    <span className="font-semibold text-sm mb-1">{level.label}</span>
                    <span className="text-xs text-slate-500 leading-normal">{level.desc}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Favorite Subjects Selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-3">
                Favorite Subjects (Select multiple)
              </label>
              <div className="flex flex-wrap gap-3">
                {SUBJECT_OPTIONS.map((subject) => {
                  const selected = selectedSubjects.includes(subject);
                  return (
                    <button
                      key={subject}
                      type="button"
                      onClick={() => toggleSubject(subject)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-semibold border transition-all ${
                        selected
                          ? 'border-indigo-500 bg-indigo-500/15 text-indigo-300'
                          : 'border-slate-800 bg-slate-900/40 hover:bg-slate-900/60 text-slate-400'
                      }`}
                    >
                      <Book size={14} />
                      {subject}
                      {selected && <Check size={12} className="ml-1" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mini Bio */}
            <div>
              <label htmlFor="bio" className="block text-sm font-semibold text-slate-300 mb-2">
                Tell us about yourself (Optional bio)
              </label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                className="block w-full px-4 py-3 border border-slate-800 bg-slate-900/60 rounded-xl text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm"
                placeholder="I am preparing for boards / competitive exams..."
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-4 px-6 border border-transparent rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-600/30"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Let's Go! <Compass size={18} />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
