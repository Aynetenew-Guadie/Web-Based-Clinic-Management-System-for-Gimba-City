import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Building2 } from 'lucide-react';
import PublicNavigation from './PublicNavigation';

const HomePage = () => {

  return (
    <div className="min-h-screen bg-white">
            <PublicNavigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Welcome to <span className="text-primary-600">Gimba Clinic</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Providing exceptional healthcare services with compassion, expertise, and cutting-edge technology.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/appointments"
                className="bg-primary-600 hover:bg-primary-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
              >
                Book Appointment
              </Link>
              <Link
                to="/services"
                className="bg-white hover:bg-gray-50 text-primary-600 border-2 border-primary-600 px-8 py-3 rounded-lg text-lg font-semibold"
              >
                Our Services
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose City Clinic?</h2>
            <p className="text-xl text-gray-600">We combine medical excellence with personalized care</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Modern Facilities</h3>
              <p className="text-gray-600">State-of-the-art medical equipment and comfortable treatment rooms</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Expert Doctors</h3>
              <p className="text-gray-600">Experienced healthcare professionals dedicated to your well-being</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">24/7 Care</h3>
              <p className="text-gray-600">Round-the-clock medical support when you need it most</p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Section */}
      <div className="bg-gray-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Get in Touch</h2>
            <p className="text-xl text-gray-600">We're here to help with all your healthcare needs</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Phone className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Phone</h3>
              <p className="text-gray-600">+1 (555) 123-4567</p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Email</h3>
              <p className="text-gray-600">info@gimbaclinic.com</p>
            </div>
            
            <div className="text-center">
              <div className="bg-primary-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="h-6 w-6 text-primary-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Address</h3>
              <p className="text-gray-600">123 Medical Center Dr, Healthcare City</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">City Clinic</h3>
              <p className="text-gray-400">Providing exceptional healthcare services with compassion and expertise.</p>
            </div>
            
            <div>
              <h4 className="text-md font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                <li><Link to="/" className="text-gray-400 hover:text-white">Home</Link></li>
                <li><Link to="/about" className="text-gray-400 hover:text-white">About Us</Link></li>
                <li><Link to="/services" className="text-gray-400 hover:text-white">Services</Link></li>
                <li><Link to="/contact" className="text-gray-400 hover:text-white">Contact</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold mb-4">Services</h4>
              <ul className="space-y-2">
                <li><Link to="/services/general" className="text-gray-400 hover:text-white">General Medicine</Link></li>
                <li><Link to="/services/cardiology" className="text-gray-400 hover:text-white">Cardiology</Link></li>
                <li><Link to="/services/pediatrics" className="text-gray-400 hover:text-white">Pediatrics</Link></li>
                <li><Link to="/services/laboratory" className="text-gray-400 hover:text-white">Laboratory</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-md font-semibold mb-4">Contact Info</h4>
              <div className="space-y-2 text-gray-400">
                <p>+1 (555) 123-4567</p>
                <p>info@gimbaclinic.com</p>
                <p>123 Medical Center Dr</p>
              </div>
            </div>
          </div>
          
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <p className="text-gray-400">&copy; 2018 Gimba Clinic. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
