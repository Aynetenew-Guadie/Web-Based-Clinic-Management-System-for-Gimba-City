import React from 'react';
import { Link } from 'react-router-dom';
import { Users, Award, Heart } from 'lucide-react';
import PublicNavigation from './PublicNavigation';

const AboutPage = () => {
  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">About City Clinic</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Dedicated to providing exceptional healthcare services with compassion, expertise, and cutting-edge technology.
          </p>
        </div>
      </div>

      {/* Mission & Vision */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-16">
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Mission</h2>
              <p className="text-lg text-gray-600 mb-4">
                To provide comprehensive, high-quality healthcare services that improve the health and well-being of our community.
              </p>
              <p className="text-gray-600">
                We are committed to delivering patient-centered care with respect, dignity, and compassion for all individuals.
              </p>
            </div>
            
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-6">Our Vision</h2>
              <p className="text-lg text-gray-600 mb-4">
                To be the leading healthcare provider, recognized for excellence in medical care, innovation, and patient satisfaction.
              </p>
              <p className="text-gray-600">
                We strive to create a healthier community through accessible, affordable, and advanced medical services.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Values */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our Core Values</h2>
            <p className="text-xl text-gray-600">The principles that guide everything we do</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Heart className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Compassion</h3>
              <p className="text-gray-600">We treat every patient with kindness, empathy, and understanding.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Award className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Excellence</h3>
              <p className="text-gray-600">We maintain the highest standards of medical care and service quality.</p>
            </div>
            
            <div className="text-center p-6">
              <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Community</h3>
              <p className="text-gray-600">We are committed to serving and improving our local community.</p>
            </div>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Our History</h2>
            <p className="text-xl text-gray-600">A legacy of healthcare excellence</p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Founded in 1995</h3>
                  <p className="text-gray-600">City Clinic was established with a vision to provide accessible healthcare to our community.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Expansion in 2005</h3>
                  <p className="text-gray-600">We expanded our facilities and added specialized departments to serve more patients.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Technology Integration</h3>
                  <p className="text-gray-600">We embraced modern technology to enhance patient care and improve outcomes.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Today</h3>
                  <p className="text-gray-600">We continue to grow and innovate, serving thousands of patients with excellence and care.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Experience Our Care?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Join thousands of satisfied patients who trust City Clinic with their health.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/appointments"
              className="bg-white hover:bg-gray-100 text-primary-600 px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Book Appointment
            </Link>
            <Link
              to="/contact"
              className="border-2 border-white text-white hover:bg-white hover:text-primary-600 px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Contact Us
            </Link>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">&copy; 2024 City Clinic. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
