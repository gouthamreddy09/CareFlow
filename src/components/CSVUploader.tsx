import { useState, useCallback } from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, X } from 'lucide-react';
import { parseCSV, validateSchema, SCHEMA_DEFINITIONS } from '../utils/csvParser';
import {
  cleanPatientRecords,
  cleanDepartmentFlowLogs,
  cleanDoctorRecords,
  cleanReadmissions,
  cleanDepartmentResources,
} from '../utils/dataCleaning';
import {
  uploadPatients,
  uploadDepartments,
  uploadDepartmentFlowLogs,
  uploadDoctors,
  uploadReadmissions,
} from '../services/dataService';
import type { DatasetType, UploadStatus } from '../types';

interface CSVUploaderProps {
  onUploadComplete: () => void;
}

const DATASET_INFO: Record<DatasetType, { label: string; description: string; example: string }> = {
  patients: {
    label: 'Patient Records',
    description: 'patient_id, admission_date, discharge_date, age, gender, diagnosis, severity, admission_type',
    example: 'P001,2024-01-15,2024-01-20,45,Male,Pneumonia,medium,emergency',
  },
  departments: {
    label: 'Hospital Resources',
    description: 'department_name, bed_capacity, avg_wait_time, staff_count, equipment_count',
    example: 'Emergency,50,25,30,100',
  },
  flowLogs: {
    label: 'Department Flow Logs',
    description: 'patient_id, department_name, entry_time, exit_time, process_type',
    example: 'P001,Emergency,2024-01-15T08:30:00,2024-01-15T10:15:00,Triage',
  },
  doctors: {
    label: 'Doctors',
    description: 'doctor_id, department_name, experience_years, shift_type',
    example: 'D001,Cardiology,15,day',
  },
  readmissions: {
    label: 'Readmissions',
    description: 'patient_id, readmission_date, days_since_discharge, reason',
    example: 'P001,2024-02-10,21,Infection',
  },
};

const UPLOAD_ORDER: DatasetType[] = ['patients', 'departments', 'flowLogs', 'doctors', 'readmissions'];

export function CSVUploader({ onUploadComplete }: CSVUploaderProps) {
  const [files, setFiles] = useState<Map<DatasetType, File>>(new Map());
  const [uploadStatuses, setUploadStatuses] = useState<Map<DatasetType, UploadStatus>>(new Map());
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState<DatasetType | null>(null);

  const handleFileSelect = useCallback((type: DatasetType, file: File) => {
    setFiles(prev => new Map(prev).set(type, file));
    setUploadStatuses(prev => {
      const newMap = new Map(prev);
      newMap.delete(type);
      return newMap;
    });
  }, []);

  const handleDrop = useCallback((type: DatasetType, e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(null);
    const file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      handleFileSelect(type, file);
    }
  }, [handleFileSelect]);

  const removeFile = useCallback((type: DatasetType) => {
    setFiles(prev => {
      const newMap = new Map(prev);
      newMap.delete(type);
      return newMap;
    });
    setUploadStatuses(prev => {
      const newMap = new Map(prev);
      newMap.delete(type);
      return newMap;
    });
  }, []);

  const processAndUpload = async () => {
    if (files.size === 0) return;

    setIsUploading(true);

    for (const type of UPLOAD_ORDER) {
      const file = files.get(type);
      if (!file) continue;

      const updateStatus = (status: Partial<UploadStatus>) => {
        setUploadStatuses(prev => new Map(prev).set(type, {
          type,
          status: 'pending',
          message: '',
          recordCount: 0,
          cleanedCount: 0,
          errors: [],
          ...prev.get(type),
          ...status,
        } as UploadStatus));
      };

      try {
        updateStatus({ status: 'validating', message: 'Validating schema...' });

        const content = await file.text();
        const { headers, rows } = parseCSV(content);

        const schemaKey = type === 'departments' ? 'departments' : type;
        const validation = validateSchema(headers, schemaKey as keyof typeof SCHEMA_DEFINITIONS);

        if (!validation.valid) {
          updateStatus({
            status: 'error',
            message: 'Schema validation failed',
            errors: validation.errors,
          });
          continue;
        }

        updateStatus({ status: 'cleaning', message: 'Cleaning data...', recordCount: rows.length });

        let result: { success: boolean; count: number; error?: string };

        switch (type) {
          case 'patients': {
            const { cleaned, errors, duplicates } = cleanPatientRecords(rows);
            updateStatus({
              cleanedCount: cleaned.length,
              errors: errors.length > 0 ? [...errors.slice(0, 5), duplicates > 0 ? `${duplicates} duplicates removed` : ''].filter(Boolean) : [],
            });
            updateStatus({ status: 'uploading', message: 'Uploading to database...' });
            result = await uploadPatients(cleaned);
            break;
          }
          case 'departments': {
            const { cleaned, errors } = cleanDepartmentResources(rows);
            updateStatus({ cleanedCount: cleaned.length, errors: errors.slice(0, 5) });
            updateStatus({ status: 'uploading', message: 'Uploading to database...' });
            result = await uploadDepartments(cleaned);
            break;
          }
          case 'flowLogs': {
            const { cleaned, errors } = cleanDepartmentFlowLogs(rows);
            updateStatus({ cleanedCount: cleaned.length, errors: errors.slice(0, 5) });
            updateStatus({ status: 'uploading', message: 'Uploading to database...' });
            result = await uploadDepartmentFlowLogs(cleaned);
            break;
          }
          case 'doctors': {
            const { cleaned, errors } = cleanDoctorRecords(rows);
            updateStatus({ cleanedCount: cleaned.length, errors: errors.slice(0, 5) });
            updateStatus({ status: 'uploading', message: 'Uploading to database...' });
            result = await uploadDoctors(cleaned);
            break;
          }
          case 'readmissions': {
            const { cleaned, errors } = cleanReadmissions(rows);
            updateStatus({ cleanedCount: cleaned.length, errors: errors.slice(0, 5) });
            updateStatus({ status: 'uploading', message: 'Uploading to database...' });
            result = await uploadReadmissions(cleaned);
            break;
          }
          default:
            continue;
        }

        if (result.success) {
          updateStatus({
            status: 'success',
            message: `Successfully uploaded ${result.count} records`,
          });
        } else {
          updateStatus({
            status: 'error',
            message: result.error || 'Upload failed',
          });
        }
      } catch (error) {
        updateStatus({
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    setIsUploading(false);
    onUploadComplete();
  };

  const getStatusIcon = (status?: UploadStatus['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'validating':
      case 'cleaning':
      case 'uploading':
        return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Datasets</h2>
        <p className="text-sm text-gray-600 mb-6">
          Upload CSV files for each dataset. Files will be validated, cleaned, and automatically joined using patient_id and department_name.
        </p>

        <div className="space-y-4">
          {UPLOAD_ORDER.map((type) => {
            const info = DATASET_INFO[type];
            const file = files.get(type);
            const status = uploadStatuses.get(type);

            return (
              <div
                key={type}
                className={`border-2 rounded-lg transition-all ${
                  dragOver === type
                    ? 'border-blue-400 bg-blue-50'
                    : file
                    ? 'border-gray-300 bg-gray-50'
                    : 'border-dashed border-gray-300 hover:border-gray-400'
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(type);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => handleDrop(type, e)}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <FileText className="w-5 h-5 text-gray-400" />
                        <div>
                          <h3 className="font-medium text-gray-900">{info.label}</h3>
                          <p className="text-xs text-gray-500 mt-0.5">{info.description}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      {status && getStatusIcon(status.status)}

                      {file ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">{file.name}</span>
                          {!isUploading && (
                            <button
                              onClick={() => removeFile(type)}
                              className="p-1 hover:bg-gray-200 rounded"
                            >
                              <X className="w-4 h-4 text-gray-500" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <label className="cursor-pointer">
                          <input
                            type="file"
                            accept=".csv"
                            className="hidden"
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              if (f) handleFileSelect(type, f);
                            }}
                          />
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                            <Upload className="w-4 h-4" />
                            Select File
                          </span>
                        </label>
                      )}
                    </div>
                  </div>

                  {status && (
                    <div className="mt-3 pl-8">
                      <p className={`text-sm ${status.status === 'error' ? 'text-red-600' : 'text-gray-600'}`}>
                        {status.message}
                      </p>
                      {status.cleanedCount > 0 && status.status !== 'error' && (
                        <p className="text-xs text-gray-500 mt-1">
                          {status.recordCount} records processed, {status.cleanedCount} cleaned
                        </p>
                      )}
                      {status.errors.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {status.errors.map((err, i) => (
                            <li key={i} className="text-xs text-amber-600">
                              {err}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {files.size} of {UPLOAD_ORDER.length} files selected
          </p>
          <button
            onClick={processAndUpload}
            disabled={files.size === 0 || isUploading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Upload & Process
              </>
            )}
          </button>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-amber-800 mb-2">Sample Data Format</h3>
        <div className="space-y-2 text-xs font-mono text-amber-700">
          {UPLOAD_ORDER.map((type) => (
            <div key={type}>
              <span className="font-semibold">{DATASET_INFO[type].label}:</span> {DATASET_INFO[type].example}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
