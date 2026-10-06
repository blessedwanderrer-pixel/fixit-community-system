import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Camera, CheckCircle2, Clock, Lock, Receipt, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { CTA } from '../components/common/CTA';
import { PageHero } from '../components/common/PageHero';
import { apiRequest } from '../lib/api';

type DonationStatus = 'Pending' | 'Verified' | 'Rejected';

interface DonationResponse {
  id: string;
  transaction_id: string;
  amount: string | number;
  currency: string;
  transaction_at: string;
  status: DonationStatus;
  created_at: string;
}

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const localDateTimeValue = (): string => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
};

export const SubmitDonationProofPage: React.FC = () => {
  const { session } = useAuth();
  const [submittedDonation, setSubmittedDonation] = useState<DonationResponse | null>(null);
  const [formData, setFormData] = useState({ transactionId: '', amount: '', transactionAt: localDateTimeValue() });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  const handleFileSelect = (file: File | undefined) => {
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setFileError('Unsupported file type. Upload a JPG/JPEG, PNG, or WebP image.');
      return;
    }
    setFileError(null);
    setSubmitError(null);
    setSelectedFile(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleRemoveFile = (event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setSelectedFile(null);
    setPreviewUrl(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);
    if (!selectedFile) {
      setFileError('Attach a screenshot or photo of the external payment receipt.');
      return;
    }
    if (!session?.access_token) {
      setSubmitError('Your authenticated session is unavailable. Please sign in again.');
      return;
    }
    const transactionAt = new Date(formData.transactionAt);
    if (Number.isNaN(transactionAt.getTime())) {
      setSubmitError('Enter a valid transaction date and time.');
      return;
    }

    const payload = new FormData();
    payload.append('transaction_id', formData.transactionId.trim());
    payload.append('amount', formData.amount);
    payload.append('transaction_at', transactionAt.toISOString());
    payload.append('currency', 'PKR');
    payload.append('screenshot', selectedFile);

    setIsSubmitting(true);
    try {
      const donation = await apiRequest<DonationResponse>('/api/donations', {
        method: 'POST', body: payload, accessToken: session.access_token,
      });
      setSubmittedDonation(donation);
    } catch (cause) {
      setSubmitError(cause instanceof Error ? cause.message : 'Unable to submit donation proof.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setSubmittedDonation(null);
    setSubmitError(null);
    handleRemoveFile();
    setFormData({ transactionId: '', amount: '', transactionAt: localDateTimeValue() });
  };

  return (
    <div className="w-full">
      <PageHero
        kicker="Financial Transparency"
        title="Submit Donation Proof"
        subtitle="After paying through an external FixIt payment channel, submit your receipt image for manual reconciliation against FixIt's real wallet or bank record."
        breadcrumbs={[{ label: 'Transparency', href: '/transparency' }, { label: 'Submit Donation Proof' }]}
        badgeText="Authenticated Citizen Submission"
      />

      <section className="bg-stone-900 text-stone-200 border-b border-stone-800 py-4 px-4 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-start gap-2">
            <Lock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
            <span><strong className="text-white">Private proof:</strong> Your screenshot is retained for authorized Admin review and is never published publicly. A screenshot alone does not verify payment.</span>
          </div>
          <span className="font-mono text-stone-400 text-[11px] shrink-0">Manual wallet-record reconciliation</span>
        </div>
      </section>

      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {submittedDonation ? (
            <div className="rounded border border-stone-300 bg-white p-8 sm:p-12 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-6"><Clock className="w-8 h-8" /></div>
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1 rounded">Submitted for Manual Review</span>
              <h2 className="mt-4 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">Donation Status: {submittedDonation.status}</h2>
              <p className="mt-2 text-sm text-stone-600 max-w-lg mx-auto">Submission confirms receipt of your proof only. An Admin must still match it against FixIt's real wallet or bank record.</p>

              <div className="my-8 p-5 rounded bg-stone-900 text-left text-white border border-stone-800 max-w-lg mx-auto space-y-2">
                <div className="text-[11px] font-mono uppercase tracking-wider text-stone-400">Donation Record ID</div>
                <div className="font-mono text-sm sm:text-base font-bold text-orange-400 break-all">{submittedDonation.id}</div>
                <div className="pt-3 mt-3 border-t border-stone-700 text-xs text-stone-300 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <span>Transaction: <strong className="text-white">{submittedDonation.transaction_id}</strong></span>
                  <span>Amount: <strong className="text-white">{submittedDonation.currency} {submittedDonation.amount}</strong></span>
                </div>
              </div>

              <div className="p-5 rounded bg-stone-50 border border-stone-200 text-left text-xs text-stone-700 max-w-lg mx-auto">
                <div className="font-bold text-stone-900 text-sm mb-3">What happens next</div>
                <div className="flex flex-wrap items-center gap-2 leading-relaxed">
                  <span className="font-bold">Pay externally</span><ArrowRight className="w-3.5 h-3.5" />
                  <span className="font-bold">Submit proof</span><ArrowRight className="w-3.5 h-3.5" />
                  <span className="font-bold text-amber-800">Pending</span><ArrowRight className="w-3.5 h-3.5" />
                  <span>Admin checks FixIt's real wallet record</span><ArrowRight className="w-3.5 h-3.5" />
                  <span className="font-bold">Verified or Rejected</span>
                </div>
              </div>

              <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link to="/citizen" className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 rounded">Return to Citizen Dashboard</Link>
                <button type="button" onClick={resetForm} className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded">Submit Another Proof</button>
              </div>
            </div>
          ) : (
            <div className="rounded border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="mb-8 pb-6 border-b border-stone-200">
                <div className="flex items-center gap-2 mb-2"><Receipt className="w-4 h-4 text-orange-600" /><span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">Manual Verification Queue</span></div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">Transaction & Receipt Details</h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">Enter the details exactly as recorded by the external payment service.</p>
              </div>

              <div className="mb-7 grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
                {['Pay externally', 'Submit proof', 'Pending', 'Admin reconciliation', 'Verified / Rejected'].map((step, index) => (
                  <div key={step} className="rounded bg-stone-50 border border-stone-200 p-2.5 text-center font-semibold text-stone-700"><span className="block text-[10px] font-mono text-orange-600 mb-1">0{index + 1}</span>{step}</div>
                ))}
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Transaction / Reference ID *</label>
                    <input type="text" required value={formData.transactionId} onChange={(event) => setFormData((current) => ({ ...current, transactionId: event.target.value }))} placeholder="Enter the external transaction reference" className="w-full px-3 py-2.5 text-xs font-mono border border-stone-300 rounded focus:outline-none focus:border-orange-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Amount (PKR) *</label>
                    <input type="number" required min="0.01" step="0.01" value={formData.amount} onChange={(event) => setFormData((current) => ({ ...current, amount: event.target.value }))} placeholder="e.g. 5000" className="w-full px-3 py-2.5 text-xs font-mono border border-stone-300 rounded focus:outline-none focus:border-orange-500" />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">Transaction Date & Time *</label>
                  <input type="datetime-local" required value={formData.transactionAt} onChange={(event) => setFormData((current) => ({ ...current, transactionAt: event.target.value }))} className="w-full px-3 py-2.5 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500" />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 gap-3"><label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">Receipt Screenshot *</label><span className="text-[11px] text-stone-400">JPG/JPEG, PNG or WebP</span></div>
                  <input type="file" ref={fileInputRef} accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(event) => handleFileSelect(event.target.files?.[0])} />

                  {!selectedFile ? (
                    <div onClick={() => fileInputRef.current?.click()} onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onDrop={(event) => { event.preventDefault(); setIsDragging(false); handleFileSelect(event.dataTransfer.files?.[0]); }} className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${isDragging ? 'border-orange-500 bg-orange-50/60' : fileError ? 'border-red-300 bg-red-50/30' : 'border-stone-300 hover:border-orange-400 bg-stone-50'}`}>
                      <Camera className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <div className="text-xs font-bold text-stone-800">Click to select or drop a receipt image</div>
                      <p className="text-[11px] text-stone-500 mt-1">The image remains private and is used only for authorized reconciliation.</p>
                      {fileError && <p role="alert" className="text-xs text-red-600 mt-2 font-medium">{fileError}</p>}
                    </div>
                  ) : (
                    <div className="rounded border border-stone-200 bg-white p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {previewUrl && <div className="w-16 h-16 rounded overflow-hidden bg-stone-100 border border-stone-200 shrink-0"><img src={previewUrl} alt="Selected receipt preview" className="w-full h-full object-cover" /></div>}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-900 truncate">{selectedFile.name}</div>
                            <div className="text-[11px] text-stone-500 font-mono mt-0.5">{formatFileSize(selectedFile.size)} · {selectedFile.type.replace('image/', '').toUpperCase()}</div>
                            <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-medium"><CheckCircle2 className="w-3.5 h-3.5" /> Image attached for review</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 self-end sm:self-auto">
                          <button type="button" onClick={() => fileInputRef.current?.click()} className="px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded">Replace</button>
                          <button type="button" onClick={handleRemoveFile} className="px-3 py-1.5 text-xs font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded">Remove</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 rounded bg-amber-50 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5"><ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" /><span><strong>Important:</strong> Submitting proof creates a <strong>Pending</strong> record. Payment becomes Verified only after an Admin matches it against FixIt's real external wallet or bank record; otherwise it may be Rejected.</span></div>

                {submitError && <div role="alert" className="p-3.5 rounded bg-red-50 border border-red-200 text-xs text-red-900"><strong>Proof could not be submitted:</strong> {submitError}</div>}

                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-stone-500 flex items-center gap-1.5"><Lock className="w-4 h-4 text-emerald-600 shrink-0" /><span>Proof images are private and never exposed publicly.</span></div>
                  <button type="submit" disabled={isSubmitting} className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 disabled:cursor-wait rounded transition-colors shadow-sm">{isSubmitting ? 'Submitting Proof…' : 'Submit Proof for Review'}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
      <CTA />
    </div>
  );
};
