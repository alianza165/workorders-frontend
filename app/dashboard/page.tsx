'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderResponse } from '../../types/workorder';
import { format } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { SparklesIcon, FunnelIcon, ChartPieIcon } from '@heroicons/react/24/outline';

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
    typesOfWork: [] as string[],
    equipments: [] as {id: string, name: string}[],
  });

  useEffect(() => {
    console.log('Current work orders:', workOrders);
  }, [workOrders]);

  // Fetch filter options
  const fetchFilterOptions = useCallback(async () => {
    try {
      // Fetch location departments
      const deptResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/departments/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const deptData = await deptResponse.json();
      
      // Fetch types of work
      const typeResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/types-of-work/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const typeData = await typeResponse.json();
      
      // Fetch equipment
      const equipResponse = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/equipments/`, {
        headers: {
          'Authorization': `Token ${token}`,
        },
      });
      const equipData = await equipResponse.json();

      setFilterOptions({
        departments: ['Electrical', 'Mechanical', 'Miscellaneous'],
        locationDepartments: deptData.map((d: Department) => d.department),
        typesOfWork: typeData.map((t: WorkType) => t.type_of_work),
        equipments: equipData.map((e: Equipment) => ({ 
          id: e.id.toString(), 
          name: e.machine 
        })),
      });
    } catch (err) {
      console.error('Failed to fetch filter options:', err);
    }
  }, [token]);

  const fetchWorkOrders = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/workorders/`);
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
        setTotalPages(Math.ceil(data.count / 20));
      } else {
        setWorkOrders([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, filters]);

  useEffect(() => {
    fetchWorkOrders(currentPage);
  }, [fetchWorkOrders, currentPage]);

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
  }, [isAuthenticated, authLoading, router]);

  const handleRowClick = (orderId: number) => {
    fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/workorders/${orderId}/check-access/`, {
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
    setCurrentPage(1);
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
    setCurrentPage(1);
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
        <div></div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen`}>
      <div className={`transition-all duration-300`}>
        <div className="container mx-auto px-4 py-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold">Work Orders</h1>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2 rounded hover:opacity-90 ${
                  theme === 'dark' 
                    ? 'bg-gray-600 text-white' 
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                <FunnelIcon className="w-5 h-5 mr-2" />
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                onClick={() => router.push('/analytics')}
                className={`flex items-center px-4 py-2 rounded hover:opacity-90 ${
                  theme === 'dark' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                }`}
              >
                <ChartPieIcon className="w-5 h-5 mr-2" />
                Analytics
              </button>              
              <button
                onClick={() => router.push('/ai-agent')}
                className={`flex items-center px-4 py-2 rounded hover:opacity-90 ${
                  theme === 'dark' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-blue-500 text-white'
                }`}
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                AI Assistant
              </button>
              {user?.profile?.is_production && (
                <button
                  onClick={handleCreateNew}
                  className={`px-4 py-2 rounded hover:opacity-90 ${
                    theme === 'dark' ? 'bg-green-600 text-white' : 'bg-green-500 text-white'
                  }`}
                >
                  Create New Work Order
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className={`mb-4 p-4 rounded ${
              theme === 'dark' ? 'bg-red-900 text-red-200' : 'bg-red-100 text-red-700'
            }`}>
              {error}
            </div>
          )}

          {/* Expanded Filters Section */}
          {showFilters && (
            <div className={`mb-6 p-4 rounded-lg ${
              theme === 'dark' ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label htmlFor="status-filter" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    Status
                  </label>
                  <select
                    id="status-filter"
                    className={`w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
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
                    <label htmlFor="department-filter" className={`block text-sm font-medium ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    } mb-1`}>
                      Work Order Department
                    </label>
                    <select
                      id="department-filter"
                      className={`w-full border rounded-md shadow-sm p-2 ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                      }`}
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
                  <label htmlFor="location-dept-filter" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    Equipment Location Department
                  </label>
                  <select
                    id="location-dept-filter"
                    className={`w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
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
                  <label htmlFor="type-filter" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    Type of Work
                  </label>
                  <select
                    id="type-filter"
                    className={`w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    value={filters.typeOfWork || ''}
                    onChange={(e) => handleFilterChange('typeOfWork', e.target.value || null)}
                  >
                    <option value="">All Types</option>
                    {filterOptions.typesOfWork.map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                {/* Equipment Filter */}
                <div>
                  <label htmlFor="equipment-filter" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    Equipment
                  </label>
                  <select
                    id="equipment-filter"
                    className={`w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    value={filters.equipment || ''}
                    onChange={(e) => handleFilterChange('equipment', e.target.value || null)}
                  >
                    <option value="">All Equipment</option>
                    {filterOptions.equipments.map(equip => (
                      <option key={equip.id} value={equip.id}>{equip.name}</option>
                    ))}
                  </select>
                </div>

                {/* Date From Filter */}
                <div>
                  <label htmlFor="date-from-filter" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    From Date
                  </label>
                  <input
                    type="date"
                    id="date-from-filter"
                    className={`w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    value={filters.dateFrom || ''}
                    onChange={(e) => handleFilterChange('dateFrom', e.target.value || null)}
                  />
                </div>

                {/* Date To Filter */}
                <div>
                  <label htmlFor="date-to-filter" className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  } mb-1`}>
                    To Date
                  </label>
                  <input
                    type="date"
                    id="date-to-filter"
                    className={`w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                    }`}
                    value={filters.dateTo || ''}
                    onChange={(e) => handleFilterChange('dateTo', e.target.value || null)}
                  />
                </div>
              </div>

              <div className="flex justify-end mt-4 space-x-2">
                <button
                  onClick={resetFilters}
                  className={`px-4 py-2 rounded hover:opacity-90 ${
                    theme === 'dark' ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Reset Filters
                </button>
                <button
                  onClick={() => fetchWorkOrders(1)}
                  className={`px-4 py-2 rounded hover:opacity-90 ${
                    theme === 'dark' ? 'bg-blue-600 text-white' : 'bg-blue-500 text-white'
                  }`}
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className={`min-w-full border ${
              theme === 'dark' ? 'border-gray-700' : 'border-gray-200'
            }`}>
              <thead className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-50'}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>ID</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Equipment</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Problem</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Status</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Initiated By</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Initiation Date</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Department</th>
                  <th className={`px-6 py-3 text-left text-xs font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                  } uppercase tracking-wider`}>Location Dept</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${
                theme === 'dark' ? 'divide-gray-700' : 'divide-gray-200'
              }`}>
                {workOrders.map((order) => (
                  <tr 
                    key={order.id} 
                    className={`${
                      theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'
                    } cursor-pointer`}
                    onClick={() => handleRowClick(order.id)}
                  >
                    <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                      theme === 'dark' ? 'text-white' : 'text-gray-900'
                    }`}>{order.id}</td>
                    <td className={`px-6 py-4 whitespace-nowrap text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    }`}>
                      {order.equipment.machine} ({order.equipment.machine_type.machine_type})
                    </td>
                    <td className={`px-6 py-4 text-sm ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-500'
                    } max-w-xs truncate`}>{order.problem}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                          ${order.closed?.closed === 'Yes' ? 'bg-purple-100 text-purple-800' :
                            order.accepted === false ? 'bg-red-100 text-red-800' :
                            !order.work_status ? 'bg-gray-100 text-gray-800' :
                            order.work_status.work_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                            order.work_status.work_status === 'Completed' ? 'bg-green-100 text-green-800' :
                            order.work_status.work_status === 'In_Process' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'}`}>
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
                ))}
              </tbody>
            </table>
          </div>

          {loading && (
            <div className="flex justify-center mt-4">
              <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
                theme === 'dark' ? 'border-gray-300' : 'border-gray-900'
              }`}></div>
            </div>
          )}

          {workOrders.length === 0 && !loading && (
            <div className={`text-center mt-8 ${
              theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
            }`}>
              No work orders found matching your criteria
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex justify-center mt-4">
              <nav className="inline-flex rounded-md shadow">
                <button
                  onClick={() => fetchWorkOrders(currentPage - 1)}
                  disabled={currentPage === 1}
                  className={`px-3 py-1 rounded-l-md border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } ${currentPage === 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  Previous
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  const page = Math.max(1, Math.min(currentPage - 2, totalPages - 4)) + i;
                  return (
                    <button
                      key={page}
                      onClick={() => fetchWorkOrders(page)}
                      className={`px-3 py-1 border-t border-b ${
                        theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                      } ${currentPage === page ? (theme === 'dark' ? 'bg-gray-600' : 'bg-gray-100') : 'hover:bg-gray-50'}`}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => fetchWorkOrders(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className={`px-3 py-1 rounded-r-md border ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300'
                  } ${currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                >
                  Next
                </button>
              </nav>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}