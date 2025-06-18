'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderResponse } from '../../types/workorder';
import { format } from 'date-fns';
import { useAppContext } from '../context/AppContext';
import { SparklesIcon } from '@heroicons/react/24/outline';

export default function Dashboard() {
  const { token, user, isAuthenticated, authLoading } = useAuth();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);
  const { theme } = useAppContext();
  const [pageLoading, setPageLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);


  useEffect(() => {
    console.log('Current work orders:', workOrders);
  }, [workOrders]);

  const fetchWorkOrders = useCallback(async (page: number = 1) => {
    try {
      setLoading(true);
      setError(null);
      
      const apiUrl = new URL(`${process.env.NEXT_PUBLIC_API_BASE_URL}/api/workorders/`);
      apiUrl.searchParams.append('page', page.toString());
      
      if (statusFilter) {
        if (statusFilter === 'Rejected') {
          apiUrl.searchParams.append('accepted', 'false');
        } else if (statusFilter === 'Closed') {
          apiUrl.searchParams.append('closed__closed', 'Yes');
        } else {
          apiUrl.searchParams.append('work_status__work_status', statusFilter);
        }
      }
      
      if (departmentFilter) {
        apiUrl.searchParams.append('department', departmentFilter);
      }

      const response = await fetch(apiUrl.toString(), {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error('Failed to fetch work orders');
      
      const data: WorkOrderResponse = await response.json();
      
      // Make sure results is an array before setting state
      if (Array.isArray(data.results)) {
        setWorkOrders(data.results);
        setCurrentPage(page);
        setTotalPages(Math.ceil(data.count / 20)); // Assuming 20 items per page
      } else {
        setWorkOrders([]); // Fallback if results isn't an array
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWorkOrders([]); // Clear on error
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, departmentFilter]);

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

  const handleStatusFilterChange = (status: string | null) => {
    setStatusFilter(status);
    setCurrentPage(1); // Reset to first page when filter changes
  };

  const handleDepartmentFilterChange = (department: string | null) => {
    setDepartmentFilter(department);
    setCurrentPage(1); // Reset to first page when filter changes
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

          {/* Filters */}
          <div className="mb-6 flex flex-wrap gap-4">
            <div>
              <label htmlFor="status-filter" className={`block text-sm font-medium ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              } mb-1`}>
                Filter by Status
              </label>
              <select
                id="status-filter"
                className={`border rounded-md shadow-sm p-2 ${
                  theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                }`}
                value={statusFilter || ''}
                onChange={(e) => handleStatusFilterChange(e.target.value || null)}
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="In_Process">In Process</option>
                <option value="Completed">Completed</option>
                <option value="Rejected">Rejected</option>
                <option value="Closed">Closed</option>
              </select>
            </div>

            {user?.profile?.is_utilities && (
              <div>
                <label htmlFor="department-filter" className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                } mb-1`}>
                  Filter by Department
                </label>
                <select
                  id="department-filter"
                  className={`border rounded-md shadow-sm p-2 ${
                    theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  }`}
                  value={departmentFilter || ''}
                  onChange={(e) => handleDepartmentFilterChange(e.target.value || null)}
                >
                  <option value="">All Departments</option>
                  <option value="Electrical">Electrical</option>
                  <option value="Mechanical">Mechanical</option>
                  <option value="Miscellaneous">Miscellaneous</option>
                </select>
              </div>
            )}
          </div>

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