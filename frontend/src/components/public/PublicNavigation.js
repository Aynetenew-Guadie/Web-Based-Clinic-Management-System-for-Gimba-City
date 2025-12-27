import React from 'react';
import { Heart, Plus, Shield, Users } from 'lucide-react';

const ICONS = [
  { icon: Heart, size: 40 },
  { icon: Plus, size: 30 },
  { icon: Shield, size: 35 },
  { icon: Users, size: 45 },
  { icon: Heart, size: 25 },
  { icon: Plus, size: 20 },
  { icon: Shield, size: 30 },
  { icon: Users, size: 35 },
];

const MedicalBackground = () => {
  return (
    <div className="absolute inset-0 -z-10 overflow-hidden">
      {/* Gradient Background */}
      <div className="absolute inset-0 bg-gradient-to-tr from-blue-50 via-slate-50 to-white"></div>

      {/* Floating icons */}
      {ICONS.map((item, idx) => {
        const Icon = item.icon;
        // Random position and animation duration
        const left = `${Math.random() * 90}%`;
        const top = `${Math.random() * 90}%`;
        const duration = `${5 + Math.random() * 5}s`; // 5s to 10s
        const delay = `${Math.random() * 5}s`;

        return (
          <div
            key={idx}
            className="absolute text-primary-400 opacity-25"
            style={{
              width: item.size,
              height: item.size,
              left: left,
              top: top,
              animation: `floatSlow ${duration} ease-in-out ${delay} infinite`,
            }}
          >
            <Icon className="w-full h-full" />
          </div>
        );
      })}

      {/* Blurred gradient circles for depth */}
      <div className="absolute top-10 left-1/4 w-72 h-72 bg-gradient-to-tr from-primary-100 to-primary-300 rounded-full opacity-20 blur-3xl animate-floatSlow"></div>
      <div className="absolute bottom-20 right-1/3 w-80 h-80 bg-gradient-to-tr from-primary-200 to-primary-400 rounded-full opacity-15 blur-3xl animate-floatSlow"></div>
      <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-gradient-to-tr from-primary-50 to-primary-200 rounded-full opacity-10 blur-2xl animate-floatSlow"></div>
      <div className="absolute bottom-10 left-1/3 w-60 h-60 bg-gradient-to-tr from-primary-100 to-primary-300 rounded-full opacity-15 blur-3xl animate-floatSlow"></div>
    </div>
  );
};

export default MedicalBackground;
