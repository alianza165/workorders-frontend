'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderResponse } from '../../types/workorder';
import { format } from 'date-fns';

export default function Dashboard() {
  const { token, user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [nextPage, setNextPage] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string | null>(null);

  const fetchWorkOrders = useCallback(async (url: string = 'http://localhost:8000/api/workorders/') => {
    try {
      setLoading(true);
      setError(null);
      
      // Add filters to URL if they exist
      let apiUrl = new URL(url);
      if (statusFilter) {
        apiUrl.searchParams.append('work_status__work_status', statusFilter);
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

      if (!response.ok) {
        throw new Error('Failed to fetch work orders');
      }

      const data: WorkOrderResponse = await response.json();
      
      // If filtering or first page, replace the work orders
      if (statusFilter || departmentFilter || url === 'http://localhost:8000/api/workorders/') {
        setWorkOrders(data.results);
      } else {
        setWorkOrders(prev => [...prev, ...data.results]);
      }
      
      setNextPage(data.next);
      setHasMore(!!data.next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
      setWorkOrders([]);
    } finally {
      setLoading(false);
    }
  }, [token, statusFilter, departmentFilter]);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }
    fetchWorkOrders();
  }, [fetchWorkOrders]);

  const loadMore = () => {
    if (nextPage) {
      fetchWorkOrders(nextPage);
    }
  };

  // Add this to your Dashboard component where the row click is handled
  const handleRowClick = (orderId: number) => {
    // Prefetch the data before navigation for better UX
    fetch(`http://localhost:8000/api/workorders/${orderId}/check-access/`, {
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
  };

  const handleDepartmentFilterChange = (department: string | null) => {
    setDepartmentFilter(department);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'PPpp');
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Work Orders</h1>
        {user?.profile?.is_production && (
          <button
            onClick={handleCreateNew}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Create New Work Order
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-1">
            Filter by Status
          </label>
          <select
            id="status-filter"
            className="border border-gray-300 rounded-md shadow-sm p-2"
            value={statusFilter || ''}
            onChange={(e) => handleStatusFilterChange(e.target.value || null)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In_Process">In Process</option>
            <option value="Completed">Completed</option>
            <option value="Rejected">Rejected</option>
          </select>
        </div>

        {user?.profile?.is_utilities && (
          <div>
            <label htmlFor="department-filter" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Department
            </label>
            <select
              id="department-filter"
              className="border border-gray-300 rounded-md shadow-sm p-2"
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
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Equipment</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Problem</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initiated By</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Initiation Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {workOrders.map((order) => (
              <tr 
                key={order.id} 
                className="hover:bg-gray-50 cursor-pointer"
                onClick={() => handleRowClick(order.id)}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.equipment.machine} ({order.equipment.machine_type.machine_type})
                </td>
                <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{order.problem}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                    ${!order.work_status ? 'bg-gray-100 text-gray-800' :
                      order.work_status.work_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                      order.work_status.work_status === 'Completed' ? 'bg-green-100 text-green-800' : 
                      'bg-blue-100 text-blue-800'}`}>
                    {order.work_status ? order.work_status.work_status : 'Not Specified'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.initiated_by.username}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {formatDate(order.initiation_date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {order.department}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {loading && (
        <div className="flex justify-center mt-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      )}

      {workOrders.length === 0 && !loading && (
        <div className="text-center mt-8 text-gray-500">
          No work orders found matching your criteria
        </div>
      )}

      {hasMore && !loading && workOrders.length > 0 && (
        <div className="flex justify-center mt-4">
          <button
            onClick={loadMore}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            disabled={loading}
          >
            Load More
          </button>
        </div>
      )}

      {!hasMore && !loading && workOrders.length > 0 && (
        <div className="text-center mt-4 text-gray-500">
          No more work orders to display
        </div>
      )}
    </div>
  );
}