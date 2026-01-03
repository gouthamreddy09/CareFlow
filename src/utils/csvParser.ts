export function parseCSV(content: string): { headers: string[]; rows: Record<string, string>[] } {
  const lines = content.trim().split('\n');
  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    if (values.length === headers.length) {
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index]?.trim() || '';
      });
      rows.push(row);
    }
  }

  return { headers, rows };
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

export const SCHEMA_DEFINITIONS = {
  patients: {
    required: ['patient_id', 'admission_date'],
    optional: ['discharge_date', 'age', 'gender', 'diagnosis', 'severity', 'admission_type'],
  },
  departments: {
    required: ['department_name'],
    optional: ['bed_capacity', 'avg_wait_time', 'staff_count', 'equipment_count'],
  },
  flowLogs: {
    required: ['patient_id', 'department_name', 'entry_time'],
    optional: ['exit_time', 'process_type'],
  },
  doctors: {
    required: ['doctor_id', 'department_name'],
    optional: ['experience_years', 'shift_type'],
  },
  readmissions: {
    required: ['patient_id', 'readmission_date'],
    optional: ['days_since_discharge', 'reason'],
  },
};

export function validateSchema(
  headers: string[],
  datasetType: keyof typeof SCHEMA_DEFINITIONS
): { valid: boolean; errors: string[]; warnings: string[] } {
  const schema = SCHEMA_DEFINITIONS[datasetType];
  const errors: string[] = [];
  const warnings: string[] = [];

  const normalizedHeaders = headers.map(h => h.toLowerCase().replace(/\s+/g, '_'));

  for (const required of schema.required) {
    if (!normalizedHeaders.includes(required)) {
      errors.push(`Missing required column: ${required}`);
    }
  }

  for (const header of normalizedHeaders) {
    if (!schema.required.includes(header) && !schema.optional.includes(header)) {
      warnings.push(`Unknown column will be ignored: ${header}`);
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}
