import { useState, useEffect, useCallback } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetProject, useGetProjectConfig, useUpsertProjectConfig,
  useValidateAsset, useListValidations, getValidation,
  getGetProjectConfigQueryKey, getListValidationsQueryKey, getGetProjectQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, Clock, Zap, DollarSign, ListChecks, FileText,
  Upload, Check, AlertTriangle, Fingerprint, Image as ImageIcon, Eye, Play, RefreshCw
} from "lucide-react";
import { format } from "date-fns";

export default function ProjectDetail() {
  const [, params] = useRoute("/projects/:id");
  const projectId = parseInt(params?.id || "0", 10);
  const [activeTab, setActiveTab] = useState("dashboard");
   const [selectedFile, setSelectedFile] = useState<File | null>(null);
const [description, setDescription] = useState("");
const [result, setResult] = useState<any>(null);
const [loading, setLoading] = useState(false);
  const { data: project, isLoading: isProjectLoading } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  if (isProjectLoading) return <div className="p-8 flex justify-center text-muted-foreground">Loading project...</div>;
  if (!project) return <div className="p-8 flex justify-center text-destructive">Project not found</div>;

  return (
    <div className="flex-1 overflow-auto bg-muted/10 h-full flex flex-col">
      <div className="border-b bg-background px-8 py-6">
        <div className="flex items-center gap-3 mb-2">
          <Badge variant="outline" className="uppercase tracking-wider text-xs">
            {project.type}
          </Badge>
          <span className="text-sm text-muted-foreground">ID: {project.id}</span>
        </div>
        <h1 className="text-3xl font-bold tracking-tight">{project.name}</h1>
        {(project as any).storageFolderLink && (
          <a
            href={(project as any).storageFolderLink}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-primary hover:underline mt-1 block"
          >
            Storage folder →
          </a>
        )}
      </div>

      <div className="p-8 flex-1">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="mb-6 h-11">
            <TabsTrigger value="dashboard" className="px-6">Dashboard</TabsTrigger>
            <TabsTrigger value="config" className="px-6">Configuration</TabsTrigger>
            <TabsTrigger value="playground" className="px-6">Playground</TabsTrigger>
            <TabsTrigger value="validations" className="px-6">Validations</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard" className="m-0">
            <DashboardTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="config" className="m-0">
            <ConfigTab projectId={projectId} />
          </TabsContent>
          <TabsContent value="playground" className="m-0">
            <PlaygroundTab projectId={projectId} projectType={project.type as any} />
          </TabsContent>
          <TabsContent value="validations" className="m-0">
            <ValidationsTab projectId={projectId} onRunNew={() => setActiveTab("playground")} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function DashboardTab({ projectId }: { projectId: number }) {
  const { data: project } = useGetProject(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectQueryKey(projectId) }
  });

  const stats = project as any;
  if (!stats) return null;

  const total = stats.validatedAssets || 0;
  const passed = stats.passCount || 0;
  const failed = stats.failCount || 0;
  const duplicates = stats.duplicateCount || 0;

  return (
    <div className="space-y-4">
      {/* Top row: primary counts */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assets Validated</CardTitle>
            <ListChecks className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{total.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Total runs</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Passed</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{passed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {total > 0 ? ((passed / total) * 100).toFixed(1) : 0}% pass rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Failed</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{failed.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {total > 0 ? ((failed / total) * 100).toFixed(1) : 0}% fail rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Duplicates Caught</CardTitle>
            <Fingerprint className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{duplicates.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Pre-check blocks</p>
          </CardContent>
        </Card>
      </div>

      {/* Bottom row: performance & cost */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
            <Zap className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.totalTokens || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Input + output</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Latency</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(stats.avgLatency || 0).toLocaleString()}ms</div>
            <p className="text-xs text-muted-foreground mt-1">Per validation</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${(stats.totalCost || 0).toFixed(4)}</div>
            <p className="text-xs text-muted-foreground mt-1">AI inference spend</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function PlaygroundTab({ projectId, projectType }: { projectId: number, projectType: "image" | "text" | "audio" | "video" }) {
  const [assetType, setAssetType] = useState<any>(projectType || "text");
  const [assetContent, setAssetContent] = useState("");
  const [assetName, setAssetName] = useState("");
  const [validationRules, setValidationRules] = useState("");
  const [promptOverride, setPromptOverride] = useState("");
  const [enablePII, setEnablePII] = useState(true);
  const [enableBlur, setEnableBlur] = useState(true);
  const [enableDuplication, setEnableDuplication] = useState(true);
  const [configLoaded, setConfigLoaded] = useState(false);
  const [manualResult, setManualResult] = useState<any>(null);

  const { data: config } = useGetProjectConfig(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectConfigQueryKey(projectId) }
  });

  useEffect(() => {
    if (config && !configLoaded) {
      setEnablePII(config.enablePIIValidation);
      setEnableBlur(config.enableBlurCheck);
      setEnableDuplication(config.enableDuplicationCheck);
      if (config.validationRules) setValidationRules(config.validationRules);
      setConfigLoaded(true);
    }
  }, [config, configLoaded]);

  const { toast } = useToast();
  const validateAsset = useValidateAsset();
  const queryClient = useQueryClient();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssetName(file.name);
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) setAssetContent(event.target.result as string);
    };
    reader.readAsDataURL(file);
  };

  // const onSubmit = () => {
  //   if (!assetContent) {
  //     toast({ title: "Asset content is required", variant: "destructive" });
  //     return;
  //   }
  //   validateAsset.mutate({
  //     data: {
  //       projectId,
  //       assetName: assetName || `Asset-${Date.now()}`,
  //       assetContent,
  //       assetType,
  //       validationRules: validationRules || undefined,
  //       promptOverride: promptOverride || undefined,
  //       enablePIICheck: enablePII,
  //       enableBlurCheck: enableBlur,
  //       enableDuplicationCheck: enableDuplication,
  //     }
  //   }, {
  //     onSuccess: () => {
  //       toast({ title: "Validation completed" });
  //       queryClient.invalidateQueries({ queryKey: getListValidationsQueryKey() });
  //       queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
  //     },
  //     onError: (err: any) => {
  //       toast({ title: "Validation failed", description: err?.error || "Error", variant: "destructive" });
  //     }
  //   });
  // };
   const onSubmit = async () => {
  //image
  // if (assetType === "image") {
  if (assetType) {
    if (!assetContent) {
      toast({ title: "Please upload asset", variant: "destructive" });
      return;
    }

    try {
      const formData = new FormData();
      const res = await fetch(assetContent);
      const blob = await res.blob();

      formData.append("file", blob, assetName || "image.jpg");
      formData.append("description", validationRules || "Validate this image");
      formData.append("assetType", assetType);
    // const endpoint = "/api/validate";
    const endpointMap: Record<string, string> = {
      image: "validate-image",
      audio: "validate-audio",
      text: "validate-text",
      video: "validate-video",
    };

    const apiPath = endpointMap[assetType];

    // const endpoint = `http://localhost:3001/api/${apiPath}`;
    const endpoint = `/api/${apiPath}`;
      // const response = await fetch("/api/validate-image", {
      //   method: "POST",
      //   body: formData,
      // });
      const response = await fetch(endpoint, {
        method: "POST",
        body: formData,
      });


      const data = await response.json();
      const validation = data.api2?.validation;

      const reasonsArray = [];

      if (validation?.reasoning) {
        reasonsArray.push(validation.reasoning);
      }

      if (validation?.final_status === "FAIL" && validation?.failure_reason) {
        reasonsArray.push(`Failure Reason: ${validation.failure_reason}`);
      }
      const mappedResult = {
        // status: data.api2?.status || "PASS",
        status: data.api2?.validation?.final_status || "",
        confidence: 0.9,
        // tokensUsed: 0,
        tokensUsed: data.api2?.metrics?.llm_usage?.total_tokens || 0,
        // latency: 0,
        latency: data.api2?.metrics?.latency_ms || 0,
        // cost: 0,
        cost: data.api2?.metrics?.llm_usage?.estimated_cost_usd || 0,
        // reasons: [JSON.stringify(data.api2)],
        // reasons: data.api2?.validation?.reasoning || [],
        reasons: reasonsArray,
        preCheckResults: {},
        rawResponse: JSON.stringify(data, null, 2),
      };
      setManualResult(mappedResult);

      toast({ title: "Validation completed (Image API)" });

    } catch (err: any) {
      toast({ title: "Validation failed", description: err.message, variant: "destructive" });
    }

    return;
  }

  //existing flow
  if (!assetContent) {
    toast({ title: "Asset content is required", variant: "destructive" });
    return;
  }

  validateAsset.mutate({
    data: {
      projectId,
      assetName: assetName || `Asset-${Date.now()}`,
      assetContent,
      assetType,
      validationRules: validationRules || undefined,
      promptOverride: promptOverride || undefined,
      enablePIICheck: enablePII,
      enableBlurCheck: enableBlur,
      enableDuplicationCheck: enableDuplication,
    }
  });
};
  // const result = validateAsset.data;
  const result = manualResult || validateAsset.data;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Validation Input</CardTitle>
            <CardDescription>Upload or input the asset to validate against the project rules.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Asset Type</Label>
              <Select value={assetType} onValueChange={setAssetType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="image">Image</SelectItem>
                  <SelectItem value="audio">Audio</SelectItem>
                  <SelectItem value="video">Video</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Asset Content</Label>
              {assetType === "text" ? (
                <Textarea
                  placeholder="Enter text to validate..."
                  className="min-h-[150px] font-mono text-sm"
                  value={assetContent}
                  onChange={(e) => setAssetContent(e.target.value)}
                />
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center bg-muted/50 hover:bg-muted/80 transition-colors">
                  <Input
                    type="file"
                    className="hidden"
                    id="file-upload"
                    onChange={handleFileUpload}
                    accept={assetType === 'image' ? 'image/*' : assetType === 'audio' ? 'audio/*' : 'video/*'}
                  />
                  <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2" />
                    <span className="font-medium text-sm">Click to upload file</span>
                    <span className="text-xs text-muted-foreground mt-1">{assetName || "No file selected"}</span>
                  </Label>
                </div>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">Pre-checks</p>
                <span className="text-xs text-muted-foreground">Loaded from config · toggle to override</span>
              </div>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">PII Detection</Label>
                  <Switch checked={enablePII} onCheckedChange={setEnablePII} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Blur Check</Label>
                  <Switch checked={enableBlur} onCheckedChange={setEnableBlur} />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-normal">Duplication Check</Label>
                  <Switch checked={enableDuplication} onCheckedChange={setEnableDuplication} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label>
                Validation Rules{" "}
                <span className="text-muted-foreground text-xs font-normal">
                  {config?.validationRules ? "from config · editable" : "optional"}
                </span>
              </Label>
              <Textarea
                placeholder="Validation rules for this run..."
                className="min-h-[80px] text-sm"
                value={validationRules}
                onChange={(e) => setValidationRules(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Prompt Override <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea
                placeholder="Override system prompt..."
                className="min-h-[80px] text-sm"
                value={promptOverride}
                onChange={(e) => setPromptOverride(e.target.value)}
              />
            </div>

            <Button className="w-full" onClick={onSubmit} disabled={validateAsset.isPending || !assetContent}>
              {validateAsset.isPending ? "Validating..." : "Run Validation"}
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        {result ? (
          <ValidationResultCard result={result} />
        ) : (
          <div className="h-full min-h-[400px] border rounded-xl bg-card flex flex-col items-center justify-center text-muted-foreground p-8 text-center border-dashed">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <Zap className="h-8 w-8 opacity-50" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">Awaiting Input</h3>
            <p className="text-sm max-w-sm">Configure your asset and click "Run Validation" to see the detailed evaluation results here.</p>
          </div>
        )}
      </div>
    </div>
  );
}


function ValidationResultCard({ result }: { result: any }) {
  return (
    <Card className="overflow-hidden">
      <div className={`p-4 flex items-center justify-between border-b ${result.status === 'PASS' ? 'bg-emerald-50/50' : 'bg-destructive/5'}`}>
        <div className="flex items-center gap-3">
          {result.status === 'PASS' ? (
            <CheckCircle2 className="h-8 w-8 text-emerald-500" />
          ) : (
            <XCircle className="h-8 w-8 text-destructive" />
          )}
          <div>
            <h3 className={`text-xl font-bold ${result.status === 'PASS' ? 'text-emerald-600' : 'text-destructive'}`}>
              {result.status}
            </h3>
            <p className="text-xs text-muted-foreground font-medium">
              Confidence: {(result.confidence * 100).toFixed(1)}%
            </p>
          </div>
        </div>
        <div className="flex gap-4 text-sm text-muted-foreground">
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Tokens</span>
            <span className="font-mono text-foreground font-medium">{result.tokensUsed.toLocaleString()}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Latency</span>
            <span className="font-mono text-foreground font-medium">{result.latency}ms</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" /> Cost</span>
            <span className="font-mono text-foreground font-medium">${result.cost.toFixed(4)}</span>
          </div>
        </div>
      </div>

      <CardContent className="p-6 space-y-6">
        {result.reasons && result.reasons.length > 0 && (
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Validation Notes</h4>
            <ul className="space-y-2">
              {result.reasons.map((reason: string, i: number) => (
                <li key={i} className="flex items-start gap-2 text-sm bg-muted/40 p-3 rounded-md border border-border/50">
                  {result.status === 'PASS' ? <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {result.preCheckResults && (
          <div>
            <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Pre-checks</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Duplicates</span>
                </div>
                <Badge variant={result.preCheckResults.isDuplicate ? "destructive" : "secondary"}>
                  {result.preCheckResults.isDuplicate ? "Found" : "Clear"}
                </Badge>
              </div>
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">PII Detect</span>
                </div>
                <Badge variant={result.preCheckResults.piiDetected ? "destructive" : "secondary"}>
                  {result.preCheckResults.piiDetected ? "Found" : "Clear"}
                </Badge>
              </div>
              {result.preCheckResults.blurScore != null && (
                <div className="border rounded-md p-3 flex items-center justify-between col-span-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Blur Score</span>
                  </div>
                  <span className="font-mono font-medium">{result.preCheckResults.blurScore.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <h4 className="text-sm font-semibold mb-3 uppercase tracking-wider text-muted-foreground">Raw AI Response</h4>
          <div className="bg-black text-gray-300 p-4 rounded-md overflow-auto max-h-[300px] text-xs font-mono border border-border/50">
            <pre>{result.rawResponse}</pre>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function ValidationDetailDialog({ record, open, onOpenChange }: { record: any; open: boolean; onOpenChange: (v: boolean) => void }) {
  if (!record) return null;
  const preCheck = record.preCheckResults as any || {};

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Validation Detail — {record.assetName}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3">
            <Badge variant={record.validationResult === "PASS" ? "default" : "destructive"}
              className={record.validationResult === "PASS" ? "bg-emerald-500" : ""}>
              {record.validationResult}
            </Badge>
            <span className="text-sm text-muted-foreground">Confidence: {(record.confidence * 100).toFixed(1)}%</span>
            <span className="text-sm text-muted-foreground">{record.tokensUsed.toLocaleString()} tokens</span>
            <span className="text-sm text-muted-foreground">{record.latency}ms</span>
            <span className="text-sm text-muted-foreground">${Number(record.cost).toFixed(4)}</span>
          </div>

          {record.reasons && record.reasons.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Reasons</p>
              <ul className="space-y-1.5">
                {(record.reasons as string[]).map((r, i) => (
                  <li key={i} className="text-sm flex items-start gap-2 bg-muted/40 p-2.5 rounded-md">
                    {record.validationResult === "PASS" ? <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" /> : <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />}
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Pre-checks</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="border rounded-md p-2.5 flex justify-between">
                <span>Duplicate</span>
                <Badge variant={preCheck.isDuplicate ? "destructive" : "secondary"} className="text-xs">
                  {preCheck.isDuplicate ? "Found" : "Clear"}
                </Badge>
              </div>
              <div className="border rounded-md p-2.5 flex justify-between">
                <span>PII</span>
                <Badge variant={preCheck.piiDetected ? "destructive" : "secondary"} className="text-xs">
                  {preCheck.piiDetected ? "Found" : "Clear"}
                </Badge>
              </div>
              {preCheck.blurScore != null && (
                <div className="border rounded-md p-2.5 flex justify-between col-span-2">
                  <span>Blur Score</span>
                  <span className="font-mono">{Number(preCheck.blurScore).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {record.rawResponse && (
            <div>
              <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">Raw AI Response</p>
              <div className="bg-black text-gray-300 p-3 rounded-md overflow-auto max-h-[200px] text-xs font-mono">
                <pre>{record.rawResponse}</pre>
              </div>
            </div>
          )}

          <p className="text-xs text-muted-foreground">
            Validated {format(new Date(record.createdAt), "MMM d, yyyy HH:mm:ss")}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ValidationsTab({ projectId, onRunNew }: { projectId: number; onRunNew: () => void }) {
  const { data: validations, isLoading } = useListValidations({
    query: { enabled: !!projectId, queryKey: getListValidationsQueryKey({ projectId }) }
  });
  const [, navigate] = useLocation();
  const validateAsset = useValidateAsset();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [rerunningId, setRerunningId] = useState<number | null>(null);

  const handleRunAgain = async (validationId: number) => {
    setRerunningId(validationId);
    try {
      const full = await getValidation(validationId);
      validateAsset.mutate(
        {
          data: {
            projectId: full.projectId,
            assetName: full.assetName,
            assetContent: full.assetContent,
            assetType: full.assetType as any,
          },
        },
        {
          onSuccess: (result: any) => {
            toast({ title: "Re-validation complete", description: `Result: ${result.status}` });
            queryClient.invalidateQueries({ queryKey: getListValidationsQueryKey({ projectId }) });
            queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
            if (result.id) navigate(`/projects/${projectId}/validations/${result.id}`);
          },
          onError: (err: any) => {
            toast({ title: "Re-validation failed", description: err?.error || "Error", variant: "destructive" });
          },
          onSettled: () => setRerunningId(null),
        }
      );
    } catch {
      toast({ title: "Failed to load asset", variant: "destructive" });
      setRerunningId(null);
    }
  };

  if (isLoading) return <div className="p-4">Loading...</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Validation History</CardTitle>
            <CardDescription>Recent validation runs for this project.</CardDescription>
          </div>
          <Button onClick={onRunNew} size="sm">
            <Play className="h-4 w-4 mr-2" /> Run Validation
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Asset</TableHead>
              <TableHead>Result</TableHead>
              <TableHead>Confidence</TableHead>
              <TableHead>Latency</TableHead>
              <TableHead>Cost</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {validations?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No validations yet.{" "}
                  <button className="text-primary underline" onClick={onRunNew}>Run your first validation</button>
                </TableCell>
              </TableRow>
            ) : (
              validations?.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-medium truncate max-w-[200px]">{v.assetName}</TableCell>
                  <TableCell>
                    <Badge variant={v.validationResult === "PASS" ? "default" : "destructive"}
                      className={v.validationResult === "PASS" ? "bg-emerald-500 hover:bg-emerald-600" : ""}>
                      {v.validationResult}
                    </Badge>
                  </TableCell>
                  <TableCell>{(v.confidence * 100).toFixed(1)}%</TableCell>
                  <TableCell className="font-mono text-xs">{v.latency}ms</TableCell>
                  <TableCell className="font-mono text-xs">${v.cost.toFixed(4)}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {format(new Date(v.createdAt), 'MMM d HH:mm')}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="View details"
                        onClick={() => navigate(`/projects/${projectId}/validations/${v.id}`)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        title="Run again"
                        disabled={rerunningId === v.id}
                        onClick={() => handleRunAgain(v.id)}
                      >
                        <RefreshCw className={`h-4 w-4 ${rerunningId === v.id ? "animate-spin" : ""}`} />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function ConfigTab({ projectId }: { projectId: number }) {
  const { data: config, isLoading } = useGetProjectConfig(projectId, {
    query: { enabled: !!projectId, queryKey: getGetProjectConfigQueryKey(projectId) }
  });

  const upsertConfig = useUpsertProjectConfig();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [rules, setRules] = useState("");
  const [dupCheck, setDupCheck] = useState(false);
  const [piiCheck, setPiiCheck] = useState(false);
  const [blurCheck, setBlurCheck] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    if (config) {
      setRules(config.validationRules || "");
      setDupCheck(config.enableDuplicationCheck);
      setPiiCheck(config.enablePIIValidation);
      setBlurCheck(config.enableBlurCheck);
      setIsDirty(false);
    }
  }, [config]);

  const markDirty = useCallback(() => setIsDirty(true), []);

  if (isLoading) return <div className="p-4">Loading config...</div>;

  const handleSave = () => {
    upsertConfig.mutate({
      params: { id: projectId },
      data: {
        validationRules: rules,
        enableDuplicationCheck: dupCheck,
        enablePIIValidation: piiCheck,
        enableBlurCheck: blurCheck,
      }
    }, {
      onSuccess: () => {
        toast({ title: "Configuration saved" });
        queryClient.invalidateQueries({ queryKey: getGetProjectConfigQueryKey(projectId) });
        setIsDirty(false);
      },
      onError: () => toast({ title: "Failed to save configuration", variant: "destructive" })
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Validation Rules</CardTitle>
            <CardDescription>Natural language instructions for the AI on how to evaluate assets in this project.</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              className="min-h-[300px] font-mono text-sm leading-relaxed"
              value={rules}
              onChange={(e) => { setRules(e.target.value); markDirty(); }}
              placeholder="e.g. Reject any image that contains text. Ensure images are well-lit and professional."
            />
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Pre-validation Checks</CardTitle>
            <CardDescription>Fast heuristic checks to run before sending to AI.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Duplication Check</Label>
                <p className="text-xs text-muted-foreground">Block exact duplicate assets (SHA-256)</p>
              </div>
              <Switch
                checked={dupCheck}
                onCheckedChange={(v) => { setDupCheck(v); markDirty(); }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>PII Detection</Label>
                <p className="text-xs text-muted-foreground">Detect emails, phones, SSNs, credit cards</p>
              </div>
              <Switch
                checked={piiCheck}
                onCheckedChange={(v) => { setPiiCheck(v); markDirty(); }}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Blur Check</Label>
                <p className="text-xs text-muted-foreground">Detect blurry/low-quality images</p>
              </div>
              <Switch
                checked={blurCheck}
                onCheckedChange={(v) => { setBlurCheck(v); markDirty(); }}
              />
            </div>
          </CardContent>
        </Card>

        <Button
          className="w-full"
          onClick={handleSave}
          disabled={upsertConfig.isPending || !isDirty}
        >
          {upsertConfig.isPending ? "Saving..." : isDirty ? "Save Changes" : "No Changes"}
        </Button>
      </div>
    </div>
  );
}
