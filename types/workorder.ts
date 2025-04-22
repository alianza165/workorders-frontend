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
  part: string | null;
  type_of_work: TypeOfWork;
  closed: string | null;
  work_status: WorkStatus;
  pending: string | null;
  initiation_date: string;
  department: string;
  problem: string;
  closing_remarks: string | null;
  accepted: string | null;
  assigned_to: User | null;
  target_date: string | null;
  remarks: string | null;
  replaced_part: string;
  completion_date: string;
  pr_number: string;
  pr_date: string | null;
  timestamp: string | null;
}

export interface WorkOrderResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: WorkOrder[];
}