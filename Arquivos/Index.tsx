import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AppHeader } from "@/components/AppHeader";
import { Cliente } from "@/lib/grc-constants";
import { addCliente, getClientes, getDocumentos } from "@/lib/grc-store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Building2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth";

const Index = () => {
  const { can } = useAuth();
  const [clientes, setClientes] = useState<Cliente[]>(() => getClientes());
  const [docs] = useState(() => getDocumentos());
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoLogo, setNovoLogo] = useState<string | undefined>();

  const filtrados = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return clientes;
    return clientes.filter(c => c.nome.toLowerCase().includes(q));
  }, [clientes, query]);

  const docsPorCliente = useMemo(() => {
    const m: Record<string, number> = {};
    docs.forEach(d => { m[d.clienteId] = (m[d.clienteId] || 0) + 1; });
    return m;
  }, [docs]);

  const handleLogo = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setNovoLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  const criarCliente = () => {
    if (!novoNome.trim()) { toast.error("Informe o nome do cliente"); return; }
    const id = novoNome.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    const c: Cliente = { id, nome: novoNome.trim(), logo: novoLogo };
    addCliente(c);
    setClientes(getClientes());
    setOpen(false); setNovoNome(""); setNovoLogo(undefined);
    toast.success("Cliente adicionado");
  };

  return (
    <div className="min-h-screen bg-gradient-surface">
      <AppHeader onSearch={setQuery} />

      <main className="container py-12">
        <section className="mb-12 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
              Wiki Corporativa
            </p>
            <h1 className="text-4xl font-bold text-foreground md:text-5xl">
              GRC – Base de Conhecimento
            </h1>
            <p className="mt-3 max-w-2xl text-muted-foreground">
              Gestão de documentos de Governança, Riscos e Compliance com versionamento,
              controle de validade, classificação da informação e fluxo de aprovação.
            </p>
          </div>

          {can("manageLayout") && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="lg" className="bg-gradient-accent shadow-elegant">
                <Plus className="mr-2 h-4 w-4" /> Adicionar Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nome do cliente</Label>
                  <Input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Ex.: Nova Empresa S.A." />
                </div>
                <div>
                  <Label>Logo do cliente</Label>
                  <Input type="file" accept="image/*" onChange={(e) => handleLogo(e.target.files?.[0])} />
                  {novoLogo && <img src={novoLogo} alt="preview" className="mt-3 h-16 w-auto rounded border bg-card p-2" />}
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={criarCliente}>Criar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          )}
        </section>

        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filtrados.map((c) => (
            <Link
              key={c.id}
              to={`/cliente/${c.id}`}
              className="group relative overflow-hidden rounded-xl border border-border bg-card p-6 shadow-elegant transition-all hover:-translate-y-1 hover:shadow-elevated"
            >
              <div className="mb-5 flex h-20 items-center justify-center rounded-lg bg-gradient-surface">
                {c.logo ? (
                  <img src={c.logo} alt={c.nome} className="max-h-16 max-w-[80%] object-contain" />
                ) : (
                  <Building2 className="h-10 w-10 text-muted-foreground" />
                )}
              </div>
              <h3 className="text-lg font-semibold text-foreground">{c.nome}</h3>
              <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                <FileText className="h-4 w-4" />
                {docsPorCliente[c.id] || 0} documento(s)
              </div>
              <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 bg-gradient-accent transition-transform group-hover:scale-x-100" />
            </Link>
          ))}
        </section>
      </main>

      <footer className="border-t border-border bg-card/60">
        <div className="container py-6 text-center text-xs text-muted-foreground">
          GRC – Base de Conhecimento · Alinhado a ITIL, Governança e Compliance
        </div>
      </footer>
    </div>
  );
};

export default Index;
