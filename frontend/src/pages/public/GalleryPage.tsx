import React, { useState } from 'react';
import PublicLayout from '../../components/PublicLayout';
import {
  Camera, Eye, X, MapPin, CheckCircle2, Sparkles
} from 'lucide-react';

interface GalleryItem {
  id: number;
  title: string;
  category: string;
  department: string;
  location: string;
  image: string;
  description: string;
  badge?: string;
  date: string;
}

const galleryItems: GalleryItem[] = [
  {
    id: 1,
    title: 'Main Hospital Entrance & Emergency Wing',
    category: 'Campus & Emergency',
    department: '24/7 Emergency Triage',
    location: 'Alem Ketema, Merhabete Woreda',
    image: '/images/hospital.jpg.webp',
    description: 'Modern entrance facade of Alem Ketema Enat General Hospital providing round-the-clock emergency admission, ambulance drop-off, and triage sorting.',
    badge: 'Main Campus',
    date: 'October 2026'
  },
  {
    id: 2,
    title: 'Maternal Delivery Suite & NICU Ward',
    category: 'Maternal & Neonatal',
    department: 'Obstetrics & Pediatrics',
    location: 'Building B, Floor 2',
    image: 'https://images.unsplash.com/photo-1559757175-5700dde675bc?w=900&q=80&auto=format&fit=crop',
    description: 'Advanced maternal delivery ward equipped with fetal monitoring systems, neonatal incubators, and specialized midwife nursing stations.',
    badge: 'Maternal Care',
    date: 'September 2026'
  },
  {
    id: 3,
    title: 'Pathology Diagnostic Laboratory',
    category: 'Pathology Lab & Equipment',
    department: 'Pathology & Hematology',
    location: 'Diagnostic Center',
    image: 'https://images.unsplash.com/photo-1579154204601-01588f351e67?w=900&q=80&auto=format&fit=crop',
    description: 'Fully automated biochemistry analyzers, specimen blood culture workstations, and electronic diagnostic result verification systems.',
    badge: 'Pathology Lab',
    date: 'October 2026'
  },
  {
    id: 4,
    title: 'Laparoscopic & General Surgical Theatre',
    category: 'Surgery & Clinical Wards',
    department: 'Surgical Operations',
    location: 'Surgical Block A',
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=900&q=80&auto=format&fit=crop',
    description: 'Sterile surgical suite fitted with modern anesthesia workstations, laparoscopic towers, and surgical shadowless lamps.',
    badge: 'Surgical Suite',
    date: 'August 2026'
  },
  {
    id: 5,
    title: 'Pediatric Care & Child Health Unit',
    category: 'Maternal & Neonatal',
    department: 'Pediatrics',
    location: 'Child Health Pavilion',
    image: 'https://images.unsplash.com/photo-1584515933487-779824d29309?w=900&q=80&auto=format&fit=crop',
    description: 'Dedicated pediatric examination rooms designed to provide warm, friendly medical consultations for infants, toddlers, and young children.',
    badge: 'Child Health',
    date: 'September 2026'
  },
  {
    id: 6,
    title: 'Intensive Care Unit (ICU) Patient Ward',
    category: 'Campus & Emergency',
    department: 'Critical Care & ICU',
    location: 'ICU Wing, 3rd Floor',
    image: 'https://images.unsplash.com/photo-1516549655169-df83a0774514?w=900&q=80&auto=format&fit=crop',
    description: '24-hour vital sign telemetry monitoring, mechanical ventilators, and dedicated intensive care nursing support for critical surgical recovery.',
    badge: 'ICU Unit',
    date: 'July 2026'
  },
  {
    id: 7,
    title: '24/7 Outpatient Pharmacy Dispensary',
    category: 'Pharmacy & Cashier POS',
    department: 'Hospital Pharmacy',
    location: 'Ground Floor Main Lobby',
    image: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?w=900&q=80&auto=format&fit=crop',
    description: 'Comprehensive inventory of essential human medicines, emergency antibiotic supplies, and digital prescription barcode verification.',
    badge: 'Pharmacy',
    date: 'October 2026'
  },
  {
    id: 8,
    title: 'Cashier POS & Telebirr Mobile Payment Desk',
    category: 'Pharmacy & Cashier POS',
    department: 'Financial Services',
    location: 'Main Finance Counter',
    image: 'https://images.unsplash.com/photo-1556742049-0a675657435b?w=900&q=80&auto=format&fit=crop',
    description: 'Cashier point-of-sale station integrated with dynamic Telebirr QR payment codes and Commercial Bank of Ethiopia (CBE Birr) direct transfer.',
    badge: 'Digital Cashier',
    date: 'October 2026'
  },
  {
    id: 9,
    title: 'Merhabete Community Health Screening Drive',
    category: 'Community Health Outreach',
    department: 'Public Health Outreach',
    location: 'North Shewa Rural Clinics',
    image: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=900&q=80&auto=format&fit=crop',
    description: 'Alem Ketema Enat Hospital mobile health team delivering free maternal checkups, blood pressure screenings, and child vaccinations to local communities.',
    badge: 'Outreach',
    date: 'September 2026'
  },
];

const categories = [
  'All',
  'Campus & Emergency',
  'Maternal & Neonatal',
  'Surgery & Clinical Wards',
  'Pathology Lab & Equipment',
  'Pharmacy & Cashier POS',
  'Community Health Outreach',
];

const GalleryPage: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [activeItem, setActiveItem] = useState<GalleryItem | null>(null);

  const filteredItems = selectedCategory === 'All'
    ? galleryItems
    : galleryItems.filter(item => item.category === selectedCategory);

  return (
    <PublicLayout>
      {/* Header Banner */}
      <section className="relative bg-slate-950 text-white py-16 lg:py-24 overflow-hidden border-b border-slate-800">
        <div className="absolute top-0 right-10 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 relative z-10 text-center">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-black uppercase tracking-widest bg-teal-500/20 text-teal-300 border border-teal-400/30 mb-4">
            <Camera className="w-4 h-4 text-teal-300" />
            Official Visual Tour & Facility Showcase
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white">
            Alem Ketema Enat Hospital Photo Gallery
          </h1>
          <p className="mt-3 text-sm md:text-base text-slate-300 max-w-3xl mx-auto leading-relaxed font-medium">
            Explore our clinical facilities, emergency triage suites, maternal delivery wards, high-tech pathology laboratory, and community health outreach programs in Alem Ketema, Merhabete Woreda.
          </p>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-xs font-bold text-slate-400">
            <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-teal-400" /> Alem Ketema, North Shewa Zone</span>
            <span className="flex items-center gap-1.5"><CheckCircle2 className="w-4 h-4 text-teal-400" /> Public General Hospital</span>
            <span className="flex items-center gap-1.5"><Sparkles className="w-4 h-4 text-amber-400" /> Amhara Region Healthcare Hub</span>
          </div>
        </div>
      </section>

      {/* Main Gallery Section */}
      <section className="py-12 bg-slate-50 dark:bg-slate-900 transition-colors">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 space-y-8">
          
          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-2xl text-xs font-extrabold transition-all duration-200 flex items-center gap-1.5 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-teal-600 to-emerald-600 text-white shadow-md scale-[1.03]'
                    : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-teal-400'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Photo Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setActiveItem(item)}
                className="group cursor-pointer bg-white dark:bg-slate-800 rounded-3xl overflow-hidden shadow-lg border border-slate-200 dark:border-slate-700 hover:shadow-2xl hover:border-teal-500/50 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="relative h-60 overflow-hidden bg-slate-950">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />
                  
                  {item.badge && (
                    <span className="absolute top-3 right-3 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900/90 text-teal-300 border border-teal-400/40 backdrop-blur-md shadow-md">
                      {item.badge}
                    </span>
                  )}

                  <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                    <span className="text-[11px] font-bold bg-black/40 backdrop-blur-md px-2 py-0.5 rounded-lg flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-teal-400" /> {item.location}
                    </span>
                    <div className="w-8 h-8 rounded-full bg-teal-500/80 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Eye className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div className="p-5 space-y-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-teal-600 dark:text-teal-400">
                    {item.department}
                  </span>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors leading-snug">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-medium line-clamp-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Lightbox Image Preview Modal */}
      {activeItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 text-white rounded-3xl max-w-4xl w-full overflow-hidden shadow-2xl border border-slate-800 flex flex-col md:flex-row">
            {/* Image display */}
            <div className="md:w-3/5 bg-black flex items-center justify-center p-2 relative min-h-[300px]">
              <img
                src={activeItem.image}
                alt={activeItem.title}
                className="max-h-[80vh] w-full object-contain rounded-2xl"
              />
            </div>

            {/* Info panel */}
            <div className="md:w-2/5 p-6 flex flex-col justify-between bg-slate-900">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-teal-500/20 text-teal-300 border border-teal-400/40">
                    {activeItem.category}
                  </span>
                  <button
                    onClick={() => setActiveItem(null)}
                    className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div>
                  <h3 className="text-xl font-extrabold text-white leading-tight">{activeItem.title}</h3>
                  <p className="text-xs text-teal-400 font-extrabold mt-1">{activeItem.department}</p>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed font-medium">
                  {activeItem.description}
                </p>

                <div className="space-y-2 border-t border-slate-800 pt-4 text-xs font-semibold text-slate-400">
                  <p className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-teal-400" /> {activeItem.location}
                  </p>
                  <p className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Official Alem Ketema Enat Hospital Record
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-slate-800">
                <button
                  onClick={() => setActiveItem(null)}
                  className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-xs rounded-xl transition-colors"
                >
                  Close Photo Preview
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </PublicLayout>
  );
};

export default GalleryPage;
