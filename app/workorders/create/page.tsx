'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'next/navigation';
import { Equipment, Part, TypeOfWork } from '../../../types/workorder';
import { useAppContext } from '../../context/AppContext';

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
  const [partsList, setPartsList] = useState<Part[]>([]);
  const [workTypes, setWorkTypes] = useState<TypeOfWork[]>([]);
  const [isFetching, setIsFetching] = useState(true);
  const [equipmentSearch, setEquipmentSearch] = useState('');
  const [allEquipment, setAllEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [showEquipmentDropdown, setShowEquipmentDropdown] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const { theme } = useAppContext();

  const fetchAllEquipment = async (search = '') => {
    try {
      let url = 'https://www.technologyhax.com/backend/api/equipment/';
      if (search) {
        url += `?search=${encodeURIComponent(search)}`;
      }
      
      const response = await fetch(url, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch equipment');
      
      const data = await response.json();
      return data.results || data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load equipment');
      return [];
    }
  };

  useEffect(() => {
    if (!token) {
      router.push('/signin');
      return;
    }

    const fetchInitialData = async () => {
      try {
        setIsFetching(true);
        
        // First fetch all equipment without search
        const equipmentData = await fetchAllEquipment();
        setAllEquipment(equipmentData);
        setFilteredEquipment(equipmentData);

        // Then fetch other data in parallel
        const [partsRes, workTypesRes] = await Promise.all([
          fetch('https://www.technologyhax.com/backend/api/parts/', {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch('https://www.technologyhax.com/backend/api/work-types/', {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!partsRes.ok) throw new Error('Failed to fetch parts');
        if (!workTypesRes.ok) throw new Error('Failed to fetch work types');

        const [partsData, workTypesData] = await Promise.all([
          partsRes.json(),
          workTypesRes.json()
        ]);

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

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (equipmentSearch.trim() === '') {
        setFilteredEquipment(allEquipment);
      } else {
        const filtered = allEquipment.filter(equip => 
          equip.machine.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
          (equip.machine_type?.machine_type?.toLowerCase().includes(equipmentSearch.toLowerCase())) ||
          (equip.location?.area?.toLowerCase().includes(equipmentSearch.toLowerCase()))
        );
        setFilteredEquipment(filtered);
      }
      setShowEquipmentDropdown(true);
    }, 300);

    return () => clearTimeout(timer);
  }, [equipmentSearch, allEquipment]);

  const handleEquipmentSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const searchTerm = e.target.value;
    setEquipmentSearch(searchTerm);
    
    // Clear selection if search term doesn't match the selected equipment
    if (selectedEquipment && !searchTerm.startsWith(selectedEquipment.machine)) {
      setSelectedEquipment(null);
      setFormData(prev => ({ ...prev, equipment: '' }));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // If backspace is pressed and there's a selected equipment
    if (e.key === 'Backspace' && selectedEquipment) {
      setSelectedEquipment(null);
      setFormData(prev => ({ ...prev, equipment: '' }));
      setEquipmentSearch('');
    }
  };

  const handleEquipmentSelect = (equip: Equipment) => {
    setSelectedEquipment(equip);
    setEquipmentSearch(`${equip.machine} (${equip.machine_type?.machine_type}) - ${equip.location?.area}`);
    setFormData(prev => ({ ...prev, equipment: equip.id.toString() }));
    setShowEquipmentDropdown(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('https://www.technologyhax.com/backend/api/workorders/', {
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
      <h1 className={`text-2xl font-bold mb-6 ${
        theme === 'dark' ? 'text-white' : 'text-gray-900'
      }`}>Create New Work Order</h1>
      
      {error && (
        <div className={`px-4 py-3 rounded mb-4 ${
          theme === 'dark' ? 'bg-red-900 border-red-700 text-red-200' : 'bg-red-100 border-red-400 text-red-700'
        }`}>
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="problem" className={`block text-sm font-medium ${
            theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
          }`}>
            Problem Description *
          </label>
          <textarea
            id="problem"
            name="problem"
            rows={4}
            className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
              theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
            }`}
            value={formData.problem}
            onChange={handleChange}
            required
            placeholder="Describe the problem in detail..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <label htmlFor="equipment-search" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Equipment *
            </label>
            <input
              id="equipment-search"
              type="text"
              placeholder="Search for equipment..."
              className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
              }`}
              value={selectedEquipment ? selectedEquipment.machine : equipmentSearch}
              onChange={handleEquipmentSearch}
              onKeyDown={handleKeyDown}
              onFocus={() => setShowEquipmentDropdown(true)}
              onBlur={() => setTimeout(() => setShowEquipmentDropdown(false), 200)}
              required
            />
            
            {/* Selected equipment details */}
            {selectedEquipment && (
              <div className={`mt-1 text-sm ${
                theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
              }`}>
                Type: {selectedEquipment.machine_type?.machine_type} | 
                Location: {selectedEquipment.location?.area}
              </div>
            )}

            {/* Equipment dropdown */}
            {showEquipmentDropdown && !selectedEquipment && (
              <>
                {filteredEquipment.length > 0 ? (
                  <ul className={`absolute z-10 mt-1 w-full border rounded-md shadow-lg max-h-60 overflow-auto ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-300'
                  }`}>
                    {filteredEquipment.map(equip => (
                      <li 
                        key={equip.id}
                        className={`px-4 py-2 cursor-pointer ${
                          theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-blue-50'
                        }`}
                        onClick={() => handleEquipmentSelect(equip)}
                      >
                        <div className={`font-medium ${
                          theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
                        }`}>{equip.machine}</div>
                        <div className={`text-sm ${
                          theme === 'dark' ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                          {equip.machine_type?.machine_type} - {equip.location?.area}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : equipmentSearch && (
                  <div className={`absolute z-10 mt-1 w-full border rounded-md shadow-lg p-4 text-sm ${
                    theme === 'dark' ? 'bg-gray-800 border-gray-700 text-gray-400' : 'bg-white border-gray-300 text-gray-500'
                  }`}>
                    No equipment found matching `{equipmentSearch}`
                  </div>
                )}
              </>
            )}
            
            <input
              type="hidden"
              name="equipment"
              value={formData.equipment}
            />
          </div>

          <div>
            <label htmlFor="part" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Part (if applicable)
            </label>
            <select
              id="part"
              name="part"
              className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
              }`}
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
            <label htmlFor="type_of_work" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Type of Work *
            </label>
            <select
              id="type_of_work"
              name="type_of_work"
              className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
              }`}
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
            <label htmlFor="department" className={`block text-sm font-medium ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Assign to Department *
            </label>
            <select
              id="department"
              name="department"
              className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                theme === 'dark' ? 'bg-gray-700 border-gray-600 text-gray-200' : 'bg-white border-gray-300 text-gray-900'
              }`}
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
            className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
              theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-4 py-2 border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
              theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
            } disabled:opacity-50`}
          >
            {loading ? 'Creating...' : 'Create Work Order'}
          </button>
        </div>
      </form>
    </div>
  );
}