import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Stethoscope, Menu, X, Phone, Mail, MapPin,
  Facebook, Twitter, Instagram, Linkedin, ChevronRight, ChevronDown, Navigation, Search
} from 'lucide-react';
import AIChatbot from './AIChatbot';

const PublicLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [contactDropdown, setContactDropdown] = useState(false);
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

  // Search box component — lightweight client-side search over public pages
  function SearchBox() {
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<{ label: string; href: string }[]>([]);

    const searchable = [
      ...navLinks,
      { label: 'News', href: '/news' },
      { label: 'Photo Gallery', href: '/gallery' },
      { label: 'Contact', href: '/contact' },
      { label: 'Staff Login', href: '/login' },
    ];

    useEffect(() => {
      if (!open) {
        setQuery('');
        setResults([]);
      }
    }, [open]);

    useEffect(() => {
      const q = query.trim().toLowerCase();
      if (!q) return setResults([]);
      const res = searchable.filter(s => s.label.toLowerCase().includes(q));
      setResults(res.slice(0, 6));
    }, [query]);

    const onSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (results.length > 0) {
        navigate(results[0].href);
      } else if (query.trim()) {
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
      }
      setOpen(false);
    };

    return (
      <div className="relative">
        {!open ? (
          <button onClick={() => setOpen(true)} className="hidden md:inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white">
            <Search className="w-4 h-4" />
          </button>
        ) : (
          <form onSubmit={onSubmit} className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search site..."
              className="w-64 md:w-80 pl-3 pr-10 py-2 rounded-md bg-white text-gray-900 text-sm shadow-sm"
            />
            <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="absolute right-0 top-0 mt-2 mr-2 text-gray-500 hover:text-gray-700">✕</button>

            {results.length > 0 && (
              <div className="absolute left-0 mt-10 w-full bg-white shadow-lg rounded-md z-50 max-h-64 overflow-auto">
                {results.map(r => (
                  <Link key={r.href} to={r.href} onClick={() => setOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                    {r.label}
                  </Link>
                ))}
              </div>
            )}
            {query && results.length === 0 && (
              <div className="absolute left-0 mt-10 w-full bg-white shadow-lg rounded-md z-50 p-3 text-sm text-gray-600">No results — press Enter to search</div>
            )}
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col font-sans">
      {/* Top info bar */}
      <div className="bg-primary text-white text-xs py-2 hidden md:block">
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

      {/* Main navbar - dark centered */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${scrolled ? 'shadow-lg' : ''}`}>
        <div className="bg-secondary text-white">
          <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
            <Link to="/home" className="flex items-center gap-3">
              <img src="/images/hospital.jpg.webp" alt="Alem Ketema Enat Hospital" className="w-10 h-10 rounded-full object-cover shadow" />
              <div className="hidden sm:block">
                <p className="text-sm font-bold leading-tight">Alem Ketema Enat</p>
                <p className="text-xs text-gray-300 font-medium leading-tight">Hospital</p>
              </div>
            </Link>

            <div className="hidden lg:flex items-center gap-6">
              {navLinks.map((link, idx) => (
                <Link key={link.href} to={link.href} className={`text-sm font-semibold uppercase tracking-wide px-2 py-2 transition ${isActive(link.href) ? 'text-white' : 'text-gray-300 hover:text-primary'}`}>
                  {link.label}
                </Link>
              ))}
              <Link to="/news" className="text-sm font-semibold uppercase tracking-wide text-gray-300 hover:text-white">News</Link>
              <Link to="/gallery" className="text-sm font-semibold uppercase tracking-wide text-gray-300 hover:text-white">Photo Gallery</Link>
            </div>

            <div className="flex items-center gap-3 relative">
              <SearchBox />
              <button onClick={() => setMenuOpen(!menuOpen)} className="lg:hidden p-2 rounded-lg text-gray-200 hover:bg-gray-800">
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="lg:hidden bg-secondary text-gray-200 px-6 py-4">
            <div className="space-y-2">
              {navLinks.map(link => (
                <Link key={link.href} to={link.href} className={`block px-4 py-3 rounded-md text-sm font-medium ${isActive(link.href) ? 'bg-secondary/90 text-white' : 'hover:bg-secondary/80 hover:text-primary'}`}>
                  {link.label}
                </Link>
              ))}
              <Link to="/news" className="block px-4 py-3 rounded-md text-sm font-medium hover:bg-gray-800">News</Link>
              <Link to="/gallery" className="block px-4 py-3 rounded-md text-sm font-medium hover:bg-gray-800">Photo Gallery</Link>
              <div className="pt-3 border-t border-gray-800 mt-3">
                <Link to="/contact" className="block px-4 py-3 rounded-md text-sm font-medium hover:bg-gray-800">Contact Us</Link>
              </div>
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
              <img src="/images/hospital.jpg.webp" alt="Alem Ketema Enat Hospital" className="w-10 h-10 rounded-xl object-cover" />
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
