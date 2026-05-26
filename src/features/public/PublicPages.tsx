import { useState } from 'react';
import type { ReactNode } from 'react';
import awardIcon from '../../assets/template/award.png';
import backgroundImage from '../../assets/template/background-img.jpg';
import heroImage from '../../assets/template/billboard-img.jpg';
import instructionIcon from '../../assets/template/instruction.png';
import item5 from '../../assets/template/item5.jpg';
import item6 from '../../assets/template/item6.jpg';
import item7 from '../../assets/template/item7.jpg';
import studentIcon from '../../assets/template/student.png';
import topicIcon from '../../assets/template/topic.png';
import type { AppPageId, AppSectionId } from '../../app/appTypes';

export type PublicModuleCard = {
  id: AppPageId;
  name: string;
  label: string;
  description: string;
  metric: string;
  level: string;
  duration: string;
  image: string;
  accent: string;
};

type PublicNavigate = (page: AppPageId) => void;
type PublicSectionNavigate = (sectionId: AppSectionId) => void;

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
    'Reading and Listening scores appear after submission. Writing scores appear after AI review is complete.',
  ],
  [
    'Can I update my profile?',
    'Yes. The profile screen supports editable account details, display name, avatar upload, and IELTS target bands.',
  ],
  [
    'How do Reading and Listening records work?',
    'Saved records open a review workspace where you can jump by passage or section and compare your answer with the correct answer.',
  ],
  [
    'Can Listening record audio be replayed?',
    'Yes. Listening reviews include an audio control when the record has tape audio available.',
  ],
  [
    'What does the Dashboard show?',
    'The dashboard shows active records, deleted records, average scores, module counts, radar data, and trend data.',
  ],
  [
    'Can admins see student records?',
    'Yes. Admin users can inspect student records through the role-protected admin console.',
  ],
  [
    'Are deleted records permanent?',
    'No. Deleted records move into a recoverable view when restore is available for that record.',
  ],
  [
    'Does Speaking show detailed scoring?',
    'Speaking review cards show per-part audio, four IELTS scoring criteria, a reference comment, and a quality comment.',
  ],
  [
    'Is this connected to live APIs?',
    'Yes. SmartIELTS supports live account access, records, profile, console data, content management, and AI Agent requests.',
  ],
];

const stats = [
  ['100%', 'Exam Format Match', 'Practice follows real IELTS task structure', topicIcon],
  ['Live', 'Accurate Dashboard', 'Shows your records, scores, and next steps clearly', studentIcon],
  ['4', 'IELTS Modules', 'Reading to speaking flow', instructionIcon],
  ['24/7', 'AI Agent', 'Help available anywhere', awardIcon],
];

const adminHighlights = [
  {
    title: 'Manage IELTS content',
    detail: 'Admins can prepare Reading, Listening, Writing, and Speaking materials in separate management flows.',
    metric: 'Content',
  },
  {
    title: 'Review student progress',
    detail: 'Record overviews help staff see practice activity, score status, deleted records, and follow-up needs.',
    metric: 'Records',
  },
  {
    title: 'Support better learning',
    detail: 'The admin side keeps materials organized so students receive clearer practice paths and useful feedback.',
    metric: 'Support',
  },
];

export function LandingPage({
  modules,
  onNavigate,
  onSectionNavigate,
}: {
  modules: PublicModuleCard[];
  onNavigate: PublicNavigate;
  onSectionNavigate: PublicSectionNavigate;
}) {
  return (
    <>
      <section id="home" className="overflow-hidden bg-[#fffdf7]">
        <div className="mx-auto grid min-h-[calc(100vh-80px)] max-w-7xl items-center gap-12 px-5 py-12 lg:grid-cols-[0.82fr_1.18fr]">
          <div>
            <p className="text-xs font-bold tracking-[0.24em] text-[#6995b1]">
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
                className="btn-arrow rounded bg-[#f1bd03] px-5 py-2.5 text-sm font-bold tracking-wide text-[#0a1622]"
                type="button"
                onClick={() => onNavigate('dashboard')}
              >
                View Dashboard
                <span aria-hidden="true">-&gt;</span>
              </button>
              <button
                className="rounded border-2 border-[#0a1622] px-5 py-2.5 text-sm font-bold tracking-wide transition hover:bg-[#0a1622] hover:text-white"
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
              <span className="text-sm font-bold tracking-wide text-slate-500">
                Readiness
              </span>
              <div className="mt-2 text-5xl font-bold">72%</div>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                A clean view of today's study focus.
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
            <p className="text-sm font-bold tracking-[0.24em] text-[#6995b1]">
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
              className="btn-arrow mt-7 rounded bg-[#0a1622] px-6 py-3 font-bold tracking-wide text-white"
              type="button"
              onClick={() => onNavigate('dashboard')}
            >
              Preview Dashboard
              <span aria-hidden="true">-&gt;</span>
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
              <p className="mt-2 font-bold tracking-wide">{label}</p>
              <p className="mt-2 text-sm text-slate-500">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <AdminIntro onNavigate={onNavigate} />

      <Footer onNavigate={onNavigate} onSectionNavigate={onSectionNavigate} />
    </>
  );
}

export function LoginRequiredPage({
  modules,
  requestedPage,
  onExploreModules,
  onLogin,
}: {
  modules: PublicModuleCard[];
  requestedPage: AppPageId;
  onExploreModules: () => void;
  onLogin: () => void;
}) {
  const pageLabel = modules.find((module) => module.id === requestedPage)?.name
    ?? (requestedPage === 'dashboard' ? 'Dashboard' : 'Records');

  return (
    <section className="grid h-[calc(100dvh-5.75rem)] max-h-[calc(100dvh-5.75rem)] place-items-center overflow-hidden px-5 py-4 pb-24 md:pb-4">
      <section className="mx-auto grid h-full max-h-full w-full max-w-5xl grid-rows-[minmax(0,1fr)_auto] items-center rounded bg-white px-5 py-5 text-center shadow-sm ring-1 ring-black/5 sm:px-8">
        <div className="flex min-h-0 items-center justify-center">
          <img
            alt="Student learning with SmartIELTS"
            className="aspect-video h-auto max-h-[42vh] w-full max-w-lg rounded object-cover shadow-xl"
            src={heroImage}
          />
        </div>
        <div className="mx-auto mt-5 max-w-2xl">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            Welcome to register or log in to use the full SmartIELTS experience.
          </h1>
          <p className="mt-3 leading-7 text-slate-600">
            Sign in to unlock {pageLabel}, personal records, target bands, progress insights,
            and AI-supported IELTS study tools.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <button
              className="btn-arrow rounded bg-[#f1bd03] px-5 py-3 font-bold text-[#0a1622]"
              type="button"
              onClick={onLogin}
            >
              Login or register
              <span aria-hidden="true">-&gt;</span>
            </button>
            <button
              className="rounded border-2 border-[#0a1622] px-5 py-3 font-bold transition hover:bg-[#0a1622] hover:text-white"
              type="button"
              onClick={onExploreModules}
            >
              Explore modules
            </button>
          </div>
        </div>
      </section>
    </section>
  );
}

export function FaqPage() {
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
                {openFaq === index ? '-' : '+'}
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

export function ErrorPage({ onNavigate }: { onNavigate: PublicNavigate }) {
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
        <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">
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
      <p className="text-sm font-bold tracking-[0.2em] text-[#6995b1]">
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
  module: PublicModuleCard;
  onNavigate: PublicNavigate;
}) {
  return (
    <button
      className="visual-card group overflow-hidden rounded bg-white text-left shadow-sm ring-1 ring-black/5"
      type="button"
      onClick={() => onNavigate(module.id)}
    >
      <div className="p-5">
        <div className="flex items-end justify-between gap-4">
          <h3 className="text-2xl font-bold">{module.name}</h3>
          <span className="text-3xl font-bold text-[#6995b1]">{module.metric}</span>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-600">{module.description}</p>
        <span className="mt-5 inline-flex font-bold text-[#0a1622] transition group-hover:text-[#6995b1]">
          Open module -&gt;
        </span>
      </div>
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

function AdminIntro({ onNavigate }: { onNavigate: PublicNavigate }) {
  return (
    <section
      id="admin"
      className="bg-cover bg-center py-20"
      style={{ backgroundImage: `linear-gradient(rgba(255,253,247,.92), rgba(255,253,247,.92)), url(${backgroundImage})` }}
    >
      <div className="mx-auto grid max-w-7xl gap-10 px-5 lg:grid-cols-[0.95fr_1.05fr]">
        <div>
          <p className="text-sm font-bold tracking-[0.24em] text-[#6995b1]">
            Admin console
          </p>
          <h2 className="mt-3 text-4xl font-bold leading-tight">
            A separate management side built to help students improve.
          </h2>
          <p className="mt-4 leading-8 text-slate-600">
            The student pages stay focused on practice, while the admin side is
            designed for content management, record review, and learning support
            decisions. This keeps the platform organized without mixing admin
            actions into the learner flow.
          </p>
          <button
            className="btn-arrow mt-7 rounded bg-[#0a1622] px-6 py-3 font-bold tracking-wide text-white"
            type="button"
            onClick={() => onNavigate('dashboard')}
          >
            Preview User Dashboard
            <span aria-hidden="true">-&gt;</span>
          </button>
        </div>
        <div className="grid gap-5">
          {adminHighlights.map((item) => (
            <article key={item.title} className="visual-card rounded bg-white p-6 shadow-sm ring-1 ring-black/5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <h3 className="text-xl font-bold">{item.title}</h3>
                <span className="rounded bg-[#fff1e8] px-3 py-1 text-xs font-bold tracking-wide text-[#c9551c]">
                  {item.metric}
                </span>
              </div>
              <p className="mt-3 leading-7 text-slate-600">{item.detail}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function Footer({
  onNavigate,
  onSectionNavigate,
}: {
  onNavigate: PublicNavigate;
  onSectionNavigate: PublicSectionNavigate;
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
          <h3 className="font-bold tracking-wide">Explore</h3>
          <div className="mt-4 space-y-2 text-slate-300">
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onSectionNavigate('modules')}>
              Modules
            </button>
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onSectionNavigate('agent')}>
              AI Agent
            </button>
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onSectionNavigate('admin')}>
              Admin
            </button>
            <button className="block hover:text-[#f1bd03]" type="button" onClick={() => onNavigate('faq')}>
              FAQ
            </button>
          </div>
        </div>
        <div>
          <h3 className="font-bold tracking-wide">Modules</h3>
          <p className="mt-4 leading-7 text-slate-300">
            Reading, Listening, Writing, and Speaking are available from the
            Modules dropdown.
          </p>
        </div>
      </div>
    </footer>
  );
}
