import React, { useState } from 'react';
import { Eye, AlertTriangle, CheckCircle, XCircle, Filter, Calendar, ArrowRightLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Trade {
  id: string;
  fromTeam: string;
  fromPlayer: string;
  fromPlayerPosition?: string;
  toTeam: string;
  toPlayer: string;
  toPlayerPosition?: string;
  date: string;
  status: 'pending' | 'completed' | 'vetoed' | 'accepted' | 'rejected';
  proposedBy?: string;
  vetoReason?: string;
  tradeValue?: {
    fromPlayerValue: number;
    toPlayerValue: number;
  };
}

interface TradeManagementPanelProps {
  trades: Trade[];
  onTradeAction: (tradeId: string, action: string, reason?: string) => void;
  isLoading?: boolean;
}

const TradeManagementPanel: React.FC<TradeManagementPanelProps> = ({
  trades,
  onTradeAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [vetoDialogOpen, setVetoDialogOpen] = useState(false);
  const [vetoReason, setVetoReason] = useState('');
  const [tradeToVeto, setTradeToVeto] = useState<string | null>(null);

  const filteredTrades = trades.filter(trade => {
    const matchesSearch = 
      trade.fromTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.toTeam.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.fromPlayer.toLowerCase().includes(searchTerm.toLowerCase()) ||
      trade.toPlayer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || trade.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return (
          <Badge variant="default" className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="w-3 h-3 mr-1" />
            Completado
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary">
            <Calendar className="w-3 h-3 mr-1" />
            Pendiente
          </Badge>
        );
      case "vetoed":
        return (
          <Badge variant="destructive">
            <XCircle className="w-3 h-3 mr-1" />
            Vetado
          </Badge>
        );
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const handleVetoTrade = () => {
    if (tradeToVeto && vetoReason.trim()) {
      onTradeAction(tradeToVeto, 'veto', vetoReason);
      setVetoDialogOpen(false);
      setVetoReason('');
      setTradeToVeto(null);
    }
  };

  const openVetoDialog = (tradeId: string) => {
    setTradeToVeto(tradeId);
    setVetoDialogOpen(true);
  };

  const getTradeBalance = (trade: Trade) => {
    if (!trade.tradeValue) return null;
    
    const difference = trade.tradeValue.fromPlayerValue - trade.tradeValue.toPlayerValue;
    const percentage = Math.abs((difference / trade.tradeValue.toPlayerValue) * 100);
    
    if (Math.abs(difference) < 5) {
      return { type: 'balanced', text: 'Equilibrado', color: 'text-green-600' };
    } else if (percentage > 20) {
      return { type: 'unbalanced', text: 'Desequilibrado', color: 'text-red-600' };
    } else {
      return { type: 'slight', text: 'Ligeramente desequilibrado', color: 'text-yellow-600' };
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Buscar por equipo o jugador..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filtrar por estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="pending">Pendientes</SelectItem>
              <SelectItem value="completed">Completados</SelectItem>
              <SelectItem value="vetoed">Vetados</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Badge variant="outline" className="text-sm px-3 py-1">
          {filteredTrades.length} intercambios
        </Badge>
      </div>

      {/* Trades Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Intercambio</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Balance</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTrades.map((trade) => {
              const balance = getTradeBalance(trade);
              return (
                <TableRow key={trade.id}>
                  <TableCell>
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium text-blue-600">{trade.fromTeam}</span>
                        <span className="text-muted-foreground">da</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{trade.fromPlayer}</span>
                          {trade.fromPlayerPosition && (
                            <Badge variant="outline" className="text-xs">
                              {trade.fromPlayerPosition}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center">
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div className="flex items-center space-x-2 text-sm">
                        <span className="font-medium text-green-600">{trade.toTeam}</span>
                        <span className="text-muted-foreground">da</span>
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">{trade.toPlayer}</span>
                          {trade.toPlayerPosition && (
                            <Badge variant="outline" className="text-xs">
                              {trade.toPlayerPosition}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center text-sm">
                      <Calendar className="h-3 w-3 mr-1" />
                      {new Date(trade.date).toLocaleDateString('es-ES')}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(trade.status)}</TableCell>
                  <TableCell>
                    {balance && (
                      <span className={`text-sm font-medium ${balance.color}`}>
                        {balance.text}
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedTrade(trade)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle>Detalles del Intercambio</DialogTitle>
                            <DialogDescription>
                              Información completa del intercambio
                            </DialogDescription>
                          </DialogHeader>
                          {selectedTrade && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-blue-600">
                                    {selectedTrade.fromTeam}
                                  </h4>
                                  <div className="p-3 bg-blue-50 rounded-lg dark:bg-blue-950">
                                    <p className="font-medium">{selectedTrade.fromPlayer}</p>
                                    {selectedTrade.fromPlayerPosition && (
                                      <p className="text-sm text-muted-foreground">
                                        {selectedTrade.fromPlayerPosition}
                                      </p>
                                    )}
                                    {selectedTrade.tradeValue && (
                                      <p className="text-sm font-semibold">
                                        Valor: {selectedTrade.tradeValue.fromPlayerValue} pts
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <h4 className="font-semibold text-green-600">
                                    {selectedTrade.toTeam}
                                  </h4>
                                  <div className="p-3 bg-green-50 rounded-lg dark:bg-green-950">
                                    <p className="font-medium">{selectedTrade.toPlayer}</p>
                                    {selectedTrade.toPlayerPosition && (
                                      <p className="text-sm text-muted-foreground">
                                        {selectedTrade.toPlayerPosition}
                                      </p>
                                    )}
                                    {selectedTrade.tradeValue && (
                                      <p className="text-sm font-semibold">
                                        Valor: {selectedTrade.tradeValue.toPlayerValue} pts
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="space-y-2">
                                <p className="text-sm">
                                  <span className="font-medium">Estado:</span> {getStatusBadge(selectedTrade.status)}
                                </p>
                                <p className="text-sm">
                                  <span className="font-medium">Fecha:</span>{' '}
                                  {new Date(selectedTrade.date).toLocaleDateString('es-ES')}
                                </p>
                                {selectedTrade.proposedBy && (
                                  <p className="text-sm">
                                    <span className="font-medium">Propuesto por:</span>{' '}
                                    {selectedTrade.proposedBy}
                                  </p>
                                )}
                                {selectedTrade.vetoReason && (
                                  <div className="p-3 bg-red-50 rounded-lg dark:bg-red-950">
                                    <p className="text-sm font-medium text-red-700 dark:text-red-300">
                                      Razón del veto:
                                    </p>
                                    <p className="text-sm text-red-600 dark:text-red-400">
                                      {selectedTrade.vetoReason}
                                    </p>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                      
                      {trade.status === "pending" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openVetoDialog(trade.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <AlertTriangle className="h-4 w-4 mr-1" />
                          Vetar
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Veto Dialog */}
      <AlertDialog open={vetoDialogOpen} onOpenChange={setVetoDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Vetar Intercambio</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, proporciona una razón para vetar este intercambio. Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              placeholder="Razón del veto (ej: Intercambio desequilibrado, violación de reglas...)"
              value={vetoReason}
              onChange={(e) => setVetoReason(e.target.value)}
              className="w-full"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setVetoReason('')}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVetoTrade}
              disabled={!vetoReason.trim()}
              className="bg-red-600 hover:bg-red-700"
            >
              Vetar Intercambio
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TradeManagementPanel; 