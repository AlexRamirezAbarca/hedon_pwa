'use client'

import { useState } from 'react'
import { AdminUser, AdminKPIs, GameSessionData, toggleUserVIP, destroyGameSession } from '@/app/actions/admin'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Loader2, Search, Users, Crown, Activity, Trash2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export function AdminDashboardClient({ 
  initialUsers, 
  initialKpis, 
  initialSessions 
}: { 
  initialUsers: AdminUser[], 
  initialKpis: AdminKPIs,
  initialSessions: GameSessionData[]
}) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [sessions, setSessions] = useState<GameSessionData[]>(initialSessions)
  const [kpis, setKpis] = useState<AdminKPIs>(initialKpis)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleToggle = async (userId: string, currentStatus: boolean) => {
    setLoadingId(userId)
    const result = await toggleUserVIP(userId, currentStatus)
    
    if (result.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, has_paid: !currentStatus } : u))
      
      // Update KPIs manually for UI instantly
      const updatedVip = kpis.vipUsers + (currentStatus ? -1 : 1);
      const updatedConversion = kpis.totalUsers > 0 ? ((updatedVip / kpis.totalUsers) * 100).toFixed(1) + '%' : '0%';
      
      setKpis({
        ...kpis,
        vipUsers: updatedVip,
        conversionRate: updatedConversion
      });
      
    } else {
      alert(`Error al guardar: ${result.error}`)
    }
    setLoadingId(null)
  }

  const handleDestroySession = async (sessionId: string) => {
    if(!confirm("¿Estás seguro de destruir esta sala? Ambos jugadores serán expulsados.")) return;
    
    setLoadingId(sessionId)
    const result = await destroyGameSession(sessionId);
    if(result.success) {
       setSessions(sessions.filter(s => s.id !== sessionId))
       setKpis({...kpis, activeSessions: kpis.activeSessions - 1})
    } else {
       alert(`Error al destruir: ${result.error}`)
    }
    setLoadingId(null)
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-8">
      {/* KPIs Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-zinc-950/50 border-zinc-800/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Total Amantes</CardTitle>
            <Users className="w-4 h-4 text-zinc-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{kpis.totalUsers}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-zinc-800/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Clientes VIP</CardTitle>
            <Crown className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-500">{kpis.vipUsers}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-zinc-800/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Conversión</CardTitle>
            <Activity className="w-4 h-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{kpis.conversionRate}</div>
          </CardContent>
        </Card>
        
        <Card className="bg-zinc-950/50 border-zinc-800/50 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-zinc-400">Salas Activas</CardTitle>
            <Activity className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{kpis.activeSessions}</div>
          </CardContent>
        </Card>
      </div>

      {/* TABS */}
      <Tabs defaultValue="users" className="w-full">
        <TabsList className="bg-zinc-900/40 border border-zinc-800/50 mb-6 py-6 px-2 rounded-xl w-full justify-start overflow-x-auto">
          <TabsTrigger value="users" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 rounded-lg px-6 py-2 transition-all">
            Control de Usuarios
          </TabsTrigger>
          <TabsTrigger value="sessions" className="data-[state=active]:bg-zinc-800 data-[state=active]:text-white text-zinc-400 rounded-lg px-6 py-2 transition-all">
            Ojo de Dios (Salas)
          </TabsTrigger>
          <TabsTrigger value="logs" disabled className="text-zinc-600 rounded-lg px-6 py-2">
            Uso de IA (Próximamente)
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/50 shadow-inner max-w-md">
            <Search className="w-5 h-5 text-zinc-500 ml-3" />
            <Input 
              placeholder="Buscar por correo o alias..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-600 h-10 w-full"
            />
          </div>

          <div className="border border-zinc-800/50 rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl overflow-x-auto">
            <Table>
              <TableHeader className="bg-zinc-900/60 hover:bg-zinc-900/60 border-b border-zinc-800/50">
                 <TableRow>
                  <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest pl-6">Usuario</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest hidden sm:table-cell">Registro</TableHead>
                  <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Estado</TableHead>
                  <TableHead className="text-right text-zinc-500 font-bold uppercase text-[10px] tracking-widest pr-6">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                    <TableRow className="border-b-0 hover:bg-transparent">
                        <TableCell colSpan={4} className="text-center py-12 text-zinc-600 text-sm">No se encontraron registros activos.</TableCell>
                    </TableRow>
                ) : filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                    <TableCell className="font-medium pl-6 py-4">
                        <div className="flex flex-col">
                            <span className="text-zinc-100 font-serif md:text-lg">{user.full_name}</span>
                            <span className="text-[10px] md:text-[11px] text-zinc-500 tracking-wider font-mono mt-0.5">{user.email}</span>
                        </div>
                    </TableCell>
                    <TableCell className="text-zinc-500 text-xs font-mono hidden sm:table-cell">
                      {new Date(user.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </TableCell>
                    <TableCell>
                      {user.has_paid ? (
                        <Badge className="bg-red-950/40 text-red-500 hover:bg-red-900/40 border border-red-900/30 text-[9px] md:text-[10px] uppercase font-bold tracking-widest py-1 px-2 md:px-3">
                            VIP
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-zinc-600 border-zinc-800 bg-zinc-950 text-[9px] md:text-[10px] uppercase font-bold tracking-widest py-1 px-2 md:px-3">
                            Gratis
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                        <div className="flex justify-end items-center gap-4">
                            {loadingId === user.id && <Loader2 className="w-4 h-4 animate-spin text-red-500" />}
                            <Switch 
                                checked={user.has_paid} 
                                onCheckedChange={() => handleToggle(user.id, user.has_paid)}
                                disabled={loadingId !== null}
                                className="data-[state=checked]:bg-red-600 data-[state=unchecked]:bg-zinc-800"
                            />
                        </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
           <div className="border border-zinc-800/50 rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl overflow-x-auto">
             <Table>
               <TableHeader className="bg-zinc-900/60 border-b border-zinc-800/50">
                 <TableRow>
                   <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest pl-6">ID Sala</TableHead>
                   <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Temática / Fantasía</TableHead>
                   <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest hidden md:table-cell">Inicio</TableHead>
                   <TableHead className="text-right text-zinc-500 font-bold uppercase text-[10px] tracking-widest pr-6">Acción de Emergencia</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {sessions.length === 0 ? (
                    <TableRow className="hover:bg-transparent">
                      <TableCell colSpan={4} className="text-center py-12 text-zinc-600 text-sm">No hay parejas jugando en este momento.</TableCell>
                    </TableRow>
                 ) : sessions.map(session => (
                    <TableRow key={session.id} className="border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                       <TableCell className="font-mono text-xs text-zinc-400 pl-6 max-w-[100px] truncate" title={session.id}>
                          {session.id.split('-')[0]}...
                       </TableCell>
                       <TableCell className="text-zinc-300 text-sm py-4">
                         {session.scenario_config?.fantasy === 'custom' 
                            ? <span className="text-emerald-400 italic">"{(session.scenario_config.customPrompt || '').substring(0, 40)}..."</span> 
                            : <span className="capitalize px-3 py-1 bg-zinc-800/50 rounded-full text-xs font-medium text-purple-300 border border-zinc-700/50">
                                {session.scenario_config?.fantasy || 'Desconocida'}
                              </span>}
                       </TableCell>
                       <TableCell className="text-zinc-500 text-xs font-mono hidden md:table-cell">
                          {new Date(session.created_at).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}
                       </TableCell>
                       <TableCell className="text-right pr-6">
                           <button 
                             onClick={() => handleDestroySession(session.id)}
                             disabled={loadingId === session.id}
                             className="text-red-500 hover:text-red-400 p-2 rounded-md hover:bg-red-950/40 transition-colors inline-flex disabled:opacity-50 border border-transparent hover:border-red-900/50"
                             title="Destruir Sala y Expulsar Pareja"
                           >
                              {loadingId === session.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                           </button>
                       </TableCell>
                    </TableRow>
                 ))}
               </TableBody>
             </Table>
           </div>
        </TabsContent>
        
      </Tabs>
    </div>
  )
}
