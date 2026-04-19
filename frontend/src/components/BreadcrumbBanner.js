import React from 'react';

const BreadcrumbBanner = ({ breadcrumbs }) => {
  return (
    <div 
      className="mb-6 py-8 px-6 rounded-lg"
      style={{
        backgroundImage: 'url(https://images.unsplash.com/photo-1552664730-d307ca884978?w=1200&h=250&fit=crop)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        position: 'relative',
        minHeight: '200px',
        display: 'flex',
        alignItems: 'center'
      }}
    >
      {/* Gradient Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 opacity-75 rounded-lg"></div>
      
      {/* Breadcrumb Navigation */}
      <nav className="relative w-full flex items-center justify-center gap-3 text-white text-center">
        {breadcrumbs && breadcrumbs.length > 0 && breadcrumbs.map((crumb, index) => (
          <React.Fragment key={index}>
            {index > 0 && <span className="text-blue-200 text-lg font-light">/</span>}
            {crumb.href ? (
              <a href={crumb.href} className="text-blue-100 hover:text-white transition text-lg font-medium">
                {crumb.label}
              </a>
            ) : (
              <span className="text-white font-semibold text-lg">{crumb.label}</span>
            )}
          </React.Fragment>
        ))}
      </nav>
    </div>
  );
};

export default BreadcrumbBanner;
