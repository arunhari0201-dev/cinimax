import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEnvelope, faPhone, faMapMarkerAlt, faPaperPlane, faUser, faEdit } from '@fortawesome/free-solid-svg-icons';
import { faFacebookF, faTwitter, faInstagram } from '@fortawesome/free-brands-svg-icons';
import Swal from 'sweetalert2';
import Footer from '../components/Footer';
import axios from 'axios';

const Contact = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const backendUrl = 
        process.env.NODE_ENV === 'production' 
          ? 'https://cinimax.onrender.com' 
          : 'http://localhost:5000';

      const response = await axios.post(`${backendUrl}/api/contact/submit`, formData, {
        withCredentials: true
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Message Sent! 📧',
        html: `
          <div style="text-align: left; font-size: 14px;">
            <p><strong>✅ Your message has been sent successfully!</strong></p>
            <p>📧 <strong>Check your email</strong> for a confirmation message.</p>
            <p>🔔 Our team has been notified and will get back to you soon.</p>
            <p>⏰ We typically respond within 24 hours!</p>
          </div>
        `,
        background: '#FFFFFF',
        color: '#1F2933',
        confirmButtonColor: '#C8A951',
        confirmButtonText: 'Great!',
        timer: 5000,
        timerProgressBar: true
      });
      
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to send message. Please try again.',
        background: '#FFFFFF',
        color: '#1F2933',
        confirmButtonColor: '#C8A951',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] p-6 font-poppins">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-4xl font-playfair font-bold mb-12 text-center text-[#C8A951] tracking-wide animate-fadeIn" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}>
          <FontAwesomeIcon icon={faEnvelope} className="mr-3 text-[#C8A951]" style={{filter: 'drop-shadow(0 0 5px rgba(200, 169, 81, 0.4))'}} />
          Contact Us
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          {/* Contact Information */}
          <div className="space-y-8">
            <div className="bg-[#0D0D0D] border border-[#C8A951]/20 shadow-lg p-8 hover:scale-105 transform transition duration-500" style={{boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(200, 169, 81, 0.2)'}}>
              <h2 className="text-2xl font-cinzel font-semibold mb-6 text-[#C8A951]" style={{textShadow: '0 0 8px rgba(200, 169, 81, 0.3)'}}>
                Get in Touch
              </h2>
              
              <div className="space-y-6">
                <div className="flex items-center space-x-4 hover:text-[#C8A951] transition duration-300">
                  <FontAwesomeIcon icon={faMapMarkerAlt} className="text-[#E50914] text-xl" style={{filter: 'drop-shadow(0 0 3px rgba(229, 9, 20, 0.5))'}} />
                  <div>
                    <h3 className="font-semibold">Our Location</h3>
                    <p className="text-[#F5F5F5]/80">123 Cinema Boulevard, Entertainment District, Mumbai, India 400001</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 hover:text-[#C8A951] transition duration-300">
                  <FontAwesomeIcon icon={faPhone} className="text-[#E50914] text-xl" style={{filter: 'drop-shadow(0 0 3px rgba(229, 9, 20, 0.5))'}} />
                  <div>
                    <h3 className="font-semibold">Phone</h3>
                    <p className="text-[#F5F5F5]/80">+91 98765 43210</p>
                    <p className="text-[#F5F5F5]/80">+91 98765 43211 (Bookings)</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 hover:text-[#C8A951] transition duration-300">
                  <FontAwesomeIcon icon={faEnvelope} className="text-[#E50914] text-xl" style={{filter: 'drop-shadow(0 0 3px rgba(229, 9, 20, 0.5))'}} />
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p className="text-[#F5F5F5]/80">info@cinematicpopcornpark.com</p>
                    <p className="text-[#F5F5F5]/80">support@cinematicpopcornpark.com</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Operating Hours */}
            <div className="bg-[#0D0D0D] border border-[#C8A951]/20 shadow-lg p-8 hover:scale-105 transform transition duration-500" style={{boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(200, 169, 81, 0.2)'}}>
              <h2 className="text-2xl font-cinzel font-semibold mb-6 text-[#C8A951]" style={{textShadow: '0 0 8px rgba(200, 169, 81, 0.3)'}}>
                Operating Hours
              </h2>
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-[#C8A951]/20 pb-2">
                  <span className="font-medium">Monday - Thursday</span>
                  <span className="text-[#C8A951]">10:00 AM - 11:30 PM</span>
                </div>
                <div className="flex justify-between items-center border-b border-[#C8A951]/20 pb-2">
                  <span className="font-medium">Friday - Saturday</span>
                  <span className="text-[#C8A951]">10:00 AM - 12:30 AM</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Sunday</span>
                  <span className="text-[#C8A951]">10:00 AM - 11:00 PM</span>
                </div>
              </div>
            </div>

            {/* Social Media */}
            <div className="bg-[#0D0D0D] border border-[#C8A951]/20 shadow-lg p-8 hover:scale-105 transform transition duration-500" style={{boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(200, 169, 81, 0.2)'}}>
              <h2 className="text-2xl font-cinzel font-semibold mb-6 text-[#C8A951]" style={{textShadow: '0 0 8px rgba(200, 169, 81, 0.3)'}}>
                Follow Us
              </h2>
              <div className="flex space-x-6">
                <a href="#" className="hover:text-[#C8A951] transition-transform duration-300 transform hover:scale-110">
                  <FontAwesomeIcon icon={faFacebookF} className="text-2xl" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                </a>
                <a href="#" className="hover:text-[#C8A951] transition-transform duration-300 transform hover:scale-110">
                  <FontAwesomeIcon icon={faTwitter} className="text-2xl" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                </a>
                <a href="#" className="hover:text-[#C8A951] transition-transform duration-300 transform hover:scale-110">
                  <FontAwesomeIcon icon={faInstagram} className="text-2xl" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                </a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-[#0D0D0D] border border-[#C8A951]/20 shadow-lg p-8 hover:scale-105 transform transition duration-500" style={{boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(200, 169, 81, 0.2)'}}>
            <h2 className="text-2xl font-cinzel font-semibold mb-6 text-[#C8A951]" style={{textShadow: '0 0 8px rgba(200, 169, 81, 0.3)'}}>
              Send us a Message
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-[#C8A951]">
                  <FontAwesomeIcon icon={faUser} className="mr-2" />
                  Your Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg focus:outline-none focus:border-[#C8A951] text-[#F5F5F5] transition duration-300"
                  placeholder="Enter your full name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[#C8A951]">
                  <FontAwesomeIcon icon={faEnvelope} className="mr-2" />
                  Your Email
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg focus:outline-none focus:border-[#C8A951] text-[#F5F5F5] transition duration-300"
                  placeholder="Enter your email address"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-2 text-[#C8A951]">
                  <FontAwesomeIcon icon={faEdit} className="mr-2" />
                  Your Message
                </label>
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  rows="6"
                  className="w-full px-4 py-3 bg-[#1A1A1A] border border-[#C8A951]/30 rounded-lg focus:outline-none focus:border-[#C8A951] text-[#F5F5F5] transition duration-300 resize-none"
                  placeholder="Enter your message here..."
                ></textarea>
              </div>
              
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-[#C8A951] text-[#0D0D0D] px-6 py-3 rounded-lg font-semibold hover:bg-[#B8994A] transform hover:scale-105 transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{boxShadow: '0 4px 15px rgba(200, 169, 81, 0.3)'}}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="mr-2" />
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
};

export default Contact;
