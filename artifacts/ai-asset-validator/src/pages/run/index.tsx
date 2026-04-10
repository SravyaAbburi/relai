import { useState, useCallback } from "react";
import { useListValidations, useValidateAsset, getListValidationsQueryKey, getGetProjectQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Play, CheckCircle2, XCircle, RefreshCw, ListChecks } from "lucide-react";
import { format } from "date-fns";

export default function RunPage() {
  const { data: validations, isLoading } = useListValidations();
  const validateAsset = useValidateAsset();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [filterProject, setFilterProject] = useState<string>("all");
  const [progress, setProgress] = useState<{ running: boolean; done: number; total: number; results: { id: number; status: string }[] }>({
    running: false, done: 0, total: 0, results: []
  });

  const allValidations = validations || [];

  const projects = Array.from(
    new Map(allValidations.map((v) => [v.projectId, v.projectName])).entries()
  ).map(([id, name]) => ({ id, name }));

  const filtered = filterProject === "all"
    ? allValidations
    : allValidations.filter((v) => String(v.projectId) === filterProject);

  const toggleOne = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((v) => v.id)));
    }
  };

  const runValidations = useCallback(async (targets: typeof allValidations) => {
    if (targets.length === 0) return;

    setProgress({ running: true, done: 0, total: targets.length, results: [] });
    const results: { id: number; status: string }[] = [];

    for (const v of targets) {
      const record = v as any;
      if (!record.assetContent && !record.assetName) {
        results.push({ id: v.id, status: "SKIP" });
        setProgress((p) => ({ ...p, done: p.done + 1, results: [...p.results, { id: v.id, status: "SKIP" }] }));
        continue;
      }

      await new Promise<void>((resolve) => {
        validateAsset.mutate(
          {
            data: {
              projectId: v.projectId,
              assetName: v.assetName,
              assetContent: record.assetContent || v.assetName,
              assetType: (record.assetType || "text") as any,
            },
          },
          {
            onSuccess: (result: any) => {
              results.push({ id: v.id, status: result.status });
              setProgress((p) => ({ ...p, done: p.done + 1, results: [...p.results, { id: v.id, status: result.status }] }));
              queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(v.projectId) });
            },
            onError: () => {
              results.push({ id: v.id, status: "ERROR" });
              setProgress((p) => ({ ...p, done: p.done + 1, results: [...p.results, { id: v.id, status: "ERROR" }] }));
            },
            onSettled: () => resolve(),
          }
        );
      });
    }

    queryClient.invalidateQueries({ queryKey: getListValidationsQueryKey() });
    setProgress((p) => ({ ...p, running: false }));
    toast({
      title: "Run complete",
      description: `${results.filter((r) => r.status === "PASS").length} passed, ${results.filter((r) => r.status === "FAIL").length} failed out of ${targets.length}.`,
    });
    setSelected(new Set());
  }, [validateAsset, queryClient, toast]);

  const handleRunAll = () => runValidations(filtered);
  const handleRunSelected = () => {
    const targets = filtered.filter((v) => selected.has(v.id));
    runValidations(targets);
  };

  const getResultForRow = (id: number) =>
    progress.results.find((r) => r.id === id);

  const passCount = progress.results.filter((r) => r.status === "PASS").length;
  const failCount = progress.results.filter((r) => r.status === "FAIL").length;

  return (
    <div className="flex-1 overflow-auto bg-muted/10">
      <div className="border-b bg-background px-8 py-6">
        <h1 className="text-2xl font-bold tracking-tight">Global Run</h1>
        <p className="text-sm text-muted-foreground mt-1">Re-run validations across all projects — all at once or selectively.</p>
      </div>

      <div className="p-8 space-y-6">
        {progress.running && (
          <Card className="border-primary/40">
            <CardContent className="pt-6 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Running validations...</span>
                <span className="text-muted-foreground">{progress.done} / {progress.total}</span>
              </div>
              <Progress value={progress.total > 0 ? (progress.done / progress.total) * 100 : 0} className="h-2" />
              <div className="flex gap-4 text-sm">
                <span className="text-emerald-600 font-medium">{passCount} passed</span>
                <span className="text-destructive font-medium">{failCount} failed</span>
              </div>
            </CardContent>
          </Card>
        )}

        {!progress.running && progress.results.length > 0 && (
          <Card className="border-emerald-200 bg-emerald-50/30">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <span className="text-sm font-medium">Run complete — {passCount} passed, {failCount} failed out of {progress.total}</span>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ListChecks className="h-5 w-5" />
                  Asset Validations
                </CardTitle>
                <CardDescription className="mt-1">
                  {filtered.length} records{selected.size > 0 ? ` · ${selected.size} selected` : ""}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                <Select value={filterProject} onValueChange={setFilterProject}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All projects</SelectItem>
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>{p.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRunSelected}
                  disabled={selected.size === 0 || progress.running}
                  className="gap-2"
                >
                  <Play className="h-3.5 w-3.5" />
                  Run Selected ({selected.size})
                </Button>
                <Button
                  size="sm"
                  onClick={handleRunAll}
                  disabled={filtered.length === 0 || progress.running}
                  className="gap-2"
                >
                  {progress.running
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <RefreshCw className="h-3.5 w-3.5" />
                  }
                  Run All ({filtered.length})
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No validations found.</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40px]">
                      <Checkbox
                        checked={filtered.length > 0 && selected.size === filtered.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Asset</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Last Result</TableHead>
                    <TableHead>Run Result</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((v) => {
                    const runResult = getResultForRow(v.id);
                    return (
                      <TableRow key={v.id} className={selected.has(v.id) ? "bg-muted/40" : ""}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(v.id)}
                            onCheckedChange={() => toggleOne(v.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium truncate max-w-[200px]">{v.assetName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">{v.projectName}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={v.validationResult === "PASS" ? "default" : "destructive"}
                            className={v.validationResult === "PASS" ? "bg-emerald-500 hover:bg-emerald-600" : ""}
                          >
                            {v.validationResult}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {runResult ? (
                            runResult.status === "PASS" ? (
                              <div className="flex items-center gap-1.5 text-emerald-600">
                                <CheckCircle2 className="h-4 w-4" />
                                <span className="text-xs font-medium">PASS</span>
                              </div>
                            ) : runResult.status === "FAIL" ? (
                              <div className="flex items-center gap-1.5 text-destructive">
                                <XCircle className="h-4 w-4" />
                                <span className="text-xs font-medium">FAIL</span>
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">{runResult.status}</span>
                            )
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {format(new Date(v.createdAt), "MMM d HH:mm")}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
