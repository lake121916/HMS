import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Stethoscope, Menu, X, Phone, Mail, MapPin,
  Facebook, Twitter, Instagram, Linkedin, ChevronRight
} from 'lucide-react';
import AIChatbot from './AIChatbot';

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMenuOpen(false);
    window.scrollTo(0, 0);
  }, [location.pathname]);

  const navLinks = [
    { label: 'Home', href: '/home' },
    { label: 'About Us', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Departments', href: '/departments' },
    { label: 'Doctors', href: '/our-doctors' },
    { label: 'Contact', href: '/contact' },
  ];

  const isActive = (href: string) => location.pathname === href;

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top info bar */}
      <div className="bg-blue-700 text-white text-xs py-2 hidden md:block">
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5"><Phone className="w-3 h-3" /> +251 11 123 4567</span>
            <span className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> info@enketemanaenat.et</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3 h-3" /> Addis Ababa, Ethiopia</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-blue-200">Mon – Sat: 8:00 AM – 8:00 PM &nbsp;|&nbsp; Emergency: 24/7</span>
          </div>
        </div>
      </div>

      {/* Main navbar */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-lg' : 'bg-white/98'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/home" className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900 leading-tight">Alem Ketema Enat</p>
                <p className="text-xs text-blue-600 font-medium leading-tight">Hospital</p>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden lg:flex items-center gap-1">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  to={link.href}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            {/* CTA */}
            <div className="hidden lg:flex items-center gap-3">
              <Link to="/contact"
                className="px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm">
                Book Appointment
              </Link>
            </div>

            {/* Mobile menu button */}
            <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-6 py-4 space-y-1 shadow-lg">
            {navLinks.map(link => (
              <Link key={link.href} to={link.href}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium ${
                  isActive(link.href) ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-blue-50'
                }`}>
                {link.label}
                <ChevronRight className="w-4 h-4 opacity-50" />
              </Link>
            ))}
            <div className="pt-3 flex flex-col gap-2 border-t border-gray-100 mt-2">
              <Link to="/contact" className="px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg text-center">Book Appointment</Link>
            </div>
          </div>
        )}
      </header>

      {/* Page content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-7xl mx-auto px-6 py-14 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
                <Stethoscope className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Alem Ketema Enat Hospital</p>
                <p className="text-xs text-blue-400">Caring for Every Mother & Child</p>
              </div>
            </div>
            <p className="text-sm text-gray-400 leading-relaxed mb-5">
              Providing compassionate, high-quality maternal and child healthcare to the people of Addis Ababa since 1985.
            </p>
            <div className="flex gap-3">
              {[Facebook, Twitter, Instagram, Linkedin].map((Icon, i) => (
                <a key={i} href="#" className="w-8 h-8 bg-gray-800 hover:bg-blue-600 rounded-lg flex items-center justify-center transition-colors">
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Quick Links</h3>
            <ul className="space-y-2.5">
              {navLinks.map(link => (
                <li key={link.href}>
                  <Link to={link.href} className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2">
                    <ChevronRight className="w-3 h-3" />{link.label}
                  </Link>
                </li>
              ))}
              <li>
                <Link to="/login" className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2">
                  <ChevronRight className="w-3 h-3" />Staff Login
                </Link>
              </li>
            </ul>
          </div>

          {/* Services */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Our Services</h3>
            <ul className="space-y-2.5">
              {['Maternity Care', 'Pediatrics', 'Emergency', 'Laboratory', 'Pharmacy', 'Radiology', 'General Surgery', 'Outpatient'].map(s => (
                <li key={s}>
                  <Link to="/services" className="text-sm text-gray-400 hover:text-blue-400 transition-colors flex items-center gap-2">
                    <ChevronRight className="w-3 h-3" />{s}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">Contact Us</h3>
            <ul className="space-y-4">
              <li className="flex items-start gap-3 text-sm text-gray-400">
                <MapPin className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
                Alem Ketema Enat Hospital,<br />Addis Ababa, Ethiopia
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Phone className="w-4 h-4 text-blue-400 flex-shrink-0" />
                +251 11 123 4567
              </li>
              <li className="flex items-center gap-3 text-sm text-gray-400">
                <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
                info@alemketemaenat.et
              </li>
              <li className="text-sm text-gray-400">
                <span className="text-white font-medium">Emergency Line:</span><br />
                <span className="text-red-400 font-bold text-base">+251 11 999 0000</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-gray-500">
            <span>© {new Date().getFullYear()} Alem Ketema Enat Hospital. All rights reserved.</span>
            <div className="flex items-center gap-4">
              <Link to="/login" className="hover:text-blue-400 transition-colors">Staff Portal</Link>
              <span className="text-gray-700">|</span>
              <span>Built with care for better healthcare.</span>
            </div>
          </div>
        </div>
      </footer>

      {/* AI Chatbot */}
      <AIChatbot />
    </div>
  );
};

export default PublicLayout;
