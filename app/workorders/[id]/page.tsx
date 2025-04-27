'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import { WorkOrder, WorkOrderHistory } from '../../types/workorder';
import { format } from 'date-fns';

export default function WorkOrderDetail() {
  const { id } = useParams();
  const { token, user } = useAuth();
  const router = useRouter();
  const [workOrder, setWorkOrder] = useState<WorkOrder | null>(null);
  const [history, setHistory] = useState<WorkOrderHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState<any>({});
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [closeStatus, setCloseStatus] = useState(true);
  const [closingRemarks, setClosingRemarks] = useState('');

  useEffect(() => {
    if (!token || !id) {
      router.push('/signin');
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const validationRes = await fetch(`http://localhost:8000/api/workorders/${id}/check-access/`, {
          headers: {
            'Authorization': `Token ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!validationRes.ok) {
          throw new Error('You do not have permission to view this work order');
        }

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
        setHistory(historyData.results || historyData); // Handle both array and object response
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

    fetchData();
  }, [id, token, router]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workOrder) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/workorders/${workOrder.id}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error('Failed to update work order');
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
      setHistory(await historyRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: string) => {
    if (!workOrder) return;

    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/workorders/${workOrder.id}/${action}/`, {
        method: 'POST',
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to ${action} work order`);
      }

      const updatedOrder = await response.json();
      setWorkOrder(updatedOrder);
      // Refresh history
      const historyRes = await fetch(`http://localhost:8000/api/workorders/${id}/history/`, {
        headers: {
          'Authorization': `Token ${token}`,
          'Content-Type': 'application/json',
        },
      });
      setHistory(await historyRes.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCloseWorkOrder = async (closed: boolean, remarks: string) => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:8000/api/workorders/${workOrder.id}/close/`, {
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

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to close work order');
      }

      // Refresh data
      const updatedOrder = await response.json();
      setWorkOrder(updatedOrder);
      
      // Refresh history
      const historyRes = await fetch(`http://localhost:8000/api/workorders/${id}/history/`);
      setHistory(await historyRes.json());
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close work order');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="container mx-auto px-4 py-8">Loading...</div>;
  if (error) return <div className="container mx-auto px-4 py-8 text-red-500">{error}</div>;
  if (!workOrder) return <div className="container mx-auto px-4 py-8">Work order not found</div>;

  const canEdit = (
    (user.profile.is_production && workOrder.initiated_by.id === user.id && workOrder.accepted === null) ||
    (user.profile.is_utilities && workOrder.accepted === true && workOrder.work_status.work_status !== 'Completed')
  );

  const canAccept = user.profile.is_utilities && workOrder.accepted === null;
  const canComplete = user.profile.is_utilities && workOrder.accepted === true && workOrder.work_status.work_status === 'In_Process';
  const canClose = user.profile.is_production && workOrder.work_status.work_status === 'Completed';

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
          className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
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
          <div className="bg-white shadow rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Details</h2>
              {canEdit && !editMode && (
                <button
                  onClick={() => setEditMode(true)}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Edit
                </button>
              )}
            </div>

            {editMode ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Problem</label>
                  <textarea
                    name="problem"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                    value={formData.problem || workOrder.problem}
                    onChange={handleChange}
                    disabled={!canEdit}
                  />
                </div>

                {user.profile.is_utilities && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Assigned To</label>
                      <input
                        type="text"
                        name="assigned_to"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={formData.assigned_to}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Date</label>
                      <input
                        type="date"
                        name="target_date"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
                        value={formData.target_date}
                        onChange={handleChange}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Remarks</label>
                      <textarea
                        name="remarks"
                        className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
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
                    className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-500">Problem</p>
                  <p className="mt-1">{workOrder.problem}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Equipment</p>
                  <p className="mt-1">
                    {workOrder.equipment.machine} ({workOrder.equipment.machine_type.machine_type})
                  </p>
                </div>
                {workOrder.part && (
                  <div>
                    <p className="text-sm text-gray-500">Part</p>
                    <p className="mt-1">
                      {workOrder.part.name} ({workOrder.part.part_type.part_type})
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-gray-500">Status</p>
                  <p className="mt-1">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${workOrder.work_status.work_status === 'Pending' ? 'bg-yellow-100 text-yellow-800' : 
                        workOrder.work_status.work_status === 'Completed' ? 'bg-green-100 text-green-800' : 
                        'bg-blue-100 text-blue-800'}`}>
                      {workOrder.work_status.work_status}
                    </span>
                  </p>
                </div>
                {workOrder.assigned_to && (
                  <div>
                    <p className="text-sm text-gray-500">Assigned To</p>
                    <p className="mt-1">{workOrder.assigned_to}</p>
                  </div>
                )}
                {workOrder.target_date && (
                  <div>
                    <p className="text-sm text-gray-500">Target Date</p>
                    <p className="mt-1">{format(new Date(workOrder.target_date), 'PP')}</p>
                  </div>
                )}
                {workOrder.remarks && (
                  <div>
                    <p className="text-sm text-gray-500">Remarks</p>
                    <p className="mt-1">{workOrder.remarks}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Actions</h2>
            <div className="flex flex-wrap gap-4">
              {canAccept && (
                <>
                  <button
                    onClick={() => handleAction('accept')}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Accept Work Order
                  </button>
                  <button
                    onClick={() => handleAction('reject')}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    Reject Work Order
                  </button>
                </>
              )}
              {canComplete && (
                <button
                  onClick={() => handleAction('complete')}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Mark as Completed
                </button>
              )}
              {canClose && (
                <button
                  onClick={() => setShowCloseDialog(true)}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Close Work Order
                </button>
              )}

              {showCloseDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white p-6 rounded-lg max-w-md w-full">
                    <h3 className="text-lg font-medium mb-4">Close Work Order</h3>
                    
                    <div className="mb-4">
                      <label className="block mb-2">
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
                      <label className="block text-sm font-medium mb-1">Closing Remarks</label>
                      <textarea
                        value={closingRemarks}
                        onChange={(e) => setClosingRemarks(e.target.value)}
                        className="w-full border rounded p-2"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setShowCloseDialog(false)}
                        className="px-4 py-2 border rounded"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => {
                          handleCloseWorkOrder(closeStatus, closingRemarks);
                          setShowCloseDialog(false);
                        }}
                        className="px-4 py-2 bg-purple-600 text-white rounded"
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* History Sidebar */}
        <div className="space-y-6">
          <div className="bg-white shadow rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">History</h2>
            <div className="space-y-4">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No history available</p>
              ) : (
                <ul className="space-y-4">
                  {history.map((item) => (
                    <li key={item.id} className="border-l-2 border-blue-500 pl-4 py-2">
                      <div className="text-sm font-medium">
                        {item.changed_by.username} - {item.action}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(item.timestamp), 'PPpp')}
                      </div>
                      {Object.keys(item.snapshot).length > 0 && (
                        <div className="mt-1 text-xs text-gray-700">
                          {Object.entries(item.snapshot).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium">{key}:</span> {JSON.stringify(value)}
                            </div>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}