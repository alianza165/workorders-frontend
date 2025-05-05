'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderHistory } from '../../types/workorder';
import { format } from 'date-fns';
import { useAppContext } from '../../context/AppContext';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const { token, user, isAuthenticated } = useAuth();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<WorkOrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeStatus, setCloseStatus] = useState(true);
  const [closingRemarks, setClosingRemarks] = useState('');
  const [workTypes, setWorkTypes] = useState<Type_of_Work[]>([]);
  const [acceptanceFormData, setAcceptanceFormData] = useState({
    assigned_to: '',
    target_date: '',
    remarks: ''
  });
  const [showAcceptanceForm, setShowAcceptanceForm] = useState(false);
  const { theme, isOpen } = useAppContext();
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/signin');
      return;
    }

    if (!token || !id) {
      router.push('/signin');
      return;
    }

    const fetchInitialData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // First fetch work types
        const workTypesRes = await fetch('http://localhost:8000/api/work-types/', {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!workTypesRes.ok) throw new Error('Failed to fetch work types');
        const workTypesData = await workTypesRes.json();
        setWorkTypes(workTypesData.results || workTypesData);

        // Then fetch work order and history
        const [orderRes, historyRes] = await Promise.all([
          fetch(`http://localhost:8000/api/workorders/${id}/`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`http://localhost:8000/api/workorders/${id}/history/`, {
            headers: {
              'Authorization': `Token ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!orderRes.ok) throw new Error('Failed to fetch work order details');
        if (!historyRes.ok) throw new Error('Failed to fetch work order history');

        const [orderData, historyData] = await Promise.all([
          orderRes.json(),
          historyRes.json()
        ]);

        setWorkOrder(orderData);
        setHistory(historyData.results || historyData);
        setFormData({
          remarks: orderData.remarks || '',
          assigned_to: orderData.assigned_to || '',
          target_date: orderData.target_date ? format(new Date(orderData.target_date), 'yyyy-MM-dd') : '',
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
        if (err instanceof Error && err.message.includes('permission')) {
          router.push('/dashboard');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();
  }, [id, token, isAuthenticated, router]);

  // Helper function to get work type name
  const getWorkTypeName = (id: number) => {
    const type = workTypes.find(t => t.id === id);
    return type?.type_of_work || `Type #${id}`;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder) return;

    try {
      setLoading(true);

      const cleanedPayload = Object.fromEntries(
        Object.entries(formData).filter(([_, value]) => value !== "")
      );
      const response = await fetch(`http://localhost:8000/api/workorders/${workOrder.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(cleanedPayload)
      });

      if (!response.ok) {
        // Add this to see the actual error message from the server
        const errorData = await response.json();
        console.error('Server error:', errorData);
        throw new Error(errorData.error || 'Failed to update work order');
      }

      const updatedOrder = await response.json();
      setWorkOrder(updatedOrder);
      setEditMode(false);
      // Refresh history to show the update
      const historyRes = await fetch(`http://localhost:8000/api/workorders/${id}/history/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const updatedHistory = await historyRes.json();
      setHistory(updatedHistory.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string, formData = null) => {
    if (!workOrder) return;

    try {
      setLoading(true);
      
      const endpoint = action === 'accept' 
        ? `http://localhost:8000/api/workorders/${workOrder.id}/accept/`
        : `http://localhost:8000/api/workorders/${workOrder.id}/${action}/`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: action === 'accept' ? JSON.stringify(formData) : null
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} work order`);
      }

      const updatedOrder = await response.json();
      setWorkOrder(updatedOrder);
      setShowAcceptanceForm(false);
      setAcceptanceFormData({ assigned_to: '', target_date: '', remarks: '' });
      
      // Refresh history
      const historyRes = await fetch(`http://localhost:8000/api/workorders/${id}/history/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      const updatedHistory = await historyRes.json();
      setHistory(updatedHistory.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Add this handler for the acceptance form
  const handleAcceptanceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleAction('accept', acceptanceFormData);
  };

  const handleCloseWorkOrder = async (closed: boolean, remarks: string) => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      
      // First close the work order
      const closeResponse = await fetch(`http://localhost:8000/api/workorders/${workOrder.id}/close/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          closed: closed,
          closing_remarks: remarks
        })
      });

      if (!closeResponse.ok) {
        const errorData = await closeResponse.json();
        throw new Error(errorData.error || 'Failed to close work order');
      }

      // Get the updated work order
      const updatedOrder = await closeResponse.json();
      setWorkOrder(updatedOrder);
      
      // Now fetch the updated history
      const historyRes = await fetch(`http://localhost:8000/api/workorders/${id}/history/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!historyRes.ok) {
        throw new Error('Failed to fetch updated history');
      }

      const updatedHistory = await historyRes.json();
      setHistory(updatedHistory.results);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close work order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (error) return <div className="container mx-auto px-4 py-8 text-red-500 dark:text-red-400">{error}</div>;
  if (!workOrder) return <div className="container mx-auto px-4 py-8">Work order not found</div>;

  const canEdit = (
    (user.profile.is_production && workOrder.initiated_by.id === user.id && workOrder.accepted === null) ||
    (user.profile.is_utilities && workOrder.accepted === true && workOrder.work_status.work_status !== 'Completed')
  );

  const canAccept = user.profile.is_utilities && workOrder.accepted === null;
  const canComplete = user.profile.is_utilities && workOrder.accepted === true && (workOrder.work_status && workOrder.work_status.work_status === 'In_Process');
  const canClose = user.profile.is_production && (workOrder.work_status && workOrder.work_status.work_status === 'Completed') && (!workOrder.closed || workOrder.closed.closed !== "Yes");

  const renderHistoryItem = (item: WorkOrderHistory) => {
    const getActionColor = (action: string) => {
      switch (action.toLowerCase()) {
        case 'created': return 'bg-blue-100 text-blue-800';
        case 'accepted': return 'bg-green-100 text-green-800';
        case 'rejected': return 'bg-red-100 text-red-800';
        case 'completed': return 'bg-purple-100 text-purple-800';
        case 'closed': return 'bg-gray-100 text-gray-800';
        default: return 'bg-yellow-100 text-yellow-800';
      }
    };

    const getActionIcon = (action: string) => {
      switch (action.toLowerCase()) {
        case 'created': return '📝';
        case 'accepted': return '✅';
        case 'rejected': return '❌';
        case 'completed': return '🏁';
        case 'closed': return '🔒';
        default: return '✏️';
      }
    };

    const renderSnapshotDetails = () => {
      if (!item.snapshot) return null;
      
      const excludedFields = ['id', 'timestamp', 'workorder'];
      const importantFields = ['remarks', 'assigned_to', 'target_date', 'work_status', 'closed'];
      
      return (
        <div className="mt-2 text-xs text-gray-700 space-y-1">
          {Object.entries(item.snapshot)
            .filter(([key]) => !excludedFields.includes(key))
            .sort(([a], [b]) => importantFields.includes(b) ? 1 : importantFields.includes(a) ? -1 : 0)
            .map(([key, value]) => {
              if (value === null || value === undefined) return null;
              
              let displayValue = value;
              if (key === 'timestamp' || key === 'target_date' || key === 'completion_date') {
                displayValue = format(new Date(value as string), 'PPpp');
              } else if (typeof value === 'object') {
                displayValue = JSON.stringify(value, null, 2);
              }

              return (
                <div key={key} className="flex">
                  <span className="font-medium min-w-[100px]">{key.replace('_', ' ')}:</span>
                  <span className="ml-2 break-all">
                    {displayValue}
                  </span>
                </div>
              );
            })}
        </div>
      );
    };

    return (
      <li key={item.id} className="border-l-2 border-blue-500 pl-4 py-3">
        <div className="flex items-start">
          <span className="mr-2">{getActionIcon(item.action)}</span>
          <div className="flex-1">
            <div className="flex justify-between items-start">
              <div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getActionColor(item.action)}`}>
                  {item.action}
                </span>
                <span className="ml-2 text-sm font-medium">
                  {item.changed_by?.username || 'System'}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {format(new Date(item.timestamp), 'PPpp')}
              </span>
            </div>
            {renderSnapshotDetails()}
          </div>
        </div>
      </li>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Work Order #{workOrder.id}</h1>
        <button
          onClick={() => router.push('/dashboard')}
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-400 hover:bg-gray-50"
        >
          Back to List
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
  {/* Main Work Order Info */}
  <div className="lg:col-span-2 space-y-6">
    <div className={`shadow rounded-lg p-6 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <div className="flex justify-between items-center mb-4">
        <h2 className={`text-xl font-semibold ${
          theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
        }`}>Details</h2>
        {canEdit && !editMode && (
          <button
            onClick={() => setEditMode(true)}
            className={`px-3 py-1 text-sm text-white rounded ${
              theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Edit
          </button>
        )}
      </div>

      {editMode ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          {user.profile.is_production && (
            <>
              <div>
                <label className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Problem</label>
                <textarea
                  name="problem"
                  className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={formData.problem || workOrder.problem}
                  onChange={handleChange}
                  disabled={!canEdit}
                />
              </div>
            </>
          )}

          {user.profile.is_utilities && (
            <>
              <div>
                <label className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Assigned To</label>
                <input
                  type="text"
                  name="assigned_to"
                  className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={formData.assigned_to}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Target Date</label>
                <input
                  type="date"
                  name="target_date"
                  className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={formData.target_date}
                  onChange={handleChange}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>Remarks</label>
                <textarea
                  name="remarks"
                  className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                    theme === 'dark' 
                      ? 'bg-gray-700 border-gray-600 text-gray-200' 
                      : 'bg-white border-gray-300 text-gray-900'
                  }`}
                  value={formData.remarks}
                  onChange={handleChange}
                />
              </div>
            </>
          )}

          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => setEditMode(false)}
              className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                theme === 'dark' 
                  ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={`px-4 py-2 border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              Save Changes
            </button>
          </div>
        </form>
      ) : (
        <div className="space-y-4">
          <div>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Problem</p>
            <p className={`mt-1 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
            }`}>{workOrder.problem}</p>
          </div>
          <div>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Equipment</p>
            <p className={`mt-1 ${
              theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
            }`}>
              {workOrder.equipment.machine} ({workOrder.equipment.machine_type.machine_type})
            </p>
          </div>
          {workOrder.part && (
            <div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Part</p>
              <p className={`mt-1 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}>
                {workOrder.part.name} ({workOrder.part.part_type.part_type})
              </p>
            </div>
          )}
          <div>
            <p className={`text-sm ${
              theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
            }`}>Status</p>
            <p className="mt-1">
              <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                workOrder.closed?.closed === 'Yes' 
                  ? theme === 'dark' 
                    ? 'bg-purple-900 text-purple-200' 
                    : 'bg-purple-100 text-purple-800' :
                !workOrder.work_status
                  ? theme === 'dark'
                    ? 'bg-gray-700 text-gray-300'
                    : 'bg-gray-200 text-gray-800' :
                workOrder.work_status.work_status === 'Pending' 
                  ? theme === 'dark' 
                    ? 'bg-yellow-900 text-yellow-200' 
                    : 'bg-yellow-100 text-yellow-800' : 
                workOrder.work_status.work_status === 'Completed' 
                  ? theme === 'dark' 
                    ? 'bg-green-900 text-green-200' 
                    : 'bg-green-100 text-green-800' :
                workOrder.work_status.work_status === 'Rejected' 
                  ? theme === 'dark' 
                    ? 'bg-red-900 text-red-200' 
                    : 'bg-red-100 text-red-800' :
                  theme === 'dark' 
                    ? 'bg-blue-900 text-blue-200' 
                    : 'bg-blue-100 text-blue-800'
              }`}>
                {workOrder.closed?.closed === 'Yes' ? 'Closed' : 
                 !workOrder.work_status ? 'Not Specified' : 
                 workOrder.work_status.work_status}
              </span>
            </p>
          </div>
          {workOrder.assigned_to && (
            <div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Assigned To</p>
              <p className={`mt-1 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}>{workOrder.assigned_to}</p>
            </div>
          )}
          {workOrder.target_date && (
            <div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Target Date</p>
              <p className={`mt-1 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}>{format(new Date(workOrder.target_date), 'PP')}</p>
            </div>
          )}
          {workOrder.remarks && (
            <div>
              <p className={`text-sm ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>Remarks</p>
              <p className={`mt-1 ${
                theme === 'dark' ? 'text-gray-200' : 'text-gray-900'
              }`}>{workOrder.remarks}</p>
            </div>
          )}
        </div>
      )}
    </div>

    {/* Action Buttons */}
    <div className={`shadow rounded-lg p-6 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <h2 className={`text-xl font-semibold mb-4 ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
      }`}>Actions</h2>
      <div className="flex flex-wrap gap-4">
        {/* Acceptance Flow */}
        {canAccept && (
          <>
            {showAcceptanceForm ? (
              <div className="w-full space-y-4">
                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Assigned To</label>
                  <input
                    type="text"
                    name="assigned_to"
                    className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={acceptanceFormData.assigned_to}
                    onChange={(e) => setAcceptanceFormData({...acceptanceFormData, assigned_to: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Target Date</label>
                  <input
                    type="date"
                    name="target_date"
                    className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={acceptanceFormData.target_date}
                    onChange={(e) => setAcceptanceFormData({...acceptanceFormData, target_date: e.target.value})}
                    required
                  />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>Remarks</label>
                  <textarea
                    name="remarks"
                    className={`mt-1 block w-full border rounded-md shadow-sm p-2 ${
                      theme === 'dark' 
                        ? 'bg-gray-700 border-gray-600 text-gray-200' 
                        : 'bg-white border-gray-300 text-gray-900'
                    }`}
                    value={acceptanceFormData.remarks}
                    onChange={(e) => setAcceptanceFormData({...acceptanceFormData, remarks: e.target.value})}
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={() => setShowAcceptanceForm(false)}
                    className={`px-4 py-2 border rounded-md shadow-sm text-sm font-medium ${
                      theme === 'dark' 
                        ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleAction('accept', acceptanceFormData)}
                    className={`px-4 py-2 text-white rounded ${
                      theme === 'dark' ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    Confirm Acceptance
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => setShowAcceptanceForm(true)}
                  className={`px-4 py-2 text-white rounded ${
                    theme === 'dark' ? 'bg-green-700 hover:bg-green-800' : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  Accept Work Order
                </button>
                <button
                  onClick={() => handleAction('reject')}
                  className={`px-4 py-2 text-white rounded ${
                    theme === 'dark' ? 'bg-red-700 hover:bg-red-800' : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  Reject Work Order
                </button>
              </>
            )}
          </>
        )}

        {/* Completion Button */}
        {canComplete && (
          <button
            onClick={() => handleAction('complete')}
            className={`px-4 py-2 text-white rounded ${
              theme === 'dark' ? 'bg-blue-700 hover:bg-blue-800' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            Mark as Completed
          </button>
        )}

        {/* Close Work Order Dialog */}
        {canClose && (
          <>
            <button
              onClick={() => setShowCloseDialog(true)}
              className={`px-4 py-2 text-white rounded ${
                theme === 'dark' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'
              }`}
            >
              Close Work Order
            </button>
            
            {showCloseDialog && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className={`p-6 rounded-lg max-w-md w-full ${
                  theme === 'dark' ? 'bg-gray-800' : 'bg-white'
                }`}>
                  <h3 className={`text-lg font-medium mb-4 ${
                    theme === 'dark' ? 'text-white' : 'text-gray-900'
                  }`}>Close Work Order</h3>
                  
                  <div className="mb-4">
                    <label className={`block mb-2 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>
                      <input 
                        type="checkbox" 
                        checked={closeStatus}
                        onChange={(e) => setCloseStatus(e.target.checked)}
                        className="mr-2"
                      />
                      Mark as Closed
                    </label>
                  </div>

                  <div className="mb-4">
                    <label className={`block text-sm font-medium mb-1 ${
                      theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                    }`}>Closing Remarks</label>
                    <textarea
                      value={closingRemarks}
                      onChange={(e) => setClosingRemarks(e.target.value)}
                      className={`w-full border rounded p-2 ${
                        theme === 'dark' 
                          ? 'bg-gray-700 border-gray-600 text-gray-200' 
                          : 'bg-white border-gray-300 text-gray-900'
                      }`}
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <button
                      onClick={() => setShowCloseDialog(false)}
                      className={`px-4 py-2 border rounded ${
                        theme === 'dark' 
                          ? 'border-gray-600 text-gray-300 hover:bg-gray-700' 
                          : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        handleCloseWorkOrder(closeStatus, closingRemarks);
                        setShowCloseDialog(false);
                      }}
                      className={`px-4 py-2 text-white rounded ${
                        theme === 'dark' ? 'bg-purple-700 hover:bg-purple-800' : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      Confirm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  </div>

  {/* History Sidebar */}
  <div className="space-y-6">
    <div className={`shadow rounded-lg p-6 ${
      theme === 'dark' ? 'bg-gray-800' : 'bg-white'
    }`}>
      <h2 className={`text-xl font-semibold mb-4 ${
        theme === 'dark' ? 'text-gray-300' : 'text-gray-600'
      }`}>History</h2>
      <div className="space-y-4">
        {historyLoading ? (
          <div className="flex justify-center items-center py-4">
            <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${
              theme === 'dark' ? 'border-gray-300' : 'border-gray-900'
            }`}></div>
          </div>
        ) : history && Array.isArray(history) && history.length === 0 ? (
          <p className={`text-sm ${
            theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
          }`}>No history available</p>
        ) : history && Array.isArray(history) ? (
          <ul className="space-y-4">
            {history.map((item) => {
              const formatSnapshot = (snapshot) => {
                if (!snapshot) return {};
                
                return Object.entries(snapshot)
                  .filter(([_, value]) => value !== null && value !== "none" && value !== "")
                  .reduce((acc, [key, value]) => {
                    switch (key) {
                      case 'closed':
                        acc[key] = value.closed;
                        break;
                      case 'accepted':
                        acc[key] = value ? 'Yes' : 'No';
                        break;
                      case 'equipment':
                        acc[key] = `${value.machine} (${value.machine_type})`;
                        break;
                      case 'type_of_work':
                        acc[key] = typeof value === 'object' ? value.type_of_work : getWorkTypeName(value);
                        break;
                      case 'work_status':
                        acc[key] = value.work_status;
                        break;
                      case 'initiated_by':
                        acc[key] = value.username;
                        break;
                      case 'initiation_date':
                      case 'completion_date':
                      case 'target_date':
                        acc[key] = format(new Date(value), 'PPpp');
                        break;
                      default:
                        acc[key] = value;
                    }
                    return acc;
                  }, {});
              };

              const formattedSnapshot = formatSnapshot(item.snapshot);

              return (
                <li key={item.id} className={`border-l-2 pl-4 py-2 ${
                  theme === 'dark' ? 'border-blue-700' : 'border-blue-500'
                }`}>
                  <div className={`text-sm font-medium ${
                    theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    {item.changed_by?.username || 'System'} - {item.action}
                  </div>
                  <div className={`text-xs ${
                    theme === 'dark' ? 'text-gray-400' : 'text-gray-500'
                  }`}>
                    {item.timestamp && format(new Date(item.timestamp), 'PPpp')}
                  </div>
                  {Object.keys(formattedSnapshot).length > 0 && (
                    <div className={`mt-2 space-y-1 text-xs ${
                      theme === 'dark' ? 'text-gray-400' : 'text-gray-700'
                    }`}>
                      {Object.entries(formattedSnapshot).map(([key, value]) => (
                        <div key={key} className="grid grid-cols-3 gap-2">
                          <span className="col-span-1 font-medium capitalize">
                            {key.replace(/_/g, ' ')}:
                          </span>
                          <span className="col-span-2 break-all">
                            {value}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className={`text-sm ${
            theme === 'dark' ? 'text-red-400' : 'text-red-500'
          }`}>Error loading history data</p>
        )}
      </div>
    </div>
  </div>
</div>
    </div>
  );
}