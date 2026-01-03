export interface PatientJourney {
  patientId: string;
  totalDuration: number;
  stages: {
    department: string;
    category: 'Emergency' | 'Diagnostics' | 'Treatment' | 'Recovery' | 'Discharge';
    entryTime: string;
    exitTime: string;
    duration: number;
  }[];
}

export interface DepartmentDelay {
  departmentName: string;
  category: string;
  medianTime: number;
  actualAvgTime: number;
  delayRatio: number;
  variance: number;
  queueBuildup: number;
  impactOnLOS: number;
  patientCount: number;
}

export interface PatientFlowPath {
  from: string;
  to: string;
  count: number;
  avgDuration: number;
}

export interface FlowInsight {
  type: 'delay' | 'variance' | 'bottleneck' | 'impact';
  severity: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  department: string;
  metric: number;
}

export interface DepartmentTimeContribution {
  department: string;
  avgTime: number;
  percentage: number;
  patientCount: number;
}
