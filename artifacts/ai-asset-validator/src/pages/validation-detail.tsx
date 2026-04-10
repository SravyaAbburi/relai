import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import {
  useGetValidation, useValidateAsset,
  getGetValidationQueryKey, getListValidationsQueryKey, getGetProjectQueryKey
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, XCircle, AlertTriangle, Check, Fingerprint,
  FileText, Image as ImageIcon, ChevronLeft, RefreshCw, Clock,
  Zap, DollarSign
} from "lucide-react";
import { format } from "date-fns";

export default function ValidationDetail() {
  const [, params] = useRoute("/projects/:projectId/validations/:validationId");
  const projectId = parseInt(params?.projectId || "0", 10);
  const validationId = parseInt(params?.validationId || "0", 10);
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: record, isLoading, refetch } = useGetValidation(validationId, {
    query: { enabled: !!validationId, queryKey: getGetValidationQueryKey(validationId) }
  });

  const validateAsset = useValidateAsset();
  const [rerunning, setRerunning] = useState(false);

  const handleRunAgain = async () => {
    if (!record) return;
    setRerunning(true);
    validateAsset.mutate(
      {
        data: {
          projectId: record.projectId,
          assetName: record.assetName,
          assetContent: record.assetContent,
          assetType: record.assetType as any,
        },
      },
      {
        onSuccess: (result: any) => {
          toast({ title: "Re-validation complete", description: `Result: ${result.status}` });
          queryClient.invalidateQueries({ queryKey: getListValidationsQueryKey({ projectId }) });
          queryClient.invalidateQueries({ queryKey: getGetProjectQueryKey(projectId) });
          if (result.id) {
            navigate(`/projects/${projectId}/validations/${result.id}`);
          } else {
            refetch();
          }
        },
        onError: (err: any) => {
          toast({ title: "Re-validation failed", description: err?.error || "Error", variant: "destructive" });
        },
        onSettled: () => setRerunning(false),
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        Loading validation...
      </div>
    );
  }

  if (!record) {
    return (
      <div className="flex-1 flex items-center justify-center text-destructive">
        Validation not found.
      </div>
    );
  }

  const preCheck = (record.preCheckResults as any) || {};
  const isPassed = record.validationResult === "PASS";

  return (
    <div className="flex-1 overflow-auto bg-muted/10">
      <div className="border-b bg-background px-8 py-5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2"
            onClick={() => navigate(`/projects/${projectId}`)}
          >
            <ChevronLeft className="h-4 w-4" />
            Back to Project
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <div>
            <h1 className="text-xl font-semibold">{record.assetName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              {record.projectName} · {format(new Date(record.createdAt), "MMM d, yyyy HH:mm:ss")}
            </p>
          </div>
        </div>
        <Button
          onClick={handleRunAgain}
          disabled={rerunning || !record.assetContent}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${rerunning ? "animate-spin" : ""}`} />
          {rerunning ? "Running..." : "Run Again"}
        </Button>
      </div>

      <div className="p-8 space-y-6 max-w-4xl mx-auto">
        <div className={`rounded-xl border-2 p-6 flex items-center gap-5 ${isPassed ? "border-emerald-200 bg-emerald-50/50" : "border-destructive/30 bg-destructive/5"}`}>
          {isPassed
            ? <CheckCircle2 className="h-12 w-12 text-emerald-500 shrink-0" />
            : <XCircle className="h-12 w-12 text-destructive shrink-0" />
          }
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <Badge
                className={`text-sm px-3 py-1 ${isPassed ? "bg-emerald-500 hover:bg-emerald-600" : ""}`}
                variant={isPassed ? "default" : "destructive"}
              >
                {record.validationResult}
              </Badge>
              <Badge variant="outline" className="capitalize">{record.assetType}</Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              Confidence: <span className="font-semibold text-foreground">{(record.confidence * 100).toFixed(1)}%</span>
            </p>
          </div>
          <div className="grid grid-cols-3 gap-4 text-center shrink-0">
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Zap className="h-3 w-3" />
                <span className="text-xs">Tokens</span>
              </div>
              <span className="text-sm font-semibold">{record.tokensUsed.toLocaleString()}</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <Clock className="h-3 w-3" />
                <span className="text-xs">Latency</span>
              </div>
              <span className="text-sm font-semibold">{record.latency}ms</span>
            </div>
            <div>
              <div className="flex items-center justify-center gap-1 text-muted-foreground mb-1">
                <DollarSign className="h-3 w-3" />
                <span className="text-xs">Cost</span>
              </div>
              <span className="text-sm font-semibold">${Number(record.cost).toFixed(4)}</span>
            </div>
          </div>
        </div>

        {record.reasons && record.reasons.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Validation Notes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(record.reasons as string[]).map((reason, i) => (
                <div key={i} className="flex items-start gap-2 text-sm bg-muted/40 p-3 rounded-md border border-border/50">
                  {isPassed
                    ? <Check className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
                  }
                  <span>{reason}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Pre-check Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-3">
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Fingerprint className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Duplicate</span>
                </div>
                <Badge variant={preCheck.isDuplicate ? "destructive" : "secondary"}>
                  {preCheck.isDuplicate ? "Found" : "Clear"}
                </Badge>
              </div>
              <div className="border rounded-md p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">PII</span>
                </div>
                <Badge variant={preCheck.piiDetected ? "destructive" : "secondary"}>
                  {preCheck.piiDetected ? "Found" : "Clear"}
                </Badge>
              </div>
              {preCheck.blurScore != null && (
                <div className="border rounded-md p-3 flex items-center justify-between col-span-2">
                  <div className="flex items-center gap-2">
                    <ImageIcon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">Blur Score</span>
                  </div>
                  <span className="font-mono font-medium">{Number(preCheck.blurScore).toFixed(2)}</span>
                </div>
              )}
              {preCheck.piiItems && preCheck.piiItems.length > 0 && (
                <div className="border rounded-md p-3 col-span-2">
                  <p className="text-sm font-medium mb-2">PII Items Detected</p>
                  <div className="flex flex-wrap gap-1">
                    {(preCheck.piiItems as string[]).map((item: string, i: number) => (
                      <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {record.rawResponse && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm uppercase tracking-wider text-muted-foreground">Raw AI Response</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-gray-300 p-4 rounded-md overflow-auto max-h-[350px] text-xs font-mono border border-border/50">
                <pre>{record.rawResponse}</pre>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
