import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

const BackButton = ({ className = '' }) => {
  const navigate = useNavigate();

  return (
    <button
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          navigate(-1);
        } else {
          navigate('/login');
        }
      }}
      className={`text-blue-600 hover:text-blue-500 font-bold inline-flex items-center space-x-2 ${className}`}
      aria-label="Go back"
      title="Go back"
      data-testid="back-button"
    >
      <ArrowLeft className="h-4 w-4" />
      <span className="uppercase">BACK</span>
    </button>
  );
};

export default BackButton; 
