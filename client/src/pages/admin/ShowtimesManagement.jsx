import { useState } from 'react';
import { toast } from 'react-toastify';
import { useSelector } from 'react-redux';

const backendUrl = 
  process.env.NODE_ENV === 'production' 
    ? 'https://cinimax.onrender.com' 
    : 'http://localhost:5000';

export default function ShowtimesManagement() {
  const { currentUser } = useSelector((state) => state.user);
  const [loading, setLoading] = useState({
    archiving: false,
    generating: false,
    nextDay: false,
    reopening: false
  });
  const [results, setResults] = useState({
    archiving: null,
    generating: null,
    nextDay: null,
    reopening: null
  });

  const handleArchivePastShowtimes = async () => {
    if (loading.archiving) return;
    
    try {
      setLoading(prev => ({ ...prev, archiving: true }));
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/showtimes/force-archive`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Successfully archived ${data.count} past showtimes`);
        setResults(prev => ({ ...prev, archiving: data }));
      } else {
        toast.error(data.message || 'Error archiving showtimes');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to archive showtimes');
    } finally {
      setLoading(prev => ({ ...prev, archiving: false }));
    }
  };

  const handleGenerateTodayShowtimes = async () => {
    if (loading.generating) return;
    
    try {
      setLoading(prev => ({ ...prev, generating: true }));
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/showtimes/generate-today`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Successfully generated ${data.count} showtimes for today`);
        setResults(prev => ({ ...prev, generating: data }));
      } else {
        toast.error(data.message || 'Error generating showtimes');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate showtimes');
    } finally {
      setLoading(prev => ({ ...prev, generating: false }));
    }
  };

  const handleGenerateNextDayShowtimes = async () => {
    if (loading.nextDay) return;
    
    try {
      setLoading(prev => ({ ...prev, nextDay: true }));
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/showtimes/generate-next-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Successfully generated ${data.count} showtimes for tomorrow`);
        setResults(prev => ({ ...prev, nextDay: data }));
      } else {
        toast.error(data.message || 'Error generating next day showtimes');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to generate next day showtimes');
    } finally {
      setLoading(prev => ({ ...prev, nextDay: false }));
    }
  };

  const handleReopenAllShowtimes = async () => {
    if (loading.reopening) return;
    
    try {
      setLoading(prev => ({ ...prev, reopening: true }));
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${backendUrl}/api/showtimes/reopen-all`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        credentials: 'include'
      });
      const data = await res.json();
      
      if (res.ok) {
        toast.success(`Successfully reopened ${data.count} archived showtimes`);
        setResults(prev => ({ ...prev, reopening: data }));
      } else {
        toast.error(data.message || 'Error reopening showtimes');
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to reopen showtimes');
    } finally {
      setLoading(prev => ({ ...prev, reopening: false }));
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Showtimes Management</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Archive Past Showtimes Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Archive Past Showtimes</h2>
          <p className="text-gray-600 mb-4">
            Archive showtimes that have ended but were not automatically archived.
          </p>
          <button 
            onClick={handleArchivePastShowtimes}
            disabled={loading.archiving}
            className="w-full bg-red-600 text-white py-2 rounded-md hover:bg-red-700 disabled:bg-gray-400"
          >
            {loading.archiving ? 'Processing...' : 'Archive Past Showtimes'}
          </button>
          
          {results.archiving && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p>Archived: {results.archiving.count} showtimes</p>
              {results.archiving.seats && <p>Freed seats: {results.archiving.seats}</p>}
              {results.archiving.parking && <p>Freed parking: {results.archiving.parking}</p>}
            </div>
          )}
        </div>
        
        {/* Reopen All Showtimes Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Reopen All Showtimes</h2>
          <p className="text-gray-600 mb-4">
            Reopen all archived showtimes to make them available for booking again.
          </p>
          <button 
            onClick={handleReopenAllShowtimes}
            disabled={loading.reopening}
            className="w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading.reopening ? 'Processing...' : 'Reopen All Showtimes'}
          </button>
          
          {results.reopening && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p>Reopened: {results.reopening.count} showtimes</p>
            </div>
          )}
        </div>
        
        {/* Generate Today's Showtimes Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Generate Today's Showtimes</h2>
          <p className="text-gray-600 mb-4">
            Generate new showtimes for today based on active movies.
          </p>
          <button 
            onClick={handleGenerateTodayShowtimes}
            disabled={loading.generating}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading.generating ? 'Processing...' : 'Generate Today\'s Showtimes'}
          </button>
          
          {results.generating && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p>Generated: {results.generating.count} showtimes</p>
            </div>
          )}
        </div>
        
        {/* Generate Next Day's Showtimes Card */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Generate Tomorrow's Showtimes</h2>
          <p className="text-gray-600 mb-4">
            Manually generate showtimes for tomorrow based on active movies.
          </p>
          <button 
            onClick={handleGenerateNextDayShowtimes}
            disabled={loading.nextDay}
            className="w-full bg-green-600 text-white py-2 rounded-md hover:bg-green-700 disabled:bg-gray-400"
          >
            {loading.nextDay ? 'Processing...' : 'Generate Tomorrow\'s Showtimes'}
          </button>
          
          {results.nextDay && (
            <div className="mt-4 p-3 bg-gray-50 rounded-md">
              <p>Generated: {results.nextDay.count} showtimes for tomorrow</p>
            </div>
          )}
        </div>
      </div>
      
      <div className="mt-8 bg-blue-50 p-4 rounded-lg">
        <h3 className="font-semibold mb-2">How This Works</h3>
        <ul className="list-disc pl-5 text-sm text-gray-700">
          <li>The system automatically archives past showtimes via a scheduled task that runs every minute</li>
          <li>All archived showtimes are automatically reopened at 12:00 AM every day</li>
          <li>New showtimes for the next day are automatically generated at 12:00 AM every day</li>
          <li>These buttons let you manually trigger these processes if needed</li>
          <li>Use "Archive Past Showtimes" if you notice old showtimes still showing as available</li>
          <li>Use "Reopen All Showtimes" to manually make all archived showtimes available again</li>
          <li>Use "Generate Tomorrow's Showtimes" if you don't see any showtimes for tomorrow</li>
        </ul>
      </div>
    </div>
  );
}
