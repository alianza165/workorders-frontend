export interface User {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
}

export interface MachineType {
  id: number;
  machine_type: string;
}

export interface Department {
  id: number;
  department: string;
}

export interface Location {
  id: number;
  department: Department;
  area: string;
}

export interface Equipment {
  id: number;
  machine_type: MachineType;
  location: Location;
  machine: string;
}

export interface Part_Type {
  id: number;
  part_type: string;
}

export interface TypeOfWork {
  id: number;
  type_of_work: string;
}

export interface WorkStatus {
  id: number;
  work_status: string;
}

export interface WorkOrder {
  id: number;
  initiated_by: User;
  equipment: Equipment;
  part: Part;
  type_of_work: TypeOfWork;
  closed: {
    id: number;
    closed: 'Yes' | 'No';
  } | null;
  work_status: WorkStatus;
  pending: string | null;
  initiation_date: string;
  department: string;
  problem: string;
  closing_remarks: string | null;
  accepted: boolean | null;
  assigned_to: string;
  target_date: string | null;
  remarks: string | null;
  replaced_part: string;
  completion_date: string;
  pr_number: string;
  pr_date: string | null;
  timestamp: string | null;
}

export interface Part {
  id: number;
  name: string;
  part_type: Part_Type;
  equipment: Equipment;
}

export interface WorkOrderResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkOrder[];
}

export interface WorkOrderSnapshot {
  id: number;
  accepted?: boolean | null;
  assigned_to?: string | User | null;
  work_status?: WorkStatus | null;
  problem?: string | null;
  part?: string | null;
  closed?: {
    id: number;
    closed: 'Yes' | 'No';
  } | null;
  pending?: string | null;
  pr_date?: string | null;
  remarks?: string | null;
  equipment?: Equipment | null;
  pr_number?: string | null;
  timestamp?: string | null;
  department?: string | null;
  target_date?: string | null;
  initiated_by?: User | null;
  type_of_work?: number | TypeOfWork | null;
  replaced_part?: string | null;
  closing_remarks?: string | null;
  completion_date?: string | null;
  initiation_date?: string | null;
}

export interface WorkOrderHistoryItem {
  id: number;
  changed_by: User;
  snapshot: WorkOrderSnapshot;
  timestamp: string;
  action: 'created' | 'updated' | 'rejected' | 'accepted' | 'completed' | string;
  workorder: number;
}

export interface WorkOrderHistoryResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkOrderHistoryItem[];
}