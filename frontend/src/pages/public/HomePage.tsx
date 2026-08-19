import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PublicLayout from '../../components/PublicLayout';
import {
  Heart, Shield, Clock, Award, Users, Stethoscope,
  FlaskConical, Baby, Bone, Brain, Eye,
  ChevronRight, Star, Phone, ArrowRight, Play, CheckCircle
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

/* ── Unsplash image constants ────────────────────────────────────────────────── */
const IMGS = {
  hero:      'https://images.unsplash.com/photo-1551076805-e1869033e561?w=1200&q=80&auto=format&fit=crop',
  maternity: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
  pediatrics:'https://images.unsplash.com/photo-1584515933487-779824d29309?w=900&q=80&auto=format&fit=crop',
  surgery:   'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=900&q=80&auto=format&fit=crop',
  lab:       'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80&auto=format&fit=crop',
  building:  'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=1200&q=80&auto=format&fit=crop',
  team:      'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=80&auto=format&fit=crop',
  doc1:      'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=500&q=80&auto=format&fit=crop',
  doc2:      'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=500&q=80&auto=format&fit=crop',
  doc3:      'https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=500&q=80&auto=format&fit=crop',
  doc4:      'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=500&q=80&auto=format&fit=crop',
};

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
  { icon: Baby, title: 'Maternity Care', desc: 'Prenatal support, labor management and postnatal follow-up for mothers.', color: 'bg-pink-50 text-pink-600', img: IMGS.maternity },
  { icon: Heart, title: 'Pediatrics', desc: 'Dedicated children’s health services for every stage of growth.', color: 'bg-red-50 text-red-600', img: IMGS.pediatrics },
  { icon: Brain, title: 'Neurology', desc: 'Fast neurological care for complex and routine cases.', color: 'bg-purple-50 text-purple-600', img: IMGS.surgery },
  { icon: Bone, title: 'Orthopedics', desc: 'Expert care for bones, joints, and movement health.', color: 'bg-orange-50 text-orange-600', img: IMGS.surgery },
  { icon: Eye, title: 'Ophthalmology', desc: 'Vision care and surgery with modern diagnostic tools.', color: 'bg-cyan-50 text-cyan-600', img: IMGS.lab },
  { icon: FlaskConical, title: 'Laboratory', desc: 'Rapid lab tests, imaging, and accurate diagnostic reports.', color: 'bg-green-50 text-green-600', img: IMGS.lab },
];

const stats = [
  { value: 35, suffix: '+', label: 'Years of Service', icon: Award },
  { value: 50000, suffix: '+', label: 'Patients Served', icon: Users },
  { value: 80, suffix: '+', label: 'Medical Staff', icon: Stethoscope },
  { value: 200, suffix: '+', label: 'Beds Available', icon: Shield },
];

const testimonials = [
  { name: 'Tigist Alemu', role: 'Mother of 2', img: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=100&q=80&auto=format&fit=crop', text: 'The maternity ward staff were incredibly supportive. I felt safe and cared for every step of the way.', stars: 5 },
  { name: 'Dr. Kebede Worku', role: 'Referring Physician', img: 'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=100&q=80&auto=format&fit=crop', text: 'Alem Ketema Enat Hospital consistently demonstrates excellence in maternal-fetal medicine. I trust them completely.', stars: 5 },
  { name: 'Meron Tadesse', role: 'Patient', img: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?w=100&q=80&auto=format&fit=crop', text: 'From the lab to the pharmacy, everyone was professional and kind. The facilities are modern and clean.', stars: 5 },
  { name: 'Abel Bekele', role: 'Father', img: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80&auto=format&fit=crop', text: 'When my daughter needed emergency care, the team responded quickly. The pediatric department is outstanding.', stars: 5 },
  { name: 'Sara Haile', role: 'New Mother', img: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80&auto=format&fit=crop', text: 'The neonatal ICU gave my premature baby the best chance. Dr. Hana and her team are angels in scrubs.', stars: 5 },
  { name: 'Dawit Mengistu', role: 'Business Owner', img: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&q=80&auto=format&fit=crop', text: 'I\'ve been coming here for years. The consistency in care and the personal attention from doctors is remarkable.', stars: 5 },
];

const doctors = [
  { name: 'Dr. Alem Tesfaye', specialty: 'Obstetrics & Gynecology', exp: '18 yrs', img: IMGS.doc1 },
  { name: 'Dr. Selamawit Bekele', specialty: 'Pediatrics', exp: '14 yrs', img: IMGS.doc2 },
  { name: 'Dr. Girma Haile', specialty: 'General Surgery', exp: '20 yrs', img: IMGS.doc3 },
  { name: 'Dr. Hana Mulugeta', specialty: 'Neonatology', exp: '12 yrs', img: IMGS.doc4 },
];

const HomePage: React.FC = () => {
  const heroRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = heroRef.current;
    if (!el) return;
    const handler = () => {
      const scrollY = window.scrollY;
      el.style.transform = `translateY(${scrollY * 0.22}px)`;
    };
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  return (
    <PublicLayout>
      <section className="relative overflow-hidden">
        <div className="relative z-10 max-w-7xl mx-auto px-6 lg:px-8 py-12 flex flex-col items-center text-center">
          <div className="w-full max-w-4xl relative">
            <img src="/images/hospital.jpg.webp" alt="Hospital building" className="w-full h-80 md:h-96 object-cover rounded-2xl shadow-lg" />

            <div className="absolute inset-0">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-b from-black/40 via-black/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col items-center justify-center px-6">
              <div className="h-36 w-36 rounded-full bg-white/90 ring-8 ring-white/80 flex items-center justify-center shadow-2xl">
                <div
                  className="h-28 w-28 rounded-full flex items-center justify-center text-white text-3xl font-extrabold"
                  style={{
                    background: 'conic-gradient(#10B981 0deg 120deg, #F59E0B 120deg 240deg, #EF4444 240deg 360deg)'
                  }}
                >
                  AK
                </div>
              </div>

              <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-[600] tracking-tight text-white drop-shadow-md" style={{fontFamily: '"Great Vibes", serif'}}>
                Alem Ketema Enat Hospital
              </h1>

              <p className="mt-3 text-white/90 max-w-2xl text-lg">Welcome to Alem Ketema Enat Hospital — compassionate care for mothers, children and families.</p>

              <div className="mt-6 flex gap-4 transform -translate-y-2 md:-translate-y-4">
                <Link to="/contact" className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white shadow-xl transition hover:opacity-95">
                  Book Appointment
                </Link>
                <Link to="/services" className="inline-flex items-center justify-center rounded-full bg-white px-6 py-3 text-sm font-semibold text-secondary shadow-md transition hover:opacity-90">
                  Explore Services
                </Link>
              </div>
            </div>
          </div>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] items-center">
            <div className="space-y-6">
              <span className="text-sm font-bold uppercase tracking-[0.28em] text-primary">Why Choose Us</span>
              <h2 className="text-3xl sm:text-4xl font-black text-foreground">Professional care that feels personal.</h2>
              <p className="max-w-2xl text-sm leading-relaxed text-slate-600">Our hospital merges modern healthcare technology with a warm, patient-centered approach so families feel confident and cared for at every visit.</p>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { label: '24/7 Emergency', icon: Clock },
                  { label: 'Expert Team', icon: Award },
                  { label: 'Modern Labs', icon: FlaskConical },
                  { label: 'Secure Care', icon: Shield },
                ].map((item) => (
                  <div key={item.label} className="rounded-3xl border border-slate-200 p-5 shadow-sm">
                    <div className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-cyan-100 text-cyan-700 mb-3">
                      <item.icon className="w-5 h-5" />
                    </div>
                    <p className="font-semibold">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              {stats.map((item, index) => (
                <Reveal key={item.label} delay={index * 100} className="rounded-3xl border border-border bg-card p-8 shadow-sm">
                  <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-cyan-100 text-cyan-700 mb-4">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <p className="text-4xl font-black text-slate-900">{item.value}{item.suffix}</p>
                  <p className="mt-3 text-sm text-slate-500">{item.label}</p>
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 bg-slate-950 text-slate-100">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-300">What We Offer</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black">Comprehensive hospital services in one trusted system.</h2>
            <p className="mt-4 max-w-2xl mx-auto text-sm leading-relaxed text-slate-300">From routine checkups to emergency care, our services cover the health needs of every family member.</p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {services.map((service, index) => (
              <Reveal key={service.title} delay={index * 90} className="group">
                <div className="overflow-hidden rounded-[2rem] bg-card/5 border border-border shadow-xl shadow-slate-950/12 transition hover:-translate-y-1 flex flex-col h-full">
                  <div className="relative h-56 overflow-hidden">
                    <img src={service.img} alt={service.title} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/10 to-transparent" />
                  </div>
                  <div className="p-6 flex-1 flex flex-col">
                    <span className={`inline-flex rounded-2xl px-3 py-2 text-xs font-semibold bg-card text-foreground`}>{service.title}</span>
                    <p className="mt-4 text-sm leading-relaxed text-slate-200 flex-1">{service.desc}</p>
                    <div className="mt-5">
                      <Link to="/services" className="inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary/90">
                        Learn more <ChevronRight className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-600">Meet Our Team</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-slate-900">Specialist Doctors Ready to Serve</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {doctors.map((doctor, index) => (
              <Reveal key={doctor.name} delay={index * 90}>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm hover-lift transition">
                  <img src={doctor.img} alt={doctor.name} className="h-56 w-full object-cover" />
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-slate-900">{doctor.name}</h3>
                    <p className="mt-2 text-sm font-semibold text-cyan-600">{doctor.specialty}</p>
                    <p className="mt-3 text-sm text-slate-600">{doctor.exp} experience</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-cyan-500 via-sky-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="text-sm font-bold uppercase tracking-[0.28em] text-cyan-100">Patient Stories</span>
            <h2 className="mt-4 text-3xl sm:text-4xl font-black">What Our Patients Say</h2>
            <p className="mt-4 max-w-2xl mx-auto text-sm leading-relaxed text-sky-100">Trusted care from families who rely on our emergency, pediatric and maternity services.</p>
          </div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 3).map((testimonial, index) => (
              <Reveal key={testimonial.name} delay={index * 100}>
                <div className="rounded-3xl bg-white/10 border border-white/15 p-6 shadow-lg shadow-slate-950/20 hover-lift transition">
                  <div className="flex items-center gap-4 mb-4">
                    <img src={testimonial.img} alt={testimonial.name} className="h-12 w-12 rounded-full object-cover border border-white/20" />
                    <div>
                      <p className="font-semibold text-white">{testimonial.name}</p>
                      <p className="text-sm text-sky-100/80">{testimonial.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-1 mb-4 text-yellow-300">
                    {[...Array(testimonial.stars)].map((_, starIndex) => (
                      <Star key={starIndex} className="w-4 h-4" />
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-sky-100">“{testimonial.text}”</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="py-0 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-0">
          {[IMGS.building, IMGS.team, IMGS.maternity, IMGS.lab].map((src, i) => (
            <div key={i} className="relative overflow-hidden h-48 group">
              <img src={src} alt={`Gallery ${i+1}`} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
              <div className="absolute inset-0 bg-blue-900/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ))}
        </div>
      </section>

      <section className="py-20 bg-gradient-to-r from-yellow-400 to-orange-400">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <Reveal>
            <h2 className="text-3xl lg:text-4xl font-extrabold text-gray-900 mb-4">Ready to Schedule Your Visit?</h2>
            <p className="text-gray-800 mb-8 text-lg max-w-xl mx-auto">Our team is available to assist you. Walk in, call, or book online today.</p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="tel:+251111234567" className="px-8 py-4 bg-white text-gray-900 font-bold rounded-xl hover:bg-gray-50 transition-colors shadow-xl inline-flex items-center justify-center gap-2 hover-lift">
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
