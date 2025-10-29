import React, { useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';

// Define the structure for the API response
interface RegistrationResult {
  deviceId: number;
  deviceKey: string;
}

export const AddDeviceForm: React.FC = () => {
  const { session } = useAuth();
  // State for form inputs
  const [deviceName, setDeviceName] = useState('');
  const [macAddress, setMacAddress] = useState('');
  
  // State for API interaction
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<RegistrationResult | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    setResult(null);

    // Basic validation
    if (!deviceName.trim() || !macAddress.trim()) {
      setError('Please fill out both device name and MAC address.');
      setIsLoading(false);
      return;
    }
    
    try {
      // The server URL should ideally come from an environment variable
      const serverUrl = 'http://localhost:3001'; 
      
      const response = await fetch(`${serverUrl}/api/devices/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ deviceName, macAddress }),
      });

      if (!response.ok) {
        throw new Error('Failed to register device. Please check server logs.');
      }

      const data: RegistrationResult = await response.json();
      setResult(data);
      setDeviceName('');
      setMacAddress('');

    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  // If registration is successful, show the credentials
  if (result) {
    return (
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md mx-auto">
        <h3 className="text-xl font-bold text-green-400 mb-3">Device Registered Successfully!</h3>
        <p className="text-gray-300 mb-4">
          Use the following credentials to flash your ESP32 device.
        </p>
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-400">Device ID</label>
            <input
              type="text"
              readOnly
              value={result.deviceId}
              className="w-full p-2 mt-1 bg-gray-900 border border-gray-700 rounded-md select-all"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-400">Device Key (Secret)</label>
            <input
              type="text"
              readOnly
              value={result.deviceKey}
              className="w-full p-2 mt-1 bg-gray-900 border border-gray-700 rounded-md select-all"
            />
          </div>
        </div>
        <button
            onClick={() => setResult(null)}
            className="w-full mt-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
            Add Another Device
        </button>
      </div>
    );
  }

  // The registration form
  return (
    <div className="bg-gray-800 p-6 rounded-lg shadow-lg text-white max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4">Register a New Device</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="deviceName" className="block text-sm font-medium text-gray-300">
            Device Name
          </label>
          <input
            id="deviceName"
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g., Living Room Lamp"
            className="w-full p-2 mt-1 bg-gray-900 border border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div>
          <label htmlFor="macAddress" className="block text-sm font-medium text-gray-300">
            MAC Address
          </label>
          <input
            id="macAddress"
            type="text"
            value={macAddress}
            onChange={(e) => setMacAddress(e.target.value)}
            placeholder="e.g., AA:BB:CC:11:22:33"
            className="w-full p-2 mt-1 bg-gray-900 border border-gray-700 rounded-md focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        
        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={isLoading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-500 text-white font-bold py-2 px-4 rounded-md transition-colors"
        >
          {isLoading ? 'Registering...' : 'Register Device'}
        </button>
      </form>
    </div>
  );
};

