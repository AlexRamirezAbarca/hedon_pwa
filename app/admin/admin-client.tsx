'use client'

import { useState } from 'react'
import { AdminUser, toggleUserVIP } from '@/app/actions/admin'
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
import { Loader2, Search } from "lucide-react"
import { Input } from "@/components/ui/input"

export function AdminTableClient({ initialUsers }: { initialUsers: AdminUser[] }) {
  const [users, setUsers] = useState<AdminUser[]>(initialUsers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const handleToggle = async (userId: string, currentStatus: boolean) => {
    setLoadingId(userId)
    const result = await toggleUserVIP(userId, currentStatus)
    
    if (result.success) {
      setUsers(users.map(u => u.id === userId ? { ...u, has_paid: !currentStatus } : u))
    } else {
      alert(`Error al guardar: ${result.error}`)
    }
    setLoadingId(null)
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) || 
    u.full_name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 bg-zinc-900/40 p-2 rounded-xl border border-zinc-800/50 shadow-inner">
        <Search className="w-5 h-5 text-zinc-500 ml-3" />
        <Input 
          placeholder="Buscar amante por correo o alias..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-transparent border-0 focus-visible:ring-0 text-white placeholder:text-zinc-600 h-10 w-full"
        />
      </div>

      <div className="border border-zinc-800/50 rounded-2xl overflow-hidden bg-black/40 backdrop-blur-md shadow-2xl">
        <Table>
          <TableHeader className="bg-zinc-900/60 hover:bg-zinc-900/60 border-b border-zinc-800/50">
             <TableRow>
              <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest pl-6">Usuario</TableHead>
              <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Registro</TableHead>
              <TableHead className="text-zinc-500 font-bold uppercase text-[10px] tracking-widest">Estado</TableHead>
              <TableHead className="text-right text-zinc-500 font-bold uppercase text-[10px] tracking-widest pr-6">Acciones VIP</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
                <TableRow className="border-b-0 hover:bg-transparent">
                    <TableCell colSpan={4} className="text-center py-12 text-zinc-600 text-sm">No se encontraron registros de amantes con esos datos.</TableCell>
                </TableRow>
            ) : filteredUsers.map((user) => (
              <TableRow key={user.id} className="border-zinc-800/50 hover:bg-zinc-900/30 transition-colors">
                <TableCell className="font-medium pl-6 py-4">
                    <div className="flex flex-col">
                        <span className="text-zinc-100 font-serif text-lg">{user.full_name}</span>
                        <span className="text-[11px] text-zinc-500 tracking-wider font-mono mt-0.5">{user.email}</span>
                    </div>
                </TableCell>
                <TableCell className="text-zinc-500 text-xs font-mono">
                  {new Date(user.created_at).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell>
                  {user.has_paid ? (
                    <Badge className="bg-red-950/40 text-red-500 hover:bg-red-900/40 border border-red-900/30 text-[10px] uppercase font-bold tracking-widest py-1 px-3">
                        VIP
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-zinc-600 border-zinc-800 bg-zinc-950 text-[10px] uppercase font-bold tracking-widest py-1 px-3">
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
    </div>
  )
}
