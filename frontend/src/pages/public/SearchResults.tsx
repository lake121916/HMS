import React from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const SearchResults: React.FC = () => {
  const [params] = useSearchParams();
  const q = params.get('q') || '';
  const query = q.trim().toLowerCase();

  const items = [
    { label: 'Home', href: '/home' },
    { label: 'About Us', href: '/about' },
    { label: 'Services', href: '/services' },
    { label: 'Departments', href: '/departments' },
    { label: 'Doctors', href: '/our-doctors' },
    { label: 'News', href: '/news' },
    { label: 'Photo Gallery', href: '/gallery' },
    { label: 'Contact', href: '/contact' },
    { label: 'Staff Login', href: '/login' },
  ];

  const results = query ? items.filter(i => i.label.toLowerCase().includes(query)) : [];

  return (
    <div className="max-w-4xl mx-auto px-6 py-12">
      <h2 className="text-2xl font-semibold mb-4">Search results for "{q}"</h2>
      {query === '' ? (
        <p className="text-gray-600">Enter a search term in the site search box.</p>
      ) : results.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 p-4 rounded">
          <p className="text-yellow-800">No results found for "{q}".</p>
          <p className="text-sm text-gray-600">Try different keywords or visit our <Link to="/contact" className="text-blue-600 underline">Contact page</Link> for help.</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {results.map(r => (
            <li key={r.href}>
              <Link to={r.href} className="text-blue-600 hover:underline">{r.label}</Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default SearchResults;
