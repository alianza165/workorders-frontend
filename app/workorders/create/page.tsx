'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Equipment, Part, Type_of_Work } from '../../types/workorder';

export default function CreateWorkOrder() {
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
  const [equipmentList, setEquipmentList] = useState<Equipment[]>([]);
  const [partsList, setPartsList] = useState<Part[]>([]);
  const [workTypes, setWorkTypes] = useState<Type_of_Work[]>([]);
  const [isFetching, setIsFetching] = useState(true);

  useEffect(() => {
    if (!token) {
      router.push('/signin');
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsFetching(true);
        
        // Fetch all required data in parallel
        const [equipmentRes, partsRes, workTypesRes] = await Promise.all([
          fetch('http://localhost:8000/api/equipment/', {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch('http://localhost:8000/api/parts/', {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch('http://localhost:8000/api/work-types/', {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!equipmentRes.ok) throw new Error('Failed to fetch equipment');
        if (!partsRes.ok) throw new Error('Failed to fetch parts');
        if (!workTypesRes.ok) throw new Error('Failed to fetch work types');

        const [equipmentData, partsData, workTypesData] = await Promise.all([
          equipmentRes.json(),
          partsRes.json(),
          workTypesRes.json()
        ]);

        setEquipmentList(equipmentData.results || equipmentData);
        setPartsList(partsData.results || partsData);
        setWorkTypes(workTypesData.results || workTypesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load initial data');
      } finally {
        setIsFetching(false);
      }
    };

    fetchInitialData();
  }, [token, router]);

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
        body: JSON.stringify({
          ...formData,
          equipment: parseInt(formData.equipment),
          part: formData.part ? parseInt(formData.part) : null,
          type_of_work: parseInt(formData.type_of_work)
        })
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

  if (isFetching) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

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
            Problem Description *
          </label>
          <textarea
            id="problem"
            name="problem"
            rows={4}
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            value={formData.problem}
            onChange={handleChange}
            required
            placeholder="Describe the problem in detail..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="equipment" className="block text-sm font-medium text-gray-700">
              Equipment *
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
                  {equip.machine} ({equip.machine_type.machine_type}) - {equip.location.area}
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
              disabled={!formData.equipment}
            >
              <option value="">No specific part</option>
              {partsList
                .filter(part => !formData.equipment || part.equipment.id === parseInt(formData.equipment))
                .map(part => (
                  <option key={part.id} value={part.id}>
                    {part.name} ({part.part_type.part_type})
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="type_of_work" className="block text-sm font-medium text-gray-700">
              Type of Work *
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
              Assign to Department *
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
        </div>

        <div className="flex justify-end space-x-4 pt-4">
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