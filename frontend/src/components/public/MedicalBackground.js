import React from "react";
import { Heart, Shield, Users, Award, Clock, Calendar } from "lucide-react";

const MedicalBackground = () => {
  // Array of floating medical icons with random positions
  const icons = [
    { icon: Heart, size: 24, top: "5%", left: "10%", animate: "animate-floatSlow" },
    { icon: Shield, size: 28, top: "25%", left: "70%", animate: "animate-float" },
    { icon: Users, size: 26, top: "40%", left: "30%", animate: "animate-floatSlow" },
    { icon: Award, size: 22, top: "60%", left: "50%", animate: "animate-float" },
    { icon: Clock, size: 20, top: "75%", left: "20%", animate: "animate-floatSlow" },
    { icon: Calendar, size: 28, top: "85%", left: "80%", animate: "animate-float" },
  ];

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Gradient background */}
      <div className="w-full h-full bg-gradient-to-br from-blue-50 via-white to-blue-50 opacity-90"></div>

      {/* Floating medical icons */}
      {icons.map((item, idx) => {
        const Icon = item.icon;
        return (
          <div
            key={idx}
            className={`absolute ${item.animate} text-primary-200 opacity-30`}
            style={{ top: item.top, left: item.left, fontSize: item.size }}
          >
            <Icon className="w-full h-full" />
          </div>
        );
      })}

      {/* Additional floating circles for depth */}
      <div className="absolute w-16 h-16 bg-blue-100 rounded-full opacity-20 animate-floatSlow -top-10 left-20"></div>
      <div className="absolute w-12 h-12 bg-primary-100 rounded-full opacity-15 animate-float -bottom-20 right-10"></div>
      <div className="absolute w-10 h-10 bg-blue-200 rounded-full opacity-10 animate-floatSlow top-1/2 left-1/3"></div>
      <div className="absolute w-20 h-20 bg-blue-50 rounded-full opacity-10 animate-floatSlow top-1/3 left-2/3"></div>
    </div>
  );
};

export default MedicalBackground;
