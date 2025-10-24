import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Database, 
  HardDrive, 
  Shield, 
  Download, 
  Upload, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Settings, 
  BarChart3, 
  Clock, 
  Trash2,
  Play,
  Pause,
  Eye,
  FileText,
  Lock,
  Unlock,
  Activity,
  Zap
} from "lucide-react";
import { apiService } from "@/lib/api";
import { toast } from "sonner";

interface DatabaseHealth {
  status: string;
  timestamp: string;
  database: {
    path: string;
    exists: boolean;
    size_bytes: number;
    size_mb: number;
    permissions: string;
    backup_enabled: boolean;
    backup_dir: string;
    last_backup: string | null;
  };
  backup_service: {
    enabled: boolean;
    running: boolean;
    interval_hours: number;
    retention_days: number;
    total_backups: number;
    total_size_mb: number;
    latest_backup: string | null;
    latest_backup_date: string | null;
  };
  connection_pool: {
    max_connections: number;
    created_connections: number;
    active_connections: number;
    available_connections: number;
    pool_size: number;
  };
  encryption: {
    enabled: boolean;
    encrypted_fields: string[];
    encrypted_settings: string[];
  };
}

interface BackupInfo {
  name: string;
  size: string;
  created: string;
}

interface DatabaseStats {
  success: boolean;
  statistics: {
    total_tables: number;
    total_records: number;
    database_size_mb: number;
    last_updated: string;
    table_counts: Record<string, number>;
  };
}

interface SecurityStatus {
  success: boolean;
  security_status: {
    file_permissions: {
      current: string;
      secure: boolean;
      recommended: string;
    };
    encryption: {
      enabled: boolean;
      encrypted_tables: string[];
      encrypted_settings: string[];
    };
    backup_security: {
      enabled: boolean;
      encrypted_backups: boolean;
      secure_location: string;
    };
    connection_security: {
      pooled_connections: boolean;
      timeout_enabled: boolean;
      wal_mode: boolean;
    };
  };
  overall_secure: boolean;
}

export function DatabaseManagement() {
  const [health, setHealth] = useState<DatabaseHealth | null>(null);
  const [stats, setStats] = useState<DatabaseStats | null>(null);
  const [security, setSecurity] = useState<SecurityStatus | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all data in parallel
      const [healthRes, statsRes, securityRes, backupsRes] = await Promise.all([
        apiService.get('/admin/database/health'),
        apiService.get('/admin/database/statistics'),
        apiService.get('/admin/database/security/status'),
        apiService.get('/admin/database/backup/list')
      ]);

      setHealth(healthRes);
      setStats(statsRes);
      setSecurity(securityRes);
      setBackups(backupsRes.backups || []);
      
    } catch (error) {
      console.error('Failed to fetch database data:', error);
      toast.error('Failed to load database information');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (action: string, endpoint: string, data?: any) => {
    try {
      setActionLoading(action);
      
      const response = await apiService.post(endpoint, data);
      
      if (response.success) {
        toast.success(response.message || 'Action completed successfully');
        await fetchData(); // Refresh data
      } else {
        toast.error(response.message || 'Action failed');
      }
    } catch (error) {
      console.error(`Failed to ${action}:`, error);
      toast.error(`Failed to ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleBackupAction = async (action: string, filename?: string) => {
    try {
      setActionLoading(action);
      
      let response;
      if (action === 'create') {
        response = await apiService.post('/admin/database/backup/create', {
          compress: true,
          encrypt: false
        });
      } else if (action === 'restore' && filename) {
        response = await apiService.post('/admin/database/backup/restore', {
          backup_filename: filename
        });
      } else if (action === 'delete' && filename) {
        response = await apiService.delete(`/admin/database/backup/delete/${filename}`);
      } else if (action === 'cleanup') {
        response = await apiService.post('/admin/database/backup/cleanup');
      }
      
      if (response?.success) {
        toast.success(response.message || 'Backup action completed');
        await fetchData();
      } else {
        toast.error(response?.message || 'Backup action failed');
      }
    } catch (error) {
      console.error(`Backup ${action} failed:`, error);
      toast.error(`Backup ${action} failed`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleServiceAction = async (action: 'start' | 'stop') => {
    try {
      setActionLoading(`service-${action}`);
      
      const response = await apiService.post(`/admin/database/backup/service/${action}`);
      
      if (response.success) {
        toast.success(response.message || `Backup service ${action}ed successfully`);
        await fetchData();
      } else {
        toast.error(response.message || `Failed to ${action} backup service`);
      }
    } catch (error) {
      console.error(`Service ${action} failed:`, error);
      toast.error(`Failed to ${action} backup service`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="w-5 h-5" />
            Database Management
          </CardTitle>
          <CardDescription>Loading database information...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Database Health Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Database Health Overview
          </CardTitle>
          <CardDescription>
            Real-time database status and performance metrics
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                <span className="text-sm font-medium">Database Size</span>
              </div>
              <div className="text-2xl font-bold">
                {health?.database.size_mb.toFixed(2)} MB
              </div>
              <div className="text-xs text-muted-foreground">
                {health?.database.size_bytes.toLocaleString()} bytes
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                <span className="text-sm font-medium">Total Records</span>
              </div>
              <div className="text-2xl font-bold">
                {stats?.statistics.total_records.toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                {stats?.statistics.total_tables} tables
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" />
                <span className="text-sm font-medium">Active Connections</span>
              </div>
              <div className="text-2xl font-bold">
                {health?.connection_pool.active_connections}
              </div>
              <div className="text-xs text-muted-foreground">
                {health?.connection_pool.max_connections} max
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span className="text-sm font-medium">Security Status</span>
              </div>
              <div className="flex items-center gap-2">
                {security?.overall_secure ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                )}
                <Badge variant={security?.overall_secure ? "default" : "secondary"}>
                  {security?.overall_secure ? "Secure" : "Needs Attention"}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Database Management Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Database Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Database className="w-5 h-5" />
                  Database Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Status</span>
                    <Badge variant={health?.status === 'healthy' ? 'default' : 'destructive'}>
                      {health?.status}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Path</span>
                    <span className="text-sm font-mono">{health?.database.path}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Permissions</span>
                    <Badge variant={security?.security_status.file_permissions.secure ? 'default' : 'secondary'}>
                      {health?.database.permissions}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Last Backup</span>
                    <span className="text-sm">
                      {health?.database.last_backup || 'Never'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connection Pool Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Connection Pool
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Active Connections</span>
                    <span className="text-sm font-bold">
                      {health?.connection_pool.active_connections}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Available</span>
                    <span className="text-sm">
                      {health?.connection_pool.available_connections}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Pool Size</span>
                    <span className="text-sm">
                      {health?.connection_pool.pool_size}
                    </span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Pool Usage</span>
                    <span>
                      {Math.round((health?.connection_pool.active_connections || 0) / (health?.connection_pool.max_connections || 1) * 100)}%
                    </span>
                  </div>
                  <Progress 
                    value={(health?.connection_pool.active_connections || 0) / (health?.connection_pool.max_connections || 1) * 100} 
                    className="h-2"
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Backups Tab */}
        <TabsContent value="backups" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Backup Service Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Backup Service
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {health?.backup_service.running ? (
                        <Play className="w-4 h-4 text-green-500" />
                      ) : (
                        <Pause className="w-4 h-4 text-gray-500" />
                      )}
                      <Badge variant={health?.backup_service.running ? 'default' : 'secondary'}>
                        {health?.backup_service.running ? 'Running' : 'Stopped'}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Interval</span>
                    <span className="text-sm">{health?.backup_service.interval_hours}h</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Retention</span>
                    <span className="text-sm">{health?.backup_service.retention_days} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Total Backups</span>
                    <span className="text-sm">{health?.backup_service.total_backups}</span>
                  </div>
                </div>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleServiceAction('start')}
                    disabled={actionLoading === 'service-start' || health?.backup_service.running}
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Start
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleServiceAction('stop')}
                    disabled={actionLoading === 'service-stop' || !health?.backup_service.running}
                  >
                    <Pause className="w-4 h-4 mr-2" />
                    Stop
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Backup Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  Backup Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Button
                    className="w-full"
                    onClick={() => handleBackupAction('create')}
                    disabled={actionLoading === 'create'}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Create Backup
                  </Button>
                  <Button
                    className="w-full"
                    variant="outline"
                    onClick={() => handleBackupAction('cleanup')}
                    disabled={actionLoading === 'cleanup'}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Cleanup Old Backups
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Backup List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Available Backups
              </CardTitle>
              <CardDescription>
                {backups.length} backup(s) available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No backups available
                </div>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <div className="font-medium">{backup.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {backup.size} • {backup.created}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleBackupAction('restore', backup.name)}
                          disabled={actionLoading === 'restore'}
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Restore
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleBackupAction('delete', backup.name)}
                          disabled={actionLoading === 'delete'}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* File Permissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="w-5 h-5" />
                  File Permissions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Current</span>
                    <Badge variant={security?.security_status.file_permissions.secure ? 'default' : 'secondary'}>
                      {security?.security_status.file_permissions.current}
                    </Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Recommended</span>
                    <span className="text-sm font-mono">
                      {security?.security_status.file_permissions.recommended}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Status</span>
                    <div className="flex items-center gap-2">
                      {security?.security_status.file_permissions.secure ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-yellow-500" />
                      )}
                      <Badge variant={security?.security_status.file_permissions.secure ? 'default' : 'secondary'}>
                        {security?.security_status.file_permissions.secure ? 'Secure' : 'Needs Fix'}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Encryption Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Encryption Status
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Field Encryption</span>
                    <div className="flex items-center gap-2">
                      {security?.security_status.encryption.enabled ? (
                        <Lock className="w-4 h-4 text-green-500" />
                      ) : (
                        <Unlock className="w-4 h-4 text-red-500" />
                      )}
                      <Badge variant={security?.security_status.encryption.enabled ? 'default' : 'destructive'}>
                        {security?.security_status.encryption.enabled ? 'Enabled' : 'Disabled'}
                      </Badge>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <span className="text-sm font-medium">Encrypted Tables:</span>
                    <div className="flex flex-wrap gap-1">
                      {security?.security_status.encryption.encrypted_tables.map((table, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {table}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Security Alerts */}
          {!security?.overall_secure && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Database security needs attention. Please review file permissions and encryption settings.
              </AlertDescription>
            </Alert>
          )}
        </TabsContent>

        {/* Maintenance Tab */}
        <TabsContent value="maintenance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Database Optimization */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  Database Optimization
                </CardTitle>
                <CardDescription>
                  Optimize database performance and free up space
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  onClick={() => handleAction('optimize', '/admin/database/maintenance/optimize')}
                  disabled={actionLoading === 'optimize'}
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Optimize Database
                </Button>
              </CardContent>
            </Card>

            {/* Integrity Check */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5" />
                  Integrity Check
                </CardTitle>
                <CardDescription>
                  Verify database integrity and detect corruption
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={() => handleAction('check', '/admin/database/maintenance/integrity-check')}
                  disabled={actionLoading === 'check'}
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Check Integrity
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Database Configuration
              </CardTitle>
              <CardDescription>
                Configure database settings and backup parameters
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Backup Interval (hours)</Label>
                    <div className="text-sm text-muted-foreground">
                      Current: {health?.backup_service.interval_hours}h
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Retention Period (days)</Label>
                    <div className="text-sm text-muted-foreground">
                      Current: {health?.backup_service.retention_days} days
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Max Connections</Label>
                    <div className="text-sm text-muted-foreground">
                      Current: {health?.connection_pool.max_connections}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Database Path</Label>
                    <div className="text-sm font-mono text-muted-foreground">
                      {health?.database.path}
                    </div>
                  </div>
                </div>
                
                <Alert>
                  <Settings className="h-4 w-4" />
                  <AlertDescription>
                    Database configuration is managed through environment variables. 
                    Contact your system administrator to modify these settings.
                  </AlertDescription>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
