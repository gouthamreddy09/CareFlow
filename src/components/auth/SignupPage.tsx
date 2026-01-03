import { useState } from 'react';
import { useAuth, type UserRole } from '../../contexts/AuthContext';
import { Activity, UserPlus, LogIn, AlertCircle, CheckCircle, Mail } from 'lucide-react';

interface SignupPageProps {
  onSwitchToLogin: () => void;
}

export function SignupPage({ onSwitchToLogin }: SignupPageProps) {
  const { signUp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('analyst');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setNeedsVerification(false);
    setLoading(true);

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await signUp(email, password, fullName, role);

    if (result.error) {
      setError(result.error.message || 'Failed to create account');
    } else if (result.needsVerification) {
      setNeedsVerification(true);
    } else {
      setSuccess(true);
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex items-center justify-center mb-8">
          <div className="p-3 bg-blue-600 rounded-xl">
            <Activity className="w-8 h-8 text-white" />
          </div>
        </div>

        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          Create Account
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Join FlowCure to access healthcare analytics
        </p>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {needsVerification && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3 mb-3">
              <Mail className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-blue-900">Verify your email</h3>
                <p className="text-sm text-blue-800 mt-1">
                  We've sent a verification email to <strong>{email}</strong>
                </p>
              </div>
            </div>
            <div className="pl-8 space-y-2 text-sm text-blue-700">
              <p>Please check your inbox and click the verification link to activate your account.</p>
              <p className="text-xs">Can't find the email? Check your spam folder.</p>
            </div>
            <button
              onClick={onSwitchToLogin}
              className="mt-4 ml-8 text-sm text-blue-600 hover:text-blue-700 font-medium underline"
            >
              Back to login
            </button>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-green-800">Account created successfully! Redirecting to login...</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="you@example.com"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="At least 6 characters"
            />
          </div>

          <div>
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value as UserRole)}
              required
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            >
              <option value="analyst">Data Analyst</option>
              <option value="doctor">Doctor</option>
              <option value="operations">Operations Staff</option>
              <option value="admin">Admin</option>
            </select>
            <p className="mt-2 text-xs text-gray-500">
              {role === 'admin' && 'Full access to all features and user management'}
              {role === 'doctor' && 'View patient journeys and department bottlenecks'}
              {role === 'analyst' && 'Access analytics dashboards and run simulations'}
              {role === 'operations' && 'View admissions, beds, and wait times only'}
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || success || needsVerification}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            <UserPlus className="w-5 h-5" />
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        {!needsVerification && (
          <div className="mt-6 text-center">
            <button
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-700 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              Already have an account? Sign in
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
