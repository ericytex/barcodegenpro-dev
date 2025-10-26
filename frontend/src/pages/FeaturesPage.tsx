import React, { useState, useMemo, useEffect } from 'react';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiService, Feature, AddFeatureRequest } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { 
  Lightbulb, 
  CheckCircle, 
  Clock, 
  Send, 
  Zap, 
  AlertTriangle, 
  ArrowUp, 
  Loader, 
  Shield, 
  Star,
  TrendingUp,
  Target,
  BarChart3
} from 'lucide-react';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

const FeaturesPage = () => {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [features, setFeatures] = useState<Feature[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchFeatures = async () => {
      try {
        setIsLoading(true);
        const fetchedFeatures = await apiService.getFeatures();
        setFeatures(fetchedFeatures);
      } catch (error) {
        console.error("Failed to fetch features:", error);
        toast.error('Failed to load features');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) {
      setIsAdmin(user.is_admin || false);
    }

    fetchFeatures();
  }, [user]);

  const handleFeatureSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title || !description) {
      toast.error('Please fill in all fields');
      return;
    }

    setSubmitting(true);
    try {
      const newFeature = await apiService.addFeature({ title, description });
      setFeatures([newFeature, ...features]);
      setTitle('');
      setDescription('');
      toast.success('Feature suggestion submitted successfully!');
    } catch (error: any) {
      console.error("Failed to add feature:", error);
      const errorMessage = error?.message || 'Failed to submit feature suggestion';
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  const sortedFeatures = useMemo(() =>
    [...features].sort((a, b) => {
      if (a.status === 'Completed' && b.status !== 'Completed') return 1;
      if (a.status !== 'Completed' && b.status === 'Completed') return -1;
      return b.upvotes - a.upvotes;
    }), [features]
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Completed':
        return { icon: CheckCircle, color: 'bg-green-100 text-green-800 border-green-200', text: status };
      case 'In Progress':
        return { icon: Loader, color: 'bg-blue-100 text-blue-800 border-blue-200', text: status };
      case 'Planned':
        return { icon: Clock, color: 'bg-purple-100 text-purple-800 border-purple-200', text: status };
      default:
        return { icon: Lightbulb, color: 'bg-indigo-100 text-indigo-800 border-indigo-200', text: status };
    }
  };

  const FeatureCard = ({ feature }: { feature: Feature }) => {
    const { icon: StatusIcon, color: statusColor, text: statusText } = getStatusBadge(feature.status);
    const [updating, setUpdating] = useState(false);

    const handleUpdateStatus = async (newStatus: string) => {
      setUpdating(true);
      try {
        const updatedFeature = await apiService.updateFeature(feature.id, { status: newStatus });
        setFeatures(features.map(f => f.id === feature.id ? updatedFeature : f));
        toast.success(`Feature marked as ${newStatus}`);
      } catch (error: any) {
        console.error("Failed to update feature:", error);
        toast.error(error?.message || 'Failed to update feature status');
      } finally {
        setUpdating(false);
      }
    };

    const handleDelete = async () => {
      if (!confirm('Are you sure you want to delete this feature?')) return;

      setUpdating(true);
      try {
        await apiService.deleteFeature(feature.id);
        setFeatures(features.filter(f => f.id !== feature.id));
        toast.success('Feature deleted successfully');
      } catch (error: any) {
        console.error("Failed to delete feature:", error);
        toast.error(error?.message || 'Failed to delete feature');
      } finally {
        setUpdating(false);
      }
    };

    return (
      <Card className="hover:shadow-lg transition-shadow">
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start gap-3 sm:gap-4">
            <div className="flex items-center gap-3 sm:flex-col sm:items-center sm:gap-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="group hover:bg-indigo-50 hover:text-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed h-8 w-8"
                aria-label={`Upvote ${feature.title}`}
                disabled={true}
              >
                <ArrowUp className="w-4 h-4 text-gray-500 group-hover:text-indigo-600" />
              </Button>
              <div className="text-center">
                <div className="text-base sm:text-lg md:text-xl font-bold text-indigo-600">{feature.upvotes || 0}</div>
                <div className="text-xs text-gray-500">votes</div>
              </div>
            </div>

            <div className="flex-grow min-w-0">
              <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900 mb-1.5 sm:mb-2">{feature.title}</h3>
              <p className="text-sm text-gray-600 mb-2 sm:mb-3">{feature.description}</p>
              {feature.submitted_by && (
                <p className="text-xs text-gray-400">
                  Submitted by: <span className="font-mono text-gray-500">{feature.submitted_by}</span>
                </p>
              )}
              
              {/* Admin Actions */}
              {isAdmin && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {feature.status !== 'Completed' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus('Completed')}
                      disabled={updating}
                      className="text-xs border-green-200 text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Mark Complete
                    </Button>
                  )}
                  {feature.status !== 'In Progress' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus('In Progress')}
                      disabled={updating}
                      className="text-xs border-blue-200 text-blue-700 hover:bg-blue-50"
                    >
                      <Loader className="w-3 h-3 mr-1" />
                      In Progress
                    </Button>
                  )}
                  {feature.status !== 'Planned' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus('Planned')}
                      disabled={updating}
                      className="text-xs border-purple-200 text-purple-700 hover:bg-purple-50"
                    >
                      <Clock className="w-3 h-3 mr-1" />
                      Mark Planned
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleDelete}
                    disabled={updating}
                    className="text-xs border-red-200 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              )}
            </div>

            <div className="flex-shrink-0 self-start sm:self-auto">
              <Badge variant="outline" className={`${statusColor} border`}>
                <StatusIcon className="w-3 h-3 mr-1" />
                {statusText}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  const stats = useMemo(() => {
    const total = features.length;
    const completed = features.filter(f => f.status === 'Completed').length;
    const inProgress = features.filter(f => f.status === 'In Progress').length;
    const planned = features.filter(f => f.status === 'Planned').length;
    const totalVotes = features.reduce((sum, f) => sum + (f.upvotes || 0), 0);

    return { total, completed, inProgress, planned, totalVotes };
  }, [features]);

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
        {/* Header Section */}
        <div className="bg-white border-b border-gray-200 shadow-sm">
          <div className="px-4 sm:px-6 py-4 sm:py-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Lightbulb className="h-5 w-5 sm:h-6 sm:w-6 text-indigo-600" />
                  </div>
                  Feature Roadmap
                </h1>
                <p className="text-sm sm:text-base text-gray-600">
                  Share your ideas and track feature development progress
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="px-4 sm:px-6 lg:px-8 py-4 sm:py-6 space-y-4 sm:space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 sm:p-2 bg-indigo-100 rounded-lg">
                    <Lightbulb className="h-3 w-3 sm:h-4 sm:w-4 text-indigo-600" />
                  </div>
                  <Badge variant="outline" className="text-xs">Total</Badge>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-indigo-900">{stats.total}</div>
                <div className="text-xs text-indigo-700">Features</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 sm:p-2 bg-green-100 rounded-lg">
                    <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-green-100">Completed</Badge>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-green-900">{stats.completed}</div>
                <div className="text-xs text-green-700">Done</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
                    <Loader className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600 animate-spin" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-blue-100">In Progress</Badge>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-blue-900">{stats.inProgress}</div>
                <div className="text-xs text-blue-700">Active</div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
              <CardContent className="p-3 sm:p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="p-1.5 sm:p-2 bg-purple-100 rounded-lg">
                    <Clock className="h-3 w-3 sm:h-4 sm:w-4 text-purple-600" />
                  </div>
                  <Badge variant="outline" className="text-xs bg-purple-100">Planned</Badge>
                </div>
                <div className="text-xl sm:text-2xl font-bold text-purple-900">{stats.planned}</div>
                <div className="text-xs text-purple-700">Queue</div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="view" className="space-y-4 sm:space-y-6">
            <TabsList className="grid w-full grid-cols-2 bg-white shadow-sm">
              <TabsTrigger value="view" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                <span className="hidden sm:inline">View Features</span>
                <span className="sm:hidden">View</span>
              </TabsTrigger>
              <TabsTrigger value="submit" className="flex items-center gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Submit Feature</span>
                <span className="sm:hidden">Submit</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="view" className="space-y-3 sm:space-y-4">
              {isLoading ? (
                <Card className="flex flex-col items-center justify-center h-64 p-8">
                  <Loader className="w-8 h-8 text-indigo-600 animate-spin" />
                  <p className="mt-4 text-lg font-medium text-gray-700">Loading features...</p>
                </Card>
              ) : (
                <>
                  {sortedFeatures.length === 0 ? (
                    <Card className="p-6 sm:p-8 text-center">
                      <Lightbulb className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-700 mb-2">No features yet</p>
                      <p className="text-sm text-gray-500">Be the first to suggest a feature!</p>
                    </Card>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {sortedFeatures.map(feature => (
                        <FeatureCard key={feature.id} feature={feature} />
                      ))}
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            <TabsContent value="submit" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Send className="h-5 w-5 text-indigo-600" />
                    Submit a Feature Request
                  </CardTitle>
                  <CardDescription>
                    Share your ideas to help us improve the platform
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleFeatureSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Feature Title</Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="e.g., Add dark mode option"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <textarea
                        id="description"
                        name="description"
                        rows={6}
                        placeholder="Describe your feature idea and why it would be helpful..."
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        required
                        className="w-full p-2 border border-gray-300 rounded-lg shadow-sm focus:ring-indigo-500 focus:border-indigo-500 resize-none"
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {submitting ? 'Submitting...' : 'Submit Feature'}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FeaturesPage;
