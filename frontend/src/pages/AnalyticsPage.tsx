import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { analyticsAPI, deviceAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { 
  BarChart, 
  Calendar, 
  TrendingUp, 
  Activity, 
  Clock,
  ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function AnalyticsPage() {
  const navigate = useNavigate();
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('7d');
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);

  // Calculate date range based on selected period
  const dateRange = useMemo(() => {
    const endDate = new Date().toISOString();
    const startDate = new Date();
    
    switch (selectedPeriod) {
      case '7d':
        startDate.setDate(startDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(startDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(startDate.getDate() - 90);
        break;
    }
    
    return {
      startDate: startDate.toISOString(),
      endDate,
    };
  }, [selectedPeriod]);

  // Fetch usage stats
  const { data: usageData, isLoading: usageLoading } = useQuery({
    queryKey: ['analytics', 'usage-stats', dateRange],
    queryFn: () => analyticsAPI.getUsageStats({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      limit: 10,
    }),
  });

  // Fetch devices for device selector
  const { data: devicesData } = useQuery({
    queryKey: ['devices'],
    queryFn: deviceAPI.getDevices,
  });

  // Fetch device-specific history if a device is selected
  const { data: deviceHistoryData, isLoading: historyLoading } = useQuery({
    queryKey: ['analytics', 'device-history', selectedDevice, dateRange],
    queryFn: () => selectedDevice 
      ? analyticsAPI.getDeviceHistory(selectedDevice, {
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          limit: 50,
        })
      : Promise.resolve({ history: [] }),
    enabled: !!selectedDevice,
  });

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleString();
  };

  const formatPeriodLabel = (period: string) => {
    switch (period) {
      case '7d': return 'Last 7 Days';
      case '30d': return 'Last 30 Days';
      case '90d': return 'Last 90 Days';
      default: return period;
    }
  };

  if (usageLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <Card>
          <CardContent className="flex justify-center py-12">
            <LoadingSpinner />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Button>
        </div>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <BarChart className="w-8 h-8" />
              Device Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Track device usage patterns and activity history
            </p>
          </div>
          
          {/* Period Selector */}
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((period) => (
              <Button
                key={period}
                variant={selectedPeriod === period ? 'default' : 'outline'}
                onClick={() => setSelectedPeriod(period)}
                className="flex items-center gap-2"
              >
                <Calendar className="w-4 h-4" />
                {formatPeriodLabel(period)}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Usage Statistics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Total Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {usageData?.stats?.reduce((sum: number, s: any) => sum + s.totalChanges, 0) || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              State changes across all devices
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Active Devices
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {usageData?.stats?.length || 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Devices with recorded activity
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Average Daily Changes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">
              {usageData?.stats
                ? Math.round(
                    usageData.stats.reduce((sum: number, s: any) => sum + s.averageChangesPerDay, 0) /
                    (usageData.stats.length || 1)
                  )
                : 0}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Per device average
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Most Active Devices */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Most Active Devices</CardTitle>
        </CardHeader>
        <CardContent>
          {usageData?.stats && usageData.stats.length > 0 ? (
            <div className="space-y-4">
              {usageData.stats.slice(0, 10).map((stat: any) => (
                <div
                  key={stat.deviceId}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setSelectedDevice(stat.deviceId)}
                >
                  <div className="flex-1">
                    <h3 className="font-semibold">{stat.deviceLabel}</h3>
                    {stat.room && (
                      <p className="text-sm text-muted-foreground">{stat.room}</p>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg">{stat.totalChanges}</div>
                    <div className="text-sm text-muted-foreground">
                      {stat.averageChangesPerDay.toFixed(1)}/day
                    </div>
                  </div>
                  <div className="ml-4 text-sm text-muted-foreground">
                    {stat.lastChanged && (
                      <>Last: {new Date(stat.lastChanged).toLocaleString()}</>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No device activity recorded in this period</p>
              <p className="text-sm mt-2">Control some devices to see analytics appear here</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Device History Detail */}
      {selectedDevice && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>
                Device History: {devicesData?.devices?.find((d: any) => d.deviceId === selectedDevice)?.label || selectedDevice}
              </CardTitle>
              <Button variant="outline" onClick={() => setSelectedDevice(null)}>
                Close
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {historyLoading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner />
              </div>
            ) : deviceHistoryData?.history && deviceHistoryData.history.length > 0 ? (
              <div className="space-y-2">
                {deviceHistoryData.history.map((entry: any) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between p-3 bg-muted/30 rounded-md text-sm"
                  >
                    <div className="flex-1">
                      <span className="font-medium">{entry.capability}</span>
                      {entry.previousValue && (
                        <span className="text-muted-foreground ml-2">
                          {entry.previousValue} → {entry.value}
                        </span>
                      )}
                      {!entry.previousValue && (
                        <span className="text-muted-foreground ml-2">
                          → {entry.value}
                        </span>
                      )}
                    </div>
                    <div className="text-right text-muted-foreground">
                      <div>{formatTimestamp(entry.timestamp)}</div>
                      {entry.triggeredBy && (
                        <div className="text-xs">by {entry.triggeredBy}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                No history records found for this device
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
