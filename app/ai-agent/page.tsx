'use client';

import { useState, useEffect } from 'react';
import Head from 'next/head';
import { DropdownService, AIAgentService } from '../../utils/api';

interface SourceDocument {
  work_order_id: number;
  equipment: string;
  problem: string;
}


interface AIResponse {
  answer: string;
  statistics: {
    exact_count: number;
    analyzed_samples: number;
  };
  sources: SourceDocument[];
}

interface Location {
  id: number;
  department: {
    id: number;
    department: string;
  };
  area?: string; // Optional if area might not always exist
}

interface EquipmentOption {
  id: number;
  machine: string;
  location: Location;
  // Add any other properties that might exist on equipment options
}

interface Filters {
  equipment?: string;
  department?: string;
  workStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  typeOfWork?: string;
  assignedTo?: string;
}

interface DropdownOption {
  id: number;
  name?: string;
  machine?: string;
  department?: string;
  type_of_work?: string;
  work_status?: string;
  location?: {
    department: {
      id: number;
      department: string;
    };
  };
}

interface DropdownOptions {
  equipmentOptions: DropdownOption[];
  departmentOptions: DropdownOption[];
  workTypeOptions: DropdownOption[];
  workStatusOptions: DropdownOption[];
  assignedToOptions: DropdownOption[];
}

export default function AIAssistant() {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<Filters>({
    equipment: '',
    department: '',
    workStatus: '',
    dateFrom: '',
    dateTo: '',
    typeOfWork: '',
    assignedTo: ''
  });

  const [dropdownOptions, setDropdownOptions] = useState<DropdownOptions>({
    equipmentOptions: [],
    departmentOptions: [],
    workTypeOptions: [],
    workStatusOptions: [],
    assignedToOptions: []
  });

  const [filteredEquipment, setFilteredEquipment] = useState<DropdownOption[]>([]);


// Updated useEffect with integrated approach
useEffect(() => {
  const loadOptions = async () => {
    setLoadingOptions(true);
    try {
      const options = await DropdownService.getAllDropdownOptions();
      
      // Transform equipment data to include location information
      const transformedEquipment = options.equipmentOptions.map((eq: EquipmentOption) => ({
        id: eq.id,
        machine: eq.machine,
        location: eq.location
      }));
      
    setDropdownOptions({
      ...dropdownOptions, // Spread existing options
      equipmentOptions: transformedEquipment // Update just the equipment options
    });
      
      // Initialize with all equipment
      setFilteredEquipment(transformedEquipment);
    } finally {
      setLoadingOptions(false);
    }
  };

  loadOptions();
}, []);

  // Add this effect to filter equipment when department changes
  useEffect(() => {
    if (filters.department) {
      const filtered = dropdownOptions.equipmentOptions.filter(
        eq => eq.location?.department.id.toString() === filters.department
      );
      setFilteredEquipment(filtered);
      
      // Clear equipment filter if it's no longer valid
      if (filters.equipment && !filtered.some(eq => eq.id.toString() === filters.equipment)) {
        setFilters(prev => ({ ...prev, equipment: '' }));
      }
    } else {
      setFilteredEquipment(dropdownOptions.equipmentOptions);
    }
  }, [filters.department, dropdownOptions.equipmentOptions]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    
    try {
      const activeFilters = Object.fromEntries(
        Object.entries(filters).filter(([, value]) => value !== '')
      );
      
      // Check if either prompt or at least one filter is provided
      if (!prompt && Object.keys(activeFilters).length === 0) {
        setError('Please provide either a prompt or at least one filter');
        return;
      }
      
      console.log("Sending filters:", activeFilters);
      
      const res = await AIAgentService.query(
        prompt || "", // Send empty string if no prompt
        activeFilters
      );
      setResponse(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (field: keyof Filters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const resetFilters = () => {
    setFilters({
      equipment: '',
      department: '',
      workStatus: '',
      dateFrom: '',
      dateTo: '',
      typeOfWork: '',
      assignedTo: ''
    });
  };

  const formatAnswer = (answer: string) => {
    return answer.split('\n').filter(para => para.trim()).map((paragraph, i) => (
      <p key={i} className="mb-4 last:mb-0">{paragraph}</p>
    ));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>AI Work Order Assistant</title>
        <meta name="description" content="AI-powered work order analysis" />
      </Head>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Work Order AI Assistant</h1>
            <p className="text-gray-600">
              Ask questions about work orders with advanced filtering
            </p>
          </div>

          {/* Main Form */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-8 relative">
            {loadingOptions && (
              <div className="absolute inset-0 bg-white bg-opacity-70 flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {/* Prompt Input */}
              <div className="mb-6">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-700 mb-2">
                  Enter your question
                </label>
                <textarea
                  id="prompt"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={isLoading || loadingOptions}
                  placeholder="E.g. What are the most common issues with CAL-MM-02?"
                />
              </div>

              {/* Filters Section */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-800">Filters</h3>
                  <button
                    type="button"
                    onClick={() => setShowFilters(!showFilters)}
                    className="text-sm text-blue-600 hover:text-blue-800"
                    disabled={loadingOptions}
                  >
                    {showFilters ? 'Hide Filters' : 'Show Filters'}
                  </button>
                </div>

                {showFilters && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Equipment</label>
    <select
      className="w-full px-3 py-2 border border-gray-300 rounded-md"
      value={filters.equipment}
      onChange={(e) => handleFilterChange('equipment', e.target.value)}
      disabled={!!(loadingOptions || (filters.department && filteredEquipment.length === 0))}
    >
    <option value="">All Equipment</option>
    {filteredEquipment.map((eq) => (
      <option key={eq.id} value={eq.id}>
        {eq.machine} {eq.location?.department && `(${eq.location.department.department})`}
      </option>
    ))}
    {filters.department && filteredEquipment.length === 0 && (
      <option value="" disabled>No equipment found for this department</option>
    )}
  </select>
</div>

                      {/* Work Status Dropdown */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Work Status</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={filters.workStatus}
                          onChange={(e) => handleFilterChange('workStatus', e.target.value)}
                          disabled={loadingOptions}
                        >
                          <option value="">All Statuses</option>
                          {dropdownOptions.workStatusOptions.map((status) => (
                            <option key={status.id} value={status.id}>
                              {status.work_status}
                            </option>
                          ))}
                        </select>
                      </div>

<div>
  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
  <select
    className="w-full px-3 py-2 border border-gray-300 rounded-md"
    value={filters.department}
    onChange={(e) => handleFilterChange('department', e.target.value)}
    disabled={loadingOptions}
  >
    <option value="">All Departments</option>
    {dropdownOptions.departmentOptions.map((dept) => (
      <option key={dept.id} value={dept.id}>
        {dept.department}
      </option>
    ))}
  </select>
</div>                 
                      {/* Date Range */}
                      <div className="col-span-1 md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Date Range</label>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="sr-only">From</label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              value={filters.dateFrom}
                              onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
                              disabled={loadingOptions}
                            />
                          </div>
                          <div>
                            <label className="sr-only">To</label>
                            <input
                              type="date"
                              className="w-full px-3 py-2 border border-gray-300 rounded-md"
                              value={filters.dateTo}
                              onChange={(e) => handleFilterChange('dateTo', e.target.value)}
                              min={filters.dateFrom}
                              disabled={loadingOptions || !filters.dateFrom}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Type of Work */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Type of Work</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={filters.typeOfWork}
                          onChange={(e) => handleFilterChange('typeOfWork', e.target.value)}
                          disabled={loadingOptions}
                        >
                          <option value="">All Types</option>
                          {dropdownOptions.workTypeOptions.map((type) => (
                            <option key={type.id} value={type.type_of_work || type.id}>
                              {type.type_of_work || type.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Assigned To */}
{/*                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                        <select
                          className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          value={filters.assignedTo}
                          onChange={(e) => handleFilterChange('assignedTo', e.target.value)}
                          disabled={loadingOptions}
                        >
                          <option value="">All Assignees</option>
                          {dropdownOptions.assignedToOptions.map((person) => (
                            <option key={person.assigned_to || person.id} value={person.assigned_to || person.id}>
                              {person.assigned_to || person.name}
                            </option>
                          ))}
                        </select>
                      </div>*/}
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="px-3 py-1.5 text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                        disabled={loadingOptions}
                      >
                        Reset Filters
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`px-6 py-2 rounded-md text-white ${isLoading || loadingOptions ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
                  disabled={isLoading || loadingOptions}
                >
                  {isLoading ? (
                    <span className="flex items-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </span>
                  ) : 'Ask AI'}
                </button>
              </div>
            </form>
          </div>

          {/* Results Section */}
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}

          {response && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              {/* Statistics Summary */}
              <div className="p-4 bg-gray-50 border-b border-gray-200">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Exact matches: {response.statistics.exact_count}</span>
                  <span>Analyzed samples: {response.statistics.analyzed_samples}</span>
                </div>
              </div>

              {/* AI Response */}
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">AI Analysis</h2>
                <div className="prose prose-blue max-w-none">
                  {formatAnswer(response.answer)}
                </div>
              </div>

              {/* Source Work Orders */}
              <div className="p-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Relevant Work Orders ({response.sources.length})</h2>
                {response.sources.length > 0 ? (
                  <div className="space-y-4">
                    {response.sources.map((source) => (
                      <div key={source.work_order_id} className="border-l-4 border-blue-500 pl-4 py-2 hover:bg-gray-50 transition-colors">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <h3 className="text-md font-medium text-gray-800">
                            WO#{source.work_order_id}
                          </h3>
                          <span className="text-sm text-gray-500">
                            Equipment: {source.equipment || 'Not specified'}
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-600">
                          {source.problem || 'No problem description available'}
                        </p>
                        <a 
                          href={`/workorders/${source.work_order_id}`} 
                          className="inline-flex items-center mt-2 text-sm text-blue-600 hover:text-blue-800"
                        >
                          View details
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No relevant work orders found</p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}