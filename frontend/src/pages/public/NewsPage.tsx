import React, { useState } from 'react';
import PublicLayout from '../../components/PublicLayout';
import {
  Newspaper, Calendar, ChevronRight, X, ArrowRight
} from 'lucide-react';

interface NewsArticle {
  id: number;
  title: string;
  category: string;
  date: string;
  author: string;
  readTime: string;
  image: string;
  summary: string;
  content: string[];
  isFeatured?: boolean;
}

const newsArticles: NewsArticle[] = [
  {
    id: 1,
    title: 'Alem Ketema Enat Hospital Deploys 24/7 Digital Triage & Electronic Health Record System',
    category: 'System Upgrades',
    date: 'October 8, 2026',
    author: 'Hospital Administration',
    readTime: '4 min read',
    image: '/images/hospital.jpg.webp',
    isFeatured: true,
    summary: 'Alem Ketema Enat General Hospital in Merhabete Woreda has officially launched an integrated hospital management system connecting Reception, Triage Nurse Vitals, Doctor Consultations, Pathology Lab, Pharmacy, and Cashier POS.',
    content: [
      'In a major advancement for healthcare delivery in the North Shewa Zone of Amhara Region, Alem Ketema Enat General Hospital has deployed a comprehensive Electronic Health Record (EHR) and digital triage workflow system.',
      'The new system enables receptionists to immediately hand off walk-in patients to triage nurses, where vitals (blood pressure, temperature, heart rate, and oxygen saturation) are recorded digitally and automatically categorized by urgency level (Emergency 🚨, Urgent ⚠️, Routine ✓).',
      'Doctor consultation desks are now equipped with ICD-10 medical coding, digital lab ordering, e-prescriptions, and seamless cashier billing, significantly reducing patient wait times and improving diagnostic accuracy across all departments.'
    ]
  },
  {
    id: 2,
    title: 'North Shewa Zone Health Department Conducts Annual Hospital Performance Review',
    category: 'Regional Health Review',
    date: 'October 4, 2026',
    author: 'Regional Health Bureau',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80&auto=format&fit=crop',
    summary: 'Officials from the Amhara Region Health Bureau and Merhabete Woreda Administration commended Alem Ketema Enat General Hospital for outstanding clinical outcomes and emergency care delivery.',
    content: [
      'Delegates from the North Shewa Zone Health Department conducted their annual comprehensive operational review at Alem Ketema Enat General Hospital.',
      'The review panel evaluated key performance indicators including maternal mortality reduction, surgical success rates, emergency response times, and pharmaceutical inventory availability.',
      'Government officials praised the hospital leadership and medical staff for establishing a high standard of clinical care and maintaining robust community health partnerships throughout Merhabete Woreda.'
    ]
  },
  {
    id: 3,
    title: 'Maternal & Neonatal Intensive Care Unit (NICU) Expansion Completed',
    category: 'Clinical Expansion',
    date: 'September 28, 2026',
    author: 'Obstetrics Department',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
    summary: 'The hospital has expanded its maternal care facility with 15 new neonatal incubators, high-risk labor delivery suites, and 24/7 midwife nursing coverage.',
    content: [
      'To address growing maternal healthcare needs in Alem Ketema and neighboring rural communities, Alem Ketema Enat Hospital has finalized a major expansion of its Obstetrics & NICU facility.',
      'The newly commissioned wing includes specialized radiant warmers, neonatal jaundice phototherapy units, and dedicated C-section recovery suites.',
      'Expectant mothers now benefit from 24-hour specialist obstetrician coverage and painless labor monitoring options, reinforcing the hospital’s core commitment to safe motherhood.'
    ]
  },
  {
    id: 4,
    title: 'Cashier Station Upgraded with Direct Telebirr & CBE Birr Mobile Payments',
    category: 'Digital Services',
    date: 'September 22, 2026',
    author: 'Finance & Accounts',
    readTime: '3 min read',
    image: 'https://images.unsplash.com/photo-1556742049-0a675657435b?w=900&q=80&auto=format&fit=crop',
    summary: 'Patients can now make instant digital payment settlements using dynamic Telebirr merchant QR codes and Commercial Bank of Ethiopia (CBE Birr) direct transfers at the Cashier POS station.',
    content: [
      'As part of ongoing digital transformation efforts, Alem Ketema Enat Hospital cashier counters have integrated dynamic QR code payment processing for Telebirr and CBE Birr users.',
      'Cashiers can display personalized invoice payment QR codes directly on POS displays, allowing patients to scan and confirm transactions securely within seconds.',
      'Automatic digital transaction reference verification ensures instant receipt printing (RCP-XXXXXX) without manual paperwork delays.'
    ]
  },
  {
    id: 5,
    title: 'Merhabete Woreda Community Blood Donation & Diabetes Screening Drive',
    category: 'Community Outreach',
    date: 'September 15, 2026',
    author: 'Community Outreach Team',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80&auto=format&fit=crop',
    summary: 'Over 350 local residents received free health screenings and contributed to the hospital blood bank during the annual Merhabete Community Health Day.',
    content: [
      'Alem Ketema Enat Hospital medical volunteers organized a day-long health outreach initiative in Alem Ketema town center.',
      'The event provided free blood pressure testing, random blood sugar screening for diabetes, and voluntary blood donations to replenish the regional blood bank.',
      'Public health educators also conducted workshops on maternal nutrition, hygiene standards, and chronic disease prevention for local families.'
    ]
  }
];

const categories = ['All News', 'System Upgrades', 'Regional Health Review', 'Clinical Expansion', 'Digital Services', 'Community Outreach'];

const NewsPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All News');
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);

  const featured = newsArticles.find(a => a.isFeatured) || newsArticles[0];
  
  const filteredArticles = selectedCategory === 'All News'
    ? newsArticles
    : newsArticles.filter(a => a.category === selectedCategory);

  return (
    <PublicLayout>
      {/* Hero Header */}
      <section className="relative bg-slate-950 text-white py-16 lg:py-24 overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 mb-4">
            <Newspaper className="w-4 h-4 text-emerald-300" />
            Official Press Releases & Healthcare Updates
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Alem Ketema Enat Hospital Newsroom
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Stay updated with clinical advancements, hospital performance reviews, community health drives, and service enhancements at Alem Ketema Enat General Hospital in Amhara Region.
          </p>
        </div>
      </section>

      {/* Featured News Banner */}
      <section className="py-10 bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="bg-gradient-to-br from-slate-800 to-slate-950 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl grid grid-cols-1 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 h-72 lg:h-full relative bg-slate-950 overflow-hidden">
              <img
                src={featured.image}
                alt={featured.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
            </div>

            <div className="lg:col-span-5 p-8 space-y-4">
              <div className="flex items-center gap-3">
                <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  Featured News
                </span>
                <span className="text-xs text-slate-400 font-semibold">{featured.date}</span>
              </div>

              <h2 className="text-2xl font-black leading-tight text-white">{featured.title}</h2>
              <p className="text-xs text-slate-300 leading-relaxed font-medium">{featured.summary}</p>

              <button
                onClick={() => setSelectedArticle(featured)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-xs rounded-xl shadow-lg transition-all"
              >
                Read Full Announcement <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Category Filters & News Grid */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md scale-[1.03]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-emerald-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* News Article Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredArticles.map((article) => (
              <div
                key={article.id}
                className="bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between group"
              >
                <div>
                  <div className="relative h-48 overflow-hidden bg-slate-950">
                    <img
                      src={article.image}
                      alt={article.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/80 text-emerald-300 border border-emerald-400/40 backdrop-blur-md">
                      {article.category}
                    </span>
                  </div>

                  <div className="p-6 space-y-3">
                    <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400 font-semibold">
                      <span className="flex items-center gap-1"><Calendar className="w-3.5 h-3.5 text-emerald-500" /> {article.date}</span>
                      <span>{article.readTime}</span>
                    </div>

                    <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors leading-snug">
                      {article.title}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-3 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>
                </div>

                <div className="p-6 pt-0">
                  <button
                    onClick={() => setSelectedArticle(article)}
                    className="w-full py-2.5 px-4 bg-slate-100 dark:bg-slate-700/60 hover:bg-emerald-600 hover:text-white dark:hover:bg-emerald-600 text-slate-800 dark:text-slate-200 font-extrabold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5"
                  >
                    Read Full Story <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Article Detail Modal */}
      {selectedArticle && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-slate-800 p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
              <div>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  {selectedArticle.category}
                </span>
                <p className="text-xs text-slate-400 font-semibold mt-1">{selectedArticle.date} • By {selectedArticle.author}</p>
              </div>
              <button
                onClick={() => setSelectedArticle(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white leading-tight">{selectedArticle.title}</h2>
              
              <div className="h-56 rounded-2xl overflow-hidden bg-slate-950">
                <img src={selectedArticle.image} alt={selectedArticle.title} className="w-full h-full object-cover" />
              </div>

              <div className="space-y-3 text-xs md:text-sm text-slate-700 dark:text-slate-300 leading-relaxed font-medium">
                {selectedArticle.content.map((paragraph, idx) => (
                  <p key={idx}>{paragraph}</p>
                ))}
              </div>

              <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 text-xs space-y-1">
                <p className="font-extrabold text-emerald-900 dark:text-emerald-200">Official Press Contact:</p>
                <p className="text-emerald-700 dark:text-emerald-300">Alem Ketema Enat General Hospital Public Relations Office • Alem Ketema, Merhabete Woreda</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setSelectedArticle(null)}
                className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 hover:bg-slate-800 text-white font-extrabold text-xs rounded-xl transition-colors"
              >
                Close Article
              </button>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

export default NewsPage;
