# CareFlow

A comprehensive healthcare analytics platform for multi-department hospital networks. CareFlow provides real-time insights into patient flow, bottleneck detection, predictive analytics, and operational optimization.

## Features

### Analytics Dashboards
- **Executive Overview** - High-level metrics and KPIs for hospital leadership
- **Admission Trends** - Track patient admission patterns and seasonal variations
- **Department Overview** - Monitor department-specific performance metrics
- **Patient Flow Analytics** - Visualize patient journey through the healthcare system
- **Bottleneck Intelligence** - Identify and analyze operational bottlenecks
- **What-If Simulation** - Test scenarios before implementing changes
- **Optimization Insights** - AI-powered recommendations for operational improvements
- **Strategic Risk Outlook** - Predictive analytics for readmission risks and resource planning

### Key Capabilities
- Real-time data visualization with interactive charts
- Multi-workspace support for different hospital departments
- Role-based access control (Admin, Analyst, Operations, Doctor)
- CSV data import for patient records, flow logs, and departmental data
- Predictive analytics for readmission risks
- Resource optimization recommendations
- Executive report generation with PDF export

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **Charts**: Custom D3.js visualizations
- **Icons**: Lucide React

## Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd careflow
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

Get these values from your Supabase project dashboard under Settings > API.

4. Run database migrations:

The database schema will be automatically applied when you first connect. The migrations include:
- User authentication tables
- Patient and department data tables
- Flow logs and readmission tracking
- Workspace management
- Row Level Security (RLS) policies

5. Start the development server:
```bash
npm run dev
```

6. Build for production:
```bash
npm run build
```

## Database Schema

The application uses the following main tables:

- `user_profiles` - User authentication and role management
- `workspaces` - Multi-tenant workspace isolation
- `workspace_members` - User workspace access control
- `patients` - Patient demographic and admission data
- `departments` - Hospital department information
- `doctors` - Medical staff records
- `patient_flow_logs` - Patient journey tracking
- `readmission_risks` - Predictive risk assessments

All tables are protected with Row Level Security (RLS) policies ensuring data isolation between workspaces.

## Role-Based Access Control

CareFlow supports four user roles with specific access permissions:

### Admin
- Full access to all features
- User management
- Data upload and management
- Executive reports

### Analyst
- Admission trends analysis
- Department overview
- Bottleneck intelligence
- Strategic risk outlook
- Data upload capabilities

### Operations
- Department overview
- Patient flow monitoring
- What-if simulations
- Optimization insights

### Doctor
- Department overview
- Patient flow analytics
- Bottleneck intelligence

## Usage

### First Time Setup

1. Create an account using the signup page
2. Select your role during registration
3. Create or join a workspace
4. Upload your healthcare data via CSV files

### Data Upload

The platform accepts three types of CSV files:

1. **Patient Data**
   - Patient ID, Name, Age, Gender
   - Admission/Discharge dates
   - Primary diagnosis, severity
   - LOS (Length of Stay)

2. **Flow Logs**
   - Patient ID, Department
   - Entry/Exit timestamps
   - Wait times, service times

3. **Departmental Data**
   - Department names
   - Capacity, occupancy
   - Staff counts, resource utilization

### Workspace Management

- Create workspaces for different hospital units or time periods
- Invite team members via email
- Switch between workspaces using the Share button
- Each workspace maintains isolated data

## Project Structure

```
careflow/
├── src/
│   ├── components/          # React components
│   │   ├── auth/           # Authentication pages
│   │   ├── charts/         # Visualization components
│   │   └── dashboards/     # Dashboard views
│   ├── contexts/           # React contexts (Auth)
│   ├── services/           # Business logic and API calls
│   ├── types/              # TypeScript type definitions
│   ├── utils/              # Helper functions
│   └── lib/                # Third-party integrations
├── supabase/
│   └── migrations/         # Database migrations
└── dist/                   # Production build
```

## Deployment

### Netlify

This project is configured for easy deployment to Netlify:

1. Push your code to GitHub
2. Connect your repository to Netlify
3. Configure build settings:
   - Build command: `npm run build`
   - Publish directory: `dist`
4. Add environment variables in Netlify dashboard (Site settings > Environment variables):
   - `VITE_SUPABASE_URL` - Your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` - Your Supabase anonymous key

The `netlify.toml` and `public/_redirects` files are included for proper SPA routing.

## Development

### Run type checking:
```bash
npm run typecheck
```

### Run linting:
```bash
npm run lint
```

### Build for production:
```bash
npm run build
```

### Preview production build:
```bash
npm run preview
```

## Security Features

- Supabase authentication with email/password
- Row Level Security (RLS) on all database tables
- Workspace-based data isolation
- Role-based access control
- Secure API endpoints with authentication checks

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please open an issue in the GitHub repository.

---

Built with React, TypeScript, and Supabase
