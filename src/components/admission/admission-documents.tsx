import { useEffect, useState } from "react";
import { useSupabase } from "@/hooks/use-supabase";
import { SupabaseClient } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { X, Pencil, Check } from "lucide-react";

export default function AdmissionDocuments({ selectedApplicant }: { selectedApplicant: Record<string, unknown> }) {
  const supabase = useSupabase() as SupabaseClient;
  const [documents, setDocuments] = useState<Record<string, unknown>[]>([]);
  const [showAddDoc, setShowAddDoc] = useState(false);
  const [newDocType, setNewDocType] = useState("");
  const [newDocRemarks, setNewDocRemarks] = useState("");
  const [adding, setAdding] = useState(false);
  const [addError, setAddError] = useState("");
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingRemarks, setEditingRemarks] = useState("");
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (!selectedApplicant) {
      setDocuments([]);
      return;
    }
    const fetchDocuments = async () => {
      const { data } = await supabase
        .from("applicant_documents")
        .select("*")
        .eq("applicant_id", selectedApplicant.id)
        .order("submitted_at", { ascending: false });
      setDocuments(data || []);
    };
    fetchDocuments();
  }, [selectedApplicant, supabase]);

  async function handleAddDocument(e: React.FormEvent) {
    e.preventDefault();
    setAdding(true);
    setAddError("");
    const { error } = await supabase.from('applicant_documents').insert({
      applicant_id: selectedApplicant.id,
      document_type: newDocType,
      remarks: newDocRemarks,
      status: 'pending',
    });
    setAdding(false);
    if (error) {
      setAddError(error.message);
      return;
    }
    setShowAddDoc(false);
    setNewDocType("");
    setNewDocRemarks("");
    // Refresh document list
    const { data } = await supabase
      .from("applicant_documents")
      .select("*")
      .eq("applicant_id", selectedApplicant.id)
      .order("submitted_at", { ascending: false });
    setDocuments(data || []);
  }

  async function handleUpdateRemarks(docId: string) {
    const { error } = await supabase
      .from("applicant_documents")
      .update({ remarks: editingRemarks })
      .eq("id", docId);
    if (!error) {
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, remarks: editingRemarks } : d));
      setEditingDocId(null);
      setEditingRemarks("");
    }
  }

  async function handleDeleteDocument(docId: string) {
    const { error } = await supabase
      .from("applicant_documents")
      .delete()
      .eq("id", docId);
    if (!error) {
      setDocuments(docs => docs.filter(d => d.id !== docId));
    }
  }

  async function handleApproveDocument(docId: string) {
    const { error } = await supabase
      .from("applicant_documents")
      .update({ status: "approved" })
      .eq("id", docId);
    if (!error) {
      setDocuments(docs => docs.map(d => d.id === docId ? { ...d, status: "approved" } : d));
    }
  }

  async function handleApproveAll() {
    await supabase
      .from("applicant_documents")
      .update({ status: "approved" })
      .eq("applicant_id", selectedApplicant.id);
    // Refresh document list
    const { data } = await supabase
      .from("applicant_documents")
      .select("*")
      .eq("applicant_id", selectedApplicant.id)
      .order("submitted_at", { ascending: false });
    setDocuments(data || []);
  }

  async function handleApproveAllWithWaiver() {
    await supabase
      .from("applicant_documents")
      .update({ status: "approved with waiver" })
      .eq("applicant_id", selectedApplicant.id);
    await supabase.from("applicant_documents").insert({
      applicant_id: selectedApplicant.id,
      document_type: "Waiver",
      status: "approved with waiver",
      remarks: "Approved with waiver"
    });
    // Refresh document list
    const { data } = await supabase
      .from("applicant_documents")
      .select("*")
      .eq("applicant_id", selectedApplicant.id)
      .order("submitted_at", { ascending: false });
    setDocuments(data || []);
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-2">
        <span>Submitted Documents:</span>
        {documents.length > 0 && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={handleApproveAll}>
              Approve All
            </Button>
            <Button size="sm" variant="secondary" onClick={handleApproveAllWithWaiver}>
              Approve All with Waiver
            </Button>
          </div>
        )}
      </div>
      {documents.length === 0 ? (
        <div className="text-muted-foreground mb-4">No documents submitted yet.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Remarks</TableHead>
              <TableHead>Submitted At</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {documents.map(doc => (
              <TableRow key={String(doc.id)}>
                <TableCell>{String(doc.document_type)}</TableCell>
                <TableCell>{String(doc.status)}</TableCell>
                <TableCell>
                  {editingDocId === doc.id ? (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={editingRemarks}
                        onChange={e => setEditingRemarks(e.target.value)}
                        className="border rounded px-2 py-1 text-sm"
                        autoFocus
                      />
                      <Button size="icon" variant="ghost" onClick={() => handleUpdateRemarks(String(doc.id))} title="Save"><Check className="w-4 h-4" /></Button>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingDocId(null); setEditingRemarks(""); }} title="Cancel"><X className="w-4 h-4" /></Button>
                    </div>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <span>{String(doc.remarks) || ''}</span>
                      <Button size="icon" variant="ghost" onClick={() => { setEditingDocId(String(doc.id)); setEditingRemarks(String(doc.remarks) || ""); }} title="Edit"><Pencil className="w-4 h-4" /></Button>
                    </div>
                  )}
                </TableCell>
                <TableCell>{mounted && doc.submitted_at ? new Date(String(doc.submitted_at)).toLocaleString() : ''}</TableCell>
                <TableCell>
                  <Button size="icon" variant="destructive" onClick={() => handleDeleteDocument(String(doc.id))} title="Delete"><X className="w-4 h-4" /></Button>
                  {doc.status !== 'approved' && (
                    <Button size="icon" variant="secondary" onClick={() => handleApproveDocument(String(doc.id))} title="Approve"><Check className="w-4 h-4" /></Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
      <Button variant="outline" className="mt-4" onClick={() => setShowAddDoc(true)}>Add Document</Button>
      <Dialog open={showAddDoc} onOpenChange={setShowAddDoc}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Document</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddDocument} className="flex flex-col gap-4">
            <Select value={newDocType} onValueChange={setNewDocType} required>
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Transcript of Records">Transcript of Records</SelectItem>
                <SelectItem value="Birth Certificate">Birth Certificate</SelectItem>
                <SelectItem value="Good Moral">Good Moral</SelectItem>
                <SelectItem value="Form 137">Form 137</SelectItem>
              </SelectContent>
            </Select>
            <input
              type="text"
              placeholder="Remarks (optional)"
              value={newDocRemarks}
              onChange={e => setNewDocRemarks(e.target.value)}
              className="border rounded px-3 py-2"
            />
            {addError && <div className="text-destructive text-sm">{addError}</div>}
            <DialogFooter>
              <Button type="submit" disabled={adding || !newDocType}>{adding ? 'Adding...' : 'Add'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
} 