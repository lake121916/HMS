import React from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import {
  Target, Eye, Heart, Award, Users, Stethoscope,
  CheckCircle, ArrowRight
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const IMGS = {
  team:     'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80&auto=format',
  care:     'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=800&q=80&auto=format',
  building: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=800&q=80&auto=format',
  lab:      'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&q=80&auto=format',
  surgery:  'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&q=80&auto=format',
  nurse:    'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80&auto=format',
  nurse2:   'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80&auto=format',
  cmo:      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80&auto=format',
  admin:    'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80&auto=format',
  peds:     'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80&auto=format',
  surgeon:  'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80&auto=format',
  cardio:   'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80&auto=format',
};

function Reveal({ children, className = '', delay = 0, dir = 'up' }:
  { children: React.ReactNode; className?: string; delay?: number; dir?: 'up'|'left'|'right' }) {
  const { ref, inView } = useInView();
  const anim = dir === 'left' ? 'fade-left' : dir === 'right' ? 'fade-right' : 'fade-up';
  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}
      className={`${anim} ${inView ? 'in-view' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

const values = [
  { icon: Heart, title: 'Compassion', desc: 'Every patient is treated with empathy, dignity, and respect regardless of background.', color: 'text-pink-600 bg-pink-50' },
  { icon: Award, title: 'Excellence', desc: 'We hold ourselves to the highest standards of medical practice and patient outcomes.', color: 'text-yellow-600 bg-yellow-50' },
  { icon: Users, title: 'Teamwork', desc: 'Our multidisciplinary teams collaborate to provide holistic, integrated care.', color: 'text-blue-600 bg-blue-50' },
  { icon: CheckCircle, title: 'Integrity', desc: 'Honest, transparent communication with patients and families at every step.', color: 'text-green-600 bg-green-50' },
];

const milestones = [
  { year: '1985', event: 'Hospital founded by Dr. Alem Ketema Tesfaye with a 30-bed maternity ward.' },
  { year: '1995', event: 'Expanded to include pediatric and neonatal intensive care units.' },
  { year: '2003', event: 'Laboratory and radiology departments modernized with digital equipment.' },
  { year: '2010', event: 'Accredited by the Ethiopian Hospital Alliance for quality standards.' },
  { year: '2018', event: 'New outpatient block opened, doubling patient capacity to 300 per day.' },
  { year: '2023', event: 'Launched electronic health records and telemedicine consultations.' },
];

const leadership = [
  { name: 'Dr. Tigist Alem Ketema', role: 'Chief Medical Officer', dept: 'Executive Team', img: IMGS.cmo },
  { name: 'Ato Girma Tadesse', role: 'Hospital Administrator', dept: 'Administration', img: IMGS.admin },
  { name: 'Dr. Selamawit Haile', role: 'Head of Obstetrics', dept: 'Clinical', img: IMGS.nurse },
  { name: 'Dr. Yonas Bekele', role: 'Head of Pediatrics', dept: 'Clinical', img: IMGS.peds },
  { name: 'Dr. Girma Haile', role: 'Head of Surgery', dept: 'Clinical', img: IMGS.surgeon },
  { name: 'W/ro Mekdes Worku', role: 'Head of Nursing', dept: 'Nursing', img: IMGS.nurse2 },
  { name: 'Dr. Kaleb Abate', role: 'Head of Cardiology', dept: 'Clinical', img: IMGS.cardio },
  { name: 'Ato Dawit Alemu', role: 'Head of Laboratory', dept: 'Diagnostics', img: IMGS.lab },
];

const AboutPage: React.FC = () => (
  <PublicLayout>

    {/* ── HERO ── */}
    <section className="relative py-28 overflow-hidden bg-gray-900">
      <div className="absolute inset-0">
        <img src={IMGS.team} alt="Medical team" className="w-full h-full object-cover opacity-100" />
      </div>
      <div className="relative max-w-7xl mx-auto px-6 text-center">
        <Reveal>
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl max-w-3xl mx-auto">
            <span className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-5 text-white">About Us</span>
            <h1 className="text-4xl lg:text-6xl font-extrabold mb-5 leading-tight text-gray-900">Our Story &amp; Mission</h1>
            <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
              For over 35 years, Alem Ketema Enat Hospital has stood at the heart of Addis Ababa as a beacon of compassionate, high-quality healthcare.
            </p>
          </div>
        </Reveal>
      </div>
    </section>

    {/* ── STORY ── */}
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <Reveal dir="left">
          <div className="relative">
            <img src={IMGS.building} alt="Hospital" className="rounded-2xl shadow-xl object-cover h-80 w-full" />
            <img src={IMGS.care} alt="Care"
              className="absolute -bottom-6 -right-6 w-48 h-36 object-cover rounded-2xl shadow-lg border-4 border-white hidden md:block" />
            <div className="absolute -top-4 -left-4 bg-blue-600 text-white rounded-2xl px-4 py-3 shadow-lg hidden md:block">
              <p className="text-2xl font-extrabold">50K+</p>
              <p className="text-xs text-blue-200">Patients Served</p>
            </div>
          </div>
        </Reveal>

        <Reveal dir="right">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Our Story</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2 mb-5">A Legacy of Caring</h2>
          <div className="space-y-4 text-gray-500 leading-relaxed text-sm">
            <p>Founded in 1985 by Dr. Alem Ketema Tesfaye, the hospital began as a modest 30-bed maternity center with a simple yet profound vision: every mother and child deserves safe, dignified healthcare.</p>
            <p>Over the decades, we've grown into a comprehensive institution with 200+ beds, 12 departments, and 80+ medical professionals — delivering over 50,000 babies and serving hundreds of thousands of families.</p>
            <p>Today we continue that legacy, investing in people, technology, and infrastructure to ensure world-class care in a warm environment.</p>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-3">
            {[['200+','Beds'],['50K+','Births'],['12','Depts']].map(([v,l]) => (
              <div key={l} className="text-center bg-blue-50 rounded-xl p-3">
                <p className="text-xl font-extrabold text-blue-600">{v}</p>
                <p className="text-xs text-gray-500 mt-0.5">{l}</p>
              </div>
            ))}
          </div>
          <Link to="/contact" className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm hover-lift">
            Book an Appointment <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
    </section>

    {/* ── MISSION / VISION / VALUES ── */}
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: Target, color: 'bg-blue-600', title: 'Our Mission', text: 'To provide accessible, high-quality, compassionate healthcare with special focus on maternal and child health, guided by evidence-based medicine.' },
          { icon: Eye, color: 'bg-green-600', title: 'Our Vision', text: 'To be the leading center of excellence for maternal and pediatric care in Ethiopia — where quality healthcare meets heartfelt compassion, accessible to all.' },
          { icon: Heart, color: 'bg-pink-600', title: 'Our Values', text: 'Compassion, Excellence, Integrity, Teamwork, and Accountability — the principles that guide every decision and every patient interaction.' },
        ].map((item, i) => (
          <Reveal key={item.title} delay={i * 120}>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center hover-lift">
              <div className={`w-16 h-16 ${item.color} rounded-2xl flex items-center justify-center mx-auto mb-5`}>
                <item.icon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-4">{item.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{item.text}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>

    {/* ── CORE VALUES ── */}
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-14">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">What Drives Us</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Our Core Values</h2>
        </Reveal>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {values.map((v, i) => (
            <Reveal key={v.title} delay={i * 100}>
              <div className="text-center p-6 rounded-2xl border border-gray-100 hover-lift">
                <div className={`w-14 h-14 rounded-xl ${v.color} flex items-center justify-center mx-auto mb-4`}>
                  <v.icon className="w-7 h-7" />
                </div>
                <h3 className="font-bold text-gray-900 mb-2">{v.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{v.desc}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ── PHOTO GALLERY ── */}
    <section className="py-0">
      <div className="grid grid-cols-2 md:grid-cols-4">
        {[IMGS.surgery, IMGS.lab, IMGS.care, IMGS.team].map((src, i) => (
          <div key={i} className="relative overflow-hidden h-52 group">
            <img src={src} alt={`gallery-${i}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
            <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        ))}
      </div>
    </section>

    {/* ── TIMELINE ── */}
    <section className="py-20 bg-gray-50">
      <div className="max-w-4xl mx-auto px-6">
        <Reveal className="text-center mb-14">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Our Journey</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Key Milestones</h2>
        </Reveal>
        <div className="relative">
          <div className="absolute left-6 md:left-1/2 top-0 bottom-0 w-0.5 bg-blue-200 -translate-x-1/2" />
          <div className="space-y-8">
            {milestones.map((m, i) => (
              <Reveal key={m.year} delay={i * 80} dir={i % 2 === 0 ? 'left' : 'right'}>
                <div className={`relative flex items-start gap-6 ${i % 2 === 0 ? 'md:flex-row' : 'md:flex-row-reverse'}`}>
                  <div className="hidden md:block md:w-1/2" />
                  <div className="absolute left-6 md:left-1/2 w-4 h-4 bg-blue-600 rounded-full border-4 border-white shadow -translate-x-1/2 mt-1.5" />
                  <div className={`ml-14 md:ml-0 md:w-1/2 bg-white rounded-2xl p-5 shadow-sm border border-gray-100 ${i % 2 === 0 ? 'md:mr-8' : 'md:ml-8'}`}>
                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full">{m.year}</span>
                    <p className="text-gray-700 text-sm mt-2 leading-relaxed">{m.event}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>

    {/* ── LEADERSHIP ── */}
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-14">
          <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Leadership</span>
          <h2 className="text-3xl font-extrabold text-gray-900 mt-2">Meet Our Leadership Team</h2>
        </Reveal>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {leadership.map((l, i) => (
            <Reveal key={l.name} delay={i * 100}>
              <div className="bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 hover-lift text-center">
                <div className="h-44 overflow-hidden">
                  <img src={l.img} alt={l.name} className="w-full h-full object-cover object-top transition-transform duration-500 hover:scale-105" />
                </div>
                <div className="p-4">
                  <p className="font-bold text-gray-900 text-sm">{l.name}</p>
                  <p className="text-blue-600 text-xs font-semibold mt-0.5">{l.role}</p>
                  <span className="text-xs text-gray-400 bg-gray-200 px-2 py-0.5 rounded-full mt-1 inline-block">{l.dept}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>

    {/* ── CTA ── */}
    <section className="py-20 bg-blue-700 text-white text-center">
      <div className="max-w-2xl mx-auto px-6">
        <Reveal>
          <Stethoscope className="w-12 h-12 mx-auto mb-5 text-blue-300" />
          <h2 className="text-3xl font-extrabold mb-4">Join Our Healthcare Family</h2>
          <p className="text-blue-200 mb-8 leading-relaxed">Experience care that puts you first. Book today and let us take care of you.</p>
          <Link to="/contact"
            className="px-8 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-xl inline-flex items-center gap-2 transition-colors shadow-lg hover-lift">
            Book an Appointment <ArrowRight className="w-4 h-4" />
          </Link>
        </Reveal>
      </div>
    </section>

  </PublicLayout>
);

export default AboutPage;
