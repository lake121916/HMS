import React, { useState } from 'react';
import PublicLayout from '../../components/PublicLayout';
import {
  Phone, Mail, MapPin, Clock, Send,
  CheckCircle, AlertCircle, Truck
} from 'lucide-react';
import { useInView } from '../../hooks/useInView';

const IMGS = {
  hero: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=1200&q=80&auto=format',
  staff:'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=700&q=80&auto=format',
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

const contactInfo = [
  { icon: Phone, title: 'Main Reception', value: '+251 11 123 4567', sub: 'Mon – Sat, 8am – 8pm', color: 'bg-blue-50 text-blue-600 border-blue-100' },
  { icon: Truck, title: 'Emergency', value: '+251 11 999 0000', sub: '24/7 — Always available', color: 'bg-red-50 text-red-600 border-red-100' },
  { icon: Mail, title: 'Email', value: 'info@alemketemaenat.et', sub: 'Reply within 24 hours', color: 'bg-green-50 text-green-600 border-green-100' },
  { icon: MapPin, title: 'Location', value: 'Alem Ketema Enat Hospital', sub: 'Addis Ababa, Ethiopia', color: 'bg-purple-50 text-purple-600 border-purple-100' },
];

const hours = [
  { day: 'Monday – Friday', time: '8:00 AM – 8:00 PM' },
  { day: 'Saturday',         time: '8:00 AM – 6:00 PM' },
  { day: 'Sunday',           time: '9:00 AM – 4:00 PM' },
  { day: 'Emergency Dept.',  time: '24 hours / 7 days' },
  { day: 'Pharmacy',         time: '8:00 AM – 10:00 PM' },
  { day: 'Laboratory',       time: '7:00 AM – 9:00 PM' },
];

const ContactPage: React.FC = () => {
  const [form, setForm] = useState({ name:'', email:'', phone:'', message:'' });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    setSubmitted(true);
    setLoading(false);
  };

  const inp = 'w-full px-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all';

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
              <span className="inline-block px-4 py-1.5 bg-blue-600 rounded-full text-xs font-bold uppercase tracking-wider mb-5 text-white">Get In Touch</span>
              <h1 className="text-4xl lg:text-6xl font-extrabold mb-5 leading-tight text-gray-900">Contact Us</h1>
              <p className="text-gray-600 text-lg max-w-xl mx-auto leading-relaxed">
                Ready to visit us? Call our reception or drop by — we're here for you.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CONTACT CARDS ── */}
      <section className="bg-white py-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {contactInfo.map((c, i) => (
            <Reveal key={c.title} delay={i * 80}>
              <div className={`${c.color.split(' ')[0]} rounded-2xl p-5 border ${c.color.split(' ')[2]} hover-lift`}>
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
                  <c.icon className={`w-5 h-5 ${c.color.split(' ')[1]}`} />
                </div>
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{c.title}</p>
                <p className="font-bold text-gray-900 mt-1 text-sm">{c.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{c.sub}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── MAIN SECTION ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-5 gap-10">

          {/* Form — 3 cols */}
          <Reveal dir="left" className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              {submitted ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-5">
                    <CheckCircle className="w-10 h-10 text-green-600" />
                  </div>
                  <h3 className="text-2xl font-extrabold text-gray-900 mb-3">Message Received!</h3>
                  <p className="text-gray-500 max-w-sm leading-relaxed mb-6 text-sm">
                    Thank you, <strong>{form.name}</strong>! We've received your message. Our team will contact you within 24 hours.
                  </p>
                  <button onClick={() => { setSubmitted(false); setForm({ name:'',email:'',phone:'',message:'' }); }}
                    className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors text-sm">
                    Send Another Message
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-2xl font-extrabold text-gray-900">Send Us a Message</h2>
                    <p className="text-gray-500 text-sm mt-1">Fill the form and we'll respond within 24 hours.</p>
                  </div>


                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Full Name *</label>
                        <input name="name" type="text" required value={form.name} onChange={handle} placeholder="Abebe Girma" className={inp} />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1">Phone Number *</label>
                        <input name="phone" type="tel" required value={form.phone} onChange={handle} placeholder="+251 91 234 5678" className={inp} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Email Address</label>
                      <input name="email" type="email" value={form.email} onChange={handle} placeholder="abebe@email.com" className={inp} />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Your Message *</label>
                      <textarea name="message" required value={form.message} onChange={handle} rows={4}
                        placeholder="How can we help you?"
                        className={`${inp} resize-none`} />
                    </div>

                    <div className="flex items-start gap-2 text-xs text-gray-500 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span>For medical emergencies, call <strong>+251 11 999 0000</strong> immediately. Do not use this form.</span>
                    </div>
                    <button type="submit" disabled={loading}
                      className="w-full py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 text-sm disabled:opacity-60 hover-lift">
                      {loading ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Sending...</>
                        : <><Send className="w-4 h-4" />Send Message</>}
                    </button>
                  </form>
                </>
              )}
            </div>
          </Reveal>

          {/* Sidebar — 2 cols */}
          <div className="lg:col-span-2 space-y-6">
            {/* Hours */}
            <Reveal dir="right">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <h3 className="font-bold text-gray-900">Working Hours</h3>
                </div>
                <div className="space-y-2.5">
                  {hours.map(h => (
                    <div key={h.day} className={`flex items-center justify-between text-sm py-2 border-b border-gray-50 last:border-0 ${h.day==='Emergency Dept.' ? 'text-red-600 font-bold' : ''}`}>
                      <span className="text-gray-600">{h.day}</span>
                      <span className="font-semibold text-gray-900">{h.time}</span>
                    </div>
                  ))}
                </div>
              </div>
            </Reveal>

            {/* Staff photo */}
            <Reveal dir="right" delay={100}>
              <div className="rounded-2xl overflow-hidden shadow-sm border border-gray-100 relative h-44 group">
                <img src={IMGS.staff} alt="Our team" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                <div className="absolute inset-0 bg-blue-900/50 flex items-center justify-center">
                  <p className="text-white font-bold text-lg text-center px-4">80+ Dedicated<br/>Medical Professionals</p>
                </div>
              </div>
            </Reveal>

            {/* Map */}
            <Reveal dir="right" delay={150}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="relative h-44 bg-blue-50">
                  {/* Embedded Google Maps iframe */}
                  <iframe
                    title="Hospital Location"
                    src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3940.5504!2d38.7468!3d9.0222!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zOcKwMDEnMjAuMCJOIDM4wrA0NCc0OC44IkU!5e0!3m2!1sen!2set!4v1600000000000"
                    width="100%" height="100%"
                    style={{ border: 0, display: 'block' }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
                <div className="p-4">
                  <p className="text-sm font-semibold text-gray-900 mb-1">How to Find Us</p>
                  <p className="text-xs text-gray-500 leading-relaxed">Central Addis Ababa, easily accessible by public transport. On-site parking available.</p>
                  <a href="https://maps.google.com/?q=9.0222,38.7468" target="_blank" rel="noopener noreferrer"
                    className="mt-3 block text-center py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
                    Get Directions
                  </a>
                </div>
              </div>
            </Reveal>

            {/* Emergency card */}
            <Reveal dir="right" delay={200}>
              <div className="bg-red-600 text-white rounded-2xl p-6 text-center hover-lift">
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3 pulse-ring">
                  <Truck className="w-6 h-6" />
                </div>
                <h3 className="font-extrabold text-lg mb-1">Medical Emergency?</h3>
                <p className="text-red-100 text-xs mb-4">Call our emergency line immediately. 24/7.</p>
                <a href="tel:+251119990000"
                  className="block py-3 bg-white text-red-600 font-extrabold text-xl rounded-xl hover:bg-red-50 transition-colors">
                  +251 11 999 0000
                </a>
              </div>
            </Reveal>
          </div>
        </div>
      </section>

    </PublicLayout>
  );
};

export default ContactPage;
