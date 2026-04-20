'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderResponse } from '../../types/workorder';
import { format } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { FunnelIcon, ChartPieIcon, MagnifyingGlassIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { token, user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { theme } = useAppContext();
  const [pageLoading, setPageLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter states
  const [filters, setFilters] = useState({
    status: null as string | null,
    department: null as string | null,
    locationDepartment: null as string | null,
    typeOfWork: null as string | null,
    equipment: null as string | null,
    dateFrom: null as string | null,
    dateTo: null as string | null,
  });

  interface Department {
    id: number;
    department: string;
  }

  interface WorkType {
    id: number;
    type_of_work: string;
  }

  interface Equipment {
    id: number;
    machine: string;
    location?: {
      department: Department;
      area?: string;
    };
  }

  // Options for filters
  const [filterOptions, setFilterOptions] = useState({
    departments: ['Electrical', 'Mechanical', 'Miscellaneous'],
    locationDepartments: [] as string[],
    typesOfWork: [] as WorkType[],
    equipments: [] as Equipment[],
  });

  // Count active filters
  const activeFilterCount = useMemo(() => {
    return Object.values(filters).filter(v => v !== null && v !== '').length;
  }, [filters]);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      // Fetch location departments
      const deptResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/departments/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const deptData = await deptResponse.json();
      
      // Fetch types of work
      const typeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/work-types/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const typeData = await typeResponse.json();
      
      // Fetch equipment
      const equipResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/equipment/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const equipData = await equipResponse.json();

      setFilterOptions({
        departments: ['Electrical', 'Mechanical', 'Miscellaneous'],
        locationDepartments: (deptData.results || deptData).map((d: Department) => d.department),
        typesOfWork: (typeData.results || typeData),
        equipments: (equipData.results || equipData),
      });
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }, [token]);

  const fetchWorkOrders = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/workorders/`);
      apiUrl.searchParams.append('page', page.toString());
      
      // Apply filters
      if (filters.status) {
        if (filters.status === 'Rejected') {
          apiUrl.searchParams.append('accepted', 'false');
        } else if (filters.status === 'Closed') {
          apiUrl.searchParams.append('closed__closed', 'Yes');
        } else {
          apiUrl.searchParams.append('work_status__work_status', filters.status);
        }
      }
      
      if (filters.department) {
        apiUrl.searchParams.append('department', filters.department);
      }

      if (filters.locationDepartment) {
        apiUrl.searchParams.append('equipment__location__department__department', filters.locationDepartment);
      }

      if (filters.typeOfWork) {
        apiUrl.searchParams.append('type_of_work__type_of_work', filters.typeOfWork);
      }

      if (filters.equipment) {
        apiUrl.searchParams.append('equipment__id', filters.equipment);
      }

      if (filters.dateFrom) {
        apiUrl.searchParams.append('initiation_date__gte', filters.dateFrom);
      }

      if (filters.dateTo) {
        apiUrl.searchParams.append('initiation_date__lte', filters.dateTo);
      }

      // Add search query if provided
      if (searchQuery.trim()) {
        apiUrl.searchParams.append('search', searchQuery.trim());
      }

      const response = await fetch(apiUrl.toString(), {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch work orders');
      
      const data: WorkOrderResponse = await response.json();
      
      if (Array.isArray(data.results)) {
        setWorkOrders(data.results);
        setCurrentPage(page);
        setTotalPages(Math.ceil((data.count || 0) / 20));
      } else {
        setWorkOrders([]);
        setTotalPages(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters, searchQuery]);

  // Auto-refetch when filters or search change
  useEffect(() => {
    setCurrentPage(1);
    fetchWorkOrders(1);
  }, [filters, searchQuery, fetchWorkOrders]);

  // Fetch on page change
  useEffect(() => {
    fetchWorkOrders(currentPage);
  }, [currentPage, fetchWorkOrders]);

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.push('/signin');
      } else {
        setPageLoading(false);
        fetchWorkOrders();
        fetchFilterOptions();
      }
    }
  }, [isAuthenticated, authLoading, router, fetchWorkOrders, fetchFilterOptions]);

  const handleRowClick = (orderId: number) => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8001'}/backend/api/workorders/${orderId}/check-access/`, {
      headers: {
        'Authorization': `Token ${token}`,
        'Content-Type': 'application/json',
      },
    })
    .then(res => {
      if (res.ok) {
        router.push(`/workorders/${orderId}`);
      } else {
        alert('You do not have permission to view this work order');
      }
    })
    .catch(() => {
      alert('Error checking work order access');
    });
  };

  const handleCreateNew = () => {
    router.push('/workorders/create');
  };

  const handleFilterChange = (filterName: keyof typeof filters, value: string | null) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const resetFilters = () => {
    setFilters({
      status: null,
      department: null,
      locationDepartment: null,
      typeOfWork: null,
      equipment: null,
      dateFrom: null,
      dateTo: null,
    });
    setSearchQuery('');
  };

  const removeFilter = (filterName: keyof typeof filters) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: null
    }));
  };

  const getFilterLabel = (key: keyof typeof filters): string => {
    const labels: Record<string, string> = {
      status: 'Status',
      department: 'Department',
      locationDepartment: 'Location Dept',
      typeOfWork: 'Type of Work',
      equipment: 'Equipment',
      dateFrom: 'From Date',
      dateTo: 'To Date',
    };
    return labels[key] || key;
  };

  const getFilterValue = (key: keyof typeof filters): string => {
    const value = filters[key];
    if (!value) return '';
    
    if (key === 'equipment') {
      const eq = filterOptions.equipments.find(e => e.id.toString() === value);
      return eq ? eq.machine : value;
    }
    
    return value;
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  if (authLoading || pageLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600"></div>
      </div>
    );
  }

  const themeClass = theme === 'dark' ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900';
  const cardClass = theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const inputClass = theme === 'dark' 
    ? 'bg-gray-700 text-white border-gray-600 focus:border-teal-500' 
    : 'bg-white text-gray-900 border-gray-300 focus:border-teal-500';

  return (
    <div className={`min-h-screen ${themeClass} transition-colors duration-200`}>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
          <div>
            <h1 className="text-3xl font-bold text-teal-600 mb-2">Work Orders</h1>
            <p className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              Manage and track all work orders
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                theme === 'dark' 
                  ? 'bg-gray-700 text-white hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              } ${showFilters ? 'ring-2 ring-teal-500' : ''}`}
            >
              <FunnelIcon className="w-5 h-5 mr-2" />
              Filters
              {activeFilterCount > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-teal-500 text-white">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <button
              onClick={() => router.push('/analytics')}
              className={`flex items-center px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                theme === 'dark' 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-blue-500 text-white hover:bg-blue-600'
              }`}
            >
              <ChartPieIcon className="w-5 h-5 mr-2" />
              Analytics
            </button>
            {user?.profile?.is_production && (
              <button
                onClick={handleCreateNew}
                className={`px-4 py-2 rounded-lg transition-all duration-200 hover:scale-105 ${
                  theme === 'dark' ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-green-500 text-white hover:bg-green-600'
                }`}
              >
                + Create New
              </button>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className={`mb-6 ${cardClass} rounded-xl shadow-lg p-4 transition-all duration-200`}>
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search work orders by problem, equipment, or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-3 rounded-lg border ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Active Filters Badges */}
        {activeFilterCount > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {Object.entries(filters).map(([key, value]) => {
              if (!value) return null;
              return (
                <span
                  key={key}
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                    theme === 'dark' ? 'bg-teal-700 text-white' : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  <span className="font-medium">{getFilterLabel(key as keyof typeof filters)}:</span>
                  <span className="ml-1">{getFilterValue(key as keyof typeof filters)}</span>
                  <button
                    onClick={() => removeFilter(key as keyof typeof filters)}
                    className="ml-2 hover:text-red-400"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </span>
              );
            })}
            {searchQuery && (
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm ${
                  theme === 'dark' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800'
                }`}
              >
                <span className="font-medium">Search:</span>
                <span className="ml-1">{searchQuery}</span>
                <button
                  onClick={() => setSearchQuery('')}
                  className="ml-2 hover:text-red-400"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </span>
            )}
            <button
              onClick={resetFilters}
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm transition-all duration-200 hover:scale-105 ${
                theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              Clear All
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className={`mb-6 p-4 rounded-lg shadow-lg ${
            theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
          }`}>
            {error}
          </div>
        )}

        {/* Expanded Filters Section */}
        {showFilters && (
          <div className={`mb-6 ${cardClass} rounded-xl shadow-lg p-6 transition-all duration-300 animate-in fade-in`}>
            <h3 className={`text-lg font-semibold mb-4 ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
              Filter Options
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label htmlFor="status-filter" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Status
                </label>
                <select
                  id="status-filter"
                  className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                  value={filters.status || ''}
                  onChange={(e) => handleFilterChange('status', e.target.value || null)}
                >
                  <option value="">All Statuses</option>
                  <option value="Pending">Pending</option>
                  <option value="In_Process">In Process</option>
                  <option value="Completed">Completed</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>

              {/* Department Filter */}
              {user?.profile?.is_utilities && (
                <div>
                  <label htmlFor="department-filter" className={`block text-sm font-medium mb-2 ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    Work Order Department
                  </label>
                  <select
                    id="department-filter"
                    className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                    value={filters.department || ''}
                    onChange={(e) => handleFilterChange('department', e.target.value || null)}
                  >
                    <option value="">All Departments</option>
                    {filterOptions.departments.map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Location Department Filter */}
              <div>
                <label htmlFor="location-dept-filter" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Location Department
                </label>
                <select
                  id="location-dept-filter"
                  className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                  value={filters.locationDepartment || ''}
                  onChange={(e) => handleFilterChange('locationDepartment', e.target.value || null)}
                >
                  <option value="">All Location Departments</option>
                  {filterOptions.locationDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              {/* Type of Work Filter */}
              <div>
                <label htmlFor="type-filter" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Type of Work
                </label>
                <select
                  id="type-filter"
                  className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                  value={filters.typeOfWork || ''}
                  onChange={(e) => handleFilterChange('typeOfWork', e.target.value || null)}
                >
                  <option value="">All Types</option>
                  {filterOptions.typesOfWork.map((type: WorkType) => (
                    <option key={type.id} value={type.type_of_work}>{type.type_of_work}</option>
                  ))}
                </select>
              </div>

              {/* Equipment Filter */}
              <div>
                <label htmlFor="equipment-filter" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Equipment
                </label>
                <select
                  id="equipment-filter"
                  className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                  value={filters.equipment || ''}
                  onChange={(e) => handleFilterChange('equipment', e.target.value || null)}
                >
                  <option value="">All Equipment</option>
                  {filterOptions.equipments.map((equip: Equipment) => (
                    <option key={equip.id} value={equip.id.toString()}>{equip.machine}</option>
                  ))}
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label htmlFor="date-from-filter" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  From Date
                </label>
                <input
                  type="date"
                  id="date-from-filter"
                  className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                  value={filters.dateFrom || ''}
                  onChange={(e) => handleFilterChange('dateFrom', e.target.value || null)}
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label htmlFor="date-to-filter" className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  To Date
                </label>
                <input
                  type="date"
                  id="date-to-filter"
                  className={`w-full border rounded-lg shadow-sm p-2.5 ${inputClass} focus:ring-2 focus:ring-teal-500 focus:outline-none transition-all duration-200`}
                  value={filters.dateTo || ''}
                  onChange={(e) => handleFilterChange('dateTo', e.target.value || null)}
                />
              </div>
            </div>

            <div className="flex justify-end mt-6 space-x-3">
              <button
                onClick={resetFilters}
                className={`px-5 py-2.5 rounded-lg transition-all duration-200 hover:scale-105 ${
                  theme === 'dark' ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Reset All
              </button>
            </div>
          </div>
        )}

        {/* Work Orders Table */}
        <div className={`${cardClass} rounded-xl shadow-lg overflow-hidden transition-all duration-200`}>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>ID</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Equipment</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Problem</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Status</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Initiated By</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Date</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Department</th>
                  <th className={`px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  }`}>Location</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center">
                      <div className="flex justify-center items-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-600"></div>
                      </div>
                    </td>
                  </tr>
                ) : workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={8} className={`px-6 py-12 text-center ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                    }`}>
                      No work orders found matching your criteria
                    </td>
                  </tr>
                ) : (
                  workOrders.map((order, index) => (
                    <tr 
                      key={order.id} 
                      className={`transition-all duration-150 ${
                        theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                      } cursor-pointer`}
                      onClick={() => handleRowClick(order.id)}
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                        theme === 'dark' ? 'text-white' : 'text-gray-900'
                      }`}>
                        <span className="text-teal-600 font-semibold">#{order.id}</span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        <div className="font-medium">{order.equipment.machine}</div>
                        <div className="text-xs opacity-75">{order.equipment.machine_type.machine_type}</div>
                      </td>
                      <td className={`px-6 py-4 text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      } max-w-xs`}>
                        <div className="truncate" title={order.problem}>
                          {order.problem}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full transition-all duration-200 ${
                          order.closed?.closed === 'Yes' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' :
                          order.accepted === false ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          !order.work_status ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200' :
                          order.work_status.work_status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' : 
                          order.work_status.work_status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          order.work_status.work_status === 'In_Process' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                        }`}>
                          {order.closed?.closed === 'Yes' ? 'Closed' : 
                           order.accepted === false ? 'Rejected' :
                           order.work_status?.work_status || 'Not Specified'}
                        </span>
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {order.initiated_by.username}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {formatDate(order.initiation_date)}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {order.department}
                      </td>
                      <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                        theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                      }`}>
                        {order.equipment.location?.department?.department || 'N/A'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center mt-6 gap-2">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'
              } ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-600 hover:text-white hover:scale-105'}`}
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let page: number;
                if (totalPages <= 5) {
                  page = i + 1;
                } else if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                      currentPage === page
                        ? 'bg-teal-600 text-white scale-110'
                        : theme === 'dark'
                        ? 'bg-gray-700 text-white hover:bg-gray-600'
                        : 'bg-white text-gray-700 hover:bg-gray-100'
                    } hover:scale-105`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`px-4 py-2 rounded-lg transition-all duration-200 ${
                theme === 'dark' ? 'bg-gray-700 text-white' : 'bg-white text-gray-700'
              } ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-teal-600 hover:text-white hover:scale-105'}`}
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
