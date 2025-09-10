import React, { useState, useMemo } from 'react';
import { 
  Clock, 
  Download, 
  Filter, 
  Users, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Hourglass,
  Calendar,
  User,
  ArrowUpDown
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import DashboardStatsCard from '@/components/DashboardStatsCard';
import { 
  useLeagueWaiverHistory, 
  useRecentWaiverActivity, 
  useWaiverStats,
  WaiverHistoryFilters 
} from '@/hooks/useLeagueWaiverHistory';
import { useFantasyTeams } from '@/hooks/useFantasyTeams';
import { toast } from '@/hooks/use-toast';

interface LeagueWaiverManagementProps {
  leagueId: string;
}

const LeagueWaiverManagement: React.FC<LeagueWaiverManagementProps> = ({ leagueId }) => {
  const [filters, setFilters] = useState<WaiverHistoryFilters>({});
  const [sortColumn, setSortColumn] = useState<'created_at' | 'week' | 'team'>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  const { data: teams = [] } = useFantasyTeams(leagueId);
  const { data: waiverHistory = [], isLoading } = useLeagueWaiverHistory(leagueId, filters);
  const { data: recentActivity = [] } = useRecentWaiverActivity(leagueId);
  const { data: stats } = useWaiverStats(leagueId);

  // Filter and sort data
  const filteredAndSortedHistory = useMemo(() => {
    const filtered = waiverHistory.filter(item => {
      const matchesSearch = searchTerm === '' || 
        item.fantasy_team.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.fantasy_team.owner.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.player.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.drop_player?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      
      return matchesSearch;
    });

    // Sort data
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortColumn) {
        case 'created_at':
          aValue = new Date(a.created_at).getTime();
          bValue = new Date(b.created_at).getTime();
          break;
        case 'week':
          aValue = a.week;
          bValue = b.week;
          break;
        case 'team':
          aValue = a.fantasy_team.name.toLowerCase();
          bValue = b.fantasy_team.name.toLowerCase();
          break;
        default:
          return 0;
      }
      
      if (sortDirection === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

    return filtered;
  }, [waiverHistory, searchTerm, sortColumn, sortDirection]);

  const handleSort = (column: 'created_at' | 'week' | 'team') => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  const exportToCSV = () => {
    const csvData = filteredAndSortedHistory.map(item => ({
      'Fecha': new Date(item.created_at).toLocaleDateString(),
      'Semana': item.week,
      'Equipo': item.fantasy_team.name,
      'Propietario': item.fantasy_team.owner.full_name,
      'Email': item.fantasy_team.owner.email || '',
      'Jugador Reclamado': item.player.name,
      'Posición': item.player.position,
      'Equipo NFL': item.player.team,
      'Jugador Liberado': item.drop_player?.name || 'N/A',
      'Posición Liberado': item.drop_player?.position || 'N/A',
      'Estado': item.status,
      'Procesado': item.processed_at ? new Date(item.processed_at).toLocaleDateString() : 'Pendiente'
    }));

    const csv = [
      Object.keys(csvData[0] || {}).join(','),
      ...csvData.map(row => Object.values(row).map(val => `"${val}"`).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `waiver-history-${leagueId}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    
    toast({
      title: "Exportación Completada",
      description: "El historial de waivers se ha exportado como CSV",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge className="bg-yellow-500/20 text-yellow-300 border-yellow-500/30"><Hourglass className="w-3 h-3 mr-1" />Pendiente</Badge>;
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-300 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" />Aprobado</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-300 border-red-500/30"><XCircle className="w-3 h-3 mr-1" />Rechazado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Cargando historial de waivers...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      {stats && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <DashboardStatsCard
            title="Total Solicitudes"
            value={stats.total}
            description={`${stats.thisWeek} esta semana`}
            icon={Users}
          />
          <DashboardStatsCard
            title="Pendientes"
            value={stats.pending}
            description="Esperando procesamiento"
            icon={Hourglass}
            className="text-yellow-400"
          />
          <DashboardStatsCard
            title="Aprobadas"
            value={stats.approved}
            description="Transacciones exitosas"
            icon={CheckCircle}
            className="text-green-400"
          />
          <DashboardStatsCard
            title="Rechazadas"
            value={stats.rejected}
            description="Solicitudes denegadas"
            icon={XCircle}
            className="text-red-400"
          />
        </div>
      )}

      <Tabs defaultValue="all" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">Historial Completo</TabsTrigger>
          <TabsTrigger value="recent">Actividad Reciente</TabsTrigger>
          <TabsTrigger value="pending">Pendientes</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Historial Completo de Waivers</span>
                <div className="flex gap-2">
                  <Button onClick={exportToCSV} variant="outline" size="sm">
                    <Download className="w-4 h-4 mr-2" />
                    Exportar CSV
                  </Button>
                </div>
              </CardTitle>
              <CardDescription>
                Control completo de todas las solicitudes de waiver en la liga
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <Label htmlFor="search">Buscar</Label>
                  <Input
                    id="search"
                    placeholder="Equipo, jugador, propietario..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="week">Semana</Label>
                  <Select value={filters.week?.toString() || 'all'} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, week: value === 'all' ? undefined : parseInt(value) }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas las semanas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas las semanas</SelectItem>
                      {Array.from({length: 17}, (_, i) => i + 1).map(week => (
                        <SelectItem key={week} value={week.toString()}>Semana {week}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="team">Equipo</Label>
                  <Select value={filters.teamId || 'all'} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, teamId: value === 'all' ? undefined : value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los equipos" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los equipos</SelectItem>
                      {teams.map(team => (
                        <SelectItem key={team.id} value={team.id}>{team.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="status">Estado</Label>
                  <Select value={filters.status || 'all'} onValueChange={(value) => 
                    setFilters(prev => ({ ...prev, status: value === 'all' ? undefined : value }))
                  }>
                    <SelectTrigger>
                      <SelectValue placeholder="Todos los estados" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos los estados</SelectItem>
                      <SelectItem value="pending">Pendiente</SelectItem>
                      <SelectItem value="approved">Aprobado</SelectItem>
                      <SelectItem value="rejected">Rechazado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Results Table */}
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead 
                        className="cursor-pointer hover:text-white"
                        onClick={() => handleSort('created_at')}
                      >
                        <div className="flex items-center gap-1">
                          Fecha
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-white"
                        onClick={() => handleSort('week')}
                      >
                        <div className="flex items-center gap-1">
                          Semana
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead 
                        className="cursor-pointer hover:text-white"
                        onClick={() => handleSort('team')}
                      >
                        <div className="flex items-center gap-1">
                          Equipo
                          <ArrowUpDown className="w-3 h-3" />
                        </div>
                      </TableHead>
                      <TableHead>Transacción</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Procesado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAndSortedHistory.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-gray-400">
                          No se encontraron solicitudes de waiver
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedHistory.map((item) => (
                        <TableRow key={item.id} className="hover:bg-gray-800/50">
                          <TableCell className="text-gray-300">
                            {new Date(item.created_at).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric'
                            })}
                            <div className="text-xs text-gray-500">
                              {new Date(item.created_at).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">Semana {item.week}</Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium text-white">{item.fantasy_team.name}</div>
                              <div className="text-sm text-gray-400">{item.fantasy_team.owner.full_name}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-green-400">+</span>
                                <span className="text-white font-medium">{item.player.name}</span>
                                <Badge variant="outline" className="text-xs">
                                  {item.player.position}
                                </Badge>
                                <span className="text-gray-500 text-sm">({item.player.team})</span>
                              </div>
                              {item.drop_player && (
                                <div className="flex items-center gap-2">
                                  <span className="text-red-400">-</span>
                                  <span className="text-gray-400">{item.drop_player.name}</span>
                                  <Badge variant="outline" className="text-xs">
                                    {item.drop_player.position}
                                  </Badge>
                                  <span className="text-gray-500 text-sm">({item.drop_player.team})</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(item.status)}
                          </TableCell>
                          <TableCell className="text-gray-300">
                            {item.processed_at ? (
                              <>
                                {new Date(item.processed_at).toLocaleDateString('es-ES')}
                                <div className="text-xs text-gray-500">
                                  {new Date(item.processed_at).toLocaleTimeString('es-ES', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                  })}
                                </div>
                              </>
                            ) : (
                              <span className="text-yellow-400">Pendiente</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Actividad Reciente (Últimos 7 días)
              </CardTitle>
              <CardDescription>
                Monitoreo de la actividad de waivers más reciente para resolución de problemas
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentActivity.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No hay actividad de waivers en los últimos 7 días
                </div>
              ) : (
                <div className="space-y-3">
                  {recentActivity.map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 bg-gray-800/50 rounded-lg border border-gray-700/50"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('es-ES')}
                        </div>
                        <div>
                          <div className="font-medium text-white">{item.fantasy_team.name}</div>
                          <div className="text-sm text-gray-400">
                            {item.player.name} ({item.player.position})
                            {item.drop_player && ` por ${item.drop_player.name}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Semana {item.week}</Badge>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-400" />
                Solicitudes Pendientes
              </CardTitle>
              <CardDescription>
                Waivers que esperan ser procesados
              </CardDescription>
            </CardHeader>
            <CardContent>
              {waiverHistory.filter(item => item.status === 'pending').length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  No hay solicitudes de waiver pendientes
                </div>
              ) : (
                <div className="space-y-3">
                  {waiverHistory
                    .filter(item => item.status === 'pending')
                    .map((item) => (
                    <div 
                      key={item.id} 
                      className="flex items-center justify-between p-4 bg-yellow-500/5 rounded-lg border border-yellow-500/20"
                    >
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-400">
                          {new Date(item.created_at).toLocaleDateString('es-ES')}
                        </div>
                        <div>
                          <div className="font-medium text-white">{item.fantasy_team.name}</div>
                          <div className="text-sm text-gray-400">
                            Reclamar: {item.player.name} ({item.player.position})
                            {item.drop_player && ` - Liberar: ${item.drop_player.name}`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">Semana {item.week}</Badge>
                        {getStatusBadge(item.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LeagueWaiverManagement;