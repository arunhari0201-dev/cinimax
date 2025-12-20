
import React, { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faQuestionCircle, faChevronDown, faEnvelope, faPaperPlane, faUser } from '@fortawesome/free-solid-svg-icons';
import Swal from 'sweetalert2';
import Footer from '../components/Footer';
import axios from 'axios';
const FAQ = () => {
  const [openFAQ, setOpenFAQ] = useState(null);
  const [activeTab, setActiveTab] = useState("faq");
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [questionData, setQuestionData] = useState({ userQuestion: '', userEmail: '' });

  const faqs = [
    {
      question: "How does dynamic pricing work?",
      answer: "Parking rates vary based on demand, optimizing space and reducing congestion during peak hours.",
    },
    {
      question: "Can I book both a movie ticket and a parking slot?",
      answer: "Yes, you can conveniently book both in a single step, ensuring stress-free planning.",
    },
    {
      question: "How is payment handled?",
      answer: "Payments are processed securely through our app with encrypted gateways and data protection.",
    },
    {
      question: "What is seat-to-slot matching?",
      answer: "When you book a seat, a parking slot nearby is assigned for easy access, reducing parking time.",
    },
  ];

  const toggleFAQ = (index) => {
    setOpenFAQ(openFAQ === index ? null : index);
  };

  const handleTabSwitch = (tab) => {
    setActiveTab(tab);
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleQuestionChange = (e) => {
    setQuestionData({ ...questionData, [e.target.name]: e.target.value });
  };



  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const backendUrl = 
        process.env.NODE_ENV === 'production' 
          ? 'https://cinimax.onrender.com' 
          : 'http://localhost:5000';

      const response = await axios.post(`${backendUrl}/api/faq/ask`, {
        userQuestion: questionData.userQuestion,
        userEmail: questionData.userEmail,
      },{
        withCredentials: true, // Include credentials in the request
      });
  
      Swal.fire({
        icon: 'success',
        title: 'Question Submitted! 📧',
        html: `
          <div style="text-align: left; font-size: 14px;">
            <p><strong>✅ Your question has been successfully submitted!</strong></p>
            <p>📧 <strong>Check your email</strong> for a confirmation message.</p>
            <p>🔔 Our team has been notified and will review your question.</p>
            <p>💡 If it's a common question, we may add it to our FAQ section to help others!</p>
          </div>
        `,
        background: '#0D0D0D',
        color: '#F5F5F5',
        confirmButtonColor: '#C8A951',
        confirmButtonText: 'Got it!',
        timer: 5000,
        timerProgressBar: true
      });

      // Clear the form
      setQuestionData({ userQuestion: '', userEmail: '' });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'There was an error submitting your question!',
      });
    }
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();
  
    try {
      const backendUrl = 
        process.env.NODE_ENV === 'production' 
          ? 'https://cinimax.onrender.com' 
          : 'http://localhost:5000';

      const response = await axios.post(`${backendUrl}/api/contact/submit`, {
        name: formData.name,
        email: formData.email,
        message: formData.message,
      }, {
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
        background: '#0D0D0D',
        color: '#F5F5F5',
        confirmButtonColor: '#C8A951',
        confirmButtonText: 'Great!',
        timer: 5000,
        timerProgressBar: true
      });

      // Clear the form
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Oops...',
        text: 'There was an error submitting your message!',
      });
    }
  };
  

  return (
    <div className="min-h-screen bg-[#0D0D0D] text-[#F5F5F5] p-6 font-poppins">
      <div className="text-center mb-12">
        <button
          className={`px-6 py-3 font-playfair font-semibold ${
            activeTab === "faq" ? "bg-[#C8A951] text-[#0D0D0D]" : "bg-[#0D0D0D] text-[#C8A951] border border-[#C8A951]"
          } transition duration-300 ease-in-out hover:shadow-md mx-3`}
          onClick={() => handleTabSwitch("faq")}
          style={{boxShadow: activeTab === "faq" ? '0 0 10px rgba(200, 169, 81, 0.4)' : 'none'}}
        >
          FAQ
        </button>
        <button
          className={`px-6 py-3 font-playfair font-semibold ${
            activeTab === "contact" ? "bg-[#C8A951] text-[#0D0D0D]" : "bg-[#0D0D0D] text-[#C8A951] border border-[#C8A951]"
          } transition duration-300 ease-in-out hover:shadow-md mx-3`}
          onClick={() => handleTabSwitch("contact")}
          style={{boxShadow: activeTab === "contact" ? '0 0 10px rgba(200, 169, 81, 0.4)' : 'none'}}
        >
          Contact
        </button>
      </div>

      {activeTab === "faq" && (
        <div>
          <h1 className="text-4xl font-playfair font-bold text-center mb-12 text-[#C8A951] tracking-wider" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}>
            <FontAwesomeIcon icon={faQuestionCircle} className="mr-3 text-[#C8A951]" style={{filter: 'drop-shadow(0 0 5px rgba(200, 169, 81, 0.4))'}} />
            Frequently Asked Questions
          </h1>
          <div className="max-w-4xl mx-auto space-y-6">
            {faqs.map((faq, index) => (
              <div
                key={index}
                className="p-6 bg-[#0D0D0D] border border-[#C8A951]/30 shadow-lg transition-all transform hover:scale-102 hover:border-[#C8A951]/50"
                style={{boxShadow: '0 0 15px rgba(0, 0, 0, 0.5)'}}
              >
                <button
                  className="w-full flex justify-between items-center text-left text-lg font-cinzel font-semibold text-[#F5F5F5]"
                  onClick={() => toggleFAQ(index)}
                >
                  {faq.question}
                  <FontAwesomeIcon
                    icon={faChevronDown}
                    className={`text-[#C8A951] transition-transform duration-300 ${
                      openFAQ === index ? "rotate-180" : ""
                    }`}
                    style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}}
                  />
                </button>
                {openFAQ === index && (
                  <p className="mt-5 text-[#F5F5F5]/90 transition-opacity duration-500 ease-in-out bg-[#111111] p-5 border-l-2 border-[#C8A951] font-poppins" style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.5)'}}>
                    {faq.answer}
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Ask a Question Form */}
          <div className="max-w-2xl mx-auto mt-16 space-y-6">
            <h2 className="text-2xl font-cinzel font-semibold text-center text-[#C8A951]" style={{textShadow: '0 0 8px rgba(200, 169, 81, 0.3)'}}>Ask a Question</h2>
            <form onSubmit={handleQuestionSubmit} className="space-y-6 bg-[#0D0D0D] border border-[#C8A951]/20 p-8 shadow-lg" style={{boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(200, 169, 81, 0.2)'}}>
              <div className="flex items-center space-x-4">
                <FontAwesomeIcon icon={faUser} className="text-[#C8A951]" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                <input
                  type="email"
                  name="userEmail"
                  value={questionData.userEmail}
                  onChange={handleQuestionChange}
                  className="w-full p-3 bg-[#0D0D0D] border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] focus:shadow-md transition duration-300 font-poppins"
                  style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
                  placeholder="Your Email"
                  required
                />
              </div>
              <div className="flex items-center space-x-4">
                <FontAwesomeIcon icon={faQuestionCircle} className="text-[#C8A951]" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                <textarea
                  name="userQuestion"
                  value={questionData.userQuestion}
                  onChange={handleQuestionChange}
                  className="w-full p-3 bg-[#0D0D0D] border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] focus:shadow-md transition duration-300 font-poppins"
                  style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
                  rows="4"
                  placeholder="Your Question"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#0D0D0D] border border-[#C8A951] text-[#F5F5F5] font-playfair font-semibold py-3 px-4 transition-all duration-300 hover:shadow-lg focus:outline-none"
                style={{boxShadow: '0 0 10px rgba(200, 169, 81, 0.2)'}}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="mr-2 text-[#C8A951]" />
                Submit Question
              </button>
            </form>
          </div>
        </div>
      )}

      {activeTab === "contact" && (
        <div>
          <h1 className="text-4xl font-playfair font-bold text-center mb-12 text-[#C8A951] tracking-wider" style={{textShadow: '0 0 10px rgba(200, 169, 81, 0.3)'}}>
            <FontAwesomeIcon icon={faEnvelope} className="mr-3 text-[#C8A951]" style={{filter: 'drop-shadow(0 0 5px rgba(200, 169, 81, 0.4))'}} />
            Contact Us
          </h1>
          <div className="max-w-2xl mx-auto space-y-8">
            <form onSubmit={handleSubmit} className="space-y-6 bg-[#0D0D0D] border border-[#C8A951]/20 p-8 shadow-lg" style={{boxShadow: '0 0 20px rgba(0, 0, 0, 0.5), 0 0 10px rgba(200, 169, 81, 0.2)'}}>
              <div className="flex items-center space-x-4">
                <FontAwesomeIcon icon={faUser} className="text-[#C8A951]" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#0D0D0D] border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] focus:shadow-md transition duration-300 font-poppins"
                  style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
                  placeholder="Your Name"
                  required
                />
              </div>
              <div className="flex items-center space-x-4">
                <FontAwesomeIcon icon={faEnvelope} className="text-[#C8A951]" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#0D0D0D] border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] focus:shadow-md transition duration-300 font-poppins"
                  style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
                  placeholder="Your Email"
                  required
                />
              </div>
              <div className="flex items-center space-x-4">
                <FontAwesomeIcon icon={faQuestionCircle} className="text-[#C8A951]" style={{filter: 'drop-shadow(0 0 3px rgba(200, 169, 81, 0.3))'}} />
                <textarea
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  className="w-full p-3 bg-[#0D0D0D] border border-[#C8A951]/30 text-[#F5F5F5] focus:outline-none focus:border-[#C8A951] focus:shadow-md transition duration-300 font-poppins"
                  style={{boxShadow: 'inset 0 0 10px rgba(0, 0, 0, 0.3)'}}
                  rows="4"
                  placeholder="Your Message"
                  required
                />
              </div>
              <button
                type="submit"
                className="w-full bg-[#0D0D0D] border border-[#C8A951] text-[#F5F5F5] font-playfair font-semibold py-3 px-4 transition-all duration-300 hover:shadow-lg focus:outline-none"
                style={{boxShadow: '0 0 10px rgba(200, 169, 81, 0.2)'}}
              >
                <FontAwesomeIcon icon={faPaperPlane} className="mr-2 text-[#C8A951]" />
                Send Message
              </button>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default FAQ;
