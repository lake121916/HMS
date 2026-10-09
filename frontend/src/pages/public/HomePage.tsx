import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import {
  Heart, Shield, Award, Users, Stethoscope,
  FlaskConical, Baby, Brain,
  ChevronRight, Star, Phone, Calendar,
  CheckCircle2, ArrowRight, Sparkles, Pill,
  HelpCircle, ChevronDown, PhoneCall
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

/* ── High Quality Image Assets ─────────────────────────────────────────────── */
const IMGS = {
  hero:      'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format&fit=crop',
  maternity: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
  pediatrics:'https://images.unsplash.com/photo-1584515933487-779824d29309?w=900&q=80&auto=format&fit=crop',
  surgery:   'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=900&q=80&auto=format&fit=crop',
  lab:       'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80&auto=format&fit=crop',
  building:  '/images/hospital.jpg.webp',
  doc1:      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80&auto=format&fit=crop',
  doc2:      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&q=80&auto=format&fit=crop',
  doc3:      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80&auto=format&fit=crop',
  doc4:      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=500&q=80&auto=format&fit=crop',
  icu:       'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=900&q=80&auto=format&fit=crop',
  pharmacy:  'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=900&q=80&auto=format&fit=crop',
};

function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const services = [
  { icon: Baby, title: 'Maternity & Childbirth', desc: 'Comprehensive prenatal, painless labor, high-risk delivery and postnatal care.', color: 'bg-pink-500/10 text-pink-600 dark:text-pink-400', img: IMGS.maternity, badge: 'Popular' },
  { icon: Heart, title: 'Pediatrics & NICU', desc: 'Specialized newborn ICU and comprehensive child health treatments.', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', img: IMGS.pediatrics, badge: 'Specialized' },
  { icon: Stethoscope, title: 'General & Laparoscopic Surgery', desc: 'Minimally invasive surgeries with rapid recovery times.', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400', img: IMGS.surgery, badge: 'Advanced' },
  { icon: FlaskConical, title: 'Diagnostic Laboratory', desc: 'Automated blood analysis, pathology, and instant report generation.', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', img: IMGS.lab, badge: '24/7 Open' },
  { icon: Brain, title: 'Neurology & Brain Health', desc: 'Specialized consultations for headaches, stroke prevention & nerve disorders.', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400', img: IMGS.icu, badge: 'Expert' },
  { icon: Pill, title: '24/7 Hospital Pharmacy', desc: 'Authentic medications, prescriptions, and emergency medicine supplies.', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', img: IMGS.pharmacy, badge: 'Full Stock' },
];

const stats = [
  { value: '35+', label: 'Years of Excellence', icon: Award, sub: 'Established legacy' },
  { value: '50,000+', label: 'Patients Served', icon: Users, sub: 'Happy families' },
  { value: '80+', label: 'Specialist Doctors', icon: Stethoscope, sub: 'Expert medical staff' },
  { value: '200+', label: 'Modern Hospital Beds', icon: Shield, sub: 'ICU & Private wards' },
];

const doctors = [
  { name: 'Dr. Alem Tesfaye', specialty: 'Obstetrics & Gynecology', exp: '18 Years Experience', status: 'Available Today', img: IMGS.doc1 },
  { name: 'Dr. Selamawit Bekele', specialty: 'Pediatric Consultant', exp: '14 Years Experience', status: 'Available Today', img: IMGS.doc2 },
  { name: 'Dr. Girma Haile', specialty: 'General & Laparoscopic Surgeon', exp: '20 Years Experience', status: 'On Call', img: IMGS.doc3 },
  { name: 'Dr. Hana Mulugeta', specialty: 'Neonatal Specialist', exp: '12 Years Experience', status: 'Available Today', img: IMGS.doc4 },
];

const testimonials = [
  { name: 'Tigist Alemu', role: 'Mother of 2', img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80&auto=format&fit=crop', text: 'The maternity ward staff at Alem Ketema Enat Hospital were incredibly supportive. I felt safe and cared for during my entire delivery.', stars: 5, date: '2 weeks ago' },
  { name: 'Dr. Kebede Worku', role: 'Physician Practitioner', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&q=80&auto=format&fit=crop', text: 'Alem Ketema Enat Hospital consistently demonstrates outstanding care in maternal-fetal medicine. I refer my patients to them with total confidence.', stars: 5, date: '1 month ago' },
  { name: 'Meron Tadesse', role: 'Patient', img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&q=80&auto=format&fit=crop', text: 'From the front desk registration to the laboratory and pharmacy, every staff member was polite, professional, and efficient.', stars: 5, date: '3 weeks ago' },
];

const faqs = [
  { q: 'What are the hospital emergency and intake hours?', a: 'Our Emergency Unit, Neonatal ICU, Operating Theatres, and Laboratory are open 24 hours a day, 7 days a week, 365 days a year.' },
  { q: 'How can I book an appointment with a specialist doctor?', a: 'You can book an appointment online via our website, call our desk directly at +251 11 123 4567, or visit our Reception Desk in person.' },
  { q: 'Does Alem Ketema Enat Hospital accept health insurance?', a: 'Yes! We partner with major national and private health insurance providers as well as Telebirr and digital payment systems.' },
  { q: 'What services are offered in the Maternity Department?', a: 'We offer full prenatal checkups, high-risk pregnancy monitoring, painless labor facilities, C-section surgical suites, and 24/7 NICU support.' },
];

const HomePage: React.FC = () => {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <PublicLayout>
      {/* ── HERO SECTION ────────────────────────────────────────────────────────── */}
      <section className="relative bg-slate-950 text-white overflow-hidden pt-12 pb-24 lg:pt-20 lg:pb-32">
        {/* Glowing Background Orbs */}
        <div className="absolute top-1/4 left-10 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-teal-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-25 pointer-events-none" />

        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            
            {/* Left Column: Hero Text */}
            <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
              
              {/* Emergency Status Pill */}
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-800/80 border border-slate-700/80 px-4 py-1.5 text-xs font-semibold backdrop-blur-md">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                </span>
                <span className="text-emerald-400">Emergency & OPD Open 24/7</span>
                <span className="text-slate-500">•</span>
                <span className="text-slate-300">Alem Ketema Enat Hospital</span>
              </div>

              {/* Title */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1]">
                Advanced Care for <br className="hidden sm:inline" />
                <span className="bg-gradient-to-r from-teal-300 via-blue-400 to-indigo-300 bg-clip-text text-transparent">
                  Mothers, Children & Families
                </span>
              </h1>

              <p className="text-slate-300 text-base sm:text-lg max-w-2xl leading-relaxed mx-auto lg:mx-0">
                Alem Ketema Enat Hospital combines state-of-the-art medical technology with compassionate, patient-centered healthcare. Your family’s well-being is our highest priority.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start pt-2">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-teal-500 hover:bg-teal-400 text-slate-950 font-bold px-7 py-4 text-sm shadow-xl shadow-teal-500/20 transition-all hover:scale-105"
                >
                  <Calendar className="w-4 h-4" />
                  Book Doctor Appointment
                </Link>

                <a
                  href="tel:+251111234567"
                  className="inline-flex items-center gap-2.5 rounded-2xl bg-rose-600/90 hover:bg-rose-600 text-white font-bold px-6 py-4 text-sm shadow-xl shadow-rose-600/20 transition-all hover:scale-105 border border-rose-500/40"
                >
                  <PhoneCall className="w-4 h-4" />
                  24/7 Emergency Dispatch
                </a>

                <Link
                  to="/services"
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 font-semibold px-6 py-4 text-sm border border-slate-700 transition"
                >
                  Explore Services <ArrowRight className="w-4 h-4 text-teal-400" />
                </Link>
              </div>

              {/* Trust Features Badges */}
              <div className="pt-6 grid grid-cols-3 gap-4 border-t border-slate-800 max-w-lg mx-auto lg:mx-0 text-left">
                <div>
                  <div className="text-xl font-extrabold text-white">35+ Years</div>
                  <div className="text-xs text-slate-400 mt-0.5">Trusted Experience</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-white">50k+ Patients</div>
                  <div className="text-xs text-slate-400 mt-0.5">Satisfied Families</div>
                </div>
                <div>
                  <div className="text-xl font-extrabold text-white">99.8%</div>
                  <div className="text-xs text-slate-400 mt-0.5">Care Satisfaction</div>
                </div>
              </div>
            </div>

            {/* Right Column: Hero Visual Container */}
            <div className="lg:col-span-5 relative">
              <div className="relative mx-auto max-w-md lg:max-w-none">
                {/* Decorative Frame */}
                <div className="absolute -inset-2 rounded-3xl bg-gradient-to-r from-teal-500 to-blue-600 opacity-30 blur-xl"></div>
                
                <div className="relative rounded-3xl bg-slate-900 border border-slate-800 p-3 shadow-2xl overflow-hidden">
                  <img
                    src={IMGS.building}
                    alt="Alem Ketema Enat Hospital"
                    className="w-full h-96 lg:h-[440px] object-cover rounded-2xl"
                  />
                  
                  {/* Floating Badge 1: Emergency */}
                  <div className="absolute bottom-6 left-6 right-6 bg-slate-900/90 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-xl flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold">
                      <Stethoscope className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white">Alem Ketema Enat Hospital</div>
                      <div className="text-xs text-slate-400">Full Emergency, Maternal & Pediatric Wing</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── QUICK ACCESS STRIP ─────────────────────────────────────────────────── */}
      <section className="relative z-20 -mt-10 max-w-7xl mx-auto px-6 lg:px-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-700 flex items-start gap-4 transition hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
              <PhoneCall className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Emergency Intake</h3>
              <p className="text-xs text-slate-500 mt-1">24/7 Ambulance & Trauma Unit</p>
              <a href="tel:+251111234567" className="mt-2 inline-block text-xs font-bold text-rose-600 hover:underline">
                Call: +251 11 123 4567 →
              </a>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-700 flex items-start gap-4 transition hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-teal-100 dark:bg-teal-950/60 text-teal-600 dark:text-teal-400 flex items-center justify-center flex-shrink-0">
              <Calendar className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Doctor Consultation</h3>
              <p className="text-xs text-slate-500 mt-1">Book online or walk-in</p>
              <Link to="/contact" className="mt-2 inline-block text-xs font-bold text-teal-600 hover:underline">
                Schedule Visit →
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-700 flex items-start gap-4 transition hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center flex-shrink-0">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Lab & Diagnostics</h3>
              <p className="text-xs text-slate-500 mt-1">Automated Pathology & Imaging</p>
              <Link to="/services" className="mt-2 inline-block text-xs font-bold text-blue-600 hover:underline">
                View Lab Tests →
              </Link>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-xl border border-slate-200 dark:border-slate-700 flex items-start gap-4 transition hover:-translate-y-1">
            <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 dark:text-purple-400 flex items-center justify-center flex-shrink-0">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 dark:text-white text-sm">Insurance & Billing</h3>
              <p className="text-xs text-slate-500 mt-1">Cashless & Telebirr payments</p>
              <Link to="/login" className="mt-2 inline-block text-xs font-bold text-purple-600 hover:underline">
                Patient Portal →
              </Link>
            </div>
          </div>

        </div>
      </section>

      {/* ── STATS SECTION ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
            
            <div className="lg:col-span-5 space-y-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950 px-3.5 py-1 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                <Sparkles className="w-3.5 h-3.5" /> Why Choose Alem Ketema Enat
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                Modern Healthcare Delivered With Heart & Precision.
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm sm:text-base leading-relaxed">
                We blend advanced clinical equipment with a warm, patient-first approach. Whether welcoming a new child, receiving surgical care, or managing health needs, families receive top-tier medical attention.
              </p>

              <div className="grid grid-cols-2 gap-4 pt-2">
                {[
                  { title: '24/7 Emergency', desc: 'Instant ER & Ambulance response' },
                  { title: 'Expert Specialists', desc: 'Board certified practitioners' },
                  { title: 'Modern Surgery Suites', desc: 'Sterile operating theatres' },
                  { title: 'Digital Health Records', desc: 'Secure & confidential EMR' },
                ].map((item) => (
                  <div key={item.title} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white text-xs">
                      <CheckCircle2 className="w-4 h-4 text-teal-600 flex-shrink-0" />
                      {item.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 pl-6">{item.desc}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="grid grid-cols-2 gap-4">
                {stats.map((s, idx) => (
                  <Reveal key={s.label} delay={idx * 100}>
                    <div className="p-6 rounded-2xl bg-gradient-to-br from-slate-50 to-teal-50/50 dark:from-slate-800 dark:to-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition">
                      <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center mb-3">
                        <s.icon className="w-5 h-5" />
                      </div>
                      <div className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{s.value}</div>
                      <div className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-1">{s.label}</div>
                      <div className="text-xs text-slate-500 mt-0.5">{s.sub}</div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── SPECIALIZED SERVICES ─────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-50 dark:bg-slate-950">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Clinical Excellence
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              Specialized Medical Services
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Providing holistic, high-quality medical services for mothers, children, and every stage of family health.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((item, index) => (
              <Reveal key={item.title} delay={index * 80}>
                <div className="group rounded-3xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col h-full hover:-translate-y-1">
                  
                  <div className="relative h-52 overflow-hidden">
                    <img src={item.img} alt={item.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-900/80 text-white backdrop-blur-md">
                      {item.badge}
                    </span>
                  </div>

                  <div className="p-6 flex-1 flex flex-col">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.color}`}>
                        <item.icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-white text-base">{item.title}</h3>
                    </div>

                    <p className="mt-3 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed flex-1">
                      {item.desc}
                    </p>

                    <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between">
                      <Link to="/services" className="text-xs font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1">
                        View Department Details <ChevronRight className="w-3.5 h-3.5" />
                      </Link>
                      <Link to="/contact" className="text-[11px] font-semibold text-slate-500 hover:text-slate-800">
                        Book Doctor
                      </Link>
                    </div>
                  </div>

                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* ── MEET OUR DOCTORS ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-14">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-100 dark:bg-teal-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-700 dark:text-teal-300">
                Medical Team
              </span>
              <h2 className="mt-2 text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                Our Specialist Doctors
              </h2>
            </div>
            <Link
              to="/our-doctors"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2.5 text-xs font-bold text-slate-800 dark:text-slate-200 transition"
            >
              View Full Medical Directory <ArrowRight className="w-4 h-4 text-teal-600" />
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((doc, idx) => (
              <Reveal key={doc.name} delay={idx * 90}>
                <div className="rounded-3xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 overflow-hidden shadow-sm hover:shadow-lg transition">
                  <div className="relative h-60">
                    <img src={doc.img} alt={doc.name} className="w-full h-full object-cover" />
                    <span className="absolute top-3 left-3 bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
                      {doc.status}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base">{doc.name}</h3>
                    <p className="text-xs font-semibold text-teal-600 dark:text-teal-400">{doc.specialty}</p>
                    <p className="text-[11px] text-slate-500">{doc.exp}</p>

                    <div className="pt-3">
                      <Link
                        to={`/contact?doctor=${encodeURIComponent(doc.name)}`}
                        className="w-full inline-flex items-center justify-center rounded-xl bg-teal-50 dark:bg-teal-950/60 hover:bg-teal-600 text-teal-700 dark:text-teal-300 hover:text-white font-bold py-2 px-3 text-xs transition"
                      >
                        Book Consultation
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* ── PATIENT TESTIMONIALS ────────────────────────────────────────────────── */}
      <section className="py-20 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10">
          
          <div className="text-center max-w-2xl mx-auto mb-14 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-3 py-1 text-xs font-bold uppercase tracking-wider text-teal-400">
              Verified Reviews
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              What Families Say About Our Care
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <Reveal key={t.name} delay={idx * 100}>
                <div className="p-6 rounded-3xl bg-slate-900/90 border border-slate-800 shadow-xl flex flex-col justify-between h-full space-y-4">
                  
                  <div className="space-y-3">
                    <div className="flex items-center gap-1 text-amber-400">
                      {[...Array(t.stars)].map((_, i) => <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />)}
                    </div>
                    <p className="text-slate-300 text-xs sm:text-sm leading-relaxed italic">
                      "{t.text}"
                    </p>
                  </div>

                  <div className="flex items-center gap-3 pt-3 border-t border-slate-800">
                    <img src={t.img} alt={t.name} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                    <div>
                      <div className="font-bold text-white text-xs">{t.name}</div>
                      <div className="text-[11px] text-slate-400">{t.role} • {t.date}</div>
                    </div>
                  </div>

                </div>
              </Reveal>
            ))}
          </div>

        </div>
      </section>

      {/* ── FREQUENTLY ASKED QUESTIONS (FAQ) ────────────────────────────────────── */}
      <section className="py-20 bg-white dark:bg-slate-900">
        <div className="max-w-4xl mx-auto px-6 lg:px-8">
          
          <div className="text-center mb-14 space-y-3">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 dark:bg-blue-950 px-3 py-1 text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              <HelpCircle className="w-3.5 h-3.5" /> FAQ
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Frequently Asked Questions
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">Quick answers about our hospital services, appointments, and emergency procedures.</p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={faq.q}
                  className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 overflow-hidden transition"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full text-left p-5 flex items-center justify-between font-bold text-slate-900 dark:text-white text-sm"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown className={`w-4 h-4 text-teal-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-300 leading-relaxed border-t border-slate-200/60 dark:border-slate-700/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

        </div>
      </section>

      {/* ── EMERGENCY CONTACT BANNER ────────────────────────────────────────────── */}
      <section className="py-16 bg-gradient-to-r from-teal-600 via-blue-600 to-indigo-700 text-white shadow-2xl">
        <div className="max-w-5xl mx-auto px-6 text-center space-y-6">
          <h2 className="text-3xl sm:text-4xl font-black tracking-tight">
            Need Immediate Medical Assistance or Appointment?
          </h2>
          <p className="text-blue-100 text-sm sm:text-base max-w-2xl mx-auto">
            Our medical staff and emergency triage team are available 24/7. Walk in or call our hotline right away.
          </p>
          
          <div className="flex flex-wrap gap-4 justify-center pt-2">
            <a
              href="tel:+251111234567"
              className="inline-flex items-center gap-2 rounded-2xl bg-white text-blue-700 font-extrabold px-8 py-4 text-sm shadow-xl hover:bg-blue-50 transition"
            >
              <Phone className="w-4 h-4" /> Call Hotline: +251 11 123 4567
            </a>

            <Link
              to="/contact"
              className="inline-flex items-center gap-2 rounded-2xl bg-slate-900/40 hover:bg-slate-900/60 text-white font-bold px-8 py-4 text-sm border border-white/20 transition"
            >
              <Calendar className="w-4 h-4" /> Schedule Visit Online
            </Link>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
};

export default HomePage;
