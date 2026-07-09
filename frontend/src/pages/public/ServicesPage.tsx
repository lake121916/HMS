import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import {
  Baby, Heart, FlaskConical, Stethoscope, Activity,
  Truck, CheckCircle, ArrowRight, Clock, Users
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const IMGS = {
  hero:      'https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=1200&q=80&auto=format',
  maternity: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=700&q=80&auto=format',
  pediatrics:'https://images.unsplash.com/photo-1584515933487-779824d29309?w=700&q=80&auto=format',
  surgery:   'https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=700&q=80&auto=format',
  lab:       'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=700&q=80&auto=format',
};

function Reveal({ children, className='', delay=0, dir='up' }:
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

const serviceCategories = [
  {
    id: 'maternal', category: 'Maternal Health', icon: Baby, color: 'bg-pink-600', light: 'border-pink-200',
    img: IMGS.maternity,
    services: [
      { title: 'Antenatal Care', desc: 'Comprehensive prenatal checkups, ultrasounds, and nutritional guidance throughout all trimesters.', features: ['Regular checkups','Fetal monitoring','Nutritional counseling','Birth planning'], duration: '30–60 min/visit' },
      { title: 'Labor & Delivery', desc: 'Safe, supportive birthing with experienced midwives and obstetricians available 24/7.', features: ['24/7 availability','Experienced OB team','Pain management','Emergency C-section'], duration: 'As needed' },
      { title: 'Postnatal Care', desc: 'Postpartum monitoring, breastfeeding support, and newborn care guidance.', features: ['Postpartum checkups','Breastfeeding support','Newborn screening','Family counseling'], duration: '6-week program' },
    ]
  },
  {
    id: 'pediatrics', category: 'Pediatrics & Neonatal', icon: Heart, color: 'bg-red-600', light: 'border-red-200',
    img: IMGS.pediatrics,
    services: [
      { title: 'Newborn & NICU', desc: 'State-of-the-art NICU for premature and critically ill newborns.', features: ['Incubator care','Respiratory support','24/7 neonatologist','Family support'], duration: 'As required' },
      { title: 'Child Health & Vaccination', desc: 'Routine checkups, growth monitoring, and complete immunization for children.', features: ['Growth monitoring','Full vaccination','Nutritional assessment','Developmental screening'], duration: '30–45 min' },
      { title: 'Pediatric Emergency', desc: 'Dedicated pediatric ER staffed with specialists for urgent childhood illnesses.', features: ['Dedicated ped. ER','Rapid assessment','Child-friendly environment','24/7 specialist cover'], duration: '24/7' },
    ]
  },
  {
    id: 'specialist', category: 'Specialist Services', icon: Stethoscope, color: 'bg-blue-600', light: 'border-blue-200',
    img: IMGS.surgery,
    services: [
      { title: 'General Surgery', desc: 'Advanced surgical procedures by experienced surgeons in modern operating theaters.', features: ['Laparoscopic surgery','General operations','Post-op care','Sterilized OR'], duration: 'Varies' },
      { title: 'Internal Medicine', desc: 'Diagnosis and management of complex adult conditions by specialist physicians.', features: ['Chronic disease mgmt','Diabetes care','Hypertension','Infectious diseases'], duration: '45–60 min' },
      { title: 'Orthopedics', desc: 'Bone, joint, and musculoskeletal care including fracture management.', features: ['Fracture care','Joint surgery','Physiotherapy','Sports injuries'], duration: 'Varies' },
    ]
  },
  {
    id: 'diagnostics', category: 'Diagnostics & Support', icon: FlaskConical, color: 'bg-green-600', light: 'border-green-200',
    img: IMGS.lab,
    services: [
      { title: 'Laboratory Services', desc: 'Full-spectrum diagnostics with rapid turnaround and accurate results.', features: ['Blood tests','Microbiology','Hormonal tests','Pathology'], duration: '1–24 hr results' },
      { title: 'Radiology & Imaging', desc: 'Digital X-ray, ultrasound, and ECG for comprehensive diagnostic imaging.', features: ['Digital X-ray','Ultrasound','ECG','Doppler studies'], duration: 'Same-day results' },
      { title: 'Pharmacy', desc: 'On-site pharmacy with full medication range and counseling services.', features: ['Full drug stock','Drug counseling','Prescription review','Affordable prices'], duration: 'Open 8am–10pm' },
    ]
  },
];

const ServicesPage: React.FC = () => {
  const [activeCategory, setActiveCategory] = useState('maternal');
  const current = serviceCategories.find(c => c.id === activeCategory)!;

  return (
    <PublicLayout>

      {/* ── HERO ── */}
      <section className="relative py-28 overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img src={IMGS.hero} alt="Medical services" className="w-full h-full object-cover opacity-100" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <Reveal>
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-5 text-white">What We Offer</span>
              <h1 className="text-4xl lg:text-6xl font-extrabold mb-5 leading-tight text-gray-900">Our Medical Services</h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                Comprehensive healthcare from preventive care to complex procedures — all under one roof with an experienced, compassionate team.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white py-10 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Activity, value: '12+', label: 'Specialties' },
            { icon: Users,    value: '80+', label: 'Medical Staff' },
            { icon: Clock,    value: '24/7',label: 'Emergency' },
            { icon: Stethoscope, value:'300+', label: 'Daily Patients' },
          ].map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-2">
                <s.icon className="w-5 h-5 text-blue-600" />
              </div>
              <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── CATEGORY TABS + SERVICES ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          {/* Tabs */}
          <div className="flex flex-wrap gap-3 mb-10 justify-center">
            {serviceCategories.map(cat => (
              <button key={cat.id} onClick={() => setActiveCategory(cat.id)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all hover-lift ${
                  activeCategory === cat.id ? `${cat.color} text-white shadow-md` : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'
                }`}>
                <cat.icon className="w-4 h-4" />{cat.category}
              </button>
            ))}
          </div>

          {/* Category hero image */}
          <Reveal className="mb-10">
            <div className="relative h-56 rounded-2xl overflow-hidden shadow-lg">
              <img src={current.img} alt={current.category} className="w-full h-full object-cover transition-transform duration-700 hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6">
                <h2 className="text-2xl font-extrabold text-white">{current.category}</h2>
              </div>
            </div>
          </Reveal>

          {/* Service cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {current.services.map((svc, i) => (
              <Reveal key={svc.title} delay={i * 100}>
                <div className={`bg-white rounded-2xl border ${current.light} shadow-sm hover-lift overflow-hidden`}>
                  <div className={`${current.color} px-6 py-4`}>
                    <h3 className="text-white font-bold text-lg">{svc.title}</h3>
                    <span className="text-xs text-white/70 mt-0.5 block">{svc.duration}</span>
                  </div>
                  <div className="p-6">
                    <p className="text-gray-500 text-sm leading-relaxed mb-5">{svc.desc}</p>
                    <ul className="space-y-2 mb-5">
                      {svc.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm text-gray-700">
                          <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Link to="/contact"
                      className={`block w-full py-2.5 ${current.color} text-white text-sm font-bold rounded-xl text-center hover:opacity-90 transition-opacity`}>
                      Book This Service
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── EMERGENCY BANNER ── */}
      <section className="py-14 bg-red-600 text-white">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-6">
          <Reveal dir="left" className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0 pulse-ring">
              <Truck className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold">24/7 Emergency Services</h2>
              <p className="text-red-100 text-sm mt-1">Our emergency team is always on standby. Call us immediately.</p>
            </div>
          </Reveal>
          <Reveal dir="right" className="text-center md:text-right">
            <p className="text-red-200 text-xs font-bold uppercase tracking-wider mb-1">Emergency Hotline</p>
            <a href="tel:+251119990000" className="text-3xl font-extrabold hover:underline">+251 11 999 0000</a>
          </Reveal>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-16 bg-white text-center">
        <div className="max-w-2xl mx-auto px-6">
          <Reveal>
            <h2 className="text-3xl font-extrabold text-gray-900 mb-4">Need a Specific Service?</h2>
            <p className="text-gray-500 mb-8">Contact us or speak directly with a specialist about your needs.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact" className="px-8 py-3.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center justify-center gap-2 hover-lift">
                Book Appointment <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/our-doctors" className="px-8 py-3.5 border-2 border-blue-600 text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors inline-flex items-center justify-center gap-2 hover-lift">
                Meet Our Doctors
              </Link>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
};

export default ServicesPage;
