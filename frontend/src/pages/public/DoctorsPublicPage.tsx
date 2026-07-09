import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import { Stethoscope, Search, ArrowRight, Star, Award, Clock, Phone } from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const IMGS = {
  hero: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=80&auto=format',
  d1: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80&auto=format',
  d2: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80&auto=format',
  d3: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80&auto=format',
  d4: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80&auto=format',
  d5: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80&auto=format',
  d6: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?w=400&q=80&auto=format',
  d7: 'https://images.unsplash.com/photo-1651008376811-b90baee60c1f?w=400&q=80&auto=format',
  d8: 'https://images.unsplash.com/photo-1527613426441-4da17471b66d?w=400&q=80&auto=format',
  d9: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80&auto=format',
  d10: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80&auto=format',
  d11: 'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80&auto=format',
  d12: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80&auto=format',
};

function Reveal({ children, className='', delay=0 }:
  { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}
      className={`fade-up ${inView ? 'in-view' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const doctors = [
  { name:'Dr. Alem Tesfaye',    specialty:'Obstetrics & Gynecology', dept:'Maternal Health', exp:'18 years', edu:'MD, Addis Ababa University', available:'Mon, Wed, Fri', rating:4.9, reviews:142, img:IMGS.d1 },
  { name:'Dr. Selamawit Bekele',specialty:'Pediatrics',             dept:'Pediatrics',     exp:'14 years', edu:'MD, Black Lion Hospital',   available:'Tue, Thu, Sat', rating:4.8, reviews:98,  img:IMGS.d2 },
  { name:'Dr. Girma Haile',     specialty:'General Surgery',         dept:'Surgery',        exp:'20 years', edu:'MD, FACS',                  available:'Mon – Fri',     rating:4.9, reviews:213, img:IMGS.d3 },
  { name:'Dr. Hana Mulugeta',   specialty:'Neonatology',             dept:'NICU',           exp:'12 years', edu:'MD, Neonatology Fellow',    available:'Mon, Tue, Thu', rating:5.0, reviews:87,  img:IMGS.d4 },
  { name:'Dr. Yonas Bekele',    specialty:'Pediatric Emergency',     dept:'Pediatrics',     exp:'10 years', edu:'MD, Jimma University',     available:'Wed, Fri, Sat', rating:4.7, reviews:64,  img:IMGS.d5 },
  { name:'Dr. Mekdes Worku',    specialty:'Internal Medicine',       dept:'General Medicine',exp:'16 years',edu:'MD, Hawassa University',   available:'Mon – Thu',     rating:4.8, reviews:119, img:IMGS.d6 },
  { name:'Dr. Biniyam Alemu',   specialty:'Orthopedic Surgery',      dept:'Orthopedics',    exp:'11 years', edu:'MD, Orthopedic Surgery',   available:'Tue, Thu, Sat', rating:4.6, reviews:53,  img:IMGS.d7 },
  { name:'Dr. Tigist Alem Ketema', specialty:'Gynecologic Oncology',    dept:'Maternal Health',exp:'22 years', edu:'MD, PhD — AAU',            available:'Mon, Wed',      rating:5.0, reviews:176, img:IMGS.d8 },
  { name:'Dr. Kaleb Abate',     specialty:'Cardiology',              dept:'Cardiology',     exp:'15 years', edu:'MD, Cardiology Fellow',    available:'Mon, Wed, Fri', rating:4.9, reviews:128, img:IMGS.d9 },
  { name:'Dr. Bethlehem Tadesse', specialty:'Dermatology',            dept:'Dermatology',    exp:'9 years',  edu:'MD, Dermatology Cert',      available:'Tue, Thu',      rating:4.7, reviews:45,  img:IMGS.d10 },
  { name:'Dr. Dawit Alemu',     specialty:'Radiology',               dept:'Radiology',      exp:'13 years', edu:'MD, Radiology Specialist',  available:'Mon – Fri',     rating:4.8, reviews:92,  img:IMGS.d11 },
  { name:'Dr. Ruth Mekonnen',  specialty:'Anesthesiology',           dept:'Surgery',        exp:'17 years', edu:'MD, Anesthesiology Fellow', available:'Tue, Thu, Sat', rating:4.9, reviews:156, img:IMGS.d12 },
];

const departments = ['All','Maternal Health','Pediatrics','Surgery','NICU','General Medicine','Orthopedics','Cardiology','Dermatology','Radiology'];

const DoctorsPublicPage: React.FC = () => {
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');

  const filtered = doctors.filter(d =>
    (dept === 'All' || d.dept === dept) &&
    (d.name.toLowerCase().includes(search.toLowerCase()) ||
     d.specialty.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <PublicLayout>

      {/* ── HERO ── */}
      <section className="relative py-28 overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img src={IMGS.hero} alt="Medical team" className="w-full h-full object-cover opacity-100" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <Reveal>
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-5 text-white">Our Team</span>
              <h1 className="text-4xl lg:text-6xl font-extrabold mb-5 leading-tight text-gray-900">Meet Our Specialists</h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                Highly qualified, compassionate doctors dedicated to delivering the best possible care to every patient.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FILTERS ── */}
      <section className="bg-white border-b border-gray-100 py-6 sticky top-14 z-30 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Search by name or specialty..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
          <div className="flex flex-wrap gap-2">
            {departments.map(d => (
              <button key={d} onClick={() => setDept(d)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all hover-lift ${dept === d ? 'bg-blue-600 text-white shadow-sm' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {d}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* ── DOCTORS GRID ── */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          {filtered.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Stethoscope className="w-16 h-16 mx-auto mb-4 opacity-30" />
              <p className="text-lg font-medium">No doctors found matching your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filtered.map((doc, i) => (
                <Reveal key={doc.name} delay={(i % 4) * 80}>
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover-lift group">
                    {/* Photo */}
                    <div className="relative h-52 overflow-hidden">
                      <img src={doc.img} alt={doc.name}
                        className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                      {/* Rating badge */}
                      <div className="absolute top-3 right-3 flex items-center gap-1 bg-white/95 rounded-full px-2 py-0.5 shadow text-xs font-bold text-yellow-600">
                        <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />{doc.rating}
                      </div>
                      {/* Hover CTA */}
                      <div className="absolute bottom-4 left-0 right-0 px-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                        <Link to="/contact"
                          className="block w-full py-2 bg-yellow-400 text-gray-900 text-xs font-bold rounded-lg text-center hover:bg-yellow-300 transition-colors">
                          Book Appointment →
                        </Link>
                      </div>
                    </div>

                    <div className="p-5">
                      <h3 className="font-bold text-gray-900 text-sm group-hover:text-blue-600 transition-colors">{doc.name}</h3>
                      <p className="text-blue-600 text-xs font-semibold mt-0.5">{doc.specialty}</p>

                      <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                        <div className="flex items-center gap-2">
                          <Award className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{doc.exp} experience
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />{doc.available}
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Stethoscope className="w-3.5 h-3.5 flex-shrink-0" />{doc.edu}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-1">
                        {[...Array(5)].map((_, j) => (
                          <Star key={j} className={`w-3 h-3 ${j < Math.floor(doc.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'}`} />
                        ))}
                        <span className="text-xs text-gray-400 ml-1">({doc.reviews})</span>
                      </div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 bg-blue-700 text-white">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-8">
          <Reveal className="text-center md:text-left">
            <h2 className="text-2xl font-extrabold mb-2">Not Sure Which Doctor to See?</h2>
            <p className="text-blue-200 text-sm">Our reception team will match you with the right specialist.</p>
          </Reveal>
          <Reveal delay={100} className="flex flex-col sm:flex-row gap-3 flex-shrink-0">
            <Link to="/contact"
              className="px-6 py-3 bg-yellow-400 text-gray-900 font-bold rounded-xl hover:bg-yellow-300 transition-colors inline-flex items-center gap-2 hover-lift">
              Contact Us <ArrowRight className="w-4 h-4" />
            </Link>
            <a href="tel:+251111234567"
              className="px-6 py-3 bg-white/25 text-white font-bold rounded-xl hover:bg-white/35 transition-colors inline-flex items-center gap-2 border border-white/50 backdrop-blur-sm">
              <Phone className="w-4 h-4" /> Call Us
            </a>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
};

export default DoctorsPublicPage;
