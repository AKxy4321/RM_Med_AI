import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Calendar,
  Heart,
  Sparkles,
  Search,
  Brain,
  Ambulance,
} from 'lucide-react';

const Dashboard = ({
  onNavigateToSymptomAnalysis,
  onNavigateToAppointment,
  onNavigateToLifestyleRecs,
  onNavigateToEmergencySupport,
}) => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user'));

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const FeatureCard = ({
    icon: Icon,
    title,
    description,
    action,
    gradient,
    onClick,
  }) => (
    <div
      className="bg-white rounded-2xl p-6 shadow-sm hover:scale-[1.02] transition-all duration-200 cursor-pointer"
      onClick={onClick}
    >
      <div
        className={`p-3 rounded-xl ${gradient} w-12 h-12 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200`}
      >
        <Icon className="w-6 h-6 text-white" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-600 mb-4 leading-relaxed">{description}</p>
      <button className="w-full bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors duration-200">
        {action}
      </button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50/50">
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-xl">
                <Heart className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
                  MediSense
                </h1>
                <p className="text-xs text-gray-500">Healthcare Dashboard</p>
              </div>
            </div>

            <div className="flex-1 max-w-2xl mx-8">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search medical records, appointments..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white/50 backdrop-blur-sm"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-cyan-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                  {user?.avatar || '👩‍💼'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-medium text-gray-900">{user?.name}</p>
                  <p className="text-xs text-gray-500">Patient</p>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block text-sm font-medium">Logout</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ======= Main ======= */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-600">
            Here's your health overview and quick access to medical services.
          </p>
        </div>

        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Quick Actions</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* 🤒 Symptom Analysis */}
            <FeatureCard
              icon={Brain}
              title="Symptom Analysis"
              description="Get AI-powered insights about your symptoms and recommended actions."
              action="Analyze Symptoms"
              gradient="bg-gradient-to-r from-blue-600 to-cyan-500"
              onClick={onNavigateToSymptomAnalysis}
            />

            {/* 🚨 Emergency Support */}
            <FeatureCard
              icon={Ambulance}
              title="Emergency Support"
              description="Access quick medical help and locate nearby hospitals instantly."
              action="Get Help Now"
              gradient="bg-gradient-to-r from-red-500 to-pink-500"
              onClick={onNavigateToEmergencySupport}
            />

            {/* 🌿 Lifestyle Recommendations */}
            <FeatureCard
              icon={Sparkles}
              title="Lifestyle Recommendations"
              description="Get personalized diet, activity, and wellness tips based on your health profile."
              action="View Tips"
              gradient="bg-gradient-to-r from-teal-500 to-cyan-500"
              onClick={onNavigateToLifestyleRecs}
            />

            {/* 📅 Book Appointment */}
            <FeatureCard
              icon={Calendar}
              title="Book Appointment"
              description="Schedule with healthcare providers based on your needs and availability."
              action="Book Now"
              gradient="bg-gradient-to-r from-green-500 to-emerald-500"
              onClick={onNavigateToAppointment}
            />

            {/* 🩺 Health Records */}
            <FeatureCard
              icon={Heart}
              title="Health Records"
              description="Access your complete medical history and test results securely."
              action="View Records"
              gradient="bg-gradient-to-r from-purple-500 to-indigo-500"
            />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
