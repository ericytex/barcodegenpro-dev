import { DashboardLayout } from "@/components/DashboardLayout";
import React, { useState, useMemo, useEffect } from 'react';
import { Lightbulb, Bug, CheckCircle, Clock, Send, Zap, List, AlertTriangle, ArrowUp, Loader, Shield, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { apiService, Feature, AddFeatureRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

const App = () => {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        const fetchedFeatures = await apiService.getFeatures();
        setFeatures(fetchedFeatures);
      } catch (error) {
        console.error("Failed to fetch features:");
      }
      setIsLoading(false);
    };

    fetchFeatures();
  }, []);

  const handleFeatureSubmit = async (e) => {
    e.preventDefault();

    const form = e.currentTarget;
    const title = form.elements.title.value;
    const description = form.elements.description.value;

    if (!title || !description) return;

    try {
      const newFeature = await apiService.addFeature({ title, description });
      setFeatures([newFeature, ...features]);
      form.reset();
    } catch (error) {
      console.error("Failed to add feature:");
    }
  };

  const sortedFeatures = useMemo(() =>
    [...features].sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return b.upvotes - a.upvotes;
    }), [features]
  );

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Completed':
        return { icon: CheckCircle, color: 'text-green-600 bg-green-100', text: status };
      case 'In Progress':
        return { icon: Loader, color: 'text-blue-600 bg-blue-100', text: status };
      case 'Planned':
        return { icon: Clock, color: 'text-purple-600 bg-purple-100', text: status };
      default:
        return { icon: Lightbulb, color: 'text-indigo-600 bg-indigo-100', text: status };
    }
  };

  const FeatureCard = ({ feature }) => {
    const { icon: StatusIcon, color: statusColor, text: statusText } = getStatusBadge(feature.status);

    return (
      <div className="flex items-start p-4 transition duration-300 bg-white border border-gray-100 rounded-xl shadow-md hover:shadow-lg">
        <div className="flex flex-col items-center flex-shrink-0 mr-4">
          <button
            className="p-2 transition duration-150 bg-gray-50 rounded-full hover:bg-indigo-100 group disabled:opacity-50 disabled:cursor-not-allowed"
            aria-label={`Upvote ${feature.title}`}
            disabled={true}
          >
            <ArrowUp className="w-5 h-5 text-gray-500 transition duration-150 group-hover:text-indigo-600" />
          </button>
          <span className="mt-1 text-lg font-bold text-gray-800">{feature.upvotes}</span>
        </div>

        <div className="flex-grow">
          <h3 className="mb-1 text-xl font-semibold text-gray-800">{feature.title}</h3>
          <p className="text-sm text-gray-600 line-clamp-2">{feature.description}</p>
          <p className="mt-2 text-xs text-gray-400">Submitted by: <span className="font-mono text-gray-500">{feature.submitted_by?.substring(0, 8)}...</span></p>
        </div>

        <div className="flex flex-col items-end flex-shrink-0 ml-4 w-32">
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${statusColor}`}>
              <StatusIcon className="w-3 h-3 mr-1" />
              {statusText}
            </div>
        </div>
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto py-8">
        <header className="mb-8">
          <h1 className="flex items-center text-4xl font-extrabold text-gray-900">
            <Shield className="w-8 h-8 mr-3 text-indigo-600" />
            Community Feedback & Tracking
          </h1>
          <p className="mt-2 text-gray-600">
            Suggest new features or report bugs. Your input is crucial for our development roadmap!
          </p>
          {user && (
            <div className="mt-4 text-xs font-medium text-gray-500">
              <p>Current User ID: <span className="font-mono text-indigo-600 break-all">{user.id}</span></p>
            </div>
          )}
        </header>

        <div className="flex p-1 mb-6 space-x-1 bg-white rounded-xl shadow-md">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex-1 flex justify-center items-center py-2 px-4 rounded-lg font-semibold transition-all duration-200 ${
              activeTab === 'suggestions'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Lightbulb className="w-5 h-5 mr-2" />
            Feature Suggestions
          </button>
        </div>
        
        {isLoading ? (
          <Card className="flex flex-col items-center justify-center h-64 p-8 shadow-lg">
            <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
            <p className="mt-4 text-lg font-medium text-gray-700">Loading features...</p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            <Card className="md:col-span-1 shadow-lg h-fit">
              <CardHeader>
                <CardTitle>Submit an Idea</CardTitle>
                <CardDescription>Tell us what you want to see next!</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleFeatureSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="feature-title" className="block text-sm font-medium text-gray-700">Title</label>
                    <input
                      type="text"
                      id="feature-title"
                      name="title"
                      placeholder="e.g., Add a dark mode option"
                      required
                      className="w-full p-2 mt-1 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label htmlFor="feature-description" className="block text-sm font-medium text-gray-700">Description</label>
                    <textarea
                      id="feature-description"
                      name="description"
                      rows="4"
                      placeholder="Explain your idea and why it would be helpful."
                      required
                      className="w-full p-2 mt-1 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                    ></textarea>
                  </div>
                  <button
                    type="submit"
                    className="flex items-center justify-center w-full px-4 py-2 text-base font-medium text-white transition duration-150 bg-indigo-600 border border-transparent rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Submit Suggestion
                  </button>
                </form>
              </CardContent>
            </Card>

            <div className="md:col-span-2 space-y-4">
              <h2 className="text-2xl font-bold text-gray-800">Suggestions ({features.length})</h2>
              {sortedFeatures.map(feature => (
                <FeatureCard key={feature.id} feature={feature} />
              ))}
              {features.length === 0 && (
                <Card className="p-4 text-center text-gray-500 shadow-inner">No features suggested yet. Be the first!</Card>
              )}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
};

export default App;