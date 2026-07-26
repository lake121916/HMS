import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import {
  Baby, Heart, Brain, Bone, Eye, FlaskConical,
  Stethoscope, Activity, Pill, Zap,
  Truck, ChevronRight, ArrowRight, Users, Clock
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const IMGS = {
  hero:      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format',
  maternity: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&q=80&auto=format',
  pediatrics:'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=80&auto=format',
  neurology: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=600&q=80&auto=format',
  ortho:     'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=600&q=80&auto=format',
  eye:       'https://images.unsplash.com/photo-1581595219315-a187dd40c322?w=600&q=80&auto=format',
  lab:       'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&q=80&auto=format',
  radiology: 'https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=600&q=80&auto=format',
  pharmacy:  'https://images.unsplash.com/photo-1563213126-a4273aed2016?w=600&q=80&auto=format',
  emergency: 'https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&q=80&auto=format',
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

const departments = [
  { id:1, icon:Baby,  color:'bg-pink-600', img:IMGS.maternity, name:'Maternity & Obstetrics', tagline:'Caring for Mothers', head:'Dr. Alem Tesfaye', beds:40, staff:18, hours:'24/7', desc:'Our flagship department offering comprehensive care from preconception through postnatal recovery. Over 3,000 babies delivered annually in modern delivery suites.', services:['Antenatal care','Labor & delivery','C-section surgery','High-risk pregnancy','Postnatal care','Family planning'] },
  { id:2, icon:Heart, color:'bg-red-600',  img:IMGS.pediatrics, name:'Pediatrics & Neonatology', tagline:'Child-Centered Care', head:'Dr. Selamawit Bekele', beds:35, staff:15, hours:'24/7', desc:'From newborns to adolescents, our pediatric team provides compassionate, evidence-based care. Our NICU handles premature and critically ill newborns.', services:['Newborn care','NICU','Growth monitoring','Vaccination','Child nutrition','Developmental screening'] },
  { id:3, icon:Stethoscope, color:'bg-blue-600', img:IMGS.maternity, name:'General Medicine', tagline:'Holistic Adult Care', head:'Dr. Mekdes Worku', beds:30, staff:12, hours:'Mon–Sat 8am–8pm', desc:'Comprehensive diagnosis and management of adult conditions including diabetes, hypertension, infectious diseases by our internist team.', services:['Diabetes management','Hypertension','Infectious diseases','Chronic care','Health screenings','Outpatient consults'] },
  { id:4, icon:Brain,  color:'bg-purple-600', img:IMGS.neurology, name:'Neurology', tagline:'Brain & Nervous System', head:'Dr. Dawit Solomon', beds:15, staff:7, hours:'Mon–Fri 8am–5pm', desc:'Our neurology unit provides diagnosis and treatment for the brain, spinal cord, and nervous system, supported by EEG and advanced imaging.', services:['Epilepsy care','Stroke management','Headache clinic','EEG services','Neuropathy','Movement disorders'] },
  { id:5, icon:Bone,   color:'bg-orange-600', img:IMGS.ortho, name:'Orthopedics & Surgery', tagline:'Bones, Joints & More', head:'Dr. Girma Haile', beds:20, staff:9, hours:'Mon–Fri 8am–6pm', desc:'Expert surgical and non-surgical care for musculoskeletal conditions in our modern operating theaters.', services:['Fracture management','Joint surgery','Spine care','Sports injuries','Physiotherapy','Prosthetics'] },
  { id:6, icon:Eye,    color:'bg-cyan-600',  img:IMGS.eye, name:'Ophthalmology', tagline:'Complete Eye Care', head:'Dr. Hiwot Girma', beds:8, staff:5, hours:'Mon–Sat 8am–4pm', desc:'Comprehensive eye care from routine examinations to cataract surgery. Serving adults and children in our fully equipped eye clinic.', services:['Eye exams','Cataract surgery','Glaucoma care','Diabetic eye','Pediatric eye','Prescription glasses'] },
  { id:7, icon:FlaskConical, color:'bg-green-600', img:IMGS.lab, name:'Laboratory Services', tagline:'Precise Diagnostics', head:'Mr. Abel Tadesse', beds:0, staff:10, hours:'Mon–Sat 7am–9pm', desc:'Fully equipped diagnostic laboratory with rapid turnaround times and accurate results to support clinical decision-making across all departments.', services:['Hematology','Biochemistry','Microbiology','Hormones','Blood bank','Pathology'] },
  { id:8, icon:Zap,    color:'bg-indigo-600', img:IMGS.radiology, name:'Radiology & Imaging', tagline:'Advanced Imaging', head:'Dr. Yosef Mekonnen', beds:0, staff:6, hours:'Mon–Sat 8am–6pm', desc:'Digital radiological services including X-ray, ultrasound, and Doppler. Same-day reporting by qualified radiologists for most procedures.', services:['Digital X-ray','Ultrasound','Obstetric scan','Doppler','ECG','Bone density'] },
  { id:9, icon:Pill,   color:'bg-teal-600',  img:IMGS.pharmacy, name:'Pharmacy', tagline:'Safe Medication', head:'Ms. Meron Abebe', beds:0, staff:8, hours:'Mon–Sun 8am–10pm', desc:'Full formulary of medications at affordable prices. Pharmacists provide counseling on drug use and potential interactions.', services:['Prescription dispensing','Drug counseling','OTC medicines','IV fluids','Pediatric doses','Affordable pricing'] },
  { id:10,icon:Truck,  color:'bg-red-700',   img:IMGS.emergency, name:'Emergency Unit', tagline:'24/7 Rapid Response', head:'Dr. Naol Fikadu', beds:12, staff:20, hours:'24/7 / 365 days', desc:'Emergency medicine specialists, triage nurses, and resuscitation teams ready for any life-threatening situation around the clock.', services:['Triage','Resuscitation','Trauma care','Obstetric emergency','Pediatric emergency','Stabilization'] },
];

const DepartmentsPage: React.FC = () => {
  const [selected, setSelected] = useState<number | null>(null);

  return (
    <PublicLayout>

      {/* ── HERO ── */}
      <section className="relative py-28 overflow-hidden bg-gray-900">
        <div className="absolute inset-0">
          <img src={IMGS.hero} alt="Hospital" className="w-full h-full object-cover opacity-100" />
        </div>
        <div className="relative max-w-7xl mx-auto px-6 text-center">
          <Reveal>
            <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-10 shadow-2xl max-w-3xl mx-auto">
              <span className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-5 text-white">Hospital Units</span>
              <h1 className="text-4xl lg:text-6xl font-extrabold mb-5 leading-tight text-gray-900">Our Departments</h1>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto leading-relaxed">
                10 specialized departments working together to provide comprehensive, coordinated healthcare.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── STATS ── */}
      <section className="bg-white border-b border-gray-100 py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
          {[
            { icon: Activity, value: '10', label: 'Departments' },
            { icon: Users,    value: '80+', label: 'Medical Staff' },
            { icon: Clock,    value: '24/7', label: 'Emergency' },
            { icon: Stethoscope, value: '200+', label: 'Beds' },
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

      {/* ── CARDS ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-10">
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              Click on any department to see services and staff details.
            </p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {departments.map((dept, i) => (
              <Reveal key={dept.id} delay={(i % 3) * 100}>
                <div
                  className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden cursor-pointer transition-all hover:shadow-xl hover-lift ${selected === dept.id ? 'ring-2 ring-blue-500 shadow-lg' : ''}`}
                  onClick={() => setSelected(selected === dept.id ? null : dept.id)}
                >
                  {/* Image header */}
                  <div className="relative h-36 overflow-hidden">
                    <img src={dept.img} alt={dept.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className={`absolute inset-0 ${dept.color} opacity-70`} />
                    <div className="absolute inset-0 flex items-center p-5 gap-3">
                      <div className="w-11 h-11 bg-white/25 rounded-xl flex items-center justify-center flex-shrink-0">
                        <dept.icon className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-white font-bold text-sm leading-tight">{dept.name}</h3>
                        <p className="text-white/70 text-xs mt-0.5">{dept.tagline}</p>
                      </div>
                      <ChevronRight className={`w-5 h-5 text-white/70 flex-shrink-0 transition-transform duration-200 ${selected === dept.id ? 'rotate-90' : ''}`} />
                    </div>
                  </div>

                  {/* Meta row */}
                  <div className="px-5 py-3 flex items-center gap-5 text-xs text-gray-500 border-b border-gray-50">
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{dept.hours}</span>
                    {dept.beds > 0 && <span className="flex items-center gap-1"><Activity className="w-3.5 h-3.5" />{dept.beds} beds</span>}
                    <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5" />{dept.staff} staff</span>
                  </div>
                  <div className="px-5 py-2.5 text-xs text-gray-500">
                    Head: <span className="font-semibold text-gray-700">{dept.head}</span>
                  </div>

                  {/* Expanded */}
                  {selected === dept.id && (
                    <div className="px-5 pb-5 border-t border-gray-100 pt-4 bg-gray-50">
                      <p className="text-gray-600 text-sm leading-relaxed mb-4">{dept.desc}</p>
                      <p className="text-xs font-bold text-gray-700 mb-2 uppercase tracking-wider">Services Offered</p>
                      <div className="grid grid-cols-2 gap-1.5 mb-4">
                        {dept.services.map(s => (
                          <span key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                            <span className={`w-1.5 h-1.5 rounded-full ${dept.color} flex-shrink-0`} />{s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-14 bg-blue-700 text-white text-center">
        <div className="max-w-xl mx-auto px-6">
          <Reveal>
            <h2 className="text-2xl font-extrabold mb-3">Need to Visit a Department?</h2>
            <p className="text-blue-200 mb-6 text-sm leading-relaxed">
              Visit our reception for walk-in services or call us for assistance.
            </p>
            <Link to="/contact"
              className="px-8 py-3 bg-yellow-400 text-gray-900 font-bold rounded-xl hover:bg-yellow-300 transition-colors inline-flex items-center gap-2 shadow hover-lift">
              Contact Us <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
};

export default DepartmentsPage;
