'use client';

import { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Equipment, Part, Type_of_Work } from '../../types/workorder';

export default function CreateWorkOrder({ 
  equipmentList, 
  partsList, 
  workTypes 
}: { 
  equipmentList: Equipment[],
  partsList: Part[],
  workTypes: Type_of_Work[]
}) {
  const { token } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    problem: '',
    equipment: '',
    part: '',
    type_of_work: '',
    department: 'Electrical'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/api/workorders/', {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create work order');
      }

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold mb-6">Create New Work Order</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="problem" className="block text-sm font-medium text-gray-700">
            Problem Description
          </label>
          <textarea
            id="problem"
            name="problem"
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={formData.problem}
            onChange={handleChange}
            required
          />
        </div>

        <div>
          <label htmlFor="equipment" className="block text-sm font-medium text-gray-700">
            Equipment
          </label>
          <select
            id="equipment"
            name="equipment"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={formData.equipment}
            onChange={handleChange}
            required
          >
            <option value="">Select Equipment</option>
            {equipmentList.map(equip => (
              <option key={equip.id} value={equip.id}>
                {equip.machine} ({equip.machine_type.machine_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="part" className="block text-sm font-medium text-gray-700">
            Part (if applicable)
          </label>
          <select
            id="part"
            name="part"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={formData.part}
            onChange={handleChange}
          >
            <option value="">No specific part</option>
            {partsList.map(part => (
              <option key={part.id} value={part.id}>
                {part.name} ({part.part_type.part_type})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="type_of_work" className="block text-sm font-medium text-gray-700">
            Type of Work
          </label>
          <select
            id="type_of_work"
            name="type_of_work"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={formData.type_of_work}
            onChange={handleChange}
            required
          >
            <option value="">Select Type of Work</option>
            {workTypes.map(workType => (
              <option key={workType.id} value={workType.id}>
                {workType.type_of_work}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="department" className="block text-sm font-medium text-gray-700">
            Assign to Department
          </label>
          <select
            id="department"
            name="department"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={formData.department}
            onChange={handleChange}
            required
          >
            <option value="Electrical">Electrical</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Miscellaneous">Miscellaneous</option>
          </select>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}