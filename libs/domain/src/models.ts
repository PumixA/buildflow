export type Role = 'CHEF_CHANTIER' | 'RESPONSABLE_QSE' | 'DIRECTION_TRAVAUX' | 'ADMIN';

export type NcrStatus = 'OPEN' | 'IN_ANALYSIS' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
export type IncidentSeverity = 'MINOR' | 'MAJOR' | 'CRITICAL';
export type IncidentStatus = 'OPEN' | 'IN_PROGRESS' | 'RESOLVED';

export type User = {
  id: string;
  name: string;
  email: string;
  role: Role;
  hashedPassword: string;
  mfaEnabled: boolean;
  createdAt: string;
};

export type Project = {
  id: string;
  name: string;
  locationGps: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
};

export type NcrPhoto = {
  id: string;
  ncrId: string;
  s3Url: string;
  geotagLat?: number;
  geotagLong?: number;
  timestamp: string;
  isWormLocked: boolean;
};

export type Ncr = {
  id: string;
  projectId: string;
  creatorId: string;
  title: string;
  description: string;
  status: NcrStatus;
  latitude: number;
  longitude: number;
  photos: string[];
  sync_status: boolean;
  localId?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
};

export type Incident = {
  id: string;
  projectId: string;
  creatorId: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  sync_status: boolean;
  status: IncidentStatus;
  createdAt: string;
};

export type HseAction = {
  id: string;
  incidentId: string;
  description: string;
  responsibleId: string;
  deadline?: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'DONE';
};
