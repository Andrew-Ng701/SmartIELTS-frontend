import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, PointerEvent, ReactNode } from 'react';
import aiAgentIcon from './assets/ai-agent-icon.png';
import awardIcon from './assets/template/award.png';
import backgroundImage from './assets/template/background-img.jpg';
import brandIcon from './assets/brand-icon-cropped.png';
import defaultAvatar from './assets/default-avatar.jpeg';
import heroImage from './assets/template/billboard-img.jpg';
import instructionIcon from './assets/template/instruction.png';
import item1 from './assets/template/item1.jpg';
import item2 from './assets/template/item2.jpg';
import item3 from './assets/template/item3.jpg';
import item4 from './assets/template/item4.jpg';
import item5 from './assets/template/item5.jpg';
import item6 from './assets/template/item6.jpg';
import item7 from './assets/template/item7.jpg';
import item8 from './assets/template/item8.jpg';
import registerImage from './assets/template/register-img.png';
import reviewer1 from './assets/template/reviewer-1.jpg';
import reviewer2 from './assets/template/reviewer-2.jpg';
import reviewer3 from './assets/template/reviewer-3.jpg';
import studentIcon from './assets/template/student.png';
import topicIcon from './assets/template/topic.png';

type PageId =
  | 'landing'
  | 'auth'
  | 'dashboard'
  | 'reading'
  | 'listening'
  | 'writing'
  | 'speaking'
  | 'records'
  | 'profile'
  | 'settings'
  | 'faq'
  | 'error';

type SectionId = 'home' | 'modules' | 'agent' | 'testimonials';

type ModuleCard = {
  id: PageId;
  name: string;
  label: string;
  description: string;
  metric: string;
  level: string;
  duration: string;
  image: string;
  accent: string;
};

type AgentPosition = {
  initialized: boolean;
  x: number;
  y: number;
};

const modules: ModuleCard[] = [
  {
    id: 'reading',
    name: 'Reading',
    label: 'Timed Practice',
    description:
      'Build speed and accuracy with passage previews, question groups, and clean review cards.',
    metric: '32/40',
    level: 'Academic',
    duration: '60 min',
    image: item1,
    accent: 'bg-sky-100 text-sky-700',
  },
  {
    id: 'listening',
    name: 'Listening',
    label: 'Audio Session',
    description:
      'Train with audio-first practice screens, simple answer panels, and clear progress cues.',
    metric: '29/40',
    level: 'Exam Mode',
    duration: '30 min',
    image: item2,
    accent: 'bg-indigo-100 text-indigo-700',
  },
  {
    id: 'writing',
    name: 'Writing',
    label: 'AI Revision',
    description:
      'Draft, upload, and review essays with score highlights and revision priorities.',
    metric: '6.5',
    level: 'Task 1 & 2',
    duration: 'AI review',
    image: item3,
    accent: 'bg-amber-100 text-amber-800',
  },
  {
    id: 'speaking',
    name: 'Speaking',
    label: 'AI Examiner',
    description:
      'Practice cue cards, recording rhythm, and score breakdowns in a guided exam flow.',
    metric: '6.0',
    level: 'Full Exam',
    duration: '12 prompts',
    image: item4,
    accent: 'bg-emerald-100 text-emerald-700',
  },
];

const showcaseFeatures = [
  {
    title: 'Speaking Examiner',
    text: 'A focused practice space for cue cards, recording flow, confidence building, and score reflection.',
    image: item5,
  },
  {
    title: 'Writing Review',
    text: 'A polished essay workspace for text, image, and PDF submissions with clear revision cards.',
    image: item6,
  },
  {
    title: 'Learning Dashboard',
    text: 'A calm dashboard that turns recent practice into next steps, trends, and focused recommendations.',
    image: item7,
  },
];

const recentRecords = [
  ['Writing Task 2', 'Completed', '6.5', 'Review feedback'],
  ['Speaking Full Exam', 'Reviewed', '6.0', 'View summary'],
  ['Reading Practice 01', 'Completed', '32/40', 'Review answers'],
  ['Listening Practice 03', 'In progress', '18 min left', 'Resume'],
];

const faqItems = [
  [
    'What is SmartIELTS?',
    'SmartIELTS is a visual IELTS practice hub for reading, listening, writing, speaking, progress review, and guided study support.',
  ],
  [
    'Can I use the AI Agent on every page?',
    'Yes. The AI Agent stays available across the website and can open a right-side conversation panel whenever you need help.',
  ],
  [
    'Does this showcase include real scoring?',
    'This version is a visual product showcase. It presents the intended experience without sending live requests.',
  ],
  [
    'Can I update my profile?',
    'The profile screen includes a clean editable account panel, avatar preview, and logout action for the product flow.',
  ],
];

const stats = [
  ['300+', 'Practice Topics', 'Choose focused IELTS skills', topicIcon],
  ['1,000+', 'Learners', 'Track progress with clarity', studentIcon],
  ['4', 'IELTS Modules', 'Reading to speaking flow', instructionIcon],
  ['24/7', 'AI Agent', 'Help available anywhere', awardIcon],
];

const testimonials = [
  [
    'Maya Chen',
    'IELTS Candidate',
    'The site feels clear and focused. I can see what each module does before entering a practice screen.',
    reviewer1,
  ],
  [
    'Ryan Lee',
    'University Applicant',
    'The AI Agent drawer makes the whole product feel connected, especially when moving between modules.',
    reviewer2,
  ],
  [
    'Ava Wong',
    'Self-Study Learner',
    'I like the clean navigation and the visual module cards. It feels more like a real learning platform.',
    reviewer3,
  ],
];

const quickPrompts = [
  'Analyze my dashboard',
  'Plan today’s practice',
  'Explain my writing score',
  'Prepare speaking tips',
];

export default function App() {
  const [page, setPage] = useState<PageId>('landing');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAgentOpen, setIsAgentOpen] = useState(false);
  const [agentPosition, setAgentPosition] = useState<AgentPosition>({
    initialized: false,
    x: 0,
    y: 0,
  });

  const goTo = (nextPage: PageId) => {
    setPage(nextPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToSection = (sectionId: SectionId) => {
    if (page !== 'landing') {
      setPage('landing');
      window.setTimeout(() => scrollToSection(sectionId), 50);
      return;
    }

    scrollToSection(sectionId);
  };

  const handleLoginComplete = () => {
    setIsLoggedIn(true);
    goTo('dashboard');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    goTo('landing');
  };

  return (
    <main className="min-h-screen bg-[#fffdf7] text-[#0a1622]">
      <Header
        currentPage={page}
        isLoggedIn={isLoggedIn}
        onLogout={handleLogout}
        onNavigate={goTo}
        onSectionNavigate={goToSection}
      />
      {page === 'landing' && (
        <LandingPage onNavigate={goTo} onSectionNavigate={goToSection} />
      )}
      {page === 'auth' && (
        <AuthPage
          authMode={authMode}
          onAuthModeChange={setAuthMode}
          onComplete={handleLoginComplete}
        />
      )}
      {page === 'dashboard' && <DashboardPage onNavigate={goTo} />}
      {page === 'reading' && <PracticePage module={modules[0]} />}
      {page === 'listening' && <PracticePage module={modules[1]} />}
      {page === 'writing' && <WritingPage />}
      {page === 'speaking' && <SpeakingPage />}
      {page === 'records' && <RecordsPage />}
      {page === 'profile' && <ProfilePage />}
      {page === 'settings' && <SettingsPage />}
      {page === 'faq' && <FaqPage />}
      {page === 'error' && <ErrorPage onNavigate={goTo} />}
      <AiAgentLauncher
        position={agentPosition}
        onOpen={() => setIsAgentOpen(true)}
        onPositionChange={setAgentPosition}
      />
      <AiAgentDrawer
        isOpen={isAgentOpen}
        onClose={() => setIsAgentOpen(false)}
      />
      <MobileNav currentPage={page} onNavigate={goTo} />
    </main>
  );
}

function Header({
  currentPage,
  isLoggedIn,
  onLogout,
  onNavigate,
  onSectionNavigate,
}: {
  currentPage: PageId;
  isLoggedIn: boolean;
  onLogout: () => void;
  onNavigate: (page: PageId) => void;
  onSectionNavigate: (sectionId: SectionId) => void;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E8E1DA] bg-[#FCFBF8]/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <button
          className="flex items-center gap-3 text-left"
          type="button"
          onClick={() => onSectionNavigate('home')}
        >
          <img
            alt="SmartIELTS"
            className="size-12 rounded bg-white object-contain shadow-sm ring-1 ring-orange-100"
            src={brandIcon}
          />
          <span>
            <span className="block text-xl font-bold leading-none">SmartIELTS</span>
            <span className="block text-xs font-bold uppercase tracking-[0.18em] text-[#666666]">
              AI Learning Hub
            </span>
          </span>
        </button>

        <nav className="hidden items-center gap-2 lg:flex">
          <button
            className={`nav-link ${currentPage === 'landing' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onSectionNavigate('home')}
          >
            Home
          </button>
          <ModuleDropdownNav currentPage={currentPage} onNavigate={onNavigate} />
          <button
            className={`nav-link ${currentPage === 'dashboard' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onNavigate('dashboard')}
          >
            Dashboard
          </button>
          <button
            className={`nav-link ${currentPage === 'records' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onNavigate('records')}
          >
            Records
          </button>
          <button
            className={`nav-link ${currentPage === 'faq' ? 'nav-link-active' : ''}`}
            type="button"
            onClick={() => onNavigate('faq')}
          >
            FAQ
          </button>
        </nav>

        {isLoggedIn ? (
          <UserAvatarMenu onLogout={onLogout} onNavigate={onNavigate} />
        ) : (
          <button
            className="btn-arrow rounded bg-[#f1bd03] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-[#0a1622]"
            type="button"
            onClick={() => onNavigate('auth')}
          >
            Login
            <span aria-hidden="true">→</span>
          </button>
        )}
      </div>
    </header>
  );
}

function ModuleDropdownNav({
  currentPage,
  onNavigate,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const isActive = modules.some((module) => module.id === currentPage);

  return (
    <div className="dropdown-nav">
      <button
        className={`nav-link dropdown-trigger ${isActive ? 'nav-link-active' : ''}`}
        type="button"
      >
        Modules
        <span aria-hidden="true" className="dropdown-arrow">▼</span>
      </button>
      <div className="dropdown-menu-panel">
        {modules.map((module) => (
          <button
            key={module.name}
            className="dropdown-menu-item"
            type="button"
            onClick={() => onNavigate(module.id)}
          >
            <span className="font-bold">{module.name}</span>
            <span className="text-xs text-[#666666]">{module.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function UserAvatarMenu({
  onLogout,
  onNavigate,
}: {
  onLogout: () => void;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <div className="avatar-menu">
      <button className="avatar-trigger" type="button">
        <img alt="Alex Morgan" src={defaultAvatar} />
      </button>
      <div className="avatar-dropdown">
        <div className="border-b border-slate-100 px-4 py-3">
          <p className="font-bold">Alex Morgan</p>
          <p className="text-xs font-semibold text-[#666666]">IELTS learner</p>
        </div>
        <button type="button" onClick={() => onNavigate('profile')}>
          View Profile
        </button>
        <button type="button" onClick={() => onNavigate('settings')}>
          Settings
        </button>
        <button type="button" onClick={onLogout}>
          Logout
        </button>
      </div>
    </div>
  );
}

function LandingPage({
  onNavigate,
  onSectionNavigate,
}: {
  onNavigate: (page: PageId) => void;
  onSectionNavigate: (sectionId: SectionId) => void;
}) {
  return (
    <>
      <section id="home" className="overflow-hidden bg-[#fffdf7]">
        <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#6995b1]">
              Personalized IELTS preparation
            </p>
            <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Practice smarter with AI-powered IELTS feedback.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
              Explore a polished IELTS learning experience built around focused
              practice, clear module previews, and a helpful AI Agent.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <button
                className="btn-arrow rounded bg-[#f1bd03] px-5 py-2.5 text-sm font-bold uppercase tracking-wide text-[#0a1622]"
                type="button"
                onClick={() => onNavigate('dashboard')}
              >
                View Dashboard
                <span aria-hidden="true">→</span>
              </button>
              <button
                className="rounded border-2 border-[#0a1622] px-5 py-2.5 text-sm font-bold uppercase tracking-wide transition hover:bg-[#0a1622] hover:text-white"
                type="button"
                onClick={() => onSectionNavigate('modules')}
              >
                Explore Modules
              </button>
            </div>
          </div>

          <div className="relative min-h-[640px]">
            <div className="zoom-effect absolute inset-x-0 top-0 overflow-hidden rounded-lg shadow-2xl">
              <img
                alt="Student learning with SmartIELTS"
                className="h-[520px] w-full object-cover"
                src={heroImage}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a1622]/45 to-transparent" />
            </div>
            <div className="visual-card absolute -left-2 bottom-20 w-56 rounded bg-white p-5 shadow-xl ring-1 ring-black/5 sm:left-2">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Readiness
              </span>
              <div className="mt-2 text-5xl font-bold">72%</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A clean view of today’s study focus.
              </p>
            </div>
            <div className="visual-card absolute bottom-4 right-0 w-72 rounded bg-[#0a1622] p-5 text-white shadow-xl">
              <span className="rounded bg-[#f1bd03] px-3 py-1 text-xs font-bold text-[#0a1622]">
                AI Agent ready
              </span>
              <p className="mt-4 text-lg font-bold">
                Ask for practice direction from anywhere on the website.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="modules" className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-5">
          <SectionTitle
            eyebrow="Module showcase"
            title="Choose the IELTS skill you want to improve"
            description="Preview the four core IELTS experiences before entering each static module page."
          />
          <div className="mt-12 grid gap-7 md:grid-cols-2 lg:grid-cols-4">
            {modules.map((module) => (
              <ModuleCourseCard
                key={module.name}
                module={module}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        </div>
      </section>

      <section id="agent" className="bg-[#f8f6ef] py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.95fr_1.05fr]">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.24em] text-[#6995b1]">
              AI Agent
            </p>
            <h2 className="mt-3 text-4xl font-bold leading-tight">
              A draggable study assistant that stays with every page.
            </h2>
            <p className="mt-4 leading-8 text-slate-600">
              The floating AI Agent opens a right-side conversation drawer with
              dashboard guidance, shortcut prompts, and a clean chat layout.
            </p>
            <button
              className="btn-arrow mt-7 rounded bg-[#0a1622] px-6 py-3 font-bold uppercase tracking-wide text-white"
              type="button"
              onClick={() => onNavigate('dashboard')}
            >
              Preview Dashboard
              <span aria-hidden="true">→</span>
            </button>
          </div>
          <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-1">
            {showcaseFeatures.map((feature) => (
              <HorizontalFeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white py-16">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 md:grid-cols-4">
          {stats.map(([value, label, description, icon]) => (
            <div key={label} className="visual-card text-center">
              <img alt="" className="mx-auto h-16 w-16 object-contain" src={icon} />
              <h3 className="mt-5 text-4xl font-bold">{value}</h3>
              <p className="mt-2 font-bold uppercase tracking-wide">{label}</p>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <Testimonials />

      <Footer onNavigate={onNavigate} onSectionNavigate={onSectionNavigate} />
    </>
  );
}

function AuthPage({
  authMode,
  onAuthModeChange,
  onComplete,
}: {
  authMode: 'login' | 'register';
  onAuthModeChange: (mode: 'login' | 'register') => void;
  onComplete: () => void;
}) {
  return (
    <PageFrame
      eyebrow="Account access"
      title="Enter the student learning center"
      description="Sign in to switch the navigation into a personal learner view."
    >
      <div className="grid overflow-hidden rounded-lg bg-white shadow-xl ring-1 ring-black/5 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="bg-[#f8f6ef] p-8">
          <img
            alt="Student registering for SmartIELTS"
            className="mx-auto max-h-[430px] w-full object-contain"
            src={registerImage}
          />
        </div>
        <div className="p-6 sm:p-8">
          <div className="grid grid-cols-2 gap-3">
            {(['login', 'register'] as const).map((mode) => (
              <button
                key={mode}
                className={`rounded px-4 py-3 font-bold uppercase tracking-wide ${
                  authMode === mode
                    ? 'bg-[#f1bd03] text-[#0a1622]'
                    : 'bg-slate-100 text-slate-600'
                }`}
                type="button"
                onClick={() => onAuthModeChange(mode)}
              >
                {mode === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            ))}
          </div>

          <form className="mt-6 space-y-4">
            <FormField label="Email address" placeholder="user@example.com" />
            <FormField label="Password" placeholder="password123" type="password" />
            {authMode === 'register' && (
              <div className="rounded bg-[#eef1f3] p-4 text-sm leading-6 text-slate-600">
                Create a learner profile and continue into the dashboard view.
              </div>
            )}
            <button
              className="btn-arrow w-full rounded bg-[#0a1622] px-5 py-3 font-bold uppercase tracking-wide text-white"
              type="button"
              onClick={onComplete}
            >
              Continue
              <span aria-hidden="true">→</span>
            </button>
          </form>
        </div>
      </div>
    </PageFrame>
  );
}

function DashboardPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <PageFrame
      eyebrow="Student dashboard"
      title="A calm command center for your IELTS week"
      description="Review trends, continue recent work, and ask the AI Agent for the next useful practice step."
    >
      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="visual-card rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-2xl font-bold">Score trend</h2>
            <span className="rounded bg-[#eef1f3] px-3 py-1 text-sm font-semibold text-slate-600">
              Last 30 days
            </span>
          </div>
          <div className="mt-6 grid h-48 grid-cols-6 items-end gap-4 border-b border-l border-slate-200 px-4">
            {[32, 41, 36, 51, 56, 65].map((height, index) => (
              <div key={height} className="flex flex-col items-center gap-2">
                <div
                  className="w-full rounded-t bg-[#6995b1] transition hover:bg-[#f1bd03]"
                  style={{ height }}
                />
                <span className="text-xs text-slate-500">W{index + 1}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="visual-card rounded bg-[#0a1622] p-6 text-white shadow-sm">
          <span className="rounded bg-[#f1bd03] px-3 py-1 text-xs font-bold text-[#0a1622]">
            AI Agent
          </span>
          <h2 className="mt-4 text-2xl font-bold">Ask what to practice next</h2>
          <p className="mt-3 leading-7 text-slate-300">
            Open the floating assistant to compare module progress and choose a
            focused next step.
          </p>
          <div className="mt-6 rounded bg-white/10 p-4 text-sm text-slate-200">
            Suggested focus: complete one Writing Task 2 and review Reading fill-in questions.
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        {modules.map((module) => (
          <CompactModuleCard key={module.name} module={module} onNavigate={onNavigate} />
        ))}
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <RecordTable />
        </div>
        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Recommended practice</h2>
          <div className="mt-5 space-y-4">
            {['Resume Listening Practice 03', 'Submit Writing Task 2', 'Start Speaking Full Exam'].map(
              (item) => (
                <button
                  key={item}
                  className="btn-arrow flex w-full items-center justify-between rounded border border-slate-200 px-4 py-3 text-left font-semibold"
                  type="button"
                >
                  <span>{item}</span>
                  <span aria-hidden="true">→</span>
                </button>
              ),
            )}
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function PracticePage({ module }: { module: ModuleCard }) {
  const isListening = module.name === 'Listening';

  return (
    <PageFrame
      eyebrow={`${module.name} module`}
      title={`${module.name} practice showcase`}
      description={
        isListening
          ? 'A focused screen for audio-first IELTS practice, answer rhythm, and progress states.'
          : 'A focused screen for passages, question groups, timers, answer panels, and review cards.'
      }
    >
      <div className="mb-6 max-w-sm">
        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Select practice paper
          </span>
          <select className="mt-2 w-full rounded border border-slate-200 bg-white px-4 py-3 font-semibold outline-none focus:border-[#f1bd03]">
            <option>Practice Paper 01</option>
            <option>Practice Paper 02</option>
            <option>Practice Paper 03</option>
            <option>Practice Paper 04</option>
          </select>
        </label>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          {['Practice Paper 01', 'Practice Paper 02', 'Practice Paper 03', 'Practice Paper 04'].map(
            (test, index) => (
              <div
                key={test}
                className="visual-card rounded bg-white p-5 shadow-sm ring-1 ring-black/5"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className={`rounded px-2 py-1 text-xs font-bold ${module.accent}`}>
                      {index === 0 ? 'Recommended' : 'Available'}
                    </span>
                    <h2 className="mt-3 text-xl font-bold">{test}</h2>
                  </div>
                  <span className="text-2xl font-bold">{module.metric}</span>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-600">
                  {isListening
                    ? 'Audio, answers, timer, and progress cues in one clean paper preview.'
                    : 'Passage preview, grouped questions, timer, and answer review in one flow.'}
                </p>
              </div>
            ),
          )}
        </div>

        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="zoom-effect mb-6 overflow-hidden rounded">
            <img
              alt={`${module.name} practice preview`}
              className="h-52 w-full object-cover"
              src={isListening ? item8 : module.image}
            />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-2xl font-bold">Practice preview</h2>
              <p className="mt-2 text-slate-600">
                A clean paper layout with time, prompts, answers, and review cards.
              </p>
            </div>
            <span className="rounded bg-red-50 px-3 py-1 text-sm font-bold text-red-700">
              18:42 left
            </span>
          </div>
          <div className="mt-6 rounded bg-[#f8f6ef] p-5">
            <h3 className="font-bold">
              {isListening ? 'Audio player area' : 'Passage reader area'}
            </h3>
            <p className="mt-3 leading-7 text-slate-600">
              {isListening
                ? 'A spacious listening view with audio controls and answer space.'
                : 'A spacious reading view with passage focus and answer controls.'}
            </p>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function WritingPage() {
  return (
    <PageFrame
      eyebrow="Writing module"
      title="Essay workspace and review cards"
      description="A polished writing experience for drafting, uploading, and reviewing focused improvement notes."
    >
      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <div className="zoom-effect mb-6 overflow-hidden rounded">
            <img alt="Writing practice" className="h-56 w-full object-cover" src={item3} />
          </div>
          <span className="rounded bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
            TASK 2
          </span>
          <h2 className="mt-4 text-2xl font-bold">Education Essay</h2>
          <p className="mt-3 leading-7 text-slate-600">
            Some people believe schools should focus more on practical skills.
            Discuss both views and give your opinion.
          </p>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {['Text', 'Image', 'PDF'].map((type) => (
              <button
                key={type}
                className="rounded border border-slate-300 px-4 py-3 font-bold hover:border-[#f1bd03]"
                type="button"
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Submission preview</h2>
          <div className="mt-5 space-y-4">
            <FormField label="Target score" placeholder="7.0" />
            <textarea
              className="min-h-36 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
              placeholder="Paste essay text here..."
            />
            <div className="rounded border border-dashed border-slate-300 p-5 text-center text-sm font-semibold text-slate-500">
              Drop images or one PDF here
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {[
          ['Draft Ready', 'Keep your essay visible while review cards appear.'],
          ['Score Highlight', 'Show the band score clearly with friendly visual hierarchy.'],
          ['Revision Plan', 'Turn feedback into a short, focused list of next improvements.'],
        ].map(([title, text]) => (
          <FeaturePanel key={title} title={title} text={text} />
        ))}
      </div>
    </PageFrame>
  );
}

function SpeakingPage() {
  return (
    <PageFrame
      eyebrow="Speaking module"
      title="AI examiner practice flow"
      description="A guided speaking layout for cue cards, preparation rhythm, recording, and confidence-building score cards."
    >
      <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded bg-[#0a1622] p-6 text-white shadow-sm">
          <div className="zoom-effect mb-6 overflow-hidden rounded">
            <img alt="Speaking practice" className="h-56 w-full object-cover" src={item4} />
          </div>
          <span className="rounded bg-[#f1bd03] px-3 py-1 text-sm font-bold text-[#0a1622]">
            Full exam
          </span>
          <h2 className="mt-5 text-3xl font-bold">Part 2 cue card</h2>
          <p className="mt-4 leading-7 text-slate-300">
            Describe a teacher who influenced you. You should say who this
            teacher was, what they taught, and why they were important.
          </p>
          <div className="mt-6 grid grid-cols-2 gap-3">
            <TimerBox label="Prep" value="00:42" />
            <TimerBox label="Answer" value="01:58" />
          </div>
        </div>

        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Recording and review</h2>
          <div className="mt-6 rounded bg-[#f8f6ef] p-6 text-center">
            <div className="mx-auto grid size-24 place-items-center rounded-full bg-red-100 text-3xl font-bold text-red-700">
              REC
            </div>
            <p className="mt-4 font-semibold text-slate-700">
              A calm recording state keeps attention on the answer.
            </p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {['Next question', 'Submit audio', 'View summary'].map((action) => (
              <button
                key={action}
                className="rounded border border-slate-300 px-4 py-3 font-bold hover:border-[#0a1622]"
                type="button"
              >
                {action}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-5 md:grid-cols-4">
        {[
          ['Fluency', '6.5'],
          ['Lexical', '6.0'],
          ['Grammar', '6.0'],
          ['Pronunciation', '6.5'],
        ].map(([label, score]) => (
          <div key={label} className="visual-card rounded bg-white p-5 shadow-sm ring-1 ring-black/5">
            <div className="text-sm font-bold uppercase tracking-wide text-slate-500">
              {label}
            </div>
            <div className="mt-3 text-4xl font-bold">{score}</div>
          </div>
        ))}
      </div>
    </PageFrame>
  );
}

function RecordsPage() {
  return (
    <PageFrame
      eyebrow="Records"
      title="All practice records in one place"
      description="A simple review page for continuing, comparing, and revisiting module attempts."
    >
      <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
        <div className="grid gap-3 md:grid-cols-4">
          {['All modules', 'Active records', 'Last 30 days', 'Newest first'].map((filter) => (
            <button
              key={filter}
              className="rounded border border-slate-300 px-4 py-3 text-left font-semibold hover:border-[#f1bd03]"
              type="button"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="mt-6">
          <RecordTable />
        </div>
      </div>
    </PageFrame>
  );
}

function ProfilePage() {
  const [displayName, setDisplayName] = useState('Alex Morgan');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setAvatarPreview((currentPreview) => {
      if (currentPreview) {
        URL.revokeObjectURL(currentPreview);
      }

      return URL.createObjectURL(file);
    });
  };

  return (
    <PageFrame
      eyebrow="Profile"
      title="Your learner profile"
      description="Review your account details, update your name, and choose a learner avatar."
    >
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
          <img
            alt={displayName}
            className="mx-auto size-40 rounded-full bg-white object-contain shadow-sm"
            src={avatarPreview ?? defaultAvatar}
          />
          <h2 className="mt-5 text-2xl font-bold">{displayName}</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500">IELTS learner</p>
          <label className="mt-6 block rounded border border-dashed border-slate-300 bg-[#f8f6ef] px-4 py-5 text-left transition hover:border-[#f1bd03]">
            <span className="block text-sm font-bold uppercase tracking-wide text-slate-500">
              Avatar image
            </span>
            <span className="mt-2 block font-semibold">Choose a new profile picture</span>
            <span className="mt-1 block text-sm leading-6 text-slate-500">
              Supports local image preview for this static prototype.
            </span>
            <input
              accept="image/*"
              className="mt-4 block w-full text-sm font-semibold text-slate-600 file:mr-4 file:rounded file:border-0 file:bg-[#f1bd03] file:px-4 file:py-2 file:font-bold file:text-[#0a1622]"
              type="file"
              onChange={handleAvatarChange}
            />
          </label>
        </div>
        <div className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Account details</h2>
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Display name
              </span>
              <input
                className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
                type="text"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <FormField label="Email" placeholder="student@example.com" />
            <FormField label="Goal band" placeholder="7.0" />
            <div className="flex flex-wrap gap-3">
              <button className="rounded bg-[#f1bd03] px-5 py-3 font-bold" type="button">
                Update Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </PageFrame>
  );
}

function SettingsPage() {
  return (
    <PageFrame
      eyebrow="Settings"
      title="Account settings"
      description="Update your account password from one clean page."
    >
      <div className="max-w-2xl">
        <section className="rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
          <h2 className="text-2xl font-bold">Change password</h2>
          <div className="mt-5 space-y-4">
            <FormField label="Current password" placeholder="Enter current password" type="password" />
            <FormField label="New password" placeholder="Enter new password" type="password" />
            <FormField label="Confirm password" placeholder="Confirm new password" type="password" />
            <button className="rounded bg-[#0a1622] px-5 py-3 font-bold text-white" type="button">
              Update Password
            </button>
          </div>
        </section>
      </div>
    </PageFrame>
  );
}

function FaqPage() {
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <PageFrame
      eyebrow="FAQ"
      title="Frequently asked questions"
      description="A dedicated help page for the clean SmartIELTS showcase experience."
    >
      <div className="divide-y divide-slate-200 rounded bg-white shadow-lg ring-1 ring-black/5">
        {faqItems.map(([question, answer], index) => (
          <button
            key={question}
            className="block w-full p-6 text-left transition hover:bg-[#fff9eb]"
            type="button"
            onClick={() => setOpenFaq(index)}
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-lg font-bold">{question}</h3>
              <span className="grid size-8 shrink-0 place-items-center rounded bg-[#f1bd03] font-bold">
                {openFaq === index ? '−' : '+'}
              </span>
            </div>
            {openFaq === index && (
              <p className="mt-4 leading-7 text-slate-600">{answer}</p>
            )}
          </button>
        ))}
      </div>
    </PageFrame>
  );
}

function ErrorPage({ onNavigate }: { onNavigate: (page: PageId) => void }) {
  return (
    <PageFrame
      eyebrow="404"
      title="This page is not available"
      description="Use the buttons below to return to the main showcase or dashboard."
    >
      <div className="flex flex-wrap gap-3">
        <button className="rounded bg-[#f1bd03] px-5 py-3 font-bold" type="button" onClick={() => onNavigate('landing')}>
          Back home
        </button>
        <button className="rounded border border-slate-300 px-5 py-3 font-bold" type="button" onClick={() => onNavigate('dashboard')}>
          Dashboard
        </button>
      </div>
    </PageFrame>
  );
}

function AiAgentLauncher({
  position,
  onOpen,
  onPositionChange,
}: {
  position: AgentPosition;
  onOpen: () => void;
  onPositionChange: (position: AgentPosition) => void;
}) {
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const dragRef = useRef({
    active: false,
    moved: false,
    offsetX: 0,
    offsetY: 0,
    startX: 0,
    startY: 0,
  });

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = {
      active: true,
      moved: false,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      startX: event.clientX,
      startY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    onPositionChange({ initialized: true, x: rect.left, y: rect.top });
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    if (!dragRef.current.active) {
      return;
    }

    const deltaX = Math.abs(event.clientX - dragRef.current.startX);
    const deltaY = Math.abs(event.clientY - dragRef.current.startY);
    if (deltaX > 4 || deltaY > 4) {
      dragRef.current.moved = true;
    }

    const buttonSize = launcherRef.current?.offsetWidth ?? 76;
    const nextX = clamp(
      event.clientX - dragRef.current.offsetX,
      12,
      window.innerWidth - buttonSize - 12,
    );
    const nextY = clamp(
      event.clientY - dragRef.current.offsetY,
      84,
      window.innerHeight - buttonSize - 84,
    );
    onPositionChange({ initialized: true, x: nextX, y: nextY });
  };

  const handlePointerUp = (event: PointerEvent<HTMLButtonElement>) => {
    event.currentTarget.releasePointerCapture(event.pointerId);
    const wasDragged = dragRef.current.moved;
    dragRef.current.active = false;

    if (!wasDragged) {
      onOpen();
    }
  };

  return (
    <button
      ref={launcherRef}
      className="ai-agent-launcher"
      style={
        position.initialized
          ? { left: position.x, top: position.y }
          : undefined
      }
      type="button"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <span className="ai-agent-image-wrap">
        <img alt="" draggable={false} src={aiAgentIcon} />
      </span>
      <span className="ai-agent-label">AI Agent</span>
    </button>
  );
}

function AiAgentDrawer({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  return (
    <aside className={`ai-agent-drawer ${isOpen ? 'ai-agent-drawer-open' : ''}`}>
      <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-5">
        <div>
          <h2 className="text-2xl font-bold">AI Agent</h2>
        </div>
        <button
          className="grid size-9 place-items-center rounded bg-slate-100 font-bold hover:bg-[#f1bd03]"
          type="button"
          onClick={onClose}
        >
          ×
        </button>
      </div>

      <div className="space-y-5 overflow-y-auto p-5">
        <div className="rounded bg-[#f8f6ef] p-4">
          <p className="font-bold">AI Agent</p>
          <p className="mt-2 leading-7 text-slate-600">
            What would you like to practice today?
          </p>
        </div>

        <div className="rounded bg-white p-4 shadow-sm ring-1 ring-black/5">
          <p className="font-bold">Suggested question</p>
          <p className="mt-2 leading-7 text-slate-600">
            What should I practice first if I want to improve my writing and speaking this week?
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              className="rounded-full border border-slate-200 px-3 py-2 text-sm font-semibold hover:border-[#f1bd03] hover:bg-[#fff9eb]"
              type="button"
            >
              {prompt}
            </button>
          ))}
        </div>

        <label className="block">
          <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
            Message
          </span>
          <textarea
            className="mt-2 min-h-28 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
            placeholder="Ask the AI Agent..."
          />
        </label>
      </div>
    </aside>
  );
}

function PageFrame({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-auto max-w-7xl px-5 py-12 pb-32 md:pb-12">
      <div className="mb-8 max-w-3xl">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6995b1]">
          {eyebrow}
        </p>
        <h1 className="mt-3 text-4xl font-bold leading-tight sm:text-5xl">{title}</h1>
        <p className="mt-4 text-lg leading-8 text-slate-600">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="mx-auto max-w-3xl text-center">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[#6995b1]">
        {eyebrow}
      </p>
      <h2 className="mt-3 text-4xl font-bold leading-tight">{title}</h2>
      <p className="mt-4 leading-7 text-slate-600">{description}</p>
    </div>
  );
}

function ModuleCourseCard({
  module,
  onNavigate,
}: {
  module: ModuleCard;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <button
      className="visual-card group overflow-hidden rounded bg-white text-left shadow-sm ring-1 ring-black/5"
      type="button"
      onClick={() => onNavigate(module.id)}
    >
      <div className="reveal-card zoom-effect relative h-52 overflow-hidden">
        <img alt={`${module.name} module`} className="h-full w-full object-cover" src={module.image} />
        <span className="absolute left-4 top-4 rounded bg-[#f1bd03] px-3 py-1 text-xs font-bold uppercase text-[#0a1622]">
          {module.duration}
        </span>
      </div>
      <div className="p-5">
        <span className={`rounded px-2 py-1 text-xs font-bold ${module.accent}`}>
          {module.level}
        </span>
        <div className="mt-4 flex items-end justify-between gap-4">
          <h3 className="text-2xl font-bold">{module.name}</h3>
          <span className="text-3xl font-bold text-[#6995b1]">{module.metric}</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{module.description}</p>
        <span className="mt-5 inline-flex font-bold text-[#0a1622] transition group-hover:text-[#6995b1]">
          Open module →
        </span>
      </div>
    </button>
  );
}

function CompactModuleCard({
  module,
  onNavigate,
}: {
  module: ModuleCard;
  onNavigate: (page: PageId) => void;
}) {
  return (
    <button
      className="visual-card rounded bg-white p-5 text-left shadow-sm ring-1 ring-black/5"
      type="button"
      onClick={() => onNavigate(module.id)}
    >
      <span className={`rounded px-2 py-1 text-xs font-bold ${module.accent}`}>
        {module.label}
      </span>
      <div className="mt-5 flex items-end justify-between gap-4">
        <h3 className="text-2xl font-bold">{module.name}</h3>
        <span className="text-3xl font-bold text-[#6995b1]">{module.metric}</span>
      </div>
      <p className="mt-4 text-sm leading-6 text-slate-600">{module.description}</p>
    </button>
  );
}

function HorizontalFeatureCard({
  title,
  text,
  image,
}: {
  title: string;
  text: string;
  image: string;
}) {
  return (
    <article className="visual-card grid overflow-hidden rounded bg-white shadow-sm ring-1 ring-black/5 md:grid-cols-[0.45fr_0.55fr] lg:grid-cols-[0.38fr_0.62fr]">
      <div className="reveal-card zoom-effect min-h-48 overflow-hidden">
        <img alt={title} className="h-full w-full object-cover" src={image} />
      </div>
      <div className="p-6">
        <h3 className="text-2xl font-bold">{title}</h3>
        <p className="mt-3 leading-7 text-slate-600">{text}</p>
      </div>
    </article>
  );
}

function FeaturePanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="visual-card rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
      <h3 className="text-xl font-bold">{title}</h3>
      <p className="mt-3 leading-7 text-slate-600">{text}</p>
    </div>
  );
}

function Testimonials() {
  return (
    <section
      id="testimonials"
      className="bg-cover bg-center py-20"
      style={{ backgroundImage: `linear-gradient(rgba(255,253,247,.92), rgba(255,253,247,.92)), url(${backgroundImage})` }}
    >
      <div className="mx-auto max-w-7xl px-5">
        <SectionTitle
          eyebrow="Learner feedback"
          title="A more visual IELTS learning experience"
          description="Reviewer cards follow the original education template feel with avatar polish and calm spacing."
        />
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.map(([name, role, quote, image]) => (
            <article key={name} className="testimonial-card rounded bg-white p-6 text-center shadow-sm ring-1 ring-black/5">
              <img
                alt={name}
                className="mx-auto size-24 rounded-full object-cover ring-4 ring-[#f1bd03]/30"
                src={image}
              />
              <h3 className="mt-4 text-xl font-bold">{name}</h3>
              <p className="mt-1 text-sm font-semibold text-slate-500">{role}</p>
              <p className="mt-4 leading-7 text-slate-600">“{quote}”</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function RecordTable() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-left">
        <thead>
          <tr className="border-b border-slate-200 text-sm uppercase tracking-wide text-slate-500">
            <th className="py-3 pr-4">Record</th>
            <th className="py-3 pr-4">Status</th>
            <th className="py-3 pr-4">Score</th>
            <th className="py-3 pr-4">Action</th>
          </tr>
        </thead>
        <tbody>
          {recentRecords.map(([record, status, score, action]) => (
            <tr key={record} className="border-b border-slate-100 transition hover:bg-[#fff9eb]">
              <td className="py-4 pr-4 font-semibold">{record}</td>
              <td className="py-4 pr-4">
                <span className="rounded bg-[#eef1f3] px-2 py-1 text-xs font-bold text-slate-700">
                  {status}
                </span>
              </td>
              <td className="py-4 pr-4 font-bold">{score}</td>
              <td className="py-4 pr-4 text-sm font-bold text-[#6995b1]">{action}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormField({
  label,
  placeholder,
  type = 'text',
}: {
  label: string;
  placeholder: string;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold uppercase tracking-wide text-slate-500">
        {label}
      </span>
      <input
        className="mt-2 w-full rounded border border-slate-200 bg-[#f8f6ef] px-4 py-3 outline-none focus:border-[#f1bd03]"
        placeholder={placeholder}
        type={type}
      />
    </label>
  );
}

function TimerBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded bg-white/10 p-4">
      <div className="text-sm font-bold uppercase tracking-wide text-slate-300">
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold text-[#f1bd03]">{value}</div>
    </div>
  );
}

function MobileNav({
  currentPage,
  onNavigate,
}: {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}) {
  const items: Array<[PageId, string]> = [
    ['dashboard', 'Home'],
    ['reading', 'Read'],
    ['writing', 'Write'],
    ['speaking', 'Speak'],
    ['records', 'Records'],
  ];

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-black/10 bg-white px-2 py-2 shadow-lg md:hidden">
      <div className="grid grid-cols-5 gap-1">
        {items.map(([id, label]) => (
          <button
            key={id}
            className={`rounded px-2 py-2 text-xs font-bold ${
              currentPage === id ? 'text-[#a55407]' : 'text-slate-700'
            }`}
            type="button"
            onClick={() => onNavigate(id)}
          >
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}

function Footer({
  onNavigate,
  onSectionNavigate,
}: {
  onNavigate: (page: PageId) => void;
  onSectionNavigate: (sectionId: SectionId) => void;
}) {
  return (
    <footer className="bg-[#0a1622] px-5 py-12 text-white">
      <div className="mx-auto grid max-w-7xl gap-8 md:grid-cols-4">
        <div className="md:col-span-2">
          <h2 className="text-2xl font-bold">SmartIELTS</h2>
          <p className="mt-3 max-w-xl leading-7 text-slate-300">
            A clean IELTS learning showcase with module previews, a draggable
            AI Agent, learner records, and a personal profile menu.
          </p>
        </div>
        <div>
          <h3 className="font-bold uppercase tracking-wide">Explore</h3>
          <div className="mt-4 space-y-2 text-slate-300">
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onSectionNavigate('modules')}>
              Modules
            </button>
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onSectionNavigate('agent')}>
              AI Agent
            </button>
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onNavigate('faq')}>
              FAQ
            </button>
          </div>
        </div>
        <div>
          <h3 className="font-bold uppercase tracking-wide">Modules</h3>
          <p className="mt-4 leading-7 text-slate-300">
            Reading, Listening, Writing, and Speaking are available from the
            Modules dropdown.
          </p>
        </div>
      </div>
    </footer>
  );
}

function scrollToSection(sectionId: SectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}
