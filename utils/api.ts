import axios from 'axios';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000/api',
});

// Request interceptor
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Token ${token}`;
  }
  return config;
});

// Response interceptor
api.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Handle token expiration
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Dropdown endpoints service
export const DropdownService = {
  async getEquipment() {
    return api.get('/api/equipment/');
  },
  async getMachineTypes() {
    return api.get('/api/machine-types/');
  },
  async getDepartments() {
    return api.get('/api/departments/');
  },
  async getWorkTypes() {
    return api.get('/api/work-types/');
  },
  async getWorkStatuses() {
    return api.get('/api/work-statuses/');
  },
  // async getAssignedTo() {
  //   return api.get('/workorders/?distinct=assigned_to');
  // },
  async getAllDropdownOptions() {
    try {
      const [
        equipmentRes,
        machineTypesRes,
        departmentsRes,
        workTypesRes,
        workStatusesRes
      ] = await Promise.all([
        this.getEquipment(),
        this.getMachineTypes(),
        this.getDepartments(),
        this.getWorkTypes(),
        this.getWorkStatuses()
      ]);

      return {
        equipmentOptions: equipmentRes.data.results || [],
        machineTypeOptions: machineTypesRes.data.results || [],
        departmentOptions: departmentsRes.data.results || [],
        workTypeOptions: workTypesRes.data.results || [],
        workStatusOptions: workStatusesRes.data.results || [],
        // assignedToOptions: assignedToRes.data.results || []
      };
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      throw error;
    }
  }
};

// AI Agent service
export const AIAgentService = {
  async query(prompt: string, filters: Record<string, any>) {
    return api.post('/ai-agent/', { prompt, filters });
  }
};

export default api;