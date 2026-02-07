import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  Search, 
  Filter, 
  CheckCircle2, 
  XCircle, 
  Clock,
  User,
  Activity,
  ChevronLeft,
  ChevronRight,
  Download
} from 'lucide-react';

interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  username: string;
  deviceId?: string;
  deviceName?: string;
  command?: string;
  success: boolean;
  ip: string;
}

interface AuditLogsResponse {
  logs: AuditLog[];
  total: number;
  limit: number;
  offset: number;
}

export default function AuditLogViewer() {
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'success' | 'failed'>('all');
  const [userFilter, setUserFilter] = useState('');
  const limit = 20;

  const { data, isLoading, error } = useQuery<AuditLogsResponse>({
    queryKey: ['audit-logs', page, limit],
    queryFn: () => adminAPI.getAuditLogs(limit, page * limit),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Client-side filtering
  const filteredLogs = data?.logs?.filter(log => {
    const matchesSearch = searchTerm === '' || 
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.deviceName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.ip.includes(searchTerm);

    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'success' && log.success) ||
      (statusFilter === 'failed' && !log.success);

    const matchesUser = userFilter === '' ||
      log.username.toLowerCase().includes(userFilter.toLowerCase());

    return matchesSearch && matchesStatus && matchesUser;
  }) || [];

  const totalPages = Math.ceil((data?.total || 0) / limit);

  const exportToCSV = () => {
    if (!filteredLogs.length) return;

    const headers = ['Timestamp', 'User', 'Action', 'Device', 'Command', 'Status', 'IP'];
    const rows = filteredLogs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.username,
      log.action,
      log.deviceName || '-',
      log.command || '-',
      log.success ? 'Success' : 'Failed',
      log.ip
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActionColor = (action: string) => {
    if (action.includes('POST')) return 'text-blue-600 dark:text-blue-400';
    if (action.includes('DELETE')) return 'text-red-600 dark:text-red-400';
    if (action.includes('PUT') || action.includes('PATCH')) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-gray-600 dark:text-gray-400';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleString();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            <CardTitle>Audit Logs</CardTitle>
            <span className="text-sm text-muted-foreground">
              ({data?.total || 0} total entries)
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportToCSV}
            disabled={!filteredLogs.length}
          >
            <Download className="w-4 h-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search action, user, device, IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="relative">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Filter by user..."
              value={userFilter}
              onChange={(e) => setUserFilter(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2">
            <Button
              variant={statusFilter === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('all')}
              className="flex-1"
            >
              All
            </Button>
            <Button
              variant={statusFilter === 'success' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('success')}
              className="flex-1"
            >
              <CheckCircle2 className="w-4 h-4 mr-1" />
              Success
            </Button>
            <Button
              variant={statusFilter === 'failed' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setStatusFilter('failed')}
              className="flex-1"
            >
              <XCircle className="w-4 h-4 mr-1" />
              Failed
            </Button>
          </div>
        </div>

        {/* Logs Table */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-center py-12 text-destructive">
            <XCircle className="w-8 h-8 mx-auto mb-2" />
            Failed to load audit logs
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No audit logs found
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="border-b">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="pb-3 font-medium">Time</th>
                    <th className="pb-3 font-medium">User</th>
                    <th className="pb-3 font-medium">Action</th>
                    <th className="pb-3 font-medium hidden md:table-cell">Device</th>
                    <th className="pb-3 font-medium hidden lg:table-cell">IP</th>
                    <th className="pb-3 font-medium text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredLogs.map((log) => (
                    <tr key={log.id} className="text-sm hover:bg-muted/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Clock className="w-3 h-3" />
                          <span className="whitespace-nowrap">
                            {formatTimestamp(log.timestamp)}
                          </span>
                        </div>
                      </td>
                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          <User className="w-3 h-3 text-muted-foreground" />
                          <span className="font-medium">{log.username}</span>
                        </div>
                      </td>
                      <td className="py-3">
                        <span className={`font-mono text-xs ${getActionColor(log.action)}`}>
                          {log.action}
                        </span>
                        {log.command && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Command: {log.command}
                          </div>
                        )}
                      </td>
                      <td className="py-3 hidden md:table-cell">
                        {log.deviceName ? (
                          <span className="text-muted-foreground">{log.deviceName}</span>
                        ) : (
                          <span className="text-muted-foreground/50">-</span>
                        )}
                      </td>
                      <td className="py-3 hidden lg:table-cell">
                        <span className="font-mono text-xs text-muted-foreground">
                          {log.ip}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        {log.success ? (
                          <span className="inline-flex items-center gap-1 text-green-600 dark:text-green-400">
                            <CheckCircle2 className="w-4 h-4" />
                            <span className="hidden sm:inline">Success</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400">
                            <XCircle className="w-4 h-4" />
                            <span className="hidden sm:inline">Failed</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between mt-6 pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {page * limit + 1} to {Math.min((page + 1) * limit, data?.total || 0)} of {data?.total || 0}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Previous
                </Button>
                <div className="flex items-center gap-2 px-3">
                  <span className="text-sm">
                    Page {page + 1} of {totalPages}
                  </span>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
