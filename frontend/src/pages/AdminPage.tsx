import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '@/lib/api';
import { useAuthStore } from '@/lib/auth';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import AuditLogViewer from '@/components/admin/AuditLogViewer';
import ACLEditor from '@/components/admin/ACLEditor';
import RoomTabsManager from '@/components/admin/RoomTabsManager';
import { ArrowLeft, Users, Activity, Shield, LayoutGrid } from 'lucide-react';

type TabType = 'overview' | 'audit-logs' | 'permissions' | 'room-tabs';

export default function AdminPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const { isDemoMode } = useAuthStore();
  
  const { data: usersData, isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminAPI.getUsers,
  });

  return (
    <div className="min-h-screen bg-background">
      {/* Demo Mode Banner */}
      {isDemoMode && (
        <div className="bg-yellow-500 text-yellow-950 px-4 py-2 text-center text-sm font-medium">
          🎭 Demo Mode Active - Using test devices (no real SmartThings connection)
        </div>
      )}
      
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/')}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
              <h1 className="text-2xl font-bold">Admin Panel</h1>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2">
            <Button
              variant={activeTab === 'overview' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('overview')}
            >
              <Users className="w-4 h-4 mr-2" />
              Overview
            </Button>
            <Button
              variant={activeTab === 'permissions' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('permissions')}
            >
              <Shield className="w-4 h-4 mr-2" />
              Permissions
            </Button>
            <Button
              variant={activeTab === 'audit-logs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('audit-logs')}
            >
              <Activity className="w-4 h-4 mr-2" />
              Audit Logs
            </Button>
            <Button
              variant={activeTab === 'room-tabs' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setActiveTab('room-tabs')}
            >
              <LayoutGrid className="w-4 h-4 mr-2" />
              Room Tabs
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {activeTab === 'overview' && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {isLoading ? '...' : usersData?.users?.length || 0}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Users</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-8">
                    <LoadingSpinner />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {usersData?.users?.map((user: any) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <div className="font-medium">{user.username}</div>
                          <div className="text-sm text-muted-foreground capitalize">
                            {user.role}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Devices: {user.accessControl?.devices?.length || 0} |
                          Rooms: {user.accessControl?.rooms?.length || 0}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground">
                <strong>Phase 2 Progress:</strong> Audit Log Viewer and Visual ACL Editor are now available! 
                Use the tabs above to manage user permissions and monitor system activity.
              </p>
            </div>
          </>
        )}

        {activeTab === 'permissions' && <ACLEditor />}

        {activeTab === 'audit-logs' && <AuditLogViewer />}

        {activeTab === 'room-tabs' && <RoomTabsManager />}
      </main>
    </div>
  );
}
