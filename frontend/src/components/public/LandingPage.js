import React, { useState, useEffect } from 'react';
import { Calendar, Clock, MapPin, Phone, Mail, Users, Award, Shield, Heart, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import MedicalBackground from './MedicalBackground';

const SERVICES = [
  { icon: Heart, title: 'General Medicine', description: 'Comprehensive healthcare for all ages with experienced physicians' },
  { icon: Users, title: 'Family Care', description: 'Complete family healthcare services under one roof' },
  { icon: Shield, title: 'Preventive Care', description: 'Regular check-ups and screenings to maintain your health' },
  { icon: Award, title: 'Specialized Treatment', description: 'Expert care from certified specialists in various fields' }
];

const STATS = [
  { number: '10,000+', label: 'Patients Served' },
  { number: '15+', label: 'Years Experience' },
  { number: '24/7', label: 'Emergency Care' },
  { number: '98%', label: 'Patient Satisfaction' }
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [showMoreDescription, setShowMoreDescription] = useState(false);
  const [animateSection, setAnimateSection] = useState({});

  const handleBookAppointment = () => navigate('/login', { state: { redirectTo: '/patient', action: 'book-appointment' } });
  const handleLearnMore = () => setShowMoreDescription(!showMoreDescription);

  const scrollTo = id => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });

  // Scroll-triggered animations
  useEffect(() => {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if(entry.isIntersecting){
          setAnimateSection(prev => ({ ...prev, [entry.target.id || entry.target.dataset.id]: true }));
        }
      });
    }, { threshold: 0.2 });

    document.querySelectorAll('[data-id]').forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Medical Background */}
      <MedicalBackground />

      <div className="relative z-10">
        {/* Header */}
        <header className="bg-white shadow-sm animate-fadeInDown transition-all duration-1000">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-slate-600 rounded-lg flex items-center justify-center animate-pulseSlow">
                  <Heart className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Gimba Clinic</h1>
                  <p className="text-sm text-gray-600">Your Health, Our Priority</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <button onClick={() => navigate('/login')} className="text-gray-600 hover:text-gray-900 font-medium animate-fadeInRight transition duration-700">Login</button>
                <button onClick={handleBookAppointment} className="btn-primary flex items-center space-x-2 animate-fadeInRight transition duration-700 hover:scale-105">
                  <Calendar className="h-4 w-4" />
                  <span>Book Appointment</span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="bg-gradient-to-br from-slate-50 to-gray-100 py-20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
            <div className={`animate-fadeInLeft transition-all duration-1000 ${animateSection.hero ? 'opacity-100' : 'opacity-0'}`} data-id="hero">
              <h1 className="text-4xl lg:text-6xl font-bold text-gray-900 mb-6">
                Quality Healthcare <span className="text-blue-700 block">You Can Trust</span>
              </h1>
              <p className="text-xl text-gray-600 mb-8">Experience compassionate care with our dedicated healthcare team.</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <button onClick={handleBookAppointment} className="btn-primary flex items-center space-x-2 animate-pulseSlow hover:scale-105 transition-transform duration-500">
                  <Calendar className="h-5 w-5" /> <span>Book Appointment</span> <ArrowRight className="h-5 w-5" />
                </button>
                <button onClick={handleLearnMore} className="btn-secondary animate-pulseSlow hover:scale-105 transition-transform duration-500">Learn More</button>
              </div>
            </div>

            {/* Quick Appointment Card */}
            <div className={`relative animate-fadeInRight transition-all duration-1000 ${animateSection.heroRight ? 'opacity-100' : 'opacity-0'}`} data-id="heroRight">
              <div className="bg-white rounded-2xl shadow-2xl p-8 hover:shadow-2xl transition-shadow duration-500">
                <h3 className="text-2xl font-bold text-gray-900 mb-6">Quick Appointment</h3>
                <div className="space-y-4">
                  {[{
                    icon: Clock, title: 'Same Day Appointments', desc: 'Available for urgent care'
                  }, {
                    icon: Users, title: 'Expert Doctors', desc: 'Certified specialists'
                  }, {
                    icon: Shield, title: 'Safe Environment', desc: 'COVID-19 protocols'
                  }].map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg hover:shadow-lg transition-shadow duration-500">
                      <item.icon className="h-6 w-6 text-primary-600 animate-float" />
                      <div>
                        <p className="font-semibold text-gray-900">{item.title}</p>
                        <p className="text-sm text-gray-600">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button onClick={handleBookAppointment} className="w-full btn-primary mt-6 flex items-center justify-center space-x-2 hover:scale-105 transition-transform duration-500">
                  <Calendar className="h-4 w-4" /> <span>Book Now</span>
                </button>
              </div>
            </div>
          </div>
        </section>
        {/* Detailed Description Section */}
{showMoreDescription && (
  <section className="py-12 bg-gray-50 animate-fadeInUp transition-all duration-1000">
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
      <h3 className="text-3xl font-bold text-gray-900 mb-4">Why Choose MediCare Clinic?</h3>
      <p className="text-lg text-gray-700 mb-6">
        At MediCare Clinic, we provide comprehensive healthcare services for patients of all ages. Our certified specialists, state-of-the-art technology, and patient-centered approach ensure high-quality care. We focus on preventive care, expert diagnosis, and compassionate treatment to keep you and your family healthy.
      </p>
      <ul className="text-left list-disc list-inside text-gray-600 space-y-2">
        <li>Experienced physicians and specialists across multiple fields</li>
        <li>24/7 emergency care and urgent appointments</li>
        <li>Advanced diagnostic tools and modern treatment facilities</li>
        <li>Patient-focused approach with high satisfaction rates</li>
      </ul>
    </div>
  </section>
)}


        {/* Stats Section */}
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-8">
            {STATS.map((stat, index) => (
              <div key={index} className={`text-center animate-fadeInUp transition-all duration-1000 ${animateSection[`stat${index}`] ? 'opacity-100' : 'opacity-0'}`} 
                   data-id={`stat${index}`} style={{ transitionDelay: `${index * 200}ms` }}>
                <div className="text-4xl font-bold text-slate-700 mb-2">{stat.number}</div>
                <div className="text-gray-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Services Section */}
        <section id="services" className="py-20 bg-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold text-gray-900 animate-fadeInUp transition-all duration-1000" data-id="servicesTitle">Our Services</h2>
              <p className="text-xl text-gray-600 max-w-3xl mx-auto animate-fadeInUp transition-all duration-1000" data-id="servicesDesc" style={{ transitionDelay: '200ms' }}>
                We offer comprehensive healthcare services designed to meet all your medical needs
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {SERVICES.map((service, index) => (
                <div key={index} className="bg-white rounded-xl p-8 shadow-lg hover:shadow-xl animate-fadeInUp transition-all duration-1000 hover:scale-105" data-id={`service${index}`} style={{ transitionDelay: `${index*150}ms` }}>
                  <div className="w-16 h-16 bg-primary-100 rounded-lg flex items-center justify-center mb-6 animate-float">
                    <service.icon className="h-8 w-8 text-primary-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-4">{service.title}</h3>
                  <p className="text-gray-600">{service.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Contact & Footer Sections */}
        {/* Contact & Footer animations will follow similar patterns (fadeInLeft / fadeInRight / fadeInUp) */}
        {/* Already detailed in previous enhanced LandingPage code */}
        {/* Contact Section */}
<section id="contact" className="py-20 bg-white">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12">
    {/* Left Contact Info */}
    <div className={`animate-fadeInLeft transition-all duration-1000 ${animateSection.contactLeft ? 'opacity-100' : 'opacity-0'}`} data-id="contactLeft">
      <h2 className="text-4xl font-bold text-gray-900 mb-6">Visit Our Clinic</h2>
      <p className="text-xl text-gray-600 mb-8">Conveniently located in the heart of the city with easy access and ample parking.</p>
      <div className="space-y-6">
        {[{ icon: MapPin, label: 'Address', value: 'Kebele 01, Gimba, Amhara Region, Ethiopia' },
          { icon: Phone, label: 'Phone', value: '+251 926 53 5272' },
          { icon: Mail, label: 'Email', value: 'info@gimbaclinic.com' },
          { icon: Clock, label: 'Hours', value: 'Mon-Fri: 2:00 AM - 2:00 PM, Sat-Sun: 2:00 AM - 5:00 PM' }].map((item, idx) => (
          <div key={idx} className="flex items-center space-x-4 p-4 bg-primary-50 rounded-lg hover:shadow-lg transition-shadow duration-500">
            <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center animate-float">
              <item.icon className="h-6 w-6 text-primary-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">{item.label}</p>
              <p className="text-gray-600">{item.value}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    {/* Right Call-to-Action */}
    <div className={`animate-fadeInRight transition-all duration-1000 ${animateSection.contactRight ? 'opacity-100' : 'opacity-0'}`} data-id="contactRight">
      <div className="bg-primary-600 rounded-2xl p-8 text-white hover:shadow-2xl transition-shadow duration-500">
        <h3 className="text-2xl font-bold mb-6">Ready to Get Started?</h3>
        <p className="text-primary-100 mb-8">Take the first step towards better health. Book your appointment today.</p>
        <div className="space-y-4">
          <button onClick={handleBookAppointment} className="w-full bg-white text-primary-600 font-semibold py-4 px-6 rounded-lg hover:bg-gray-50 transition-colors flex items-center justify-center space-x-2 hover:scale-105 transform transition-transform duration-500">
            <Calendar className="h-5 w-5" /> <span>Book Appointment Online</span>
          </button>
          <button className="w-full border-2 border-white text-white font-semibold py-4 px-6 rounded-lg hover:bg-white hover:text-primary-600 transition-colors flex items-center justify-center space-x-2 hover:scale-105 transform transition-transform duration-500">
            <Phone className="h-5 w-5" /> <span>Call +251 926 53 5272</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</section>

{/* Footer Section */}
<footer className="bg-gray-900 text-white py-12 animate-fadeInUp transition-all duration-1000">
  <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-3 gap-12">
    <div className="animate-fadeInUp transition-all duration-1000" data-id="footerCol1">
      <h4 className="font-bold text-xl mb-4">Gimba Clinic</h4>
      <p className="text-gray-400">Your trusted partner in health and wellness, providing quality care for all ages.</p>
    </div>
    <div className="animate-fadeInUp transition-all duration-1000" data-id="footerCol2" style={{ transitionDelay: '150ms' }}>
      <h4 className="font-bold text-xl mb-4">Quick Links</h4>
      <ul className="space-y-2">
        {['Home', 'Services', 'Contact', 'Book Appointment'].map((link, idx) => (
          <li key={idx} className="hover:text-primary-400 cursor-pointer transition-colors duration-500" onClick={() => scrollTo(link.toLowerCase().replace(' ', ''))}>{link}</li>
        ))}
      </ul>
    </div>
    <div className="animate-fadeInUp transition-all duration-1000" data-id="footerCol3" style={{ transitionDelay: '300ms' }}>
      <h4 className="font-bold text-xl mb-4">Follow Us</h4>
      <div className="flex space-x-4">
        {['facebook', 'twitter', 'linkedin', 'instagram'].map((platform, idx) => (
          <a key={idx} href="#" className="hover:text-primary-400 transition-colors duration-500">{platform}</a>
        ))}
      </div>
    </div>
  </div>
  <div className="text-center mt-12 text-gray-500 text-sm animate-fadeInUp transition-all duration-1000">© 2018 Gimba Clinic. All rights reserved.</div>
</footer>

      </div>
    </div>
  );
};

export default LandingPage;
