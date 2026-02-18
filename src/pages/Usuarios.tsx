import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions, type AppRole } from "@/hooks/usePermissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { Shield, Users, History, Loader2, Save, ShieldCheck, ShieldAlert } from "lucide-react";

interface UserProfile {
  id: string;
  user_id: string;
  nombre: string;
  email: string | null;
  created_at: string;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface AuditLog {
  id: string;
  user_id: string;
  accion: string;
  entidad: string;
  entidad_id: string | null;
  detalles: any;
  created_at: string;
}

const ROLE_CONFIG: Record<AppRole, { label: string; color: string; desc: string }> = {
  admin: { label: "Administrador", color: "default", desc: "Acceso total al sistema" },
  cajero: { label: "Cajero", color: "secondary", desc: "Ventas y facturación básica" },
  contador: { label: "Contador", color: "outline", desc: "Reportes y exportaciones" },
};

const PERMISSION_MATRIX: { permission: string; admin: boolean; cajero: boolean; contador: boolean }[] = [
  { permission: "Crear facturas", admin: true, cajero: true, contador: false },
  { permission: "Anular facturas", admin: true, cajero: false, contador: false },
  { permission: "Eliminar facturas", admin: true, cajero: false, contador: false },
  { permission: "Cambiar precios", admin: true, cajero: false, contador: false },
  { permission: "Aplicar descuentos", admin: true, cajero: false, contador: true },
  { permission: "Ver reportes", admin: true, cajero: false, contador: true },
  { permission: "Exportar datos", admin: true, cajero: false, contador: true },
  { permission: "Configuración", admin: true, cajero: false, contador: false },
  { permission: "Gestionar usuarios", admin: true, cajero: false, contador: false },
  { permission: "Registrar compras", admin: true, cajero: false, contador: true },
  { permission: "Gestionar inventario", admin: true, cajero: false, contador: false },
];

export default function Usuarios() {
  const { user } = useAuth();
  const { isAdmin, loading: permLoading } = usePermissions();
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingChanges, setPendingChanges] = useState<Record<string, AppRole>>({});

  useEffect(() => {
    if (!user || !isAdmin) return;
    loadData();
  }, [user, isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [profilesRes, rolesRes, logsRes] = await Promise.all([
      supabase.from("profiles").select("*").order("nombre"),
      supabase.from("user_roles").select("*"),
      supabase.from("audit_logs").select("*").order("created_at", { ascending: false }).limit(50),
    ]);
    setProfiles((profilesRes.data as any) || []);
    setRoles((rolesRes.data as any) || []);
    setLogs((logsRes.data as any) || []);
    setLoading(false);
  };

  const getRoleForUser = (userId: string): AppRole => {
    if (pendingChanges[userId]) return pendingChanges[userId];
    const r = roles.find(r => r.user_id === userId);
    return (r?.role as AppRole) || "cajero";
  };

  const handleRoleChange = (userId: string, newRole: AppRole) => {
    setPendingChanges(prev => ({ ...prev, [userId]: newRole }));
  };

  const saveRole = async (userId: string) => {
    const newRole = pendingChanges[userId];
    if (!newRole) return;

    const existingRole = roles.find(r => r.user_id === userId);

    let error;
    if (existingRole) {
      ({ error } = await supabase.from("user_roles").update({ role: newRole } as any).eq("id", existingRole.id));
    } else {
      ({ error } = await supabase.from("user_roles").insert({ user_id: userId, role: newRole } as any));
    }

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Rol actualizado");
      // Log the action
      await supabase.from("audit_logs").insert({
        user_id: user!.id,
        accion: "cambio_rol",
        entidad: "user_roles",
        entidad_id: userId,
        detalles: { nuevo_rol: newRole, anterior: existingRole?.role || "ninguno" },
      } as any);
      setPendingChanges(prev => { const n = { ...prev }; delete n[userId]; return n; });
      loadData();
    }
  };

  const getProfileName = (userId: string) => {
    return profiles.find(p => p.user_id === userId)?.nombre || profiles.find(p => p.user_id === userId)?.email || userId.slice(0, 8);
  };

  if (permLoading || loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>;
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
        <ShieldAlert className="h-12 w-12 mb-4 opacity-40" />
        <h2 className="text-lg font-semibold text-foreground">Acceso Restringido</h2>
        <p className="text-sm mt-1">Solo los administradores pueden gestionar usuarios y roles.</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Usuarios y Roles</h1>
        <p className="text-muted-foreground">Administra usuarios, asigna roles y revisa la actividad del sistema</p>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList className="grid grid-cols-3 w-full max-w-md">
          <TabsTrigger value="usuarios"><Users className="h-4 w-4 mr-1.5" />Usuarios</TabsTrigger>
          <TabsTrigger value="permisos"><Shield className="h-4 w-4 mr-1.5" />Permisos</TabsTrigger>
          <TabsTrigger value="auditoria"><History className="h-4 w-4 mr-1.5" />Auditoría</TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Usuarios Registrados</CardTitle>
              <CardDescription>Asigna roles a cada usuario del sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Rol Actual</TableHead>
                    <TableHead>Cambiar Rol</TableHead>
                    <TableHead>Registro</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {profiles.map(p => {
                    const currentRole = getRoleForUser(p.user_id);
                    const hasPending = !!pendingChanges[p.user_id];
                    const isCurrentUser = p.user_id === user?.id;

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">
                          {p.nombre || "—"}
                          {isCurrentUser && <Badge variant="outline" className="ml-2 text-[10px]">Tú</Badge>}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{p.email || "—"}</TableCell>
                        <TableCell>
                          <Badge variant={ROLE_CONFIG[currentRole]?.color as any || "secondary"}>
                            {ROLE_CONFIG[currentRole]?.label || currentRole}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Select
                            value={currentRole}
                            onValueChange={(v) => handleRoleChange(p.user_id, v as AppRole)}
                            disabled={isCurrentUser}
                          >
                            <SelectTrigger className="w-40 h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(ROLE_CONFIG).map(([key, val]) => (
                                <SelectItem key={key} value={key}>
                                  {val.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString("es-DO")}
                        </TableCell>
                        <TableCell>
                          {hasPending && (
                            <Button size="sm" onClick={() => saveRole(p.user_id)}>
                              <Save className="h-3 w-3 mr-1" /> Guardar
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              {profiles.length === 0 && (
                <p className="text-center py-8 text-sm text-muted-foreground">No hay usuarios registrados</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permisos" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Matriz de Permisos por Rol</CardTitle>
              <CardDescription>Vista general de permisos asignados a cada rol</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Permiso</TableHead>
                    <TableHead className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" /> Admin
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Cajero</TableHead>
                    <TableHead className="text-center">Contador</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {PERMISSION_MATRIX.map(row => (
                    <TableRow key={row.permission}>
                      <TableCell className="font-medium text-sm">{row.permission}</TableCell>
                      <TableCell className="text-center">{row.admin ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-center">{row.cajero ? "✅" : "❌"}</TableCell>
                      <TableCell className="text-center">{row.contador ? "✅" : "❌"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="auditoria" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registro de Actividad</CardTitle>
              <CardDescription>Últimas 50 acciones registradas en el sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[500px]">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fecha</TableHead>
                      <TableHead>Usuario</TableHead>
                      <TableHead>Acción</TableHead>
                      <TableHead>Entidad</TableHead>
                      <TableHead>Detalles</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map(log => (
                      <TableRow key={log.id}>
                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString("es-DO")}
                        </TableCell>
                        <TableCell className="text-sm">{getProfileName(log.user_id)}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{log.accion}</Badge>
                        </TableCell>
                        <TableCell className="text-sm">{log.entidad}</TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-48 truncate">
                          {log.detalles ? JSON.stringify(log.detalles) : "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {logs.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No hay registros de actividad
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
