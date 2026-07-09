import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import {
  Heart, Shield, Clock, Award, Users, Stethoscope,
  FlaskConical, Baby, Bone, Brain, Eye,
  ChevronRight, Star, Phone, ArrowRight, Play, CheckCircle
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

/* ── Unsplash image constants ──────────────────────────────────────────────── */
const IMGS = {
  hero:      'https://images.unsplash.com/photo-1551076805-e1869033e561?w=900&q=80&auto=format',
  maternity: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=600&q=80&auto=format',
  pediatrics:'https://images.unsplash.com/photo-1584515933487-779824d29309?w=600&q=80&auto=format',
  surgery:   'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=600&q=80&auto=format',
  lab:       'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=600&q=80&auto=format',
  building:  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=900&q=80&auto=format',
  team:      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=900&q=80&auto=format',
  doc1:      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80&auto=format',
  doc2:      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80&auto=format',
  doc3:      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=400&q=80&auto=format',
  doc4:      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80&auto=format',
};

/* ── Animated counter component ──────────────────────────────────────────── */
function AnimatedCounter({ end, suffix = '', duration = 1800 }: { end: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const { ref, inView } = useInView({ threshold: 0.5 });
  const started = useRef(false);

  useEffect(() => {
    if (!inView || started.current) return;
    started.current = true;
    const startTime = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * end));
      if (progress < 1) requestAnimationFrame(tick);
      else setCount(end);
    };
    requestAnimationFrame(tick);
  }, [inView, end, duration]);

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>}>
      {count.toLocaleString()}{suffix}
    </span>
  );
}

/* ── Reveal wrapper ────────────────────────────────────────────────────────── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const { ref, inView } = useInView();
  return (
    <div
      ref={ref as React.RefObject<HTMLDivElement>}
      className={`fade-up ${inView ? 'in-view' : ''} ${className}`}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

const services = [
  { icon: Baby, title: 'Maternity & Obstetrics', desc: 'Expert prenatal, delivery, and postnatal care for mothers.', color: 'bg-pink-50 text-pink-600', img: IMGS.maternity },
  { icon: Heart, title: 'Pediatrics', desc: 'Dedicated care for infants, children, and adolescents.', color: 'bg-red-50 text-red-600', img: IMGS.pediatrics },
  { icon: Brain, title: 'Neurology', desc: 'Advanced diagnosis and treatment of neurological conditions.', color: 'bg-purple-50 text-purple-600', img: IMGS.surgery },
  { icon: Bone, title: 'Orthopedics', desc: 'Bone, joint, and musculoskeletal care and surgery.', color: 'bg-orange-50 text-orange-600', img: IMGS.surgery },
  { icon: Eye, title: 'Ophthalmology', desc: 'Complete eye care from routine exams to cataract surgery.', color: 'bg-cyan-50 text-cyan-600', img: IMGS.lab },
  { icon: FlaskConical, title: 'Laboratory', desc: 'State-of-the-art diagnostic laboratory services.', color: 'bg-green-50 text-green-600', img: IMGS.lab },
];

const stats = [
  { value: 35, suffix: '+', label: 'Years of Service', icon: Award },
  { value: 50000, suffix: '+', label: 'Patients Served', icon: Users },
  { value: 80, suffix: '+', label: 'Medical Staff', icon: Stethoscope },
  { value: 200, suffix: '+', label: 'Beds Available', icon: Shield },
];

const testimonials = [
  { name: 'Tigist Alemu', role: 'Mother of 2', img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80', text: 'The maternity ward staff were incredibly supportive. I felt safe and cared for every step of the way.', stars: 5 },
  { name: 'Dr. Kebede Worku', role: 'Referring Physician', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&q=80', text: 'Alem Ketema Enat Hospital consistently demonstrates excellence in maternal-fetal medicine. I trust them completely.', stars: 5 },
  { name: 'Meron Tadesse', role: 'Patient', img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&q=80', text: 'From the lab to the pharmacy, everyone was professional and kind. The facilities are modern and clean.', stars: 5 },
  { name: 'Abel Bekele', role: 'Father', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80', text: 'When my daughter needed emergency care, the team responded quickly. The pediatric department is outstanding.', stars: 5 },
  { name: 'Sara Haile', role: 'New Mother', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80', text: 'The neonatal ICU gave my premature baby the best chance. Dr. Hana and her team are angels in scrubs.', stars: 5 },
  { name: 'Dawit Mengistu', role: 'Business Owner', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80', text: 'I\'ve been coming here for years. The consistency in care and the personal attention from doctors is remarkable.', stars: 5 },
];

const doctors = [
  { name: 'Dr. Alem Tesfaye', specialty: 'Obstetrics & Gynecology', exp: '18 yrs', img: IMGS.doc1 },
  { name: 'Dr. Selamawit Bekele', specialty: 'Pediatrics', exp: '14 yrs', img: IMGS.doc2 },
  { name: 'Dr. Girma Haile', specialty: 'General Surgery', exp: '20 yrs', img: IMGS.doc3 },
  { name: 'Dr. Hana Mulugeta', specialty: 'Neonatology', exp: '12 yrs', img: IMGS.doc4 },
];

const HomePage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  // Parallax on hero image
  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = () => {
      const scrollY = window.scrollY;
      el.style.transform = `translateY(${scrollY * 0.25}px)`;
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <PublicLayout>

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[92vh] flex items-center overflow-hidden bg-gray-900">
        {/* Background image with parallax */}
        <div ref={heroRef} className="absolute inset-0 will-change-transform">
          <img
            src={IMGS.hero}
            alt="Hospital team"
            className="w-full h-full object-cover opacity-100"
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-6 py-24 lg:py-32 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center w-full">
          {/* Left content */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl p-8 shadow-2xl">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-600 rounded-full text-xs font-semibold text-white uppercase tracking-wider mb-6 fade-up in-view">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              Emergency Line Active 24/7
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-gray-900 leading-tight mb-6 fade-up in-view delay-100">
              Your Health Is<br />
              <span className="text-blue-600">Our Priority</span>
            </h1>

            <p className="text-gray-600 text-lg max-w-lg mb-8 leading-relaxed fade-up in-view delay-200">
              Alem Ketema Enat Hospital — trusted center for maternal and child healthcare in Merabete, Alem Ketema since 1985. World-class care with heartfelt compassion.
            </p>

            <div className="flex flex-wrap gap-3 mb-8 fade-up in-view delay-300">
              <Link to="/contact"
                className="px-7 py-3.5 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-xl shadow-lg transition-all text-sm flex items-center gap-2 hover-lift">
                Book Appointment <ArrowRight className="w-4 h-4" />
              </Link>
              <Link to="/services"
                className="px-7 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all text-sm flex items-center gap-2">
                <Play className="w-4 h-4" /> Our Services
              </Link>
            </div>

            {/* Trust badges */}
            <div className="flex flex-wrap gap-4 fade-up in-view delay-400">
              {['Accredited Facility','ISO Certified','24/7 Emergency'].map(b => (
                <span key={b} className="flex items-center gap-1.5 text-xs text-gray-600">
                  <CheckCircle className="w-3.5 h-3.5 text-green-600" /> {b}
                </span>
              ))}
            </div>

            {/* Emergency */}
            <div className="mt-8 inline-flex items-center gap-3 bg-red-600 rounded-2xl px-5 py-3 fade-up in-view delay-500">
              <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center pulse-ring flex-shrink-0">
                <Phone className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="text-xs text-red-200 font-medium">Emergency Hotline</p>
                <a href="tel:+251119990000" className="text-white font-extrabold text-base hover:text-yellow-300 transition-colors">
                  +251 11 999 0000
                </a>
              </div>
            </div>
          </div>

          {/* Right: quick appointment card */}
          <div className="fade-up in-view delay-200">
            <div className="bg-white/15 backdrop-blur-sm border border-white/30 rounded-3xl p-7 shadow-2xl float-anim">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 bg-yellow-400 rounded-xl flex items-center justify-center">
                  <Stethoscope className="w-5 h-5 text-gray-900" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-sm">Quick Appointment</h3>
                  <p className="text-blue-300 text-xs">We'll call you within 2 hours</p>
                </div>
              </div>
              <div className="space-y-3">
                <input type="text" placeholder="Your Full Name"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 text-sm focus:outline-none focus:border-white/50 transition-colors" />
                <input type="tel" placeholder="Phone Number"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-blue-300 text-sm focus:outline-none focus:border-white/50 transition-colors" />
                <select className="w-full px-4 py-3 bg-blue-900/80 border border-white/20 rounded-xl text-blue-200 text-sm focus:outline-none focus:border-white/50 transition-colors">
                  <option value="">Select Department</option>
                  <option>Maternity & Obstetrics</option>
                  <option>Pediatrics</option>
                  <option>General Medicine</option>
                  <option>Emergency</option>
                  <option>Laboratory</option>
                </select>
                <input type="date"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-blue-200 text-sm focus:outline-none focus:border-white/50 transition-colors" />
                <Link to="/contact"
                  className="w-full py-3 bg-yellow-400 hover:bg-yellow-300 text-gray-900 font-bold rounded-xl transition-all text-sm text-center block shadow-lg">
                  Request Appointment →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-white/50">
          <span className="text-xs">Scroll</span>
          <div className="w-0.5 h-8 bg-white/30 rounded-full overflow-hidden">
            <div className="w-full h-1/2 bg-white/70 rounded-full animate-bounce" />
          </div>
        </div>
      </section>

      {/* ── ANIMATED STATS ─────────────────────────────────────────────────── */}
      <section className="bg-blue-700 py-14">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 lg:grid-cols-4 gap-8">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 100} className="text-center">
              <div className="w-12 h-12 bg-white/15 rounded-xl flex items-center justify-center mx-auto mb-3">
                <s.icon className="w-6 h-6 text-white" />
              </div>
              <p className="text-4xl font-extrabold text-white">
                <AnimatedCounter end={s.value} suffix={s.suffix} />
              </p>
              <p className="text-blue-200 text-sm mt-1">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── ABOUT STRIP ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center">
          {/* Images mosaic */}
          <div className="relative grid grid-cols-2 gap-3 fade-up in-view">
            <img src={IMGS.building} alt="Hospital building" className="rounded-2xl object-cover h-56 w-full shadow-lg col-span-2" />
            <img src={IMGS.maternity} alt="Maternity care" className="rounded-2xl object-cover h-40 w-full shadow-md" />
            <img src={IMGS.team} alt="Medical team" className="rounded-2xl object-cover h-40 w-full shadow-md" />
            {/* Floating badge */}
            <div className="absolute -bottom-4 -right-4 bg-yellow-400 rounded-2xl px-4 py-3 shadow-xl">
              <p className="text-2xl font-extrabold text-gray-900">35+</p>
              <p className="text-xs font-semibold text-gray-700">Years of Care</p>
            </div>
          </div>

          {/* Text */}
          <div>
            <Reveal>
              <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">About Us</span>
              <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mt-2 mb-5 leading-tight">
                A Legacy of Caring for <span className="text-blue-600">Every Mother & Child</span>
              </h2>
            </Reveal>
            <Reveal delay={100}>
              <p className="text-gray-500 leading-relaxed mb-4 text-sm">
                Founded in 1985, Enketema Enat Hospital has grown from a 30-bed maternity center into a comprehensive medical institution serving over 50,000 patients annually across 12 specialized departments.
              </p>
              <p className="text-gray-500 leading-relaxed mb-6 text-sm">
                Our team of 80+ dedicated medical professionals brings world-class expertise with genuine compassion — treating every patient like family.
              </p>
            </Reveal>
            <Reveal delay={200}>
              <div className="space-y-3 mb-8">
                {[
                  'Ethiopian Hospital Alliance Accredited',
                  'Over 50,000 babies delivered since 1985',
                  'Modern digital diagnostics & imaging',
                  '24/7 emergency and maternity care',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3 text-sm text-gray-700">
                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <Link to="/about"
                className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm">
                Learn Our Story <ArrowRight className="w-4 h-4" />
              </Link>
            </Reveal>
          </div>
        </div>
      </section>

      {/* ── WHY CHOOSE US ──────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Why Choose Us</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mt-2">Excellence in Every Care</h2>
            <p className="text-gray-500 mt-4 max-w-xl mx-auto text-sm">We combine modern medical technology with heartfelt compassion for outstanding outcomes.</p>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Shield, title: 'Safe & Accredited', desc: 'Certified facility following international patient safety standards.', color: 'text-blue-600 bg-blue-50' },
              { icon: Clock, title: '24/7 Emergency', desc: 'Round-the-clock emergency services with rapid response teams.', color: 'text-red-600 bg-red-50' },
              { icon: Award, title: 'Award Winning', desc: 'Recognized for excellence in maternal and child healthcare.', color: 'text-yellow-600 bg-yellow-50' },
              { icon: Users, title: 'Expert Team', desc: '80+ experienced doctors, nurses, and specialists dedicated to you.', color: 'text-green-600 bg-green-50' },
              { icon: Heart, title: 'Compassionate Care', desc: 'We treat every patient with warmth, dignity, and respect.', color: 'text-pink-600 bg-pink-50' },
              { icon: Stethoscope, title: 'Modern Equipment', desc: 'Latest diagnostic and treatment technology for precision care.', color: 'text-purple-600 bg-purple-50' },
            ].map((item, i) => (
              <Reveal key={item.title} delay={i * 80}>
                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 hover-lift">
                  <div className={`w-12 h-12 rounded-xl ${item.color} flex items-center justify-center mb-4`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <h3 className="text-gray-900 font-bold mb-2">{item.title}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── SERVICES ───────────────────────────────────────────────────────── */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">What We Offer</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mt-2">Our Core Services</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <div className="rounded-2xl overflow-hidden border border-gray-100 shadow-sm hover-lift group">
                  <div className="relative h-44 overflow-hidden">
                    <img src={s.img} alt={s.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-lg bg-white/90 flex items-center justify-center`}>
                        <s.icon className={`w-4 h-4 ${s.color.split(' ')[1]}`} />
                      </div>
                      <h3 className="text-white font-bold text-sm">{s.title}</h3>
                    </div>
                  </div>
                  <div className="p-5 bg-white">
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">{s.desc}</p>
                    <Link to="/services" className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:gap-2 transition-all">
                      Learn more <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-10">
            <Link to="/services"
              className="px-8 py-3 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-colors shadow-sm inline-flex items-center gap-2">
              View All Services <ArrowRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── OUR DOCTORS ────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <span className="text-blue-600 text-sm font-bold uppercase tracking-wider">Meet Our Team</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mt-2">Our Specialist Doctors</h2>
          </Reveal>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {doctors.map((d, i) => (
              <Reveal key={d.name} delay={i * 100}>
                <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover-lift group text-center">
                  <div className="relative h-48 overflow-hidden">
                    <img src={d.img} alt={d.name}
                      className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-110" />
                    <div className="absolute inset-0 bg-gradient-to-t from-blue-900/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    <div className="absolute bottom-3 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                      <Link to="/contact"
                        className="inline-flex items-center gap-1 text-xs font-bold text-white bg-yellow-400 rounded-lg px-3 py-1.5">
                        Book <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-gray-900 text-sm">{d.name}</h3>
                    <p className="text-blue-600 text-xs font-semibold mt-0.5">{d.specialty}</p>
                    <p className="text-gray-400 text-xs mt-1">{d.exp} experience</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
          <Reveal className="text-center mt-10">
            <Link to="/our-doctors" className="text-blue-600 font-bold hover:underline flex items-center justify-center gap-1 text-sm">
              View All Doctors <ChevronRight className="w-4 h-4" />
            </Link>
          </Reveal>
        </div>
      </section>

      {/* ── TESTIMONIALS ───────────────────────────────────────────────────── */}
      <section className="py-20 bg-blue-700 overflow-hidden">
        <div className="max-w-7xl mx-auto px-6">
          <Reveal className="text-center mb-14">
            <span className="text-blue-200 text-sm font-bold uppercase tracking-wider">Testimonials</span>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-white mt-2">What Our Patients Say</h2>
          </Reveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <Reveal key={t.name} delay={i * 120}>
                <div className="bg-white/30 border border-white/50 rounded-2xl p-6 hover-lift">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={t.img} alt={t.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-white/30" />
                    <div>
                      <p className="font-bold text-white text-sm">{t.name}</p>
                      <p className="text-blue-300 text-xs">{t.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-0.5 mb-3">
                    {[...Array(t.stars)].map((_, j) => (
                      <Star key={j} className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-blue-100 text-sm leading-relaxed italic">"{t.text}"</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── GALLERY STRIP ──────────────────────────────────────────────────── */}
      <section className="py-0 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[IMGS.building, IMGS.team, IMGS.maternity, IMGS.lab].map((src, i) => (
            <div key={i} className="relative overflow-hidden h-48 group">
              <img src={src} alt={`Gallery ${i+1}`}
                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA BANNER ─────────────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-r from-yellow-400 to-orange-400">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">
              Ready to Schedule Your Visit?
            </h2>
            <p className="text-gray-800 mb-8 text-lg max-w-xl mx-auto">
              Our team is available to assist you. Walk in, call, or book online today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/contact"
                className="px-8 py-4 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-xl inline-flex items-center justify-center gap-2 hover-lift">
                Book Appointment <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="tel:+251111234567"
                className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-xl inline-flex items-center justify-center gap-2 hover-lift">
                <Phone className="w-4 h-4" /> Call Us Now
              </a>
            </div>
          </Reveal>
        </div>
      </section>

    </PublicLayout>
  );
};

export default HomePage;
