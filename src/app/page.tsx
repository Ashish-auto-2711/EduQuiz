'use client';

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Menu,
  X,
  Bell,
  Coins,
  Award,
  ChevronRight,
  TrendingUp,
  Star,
  Users,
  CheckCircle,
  HelpCircle,
  ArrowRight,
  Flame,
  Search,
  BookOpen,
  ArrowUp,
  Trophy,
  Shield,
  Zap,
} from 'lucide-react';

const CATEGORIES = [
  { id: 'sci', name: 'Science', count: 18, color: 'from-blue-600 to-indigo-600', icon: BookOpen },
  { id: 'math', name: 'Mathematics', count: 14, color: 'from-purple-600 to-pink-600', icon: Award },
  { id: 'gk', name: 'General Knowledge', count: 22, color: 'from-emerald-600 to-teal-600', icon: Trophy },
  { id: 'code', name: 'Coding', count: 16, color: 'from-amber-600 to-orange-600', icon: Zap },
  { id: 'hist', name: 'History', count: 12, color: 'from-red-600 to-rose-600', icon: BookOpen },
  { id: 'sports', name: 'Sports', count: 10, color: 'from-indigo-600 to-cyan-600', icon: Trophy },
  { id: 'ent', name: 'Entertainment', count: 15, color: 'from-fuchsia-600 to-pink-600', icon: Star },
  { id: 'cur', name: 'Current Affairs', count: 25, color: 'from-violet-600 to-purple-600', icon: TrendingUp },
];

const TRENDING_QUIZZES = [
  { id: 'q1', title: 'Sexual Reproduction in Flowering Plants', category: 'Biology', difficulty: 'NEET', attempts: '1.4k', accuracy: '72%', time: '15 mins' },
  { id: 'q2', title: 'Electrochemistry Concept Builder', category: 'Chemistry', difficulty: 'Hard', attempts: '950', accuracy: '64%', time: '20 mins' },
  { id: 'q3', title: 'Electric Charges and Fields', category: 'Physics', difficulty: 'Moderate', attempts: '2.1k', accuracy: '78%', time: '12 mins' },
  { id: 'q4', title: 'Basic Molarity & Molality Quiz', category: 'Chemistry', difficulty: 'Easy', attempts: '3.2k', accuracy: '85%', time: '10 mins' },
];

const LEADERBOARD_PREVIEW = [
  { rank: 1, name: 'Ananya Sharma', points: '14,820', accuracy: '96%', avatar: '👩‍🎓', badge: '🥇' },
  { rank: 2, name: 'Rahul Verma', points: '13,950', accuracy: '92%', avatar: '🧑‍💻', badge: '🥈' },
  { rank: 3, name: 'Priya Patel', points: '13,100', accuracy: '91%', avatar: '👩‍⚕️', badge: '🥉' },
  { rank: 4, name: 'Amit Singh', points: '11,400', accuracy: '88%', avatar: '🧑‍🎓', badge: '' },
  { rank: 5, name: 'Sneha Rao', points: '10,950', accuracy: '87%', avatar: '👩‍💻', badge: '' },
];

const FAQS = [
  { q: 'Is EduQuiz free to use?', a: 'Yes! You can play hundreds of quizzes and practice papers completely free. We also offer a Premium tier with advanced time analysis, personalized recommendations, and unlimited attempts.' },
  { q: 'How does the global leaderboard work?', a: 'Leaderboard points (XP) are calculated based on your accuracy, speed, and the difficulty level of the quizzes you attempt. Points reset weekly for the tournament, but your all-time score remains.' },
  { q: 'Can I request a custom subject or chapter?', a: 'Absolutely! Our editors frequently upload new NCERT questions and curriculum guides. You can drop us a suggestion through our contact page.' },
  { q: 'What is a Streak and how do I preserve it?', a: 'Your Streak tracks how many consecutive days you attempt a quiz. Premium members get one free "streak freeze" per week to protect their progress even if they miss a day.' },
  { q: 'Is there an offline mode?', a: 'Yes, our platform is PWA-enabled. You can download quiz packs on your mobile device and play them offline. Your score will sync automatically once you are back online.' },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('Trending');
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [scrolled, setScrolled] = useState(false);

  // Rotating quiz preview animation states
  const [quizQuestionIndex, setQuizQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [quizCardPhase, setQuizCardPhase] = useState<'typing' | 'answer' | 'correct'>('typing');

  const previewQuestions = [
    { q: 'Which organelle is known as the powerhouse of the cell?', options: ['Nucleus', 'Mitochondria', 'Ribosome', 'Golgi Body'], correct: 'Mitochondria' },
    { q: 'What is the SI unit of electric current?', options: ['Volt', 'Ohm', 'Ampere', 'Watt'], correct: 'Ampere' },
    { q: 'Molarity is defined as moles of solute per...?', options: ['kg of solvent', 'litre of solution', 'kg of solution', 'litre of solvent'], correct: 'litre of solution' },
  ];

  // Handle scroll trigger for navbar shadow
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Automated Quiz Card Simulation
  useEffect(() => {
    const currentQ = previewQuestions[quizQuestionIndex];
    setSelectedOption(null);
    setQuizCardPhase('typing');

    // Simulate thinking/typing answers
    const selectTimer = setTimeout(() => {
      setSelectedOption(currentQ.correct);
      setQuizCardPhase('answer');
    }, 2000);

    const correctTimer = setTimeout(() => {
      setQuizCardPhase('correct');
    }, 3200);

    const nextQuestionTimer = setTimeout(() => {
      setQuizQuestionIndex((prev) => (prev + 1) % previewQuestions.length);
    }, 5500);

    return () => {
      clearTimeout(selectTimer);
      clearTimeout(correctTimer);
      clearTimeout(nextQuestionTimer);
    };
  }, [quizQuestionIndex]);

  return (
    <div className="relative min-h-screen flex flex-col font-sans">
      {/* Animated GIF Background with Black Overlay Cover */}
      <div 
        className="absolute inset-0 bg-cover bg-center -z-20 transition-all duration-700"
        style={{ backgroundImage: `url('https://i.ibb.co/gLxNYHDY/Animate-them.gif')` }}
      ></div>
      {/* Black overlap to darken the GIF background */}
      <div className="absolute inset-0 bg-black/85 -z-10"></div>

      {/* 1. NAVBAR */}
      <nav className={`fixed top-0 inset-x-0 z-50 transition-all duration-300 ${scrolled ? 'glass-panel py-3 shadow-lg' : 'bg-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-black tracking-tight gradient-text">EduQuiz</span>
          </Link>

          {/* Desktop Menu */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="#categories" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Categories</Link>
            <Link href="#trending" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Trending</Link>
            <Link href="#leaderboard" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Leaderboard</Link>
            <Link href="#pricing" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">Pricing</Link>
            <Link href="#faq" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors">FAQ</Link>
          </div>

          {/* Right side auth status */}
          <div className="flex items-center gap-4">
            {session ? (
              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold">
                  <Coins size={14} />
                  <span>250</span>
                </div>
                <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold">
                  <Award size={14} />
                  <span>1.2k XP</span>
                </div>
                <button className="text-slate-400 hover:text-white relative p-1.5 rounded-full bg-slate-900/60 border border-slate-800 transition-colors">
                  <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-indigo-500 rounded-full"></span>
                  <Bell size={18} />
                </button>
                <div className="relative group">
                  <button className="w-9 h-9 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-sm text-indigo-300 select-none">
                    {session.user?.name ? session.user.name[0].toUpperCase() : 'U'}
                  </button>
                  <div className="absolute right-0 mt-2 w-48 rounded-xl glass-panel p-2 shadow-2xl opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all duration-200">
                    <Link href="/dashboard" className="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-800 rounded-lg transition-colors">Dashboard</Link>
                    <button onClick={() => signOut({ callbackUrl: '/' })} className="w-full text-left block px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">Sign Out</button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white px-4 py-2 transition-colors">Login</Link>
                <Link href="/signup" className="text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 px-5 py-2 rounded-xl transition-all shadow-md shadow-indigo-600/20">Sign Up</Link>
              </div>
            )}

            {/* Mobile hamburger */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden text-slate-300 hover:text-white p-1">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Full-Screen Overlay Nav */}
        {mobileMenuOpen && (
          <div className="md:hidden fixed inset-0 top-[65px] bg-slate-950/98 backdrop-blur-lg flex flex-col p-6 space-y-6 z-40 transition-all duration-300 border-t border-slate-900 animate-fade-in">
            <Link onClick={() => setMobileMenuOpen(false)} href="#categories" className="text-lg font-semibold text-slate-300 hover:text-white">Categories</Link>
            <Link onClick={() => setMobileMenuOpen(false)} href="#trending" className="text-lg font-semibold text-slate-300 hover:text-white">Trending</Link>
            <Link onClick={() => setMobileMenuOpen(false)} href="#leaderboard" className="text-lg font-semibold text-slate-300 hover:text-white">Leaderboard</Link>
            <Link onClick={() => setMobileMenuOpen(false)} href="#pricing" className="text-lg font-semibold text-slate-300 hover:text-white">Pricing</Link>
            <Link onClick={() => setMobileMenuOpen(false)} href="#faq" className="text-lg font-semibold text-slate-300 hover:text-white">FAQ</Link>
            {session && (
              <div className="pt-4 border-t border-slate-900 flex flex-col gap-4">
                <Link onClick={() => setMobileMenuOpen(false)} href="/dashboard" className="text-lg font-semibold text-indigo-400">Go to Dashboard</Link>
                <button onClick={() => { setMobileMenuOpen(false); signOut({ callbackUrl: '/' }); }} className="text-left text-lg font-semibold text-red-400">Sign Out</button>
              </div>
            )}
          </div>
        )}
      </nav>

      {/* 2. HERO SECTION */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-28 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            {/* Left Column Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 text-xs font-bold animate-pulse">
                <Flame size={12} className="shrink-0" />
                <span>Weekly Tournament is Live!</span>
              </div>
              <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight leading-[1.1] text-white">
                Test Your Knowledge. <br />
                <span className="gradient-text">Climb the Leaderboard.</span> <br />
                Learn Smarter.
              </h1>
              <p className="text-lg text-slate-400 max-w-xl mx-auto lg:mx-0">
                Master your syllabus with high-quality NCERT/CBSE practice tests, compete with peers, and level up with our gamified platform.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link href={session ? "/dashboard" : "/signup"} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.03] text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all text-center animate-pulse">
                  Start a Free Quiz
                </Link>
                <Link href="#categories" className="px-8 py-4 border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 text-slate-300 font-semibold rounded-xl text-center transition-all">
                  Explore Categories
                </Link>
              </div>

              {/* Trust Indicators */}
              <div className="pt-4 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-slate-400 text-sm">
                <div className="flex items-center gap-1.5">
                  <CheckCircle size={16} className="text-emerald-500" />
                  <span>10,000+ Quizzes Taken</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Users size={16} className="text-indigo-400" />
                  <span>5,000+ Active Learners</span>
                </div>
                <div className="flex items-center text-amber-500">
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" />
                  <Star size={16} fill="currentColor" className="opacity-50" />
                  <span className="ml-1 text-slate-300 font-semibold">4.8 Rating</span>
                </div>
              </div>
            </div>

            {/* Right Column Quiz Simulation */}
            <div className="lg:col-span-5 flex justify-center">
              <div className="w-full max-w-sm glass-panel p-6 rounded-2xl shadow-2xl relative border-indigo-500/20">
                {/* Floating XP bubble */}
                <div className="absolute -top-3 -right-3 px-3 py-1.5 rounded-full bg-amber-500 text-slate-950 font-black text-xs shadow-lg animate-bounce">
                  +50 XP
                </div>

                <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-4">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Live Preview</span>
                  <div className="flex items-center gap-1 text-indigo-400 text-xs font-bold">
                    <span className="w-2 h-2 rounded-full bg-indigo-400 animate-ping"></span>
                    Question {quizQuestionIndex + 1}/3
                  </div>
                </div>

                <div className="min-h-[140px] space-y-4">
                  <h3 className="text-base font-semibold leading-relaxed text-slate-100">
                    {previewQuestions[quizQuestionIndex].q}
                  </h3>

                  <div className="space-y-2">
                    {previewQuestions[quizQuestionIndex].options.map((opt, i) => {
                      const isSelected = selectedOption === opt;
                      const isCorrectPhase = quizCardPhase === 'correct' && opt === previewQuestions[quizQuestionIndex].correct;
                      
                      return (
                        <div
                          key={i}
                          className={`w-full py-2.5 px-4 rounded-xl border text-sm font-medium transition-all ${
                            isCorrectPhase
                              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                              : isSelected
                              ? 'border-indigo-500/40 bg-indigo-500/10 text-indigo-400'
                              : 'border-slate-800 bg-slate-900/30 text-slate-400'
                          }`}
                        >
                          <div className="flex justify-between items-center">
                            <span>{opt}</span>
                            {isCorrectPhase && <span className="text-xs font-bold">Correct ✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 3. QUICK STATS BAR */}
      <section className="py-12 bg-slate-950/60 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">50K+</p>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-1">Total Users</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">120K+</p>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-1">Quizzes Completed</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">1.5M+</p>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-1">Questions Solved</p>
            </div>
            <div>
              <p className="text-3xl sm:text-4xl font-extrabold text-white">100+</p>
              <p className="text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mt-1">Chapters Covered</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. CATEGORY SHOWCASE */}
      <section id="categories" className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-12">
          <div>
            <h2 className="text-3xl font-extrabold text-white">Explore Quiz Categories</h2>
            <p className="text-slate-400 mt-2 text-sm leading-relaxed">Choose a domain and challenge your conceptual clarity.</p>
          </div>
          <Link href="/categories" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1 mt-4 md:mt-0">
            View All Categories <ChevronRight size={16} />
          </Link>
        </div>

        {/* Grid and Mobile Scroll Container */}
        <div className="flex overflow-x-auto md:grid md:grid-cols-4 gap-6 pb-6 md:pb-0 scroll-smooth snap-x snap-mandatory">
          {CATEGORIES.map((cat, idx) => {
            const IconComponent = cat.icon;
            return (
              <div
                key={cat.id}
                className="min-w-[260px] md:min-w-0 snap-center glass-panel p-6 rounded-2xl glass-panel-hover flex flex-col justify-between group cursor-pointer"
              >
                <div>
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cat.color} flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-all duration-300`}>
                    <IconComponent size={24} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-100">{cat.name}</h3>
                  <p className="text-slate-500 text-xs mt-1.5">{cat.count} practice quizzes available</p>
                </div>
                <div className="mt-8 flex items-center gap-1.5 text-xs font-bold text-slate-400 group-hover:text-indigo-400 transition-colors">
                  Browse Quizzes <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 5. FEATURED / TRENDING QUIZZES */}
      <section id="trending" className="py-20 bg-slate-950/40 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12">
            <div>
              <h2 className="text-3xl font-extrabold text-white">Trending This Week 🔥</h2>
              <p className="text-slate-400 mt-2 text-sm">Join thousands of students competing in this week's featured topics.</p>
            </div>
            {/* Filter Tabs */}
            <div className="flex gap-1.5 p-1 rounded-xl bg-slate-900/60 border border-slate-800 mt-6 md:mt-0">
              {['Trending', 'New', 'Most Played'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {TRENDING_QUIZZES.map((quiz) => (
              <div key={quiz.id} className="glass-panel p-6 rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all duration-300">
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="px-2.5 py-0.5 rounded-full bg-slate-900/80 text-indigo-400 border border-slate-800 text-[10px] font-extrabold uppercase tracking-wider">{quiz.category}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase ${
                      quiz.difficulty === 'NEET' || quiz.difficulty === 'Hard' ? 'bg-red-500/10 text-red-400 border border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    }`}>
                      {quiz.difficulty}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-100 leading-normal line-clamp-2 min-h-[44px]">
                    {quiz.title}
                  </h3>
                  <div className="flex items-center justify-between text-slate-500 text-xs mt-6">
                    <span>{quiz.attempts} plays</span>
                    <span>Accuracy: {quiz.accuracy}</span>
                  </div>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-900">
                  <Link href={`/quiz/${quiz.id}`} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-slate-900/80 hover:bg-indigo-600 border border-slate-800 text-xs font-bold text-slate-300 hover:text-white hover:border-indigo-600 transition-all">
                    Play Now
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. HOW IT WORKS */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white">How It Works</h2>
          <p className="text-slate-400 mt-2 text-sm max-w-md mx-auto">Get started in under a minute and build your knowledge daily.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
          {[
            { step: '1', title: 'Sign Up', desc: 'Create your account to track your progress & badges.' },
            { step: '2', title: 'Pick a Quiz', desc: 'Select from thousands of high-yield NCERT chapters.' },
            { step: '3', title: 'Earn XP & Coins', desc: 'Answer correctly to earn XP multipliers and daily freeze coins.' },
            { step: '4', title: 'Climb the Rank', desc: 'Top the league to claim weekly tournament accolades.' },
          ].map((item, idx) => (
            <div key={idx} className="text-center space-y-4 relative z-10">
              <div className="w-14 h-14 rounded-full bg-slate-900 border-2 border-indigo-500/30 flex items-center justify-center text-white font-extrabold mx-auto shadow-lg shadow-indigo-500/5 relative">
                <span className="text-lg gradient-text font-black">{item.step}</span>
              </div>
              <h3 className="text-base font-bold text-slate-100">{item.title}</h3>
              <p className="text-slate-500 text-xs leading-relaxed max-w-xs mx-auto">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* 7. LIVE LEADERBOARD PREVIEW */}
      <section id="leaderboard" className="py-20 bg-slate-950/40 border-y border-slate-900">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-white">This Week's Top Performers</h2>
            <p className="text-slate-400 mt-2 text-sm">Meet the conceptual champions dominating the weekly tournament.</p>
          </div>

          <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl border-slate-800">
            <div className="divide-y divide-slate-900">
              {LEADERBOARD_PREVIEW.map((user) => (
                <div key={user.rank} className="flex items-center justify-between p-5 hover:bg-slate-900/40 transition-colors">
                  <div className="flex items-center gap-4">
                    <span className="w-6 text-center text-sm font-extrabold text-slate-500">
                      {user.badge ? user.badge : user.rank}
                    </span>
                    <span className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-lg shadow-md">
                      {user.avatar}
                    </span>
                    <div>
                      <p className="text-sm font-bold text-slate-200">{user.name}</p>
                      <p className="text-[10px] text-slate-500">Avg Accuracy: {user.accuracy}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-indigo-400">{user.points} XP</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="text-center mt-8">
            <Link href="/leaderboard" className="inline-flex items-center gap-2 px-6 py-3 border border-slate-800 bg-slate-900/50 hover:bg-slate-900 text-slate-300 font-bold rounded-xl text-sm transition-all">
              View Full Leaderboard <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. GAMIFICATION TEASER */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="glass-panel p-8 md:p-12 rounded-3xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center border-indigo-500/10">
          <div className="lg:col-span-7 space-y-6">
            <div className="inline-flex p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold items-center gap-1.5">
              <Flame size={14} /> Streak Booster
            </div>
            <h2 className="text-3xl font-extrabold text-white leading-normal">
              Earn XP, Unlock Achievements, & Level Up.
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed max-w-md">
              Complete daily challenges, maintain your streaks like Duolingo, unlock 25+ unique achievements, and rise from Bronze to Diamond leagues.
            </p>
            <div className="flex flex-wrap gap-6 pt-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-amber-400 font-bold">🔥</div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Daily Streaks</p>
                  <p className="text-[10px] text-slate-500">Protect with streak freeze</p>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center text-indigo-400 font-bold">💎</div>
                <div>
                  <p className="text-xs font-bold text-slate-200">League Divisions</p>
                  <p className="text-[10px] text-slate-500">Rise to Diamond</p>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 flex justify-center">
            {/* Badges showcase Grid */}
            <div className="grid grid-cols-3 gap-4">
              {['Speed Demon', 'Perfect Score', '7-Day Streak', 'Comeback King', 'Elite Scholar', 'Exam Master'].map((badge, idx) => (
                <div key={idx} className="glass-panel p-4 rounded-xl text-center space-y-2 flex flex-col items-center justify-center border-slate-800/80">
                  <div className="w-10 h-10 rounded-full bg-slate-950 flex items-center justify-center text-lg shadow-inner">
                    {idx === 0 ? '⚡' : idx === 1 ? '💯' : idx === 2 ? '🔥' : idx === 3 ? '👑' : idx === 4 ? '🧠' : '🎯'}
                  </div>
                  <span className="text-[10px] font-bold text-slate-300 block line-clamp-1">{badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 9. TESTIMONIALS */}
      <section className="py-20 bg-slate-950/40 border-y border-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">Trusted by Thousands of Students</h2>
            <p className="text-slate-400 mt-2 text-sm">Here is what our top scorers say about their experience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'Karan Malhotra', role: 'NEET Aspirant', text: 'The chapter-wise Biology quizzes are identical to the actual exam pattern. The explanations helped clear my concepts instantly!', stars: 5 },
              { name: 'Riya Gupta', role: 'Class 12 Student', text: 'I love the daily streak and tournament mode. It actually makes studying Chemistry topics feel like a game.', stars: 5 },
              { name: 'Dr. Shruti Sen', role: 'School Teacher', text: 'I recommend EduQuiz to all my physics students. The numericals quizzes are extremely well structured.', stars: 5 },
            ].map((review, idx) => (
              <div key={idx} className="glass-panel p-6 rounded-2xl flex flex-col justify-between border-slate-800/60">
                <div className="space-y-4">
                  <div className="flex text-amber-500">
                    {Array.from({ length: review.stars }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" />
                    ))}
                  </div>
                  <p className="text-slate-300 text-sm leading-relaxed italic">"{review.text}"</p>
                </div>
                <div className="mt-8 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center font-bold text-sm text-indigo-400">
                    {review.name[0]}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-200">{review.name}</p>
                    <p className="text-[10px] text-slate-500">{review.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 10. PRICING TEASER */}
      <section id="pricing" className="py-20 max-w-5xl mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-extrabold text-white">Simple, transparent pricing</h2>
          <p className="text-slate-400 mt-2 text-sm">Start practicing for free, or unlock advanced features.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Free Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-slate-850 relative">
            <div>
              <h3 className="text-xl font-bold text-white">Free Plan</h3>
              <p className="text-slate-500 text-xs mt-2">Perfect for casual self-assessments.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">₹0</span>
                <span className="text-slate-500 text-sm"> / forever</span>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-400">
                <li className="flex items-center gap-2">✓ Access to basic MCQs</li>
                <li className="flex items-center gap-2">✓ Chapterwise selection limits</li>
                <li className="flex items-center gap-2">✓ Standard leaderboard lists</li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-900">
              <Link href="/signup" className="w-full block py-3 rounded-xl border border-slate-800 hover:bg-slate-900 text-center text-sm font-bold text-slate-300 transition-all">
                Get Started for Free
              </Link>
            </div>
          </div>

          {/* Premium Tier */}
          <div className="glass-panel p-8 rounded-2xl flex flex-col justify-between border-indigo-500/30 relative bg-indigo-950/10 shadow-2xl shadow-indigo-600/5">
            <div className="absolute -top-3.5 right-6 px-3 py-1 rounded-full bg-indigo-600 text-white font-extrabold text-xs tracking-wider uppercase">
              POPULAR
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Premium Plan</h3>
              <p className="text-indigo-400 text-xs mt-2">For serious board & competitive preparation.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-white">₹199</span>
                <span className="text-slate-500 text-sm"> / month</span>
              </div>
              <ul className="space-y-3.5 text-sm text-slate-300">
                <li className="flex items-center gap-2 text-indigo-300">★ Unlimited daily quizzes</li>
                <li className="flex items-center gap-2">✓ Detailed time-spent analysis heatmap</li>
                <li className="flex items-center gap-2">✓ Daily Streak Freeze (Duolingo Style)</li>
                <li className="flex items-center gap-2">✓ Real-time 1v1 live multiplayer matching</li>
                <li className="flex items-center gap-2">✓ Downloadable PDF scorecards</li>
              </ul>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-900">
              <Link href="/pricing" className="w-full block py-3 bg-indigo-600 hover:bg-indigo-500 rounded-xl text-center text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition-all">
                Upgrade to Premium
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 11. FAQ SECTION */}
      <section id="faq" className="py-20 bg-slate-950/40 border-y border-slate-900">
        <div className="max-w-3xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-extrabold text-white">Frequently Asked Questions</h2>
            <p className="text-slate-400 mt-2 text-sm">Have queries about the league or questions? We've got answers.</p>
          </div>

          <div className="space-y-4">
            {FAQS.map((faq, idx) => {
              const isOpen = activeFaq === idx;
              return (
                <div key={idx} className="glass-panel rounded-xl overflow-hidden border-slate-850/60 transition-all">
                  <button
                    onClick={() => setActiveFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-200 hover:text-white transition-colors"
                  >
                    <span>{faq.q}</span>
                    <HelpCircle size={18} className="text-slate-500" />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 pt-1 text-sm text-slate-400 leading-relaxed border-t border-slate-900/60 bg-slate-900/20">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 12. FINAL CTA BANNER */}
      <section className="py-24 max-w-5xl mx-auto px-4">
        <div className="glass-panel p-10 md:p-16 rounded-3xl text-center space-y-6 border-indigo-500/20 bg-gradient-to-br from-indigo-950/15 via-slate-950 to-slate-950 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-radial-glow opacity-30 pointer-events-none"></div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight relative z-10">
            Ready to Test Your Conceptual Clarity?
          </h2>
          <p className="text-slate-400 text-sm max-w-md mx-auto relative z-10">
            Get started right now. Log in using Google in 1 tap, complete onboarding, and attempt your first Chapter Quiz.
          </p>
          <div className="relative z-10 pt-4">
            <Link href={session ? "/dashboard" : "/signup"} className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all inline-flex items-center gap-1.5 hover:scale-[1.03]">
              Get Started for Free <ChevronRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      {/* 13. FOOTER */}
      <footer className="bg-slate-950 border-t border-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-12">
          {/* Logo tagline */}
          <div className="space-y-4">
            <span className="text-2xl font-black gradient-text">EduQuiz</span>
            <p className="text-slate-500 text-xs leading-normal">
              High-converting, gamified concept testing platform for modern boards and exam preparation.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Product</h4>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><Link href="#categories" className="hover:text-white transition-colors">Categories</Link></li>
              <li><Link href="#leaderboard" className="hover:text-white transition-colors">Leaderboard</Link></li>
              <li><Link href="#pricing" className="hover:text-white transition-colors">Pricing Options</Link></li>
            </ul>
          </div>

          {/* Company links */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Company</h4>
            <ul className="space-y-2.5 text-xs text-slate-500">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact Support</a></li>
              <li><a href="#" className="hover:text-white transition-colors">System Status</a></li>
            </ul>
          </div>

          {/* Newsletter signup */}
          <div>
            <h4 className="text-sm font-semibold uppercase tracking-wider text-slate-300 mb-4">Newsletter</h4>
            <p className="text-slate-500 text-xs mb-4 leading-normal">Get updates on new chapters & syllabus guides.</p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="name@email.com"
                className="flex-grow px-3 py-2 text-xs border border-slate-800 bg-slate-900/60 rounded-lg text-slate-350 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold transition-colors">
                Subscribe
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-16 pt-8 border-t border-slate-900 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-600">
          <p>© {new Date().getFullYear()} EduQuiz. All rights reserved.</p>
          <div className="flex gap-6 mt-4 sm:mt-0">
            <a href="#" className="hover:text-slate-400">Privacy Policy</a>
            <a href="#" className="hover:text-slate-400">Terms of Use</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
