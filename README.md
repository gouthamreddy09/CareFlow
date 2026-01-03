# FlowCure

> Healthcare Analytics Platform for Hospital Operations Optimization

FlowCure is a powerful analytics platform designed to help hospitals optimize patient flow, detect operational bottlenecks, and make data-driven decisions. Built with React, TypeScript, and Supabase.

---

## Features

### Core Analytics Dashboards

- **Executive Overview** - Real-time KPIs and performance metrics for leadership
- **Admission Trends** - Track and analyze patient admission patterns over time
- **Department Overview** - Monitor department-specific operational metrics
- **Patient Flow Analytics** - Visualize patient journeys through the healthcare system
- **Bottleneck Intelligence** - Automatically detect and analyze operational bottlenecks
- **What-If Simulation** - Test scenarios before implementing operational changes
- **Optimization Insights** - AI-powered recommendations for resource allocation
- **Strategic Risk Outlook** - Predict readmission risks and plan resources

### Key Capabilities

- Real-time data visualization with interactive charts
- Multi-workspace support for different departments/facilities
- Role-based access control (Admin, Analyst, Operations, Doctor)
- CSV data import with validation and cleaning
- Predictive analytics for risk assessment
- Executive report generation with PDF export
- Secure multi-tenant architecture

---

## Tech Stack

**Frontend**
- React 18 with TypeScript
- Vite for fast development and builds
- Tailwind CSS for styling
- Lucide React for icons

**Backend & Database**
- Supabase (PostgreSQL) for database and authentication
- Row Level Security (RLS) for data isolation
- Real-time subscriptions for live updates

**Analytics**
- Custom algorithms for bottleneck detection
- Predictive risk scoring
- Statistical analysis and trend forecasting

---

## Quick Start

### Prerequisites

- Node.js 18 or higher
- npm or yarn
- A Supabase account ([Sign up free](https://supabase.com))

### Installation

1. **Clone the repository**

```bash
git clone https://github.com/yourusername/flowcure.git
cd flowcure
```

2. **Install dependencies**

```bash
npm install
```

3. **Set up Supabase**

- Create a new project at [supabase.com](https://supabase.com)
- Copy your project URL and anon key from Settings > API

4. **Configure environment variables**

Create a `.env` file in the root directory:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. **Apply database migrations**

The database schema will be automatically created on first connection. Migrations include:
- User authentication and profiles
- Multi-tenant workspace management
- Patient and department data tables
- Flow logs and analytics tables
- Row Level Security policies

6. **Start the development server**

```bash
npm run dev
```

Visit `http://localhost:5173` to see the application.

7. **Build for production**

```bash
npm run build
```

---

## Getting Started

### First-Time Setup

1. **Create an Account**
   - Navigate to the signup page
   - Enter your email, password, and full name
   - Select your role (Admin, Analyst, Operations, or Doctor)

2. **Create a Workspace**
   - After logging in, create your first workspace
   - Workspaces isolate data between different departments or facilities

3. **Upload Data**
   - Click the upload button to import CSV files
   - Three data types are supported:
     - **Patient Data**: Demographics, admission dates, diagnoses
     - **Flow Logs**: Patient movement through departments
     - **Department Data**: Capacity, staffing, occupancy

4. **Explore Dashboards**
   - Access different views based on your role
   - Apply filters to analyze specific time periods or departments
   - Generate reports and export insights

### Sample Data Format

**Patient Data CSV**
```csv
patient_id,name,age,gender,admission_date,discharge_date,primary_diagnosis,severity,los
P001,John Doe,65,Male,2024-01-15,2024-01-20,Pneumonia,High,5
P002,Jane Smith,45,Female,2024-01-16,2024-01-18,Fracture,Medium,2
```

**Flow Logs CSV**
```csv
patient_id,department,entry_time,exit_time,wait_time,service_time
P001,Emergency,2024-01-15 08:00,2024-01-15 09:30,30,60
P001,Radiology,2024-01-15 09:30,2024-01-15 10:45,15,60
```

**Department Data CSV**
```csv
department,capacity,current_occupancy,staff_count,avg_wait_time
Emergency,50,42,15,25
ICU,20,18,25,10
```

---

## Role-Based Access

FlowCure implements granular access control based on user roles:

| Role | Access |
|------|--------|
| **Admin** | Full access: All dashboards, user management, data upload, executive reports |
| **Analyst** | Admission trends, department overview, bottleneck analysis, risk analytics, data upload |
| **Operations** | Department overview, patient flow, simulations, optimization insights |
| **Doctor** | Department overview, patient flow, bottleneck intelligence |

---

## Architecture

```
┌─────────────────────────────────────┐
│     React Frontend (TypeScript)     │
│  ├── Components (UI Layer)          │
│  ├── Services (Business Logic)      │
│  └── Contexts (State Management)    │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│        Supabase Backend             │
│  ├── PostgreSQL Database            │
│  ├── Authentication & Auth          │
│  ├── Row Level Security (RLS)       │
│  └── Real-time Subscriptions        │
└─────────────────────────────────────┘
```

**Key Design Principles:**
- **Security First**: Database-level RLS ensures data isolation
- **Multi-Tenancy**: Workspace-based data segregation
- **Type Safety**: End-to-end TypeScript
- **Serverless**: No infrastructure management required

---

## Development

### Available Scripts

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Run type checking
npm run typecheck

# Run ESLint
npm run lint
```

### Project Structure

```
flowcure/
├── src/
│   ├── components/       # React components
│   │   ├── auth/        # Login/Signup
│   │   ├── charts/      # Visualizations
│   │   └── dashboards/  # Dashboard views
│   ├── contexts/        # React contexts
│   ├── services/        # Business logic
│   ├── types/           # TypeScript types
│   ├── utils/           # Helper functions
│   └── lib/             # Third-party configs
├── supabase/
│   └── migrations/      # Database migrations
├── public/              # Static assets
└── dist/                # Production build
```

---

## Deployment

### Deploy to Netlify

1. **Connect Repository**
   - Push your code to GitHub
   - Connect the repository to Netlify

2. **Configure Build Settings**
   - Build command: `npm run build`
   - Publish directory: `dist`

3. **Add Environment Variables**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

4. **Deploy**
   - Netlify will automatically build and deploy
   - The included `netlify.toml` handles SPA routing

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

Add environment variables in the Vercel dashboard.

---

## Security

FlowCure implements multiple layers of security:

1. **Authentication**
   - Supabase Auth with secure session management
   - Password hashing with bcrypt

2. **Authorization**
   - Row Level Security (RLS) enforced at database level
   - Role-based access control (RBAC)
   - Workspace isolation

3. **Data Protection**
   - Encryption at rest (PostgreSQL)
   - HTTPS/TLS for data in transit
   - Prepared statements prevent SQL injection

4. **Compliance**
   - HIPAA-ready architecture
   - Audit logging capabilities
   - Secure multi-tenant design

---

## Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**

2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
   - Follow the existing code style
   - Add tests if applicable
   - Update documentation

4. **Commit your changes**
```bash
git commit -m 'Add amazing feature'
```

5. **Push to your branch**
```bash
git push origin feature/amazing-feature
```

6. **Open a Pull Request**
   - Provide a clear description of the changes
   - Reference any related issues

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing component structure
- Write meaningful commit messages
- Test your changes thoroughly
- Update README if needed

---

## Roadmap

### Planned Features

- [ ] Real-time alerts and notifications
- [ ] Mobile app (React Native)
- [ ] Advanced machine learning models
- [ ] Custom report builder
- [ ] API for third-party integrations
- [ ] Multi-language support
- [ ] Dark mode
- [ ] HL7/FHIR integration
- [ ] Advanced data export options
- [ ] Team collaboration features

### Future Improvements

- Backend analytics processing for larger datasets
- Real-time data streaming from hospital systems
- Enhanced predictive models
- Automated anomaly detection
- Integration with EHR systems

---

## Troubleshooting

### Common Issues

**Build Errors**
```bash
# Clear node modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

**Database Connection Issues**
- Verify your Supabase URL and key in `.env`
- Check that your Supabase project is active
- Ensure network connectivity

**CSV Upload Fails**
- Verify CSV format matches the sample templates
- Check for special characters or encoding issues
- Ensure all required columns are present

**Permission Denied Errors**
- Verify your user role has access to the feature
- Check workspace membership
- Review RLS policies in Supabase dashboard

---

## FAQ

**Q: Can I use this for multiple hospitals?**
A: Yes, use workspaces to isolate data between different facilities.

**Q: What's the maximum data size supported?**
A: Client-side analytics work best with up to 100K records. For larger datasets, consider server-side processing.

**Q: Is this HIPAA compliant?**
A: The architecture follows HIPAA best practices, but full compliance requires additional operational controls.

**Q: Can I customize the dashboards?**
A: Yes, the codebase is modular and designed for customization.

**Q: What browsers are supported?**
A: Modern browsers (Chrome, Firefox, Safari, Edge) with ES6 support.

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## Support

- **Documentation**: See the full documentation in the `/docs` folder
- **Issues**: Report bugs via [GitHub Issues](https://github.com/yourusername/flowcure/issues)
- **Discussions**: Join conversations in [GitHub Discussions](https://github.com/yourusername/flowcure/discussions)
- **Email**: [your-email@example.com]

---

## Acknowledgments

- Built with [React](https://react.dev/)
- Powered by [Supabase](https://supabase.com)
- Styled with [Tailwind CSS](https://tailwindcss.com)
- Icons by [Lucide](https://lucide.dev)

---

## Star History

If you find this project useful, please consider giving it a star on GitHub!

[![Star History Chart](https://api.star-history.com/svg?repos=yourusername/flowcure&type=Date)](https://star-history.com/#yourusername/flowcure&Date)

---

**Made with ❤️ for healthcare professionals**

[Website](#) | [Documentation](#) | [Demo](#)
