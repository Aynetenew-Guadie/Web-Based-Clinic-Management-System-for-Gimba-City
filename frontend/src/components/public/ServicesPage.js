import React from 'react';
import { Link } from 'react-router-dom';
import { Stethoscope, Heart, Baby, TestTube, Eye, Brain, Bone } from 'lucide-react';
import PublicNavigation from './PublicNavigation';

const ServicesPage = () => {
  const services = [
    {
      icon: <Stethoscope className="h-8 w-8 text-primary-600" />,
      title: 'General Medicine',
      description: 'Comprehensive primary care services for all ages, including routine check-ups, preventive care, and treatment of common illnesses.',
      features: ['Annual Physicals', 'Chronic Disease Management', 'Immunizations', 'Health Screenings']
    },
    {
      icon: <Heart className="h-8 w-8 text-primary-600" />,
      title: 'Cardiology',
      description: 'Expert heart care services including diagnostic testing, treatment of heart conditions, and preventive cardiology.',
      features: ['ECG Testing', 'Echocardiograms', 'Stress Tests', 'Heart Disease Treatment']
    },
    {
      icon: <Baby className="h-8 w-8 text-primary-600" />,
      title: 'Pediatrics',
      description: 'Specialized care for infants, children, and adolescents, focusing on growth, development, and overall health.',
      features: ['Well-Child Visits', 'Vaccinations', 'Growth Monitoring', 'Childhood Illnesses']
    },
    {
      icon: <TestTube className="h-8 w-8 text-primary-600" />,
      title: 'Laboratory Services',
      description: 'Comprehensive diagnostic testing with state-of-the-art equipment and quick turnaround times.',
      features: ['Blood Tests', 'Urine Analysis', 'Microbiology', 'Pathology']
    },
    {
      icon: <Eye className="h-8 w-8 text-primary-600" />,
      title: 'Ophthalmology',
      description: 'Complete eye care services including vision testing, treatment of eye diseases, and surgical procedures.',
      features: ['Eye Exams', 'Glaucoma Screening', 'Cataract Surgery', 'Vision Correction']
    },
    {
      icon: <Brain className="h-8 w-8 text-primary-600" />,
      title: 'Neurology',
      description: 'Specialized care for neurological disorders, including diagnosis, treatment, and ongoing management.',
      features: ['Headache Treatment', 'Seizure Management', 'Stroke Care', 'Neurological Testing']
    },
    {
      icon: <Bone className="h-8 w-8 text-primary-600" />,
      title: 'Orthopedics',
      description: 'Comprehensive bone and joint care, including sports medicine, rehabilitation, and surgical procedures.',
      features: ['Fracture Care', 'Joint Replacement', 'Sports Injuries', 'Physical Therapy']
    }
  ];

  return (
    <div className="min-h-screen bg-white">
      <PublicNavigation />

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-50 to-secondary-50 py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Services</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Comprehensive healthcare services delivered with expertise, compassion, and cutting-edge technology.
          </p>
        </div>
      </div>

      {/* Services Grid */}
      <div className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.map((service, index) => (
              <div key={index} className="bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  {service.icon}
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{service.title}</h3>
                <p className="text-gray-600 mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-primary-600 rounded-full mr-2"></div>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Specialized Care */}
      <div className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Specialized Care Programs</h2>
            <p className="text-xl text-gray-600">Tailored healthcare solutions for specific needs</p>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Preventive Care</h3>
              <p className="text-gray-600 mb-4">
                Our preventive care programs focus on maintaining your health and catching potential issues early.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Regular health screenings</li>
                <li>• Vaccination programs</li>
                <li>• Lifestyle counseling</li>
                <li>• Risk assessment</li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-2xl font-bold text-gray-900 mb-4">Chronic Disease Management</h3>
              <p className="text-gray-600 mb-4">
                Comprehensive care for chronic conditions with ongoing support and monitoring.
              </p>
              <ul className="space-y-2 text-gray-600">
                <li>• Diabetes management</li>
                <li>• Hypertension care</li>
                <li>• Asthma treatment</li>
                <li>• Heart disease management</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary-600 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Book an appointment today and experience our exceptional healthcare services.
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

export default ServicesPage;
