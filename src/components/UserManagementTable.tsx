import React, { useState } from 'react';
import { UserX, UserCheck, Mail, Calendar, MoreHorizontal, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface User {
  id: string;
  name: string;
  email: string;
  teamName: string;
  status: 'active' | 'banned' | 'pending';
  joinDate: string;
  avatar?: string;
  lastActive?: string;
}

interface UserManagementTableProps {
  users: User[];
  onUserAction: (userId: string, action: string, reason?: string) => void;
  isLoading?: boolean;
}

const UserManagementTable: React.FC<UserManagementTableProps> = ({
  users,
  onUserAction
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAction, setSelectedAction] = useState<{
    userId: string;
    action: string;
    userName: string;
  } | null>(null);

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.teamName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="default" className="bg-green-500 hover:bg-green-600">Activo</Badge>;
      case "banned":
        return <Badge variant="destructive">Baneado</Badge>;
      case "pending":
        return <Badge variant="secondary">Pendiente</Badge>;
      default:
        return <Badge variant="outline">Desconocido</Badge>;
    }
  };

  const handleActionConfirm = () => {
    if (selectedAction) {
      onUserAction(selectedAction.userId, selectedAction.action, getActionReason(selectedAction.action));
      setSelectedAction(null);
    }
  };

  const getActionText = (action: string) => {
    switch (action) {
      case 'ban':
        return 'banear';
      case 'unban':
        return 'desbanear';
      case 'approve':
        return 'aprobar';
      case 'reject':
        return 'rechazar';
      case 'remove':
        return 'eliminar de la liga';
      default:
        return action;
    }
  };

  const getActionReason = (action: string) => {
    switch (action) {
      case 'ban':
        return 'Baneado por el administrador de la liga';
      case 'unban':
        return 'Desbaneado por el administrador de la liga';
      case 'remove':
        return 'Eliminado de la liga por el administrador';
      default:
        return `Acción ${action} realizada por el administrador`;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Bar */}
      <div className="flex items-center space-x-2">
        <Input
          placeholder="Buscar usuarios por nombre, email o equipo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Badge variant="outline" className="text-sm">
          {filteredUsers.length} usuarios
        </Badge>
      </div>

      {/* Users Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Equipo</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha Ingreso</TableHead>
              <TableHead>Última Actividad</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.map((user) => (
              <TableRow key={user.id}>
                <TableCell>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={user.avatar} alt={user.name} />
                      <AvatarFallback>
                        {user.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{user.name}</p>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Mail className="h-3 w-3 mr-1" />
                        {user.email}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{user.teamName}</TableCell>
                <TableCell>{getStatusBadge(user.status)}</TableCell>
                <TableCell>
                  <div className="flex items-center text-sm">
                    <Calendar className="h-3 w-3 mr-1" />
                    {new Date(user.joinDate).toLocaleDateString('es-ES')}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-muted-foreground">
                    {user.lastActive ? new Date(user.lastActive).toLocaleDateString('es-ES') : 'N/A'}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <span className="sr-only">Abrir menú</span>
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(user.email)}>
                        Copiar email
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      
                      {user.status === "active" && (
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setSelectedAction({
                            userId: user.user_id,
                            action: 'ban',
                            userName: user.name
                          })}
                        >
                          <UserX className="h-4 w-4 mr-2" />
                          Banear usuario
                        </DropdownMenuItem>
                      )}
                      
                      {user.status === "banned" && (
                        <DropdownMenuItem
                          className="text-green-600"
                          onClick={() => setSelectedAction({
                            userId: user.user_id,
                            action: 'unban',
                            userName: user.name
                          })}
                        >
                          <UserCheck className="h-4 w-4 mr-2" />
                          Desbanear usuario
                        </DropdownMenuItem>
                      )}
                      
                      {user.status === "pending" && (
                        <>
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => setSelectedAction({
                              userId: user.user_id,
                              action: 'approve',
                              userName: user.name
                            })}
                          >
                            <UserCheck className="h-4 w-4 mr-2" />
                            Aprobar usuario
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => setSelectedAction({
                              userId: user.user_id,
                              action: 'reject',
                              userName: user.name
                            })}
                          >
                            <UserX className="h-4 w-4 mr-2" />
                            Rechazar usuario
                          </DropdownMenuItem>
                        </>
                      )}

                      {/* Opción para eliminar usuario de la liga - disponible para todos los estados */}
                      {user.status !== "pending" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600 font-medium"
                            onClick={() => setSelectedAction({
                              userId: user.user_id,
                              action: 'remove',
                              userName: user.name
                            })}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar de Liga
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!selectedAction} onOpenChange={() => setSelectedAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar acción</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que quieres {selectedAction && getActionText(selectedAction.action)} a{' '}
              <span className="font-semibold">{selectedAction?.userName}</span>?
              {selectedAction?.action === 'ban' && ' Esta acción impedirá al usuario acceder a la liga.'}
              {selectedAction?.action === 'reject' && ' Esta acción eliminará la solicitud del usuario.'}
              {selectedAction?.action === 'remove' && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-800 font-medium">⚠️ Esta acción es IRREVERSIBLE y:</p>
                  <ul className="list-disc list-inside text-sm text-red-700 mt-2 space-y-1">
                    <li>Eliminará al usuario completamente de la liga</li>
                    <li>Liberará TODOS sus jugadores como agentes libres</li>
                    <li>El usuario tendrá que volver a unirse para participar</li>
                    <li>Reducirá el número total de participantes</li>
                  </ul>
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleActionConfirm}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserManagementTable; 