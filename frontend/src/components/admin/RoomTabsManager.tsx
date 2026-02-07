import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { deviceAPI } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import LoadingSpinner from '@/components/ui/LoadingSpinner';
import { GripVertical, RotateCcw, Save } from 'lucide-react';

const ROOM_ORDER_KEY = 'homecontrol_room_tab_order';

export default function RoomTabsManager() {
  const [roomOrder, setRoomOrder] = useState<string[]>([]);
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  const { data: devicesData, isLoading } = useQuery({
    queryKey: ['devices'],
    queryFn: deviceAPI.getDevices,
  });

  // Extract unique room names from devices
  useEffect(() => {
    if (devicesData?.devices) {
      const rooms = new Set<string>();
      devicesData.devices.forEach((device: any) => {
        const roomName = device.room || 'Unassigned';
        rooms.add(roomName);
      });
      
      const roomArray = Array.from(rooms).sort();
      
      // Load saved order or use default
      const savedOrder = localStorage.getItem(ROOM_ORDER_KEY);
      if (savedOrder) {
        try {
          const parsed = JSON.parse(savedOrder);
          // Merge saved order with new rooms
          const orderedRooms = [...parsed.filter((r: string) => roomArray.includes(r))];
          const newRooms = roomArray.filter(r => !parsed.includes(r));
          setRoomOrder([...orderedRooms, ...newRooms]);
        } catch {
          setRoomOrder(roomArray);
        }
      } else {
        setRoomOrder(roomArray);
      }
    }
  }, [devicesData]);

  const handleDragStart = (room: string) => {
    setDraggedItem(room);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetRoom: string) => {
    if (!draggedItem || draggedItem === targetRoom) return;

    const newOrder = [...roomOrder];
    const draggedIndex = newOrder.indexOf(draggedItem);
    const targetIndex = newOrder.indexOf(targetRoom);

    // Remove dragged item and insert at target position
    newOrder.splice(draggedIndex, 1);
    newOrder.splice(targetIndex, 0, draggedItem);

    setRoomOrder(newOrder);
    setHasChanges(true);
    setDraggedItem(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
  };

  const saveOrder = () => {
    localStorage.setItem(ROOM_ORDER_KEY, JSON.stringify(roomOrder));
    setHasChanges(false);
    // Trigger a custom event to notify the dashboard
    window.dispatchEvent(new CustomEvent('roomOrderChanged'));
  };

  const resetOrder = () => {
    if (devicesData?.devices) {
      const rooms = new Set<string>();
      devicesData.devices.forEach((device: any) => {
        const roomName = device.room || 'Unassigned';
        rooms.add(roomName);
      });
      const defaultOrder = Array.from(rooms).sort();
      setRoomOrder(defaultOrder);
      setHasChanges(true);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Room Tab Order</h2>
        <p className="text-muted-foreground">
          Drag and drop rooms to customize the tab order on the dashboard. Changes affect all users.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customize Tab Order</CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={resetOrder}
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset to Alphabetical
              </Button>
              <Button
                size="sm"
                onClick={saveOrder}
                disabled={!hasChanges}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Order
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {roomOrder.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No rooms found. Add devices with room assignments to see them here.
            </p>
          ) : (
            <div className="space-y-2">
              {roomOrder.map((room, index) => {
                const deviceCount = devicesData?.devices?.filter(
                  (d: any) => (d.room || 'Unassigned') === room
                ).length || 0;

                return (
                  <div
                    key={room}
                    draggable
                    onDragStart={() => handleDragStart(room)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(room)}
                    onDragEnd={handleDragEnd}
                    className={`
                      flex items-center gap-3 p-4 rounded-lg border-2 transition-all cursor-move
                      ${draggedItem === room 
                        ? 'border-primary bg-primary/5 opacity-50' 
                        : 'border-border bg-card hover:border-primary/50 hover:shadow-md'
                      }
                    `}
                  >
                    <GripVertical className="w-5 h-5 text-muted-foreground" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-lg">{room}</span>
                        <span className="text-sm text-muted-foreground">
                          ({deviceCount} {deviceCount === 1 ? 'device' : 'devices'})
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground font-mono">
                      Position {index + 1}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          
          {hasChanges && (
            <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">
                ⚠️ You have unsaved changes. Click "Save Order" to apply them to the dashboard.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This is how the tabs will appear on the dashboard:
          </p>
          <div className="inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground flex-wrap gap-1">
            {roomOrder.map((room) => (
              <div
                key={room}
                className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium bg-background text-foreground shadow-sm"
              >
                {room}
              </div>
            ))}
            <div className="inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium">
              All Devices
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export { ROOM_ORDER_KEY };
