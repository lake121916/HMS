import React, { useState } from 'react';
import PublicLayout from '../../components/PublicLayout';
import {
  Newspaper, Calendar, Clock, ChevronRight, X, ArrowRight,
  Tag, Eye, BookOpen, Search, Rss
} from 'lucide-react';

interface NewsArticle {
  id: number;
  title: string;
  category: string;
  categoryColor: string;
  date: string;
  author: string;
  authorTitle: string;
  readTime: string;
  image: string;
  summary: string;
  content: string[];
  isFeatured?: boolean;
  views?: number;
}

const newsArticles: NewsArticle[] = [
  {
    id: 1,
    title: 'Alem Ketema Enat Hospital Deploys 24/7 Digital Triage & Electronic Health Record System',
    category: 'System Upgrades',
    categoryColor: 'bg-blue-100 text-blue-700',
    date: 'October 8, 2026',
    author: 'Hospital Administration',
    authorTitle: 'Communications Office',
    readTime: '4 min read',
    views: 1240,
    image: '/images/hospital.jpg.webp',
    isFeatured: true,
    summary: 'Alem Ketema Enat General Hospital has officially launched an integrated hospital management system connecting Reception, Triage Nurse Vitals, Doctor Consultations, Pathology Lab, Pharmacy, and Cashier POS.',
    content: [
      'In a major advancement for healthcare delivery in the North Shewa Zone of Amhara Region, Alem Ketema Enat General Hospital has deployed a comprehensive Electronic Health Record (EHR) and digital triage workflow system.',
      'The new system enables receptionists to immediately hand off walk-in patients to triage nurses, where vitals (blood pressure, temperature, heart rate, and oxygen saturation) are recorded digitally and automatically categorized by urgency level (Emergency 🚨, Urgent ⚠️, Routine ✓).',
      'Doctor consultation desks are now equipped with ICD-10 medical coding, digital lab ordering, e-prescriptions, and seamless cashier billing, significantly reducing patient wait times and improving diagnostic accuracy across all departments.',
      'The system was developed and deployed in collaboration with local software engineers and trained hospital staff, marking a milestone in digital health transformation for community hospitals in Ethiopia.',
    ]
  },
  {
    id: 2,
    title: 'North Shewa Zone Health Department Conducts Annual Hospital Performance Review',
    category: 'Regional Health',
    categoryColor: 'bg-green-100 text-green-700',
    date: 'October 4, 2026',
    author: 'Regional Health Bureau',
    authorTitle: 'Amhara Region Health Bureau',
    readTime: '5 min read',
    views: 876,
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80&auto=format&fit=crop',
    summary: 'Officials commended Alem Ketema Enat General Hospital for outstanding clinical outcomes and emergency care delivery.',
    content: [
      'Delegates from the North Shewa Zone Health Department conducted their annual comprehensive operational review at Alem Ketema Enat General Hospital.',
      'The review panel evaluated key performance indicators including maternal mortality reduction, surgical success rates, emergency response times, and pharmaceutical inventory availability.',
      'Government officials praised the hospital leadership and medical staff for establishing a high standard of clinical care and maintaining robust community health partnerships throughout Merhabete Woreda.',
    ]
  },
  {
    id: 3,
    title: 'Maternal & Neonatal Intensive Care Unit (NICU) Expansion Completed',
    category: 'Clinical Expansion',
    categoryColor: 'bg-pink-100 text-pink-700',
    date: 'September 28, 2026',
    author: 'Obstetrics Department',
    authorTitle: 'Head of OB/GYN',
    readTime: '3 min read',
    views: 1050,
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
    summary: 'The hospital has expanded its maternal care facility with 15 new neonatal incubators, high-risk labor delivery suites, and 24/7 midwife nursing coverage.',
    content: [
      'Alem Ketema Enat General Hospital has completed a major expansion of its Maternal and Neonatal Intensive Care Unit (NICU), increasing capacity from 8 to 23 dedicated neonatal care stations.',
      'The expanded NICU features 15 new imported incubators with integrated monitoring, two dedicated high-risk labor delivery suites, and a new postnatal recovery ward.',
      'This expansion is expected to serve an additional 800 high-risk deliveries per year and significantly reduce neonatal mortality in Merhabete Woreda and neighboring zones.',
    ]
  },
  {
    id: 4,
    title: 'Free Community Health Screening Campaign Reaches 3,000 Residents',
    category: 'Community Outreach',
    categoryColor: 'bg-amber-100 text-amber-700',
    date: 'September 15, 2026',
    author: 'Community Health Team',
    authorTitle: 'Outreach & Prevention Unit',
    readTime: '3 min read',
    views: 690,
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=900&q=80&auto=format&fit=crop',
    summary: 'A 5-day mobile screening campaign provided free blood pressure, blood glucose, and HIV testing to over 3,000 Merhabete Woreda residents.',
    content: [
      'The Alem Ketema Enat General Hospital Community Health Team, in partnership with the Merhabete Woreda Health Office, conducted a 5-day mobile community screening campaign.',
      'Over 3,000 residents received free blood pressure checks, fasting blood glucose tests, HIV counseling and testing, and nutritional assessments across 12 kebeles in the woreda.',
      'The campaign identified 214 previously undiagnosed hypertension cases and 41 diabetes cases, all of whom were referred for follow-up care at the hospital.',
    ]
  },
  {
    id: 5,
    title: 'Blood Bank Achieves Zero-Shortage Status with New Refrigerated Storage',
    category: 'Laboratory',
    categoryColor: 'bg-red-100 text-red-700',
    date: 'September 5, 2026',
    author: 'Laboratory Services',
    authorTitle: 'Head of Blood Bank',
    readTime: '2 min read',
    views: 543,
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80&auto=format&fit=crop',
    summary: 'New WHO-standard blood refrigeration units and a community donor program ensure uninterrupted blood supply for emergency and surgical procedures.',
    content: [
      'The Alem Ketema Enat Hospital Blood Bank has achieved zero blood shortage status following the installation of three WHO-standard blood refrigeration units and the launch of a dedicated community blood donor outreach program.',
      'The hospital now maintains a 30-day emergency blood reserve across all major blood types and has partnered with the Ethiopian Red Cross to coordinate donor mobilization for emergency situations.',
    ]
  },
  {
    id: 6,
    title: 'Hospital Staff Complete Advanced Life Support Training',
    category: 'Training',
    categoryColor: 'bg-purple-100 text-purple-700',
    date: 'August 22, 2026',
    author: 'Training & Development',
    authorTitle: 'Human Resources Department',
    readTime: '3 min read',
    views: 412,
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=900&q=80&auto=format&fit=crop',
    summary: '45 clinical staff members — including emergency nurses, triage coordinators, and surgical technicians — completed a certified BLS/ACLS training program.',
    content: [
      '45 clinical staff members from the Alem Ketema Enat General Hospital recently completed a 4-day Basic Life Support (BLS) and Advanced Cardiac Life Support (ACLS) training program.',
      'The training was facilitated by certified instructors from the Ethiopian Emergency Medical Training Institute and covered CPR, defibrillation, airway management, and advanced resuscitation protocols.',
      'Hospital management confirmed that all emergency department nurses, surgical technicians, and triage coordinators are now ACLS-certified — a first for any General Hospital in the Merhabete Woreda.',
    ]
  },
];

const allCategories = ['All', ...Array.from(new Set(newsArticles.map(a => a.category)))];

const NewsPage: React.FC = () => {
  const [selected, setSelected] = useState<NewsArticle | null>(null);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const featured = newsArticles.find(a => a.isFeatured);
  const filtered = newsArticles
    .filter(a => !a.isFeatured || activeCategory !== 'All' || searchQuery)
    .filter(a => activeCategory === 'All' || a.category === activeCategory)
    .filter(a => !searchQuery || a.title.toLowerCase().includes(searchQuery.toLowerCase()) || a.summary.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <PublicLayout>

      {/* ── Hero Header ── */}
      <section className="relative py-24 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.3) 1px, transparent 0)', backgroundSize: '32px 32px' }} />
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full mb-6">
            <Rss className="w-3.5 h-3.5" />
            Hospital News & Updates
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white mb-4">
            News & <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">Announcements</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto">
            Stay informed about the latest developments, expansions, and community health initiatives at Alem Ketema Enat General Hospital.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-14">

        {/* ── Featured Article ── */}
        {featured && activeCategory === 'All' && !searchQuery && (
          <div className="mb-14">
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1 h-5 bg-blue-600 rounded-full" />
              <span className="text-sm font-bold uppercase tracking-widest text-blue-600">Featured Story</span>
            </div>
            <div
              className="group relative grid md:grid-cols-2 gap-0 rounded-3xl overflow-hidden shadow-2xl cursor-pointer border border-slate-200 dark:border-slate-700 hover:shadow-blue-200/40 dark:hover:shadow-blue-900/40 transition-shadow duration-500"
              onClick={() => setSelected(featured)}
            >
              {/* Image */}
              <div className="relative overflow-hidden min-h-[300px] md:min-h-[420px]">
                <img
                  src={featured.image}
                  alt={featured.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent md:block hidden" />
                <span className={`absolute top-5 left-5 text-xs font-bold px-3 py-1.5 rounded-full ${featured.categoryColor}`}>
                  {featured.category}
                </span>
              </div>

              {/* Content */}
              <div className="flex flex-col justify-center bg-white dark:bg-slate-800 p-8 md:p-10">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-4">
                  <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{featured.date}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{featured.readTime}</span>
                  <span>·</span>
                  <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{featured.views?.toLocaleString()} views</span>
                </div>

                <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-white mb-4 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {featured.title}
                </h2>
                <p className="text-slate-600 dark:text-slate-300 leading-relaxed mb-6 text-sm">
                  {featured.summary}
                </p>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-sm font-bold">
                      {featured.author[0]}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-white">{featured.author}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{featured.authorTitle}</p>
                    </div>
                  </div>
                  <span className="flex items-center gap-1.5 text-sm font-bold text-blue-600 dark:text-blue-400 group-hover:gap-3 transition-all">
                    Read full article <ArrowRight className="w-4 h-4" />
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Search + Filter ── */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          {/* Category Pills */}
          <div className="flex flex-wrap gap-2">
            {allCategories.map(cat => (
              <button
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all duration-200 ${
                  activeCategory === cat
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200 dark:shadow-blue-900'
                    : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400 hover:text-blue-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-56"
            />
          </div>
        </div>

        {/* ── Article Grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-500 dark:text-slate-400">
            <Newspaper className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No articles found</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((article, i) => (
              <article
                key={article.id}
                onClick={() => setSelected(article)}
                className="group bg-white dark:bg-slate-800 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {/* Thumbnail */}
                <div className="relative overflow-hidden h-48">
                  <img
                    src={article.image}
                    alt={article.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                  <span className={`absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full ${article.categoryColor}`}>
                    {article.category}
                  </span>
                </div>

                {/* Body */}
                <div className="p-5">
                  <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 mb-3">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{article.date}</span>
                    <span>·</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{article.readTime}</span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-2 line-clamp-3 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {article.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed mb-4">
                    {article.summary}
                  </p>

                  <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-cyan-500 flex items-center justify-center text-white text-[10px] font-bold">
                        {article.author[0]}
                      </div>
                      <span className="text-[11px] font-medium text-slate-600 dark:text-slate-400 truncate max-w-[100px]">{article.author}</span>
                    </div>
                    <span className="flex items-center gap-1 text-[11px] font-bold text-blue-600 dark:text-blue-400 group-hover:gap-2 transition-all">
                      Read <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* ── Article Reader Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-sm overflow-y-auto py-8 px-4"
          onClick={() => setSelected(null)}
        >
          <div
            className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-2xl w-full my-auto"
            onClick={e => e.stopPropagation()}
          >
            {/* Hero image */}
            <div className="relative h-64 overflow-hidden rounded-t-3xl">
              <img src={selected.image} alt={selected.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <button
                onClick={() => setSelected(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
              <span className={`absolute bottom-4 left-5 text-xs font-bold px-3 py-1 rounded-full ${selected.categoryColor}`}>
                {selected.category}
              </span>
            </div>

            {/* Content */}
            <div className="p-7">
              <h2 className="text-xl font-black text-slate-900 dark:text-white mb-3 leading-snug">
                {selected.title}
              </h2>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-5 pb-5 border-b border-slate-100 dark:border-slate-800">
                <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5" />{selected.date}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><BookOpen className="w-3.5 h-3.5" />{selected.readTime}</span>
                <span>·</span>
                <span className="flex items-center gap-1"><Eye className="w-3.5 h-3.5" />{selected.views?.toLocaleString()} views</span>
                <span>·</span>
                <span className="flex items-center gap-1 font-semibold text-slate-600 dark:text-slate-300">
                  <Tag className="w-3.5 h-3.5" />{selected.author}
                </span>
              </div>

              <p className="text-sm font-medium text-blue-700 dark:text-blue-400 mb-5 leading-relaxed bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl border-l-4 border-blue-500">
                {selected.summary}
              </p>

              <div className="space-y-4">
                {selected.content.map((para, i) => (
                  <p key={i} className="text-sm text-slate-700 dark:text-slate-300 leading-7">
                    {para}
                  </p>
                ))}
              </div>

              <div className="mt-7 pt-5 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                  {selected.author[0]}
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800 dark:text-white">{selected.author}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{selected.authorTitle}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </PublicLayout>
  );
};

export default NewsPage;
