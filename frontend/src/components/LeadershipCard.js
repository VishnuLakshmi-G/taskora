import React from "react";
import { FaFacebook, FaTwitter, FaLinkedin, FaInstagram } from 'react-icons/fa';

export function LeadershipCard({ name, position, image, socials = [] }) {
  const iconMap = {
    'fab fa-facebook': FaFacebook,
    'fab fa-twitter': FaTwitter,
    'fab fa-linkedin': FaLinkedin,
    'fab fa-instagram': FaInstagram,
  };

  return (
    <div className="w-80 bg-white rounded-lg shadow-lg hover:shadow-2xl transition-shadow overflow-hidden">
      {/* Image Container */}
      <div className="h-80 overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>
      
      {/* Content Container */}
      <div className="text-center p-6">
        <h4 className="text-xl font-bold text-gray-800 mb-2">
          {name}
        </h4>
        <p className="text-gray-600 font-medium bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
          {position}
        </p>
      </div>
      
      {/* Social Links */}
      <div className="flex justify-center gap-7 pb-4 px-6">
        {socials.map((social, idx) => {
          const IconComponent = iconMap[social.icon] || FaFacebook;
          return (
            <a
              key={idx}
              href={social.href}
              title={social.label}
              className="text-lg text-blue-500 hover:text-blue-700 transition-colors"
            >
              <IconComponent />
            </a>
          );
        })}
      </div>
    </div>
  );
}
