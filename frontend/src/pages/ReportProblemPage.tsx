import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHero } from '../components/common/PageHero';
import { useAuth } from '../auth/AuthContext';
import { apiRequest } from '../lib/api';
import { 
  AlertTriangle, 
  MapPin, 
  Camera, 
  CheckCircle2, 
  Copy, 
  ArrowRight, 
  ShieldCheck,
  Cpu,
  Navigation
} from 'lucide-react';

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

type BackendReportStatus =
  | 'Submitted'
  | 'Approved'
  | 'Rejected'
  | 'Scheduled'
  | 'In Progress'
  | 'Solved'
  | 'Cancelled';

interface SubmittedReport {
  tracking_id: string;
  status: BackendReportStatus;
  category: string | null;
}

export const ReportProblemPage: React.FC = () => {
  const { session } = useAuth();
  const [submittedReport, setSubmittedReport] = useState<SubmittedReport | null>(null);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  const [formData, setFormData] = useState({
    category: 'Damaged Roads & Potholes',
    description: '',
    hasPhoto: false,
  });

  // Real local file upload state (retains File object for later backend multipart/form-data integration)
  const [selectedPhotoFile, setSelectedPhotoFile] = useState<File | null>(null);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const categories = [
    'Damaged Roads & Potholes',
    'Water & Civic Sanitation',
    'Waste & Community Cleanliness',
    'Community Infrastructure Hazards',
  ];

  // Cleanup object URL on unmount or removal
  useEffect(() => {
    return () => {
      if (photoPreviewUrl) {
        URL.revokeObjectURL(photoPreviewUrl);
      }
    };
  }, [photoPreviewUrl]);

  const handlePhotoSelect = (file: File | undefined) => {
    if (!file) return;

    // Strict MIME-type acceptance: JPG/JPEG, PNG, WebP
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setPhotoError('Invalid file format. Please choose a JPG, PNG, or WebP image.');
      return;
    }

    setPhotoError(null);
    setSelectedPhotoFile(file);

    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    const newUrl = URL.createObjectURL(file);
    setPhotoPreviewUrl(newUrl);
    setFormData((prev) => ({ ...prev, hasPhoto: true }));
  };

  const handleRemovePhoto = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (photoPreviewUrl) {
      URL.revokeObjectURL(photoPreviewUrl);
    }
    setSelectedPhotoFile(null);
    setPhotoPreviewUrl(null);
    setPhotoError(null);
    if (photoInputRef.current) {
      photoInputRef.current.value = '';
    }
    setFormData((prev) => ({ ...prev, hasPhoto: false }));
  };

  const handleLocate = () => {
    setLocationError(null);
    if (!navigator.geolocation) {
      setLocationError('This browser does not support location access. Please use a browser with geolocation enabled.');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        setLocation({ latitude: coords.latitude, longitude: coords.longitude });
        setIsLocating(false);
      },
      (error) => {
        const messages: Record<number, string> = {
          [error.PERMISSION_DENIED]: 'Location permission was denied. Allow location access and try again.',
          [error.POSITION_UNAVAILABLE]: 'Your current location could not be determined. Move to an area with a stronger location signal and try again.',
          [error.TIMEOUT]: 'Location lookup timed out. Please try again.',
        };
        setLocation(null);
        setLocationError(messages[error.code] ?? 'Unable to capture your current location.');
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setSubmitError(null);

    if (!selectedPhotoFile) {
      setPhotoError('Please attach photographic evidence of the problem.');
      return;
    }
    if (!location) {
      setLocationError('Capture your current location before submitting the report.');
      return;
    }
    if (!session?.access_token) {
      setSubmitError('Your authenticated session is unavailable. Please sign in again.');
      return;
    }

    const payload = new FormData();
    payload.append('description', formData.description.trim());
    payload.append('category', formData.category);
    payload.append('latitude', String(location.latitude));
    payload.append('longitude', String(location.longitude));
    payload.append('photo', selectedPhotoFile);

    setIsSubmitting(true);
    try {
      const report = await apiRequest<SubmittedReport>('/api/reports/with-photo', {
        method: 'POST',
        body: payload,
        accessToken: session.access_token,
      });
      setSubmittedReport(report);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Unable to submit the report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopy = () => {
    if (!submittedReport) return;
    void navigator.clipboard.writeText(submittedReport.tracking_id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full">
      <PageHero
        kicker="Citizen Action Engine"
        title="Report a Community Problem"
        subtitle="Empower your neighborhood. Authenticated Citizens can report damaged roads, sewage hazards, or public infrastructure risks and receive a Tracking ID."
        breadcrumbs={[{ label: 'Report a Problem' }]}
        badgeText="Authenticated Citizen Tracking"
      />

      <section className="py-16 sm:py-24 bg-stone-50 border-b border-stone-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {submittedReport ? (
            /* Submission Success Screen */
            <div className="rounded border border-stone-300 bg-white p-8 sm:p-12 shadow-sm text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded">
                Report Registered Successfully
              </span>

              <h2 className="mt-4 text-2xl sm:text-3xl font-black text-stone-900 tracking-tight">
                Your Tracking ID
              </h2>

              <p className="mt-2 text-sm text-stone-600 max-w-md mx-auto">
                Save this tracking identifier to follow operations review, scheduling, and on-ground completion.
              </p>

              {/* Big Tracking ID Badge */}
              <div className="my-8 inline-flex items-center gap-3 p-4 rounded bg-stone-900 text-white border border-stone-800">
                <span className="font-mono text-2xl sm:text-3xl font-bold tracking-wider text-orange-400">
                  {submittedReport.tracking_id}
                </span>
                <button
                  onClick={handleCopy}
                  className="p-2 rounded bg-stone-800 hover:bg-stone-700 text-stone-300 transition-colors"
                  title="Copy Tracking ID"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>

              {copied && (
                <div className="text-xs font-mono text-emerald-600 mb-4">
                  Tracking ID copied to clipboard!
                </div>
              )}

              {/* Submitted Details Review */}
              <div className="p-4 rounded bg-stone-50 border border-stone-200 max-w-md mx-auto mb-6 text-xs text-stone-600 text-left space-y-1.5">
                <div className="font-bold text-stone-900 mb-1">Report Summary:</div>
                <div className="flex items-center gap-1.5 text-stone-800">
                  <span className="font-medium text-stone-500">Category:</span>
                  <span className="font-semibold">{submittedReport.category ?? formData.category}</span>
                </div>
                <div className="flex items-center gap-1.5 text-stone-800">
                  <span className="font-medium text-stone-500">Status:</span>
                  <span className="font-semibold text-orange-700">{submittedReport.status}</span>
                </div>
                {selectedPhotoFile && (
                  <div className="text-stone-600 pt-1 flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span>Photo attached: {selectedPhotoFile.name} ({formatFileSize(selectedPhotoFile.size)})</span>
                  </div>
                )}
              </div>

              {/* What happens next roadmap */}
              <div className="p-6 rounded bg-stone-50 border border-stone-200 text-left text-xs text-stone-700 space-y-3 max-w-lg mx-auto mb-8">
                <div className="font-bold text-stone-900 text-sm">Next Steps:</div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-orange-600 font-bold">01.</span>
                  <span><strong>Proximity Check:</strong> Same category + active report within 100m is flagged as "Possible Duplicate".</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-orange-600 font-bold">02.</span>
                  <span><strong>Advisory AI Triage:</strong> Prepares summary and urgency advisory for dispatchers (AI Triage is advisory only).</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-mono text-orange-600 font-bold">03.</span>
                  <span><strong>Human Review:</strong> An Admin decides whether to approve, reject, or merge. A Coordinator schedules approved work.</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/citizen"
                  className="w-full sm:w-auto px-6 py-3 text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 rounded transition-colors inline-flex items-center justify-center gap-2"
                >
                  <span>Return to Citizen Area</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <button
                  onClick={() => {
                    setSubmittedReport(null);
                    handleRemovePhoto();
                    setLocation(null);
                    setLocationError(null);
                    setSubmitError(null);
                    setFormData({
                      category: 'Damaged Roads & Potholes',
                      description: '',
                      hasPhoto: false,
                    });
                  }}
                  className="w-full sm:w-auto px-6 py-3 text-sm font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 rounded"
                >
                  Submit Another Report
                </button>
              </div>
            </div>
          ) : (
            /* Problem Report Form */
            <div className="rounded border border-stone-200 bg-white p-6 sm:p-10 shadow-xs">
              <div className="mb-8 pb-6 border-b border-stone-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="text-xs font-mono font-bold uppercase tracking-widest text-orange-600">
                    Step 01 / 09 in Workflow
                  </span>
                </div>
                <h2 className="text-2xl font-black text-stone-900 tracking-tight">
                  Submit Civic Problem Details
                </h2>
                <p className="text-xs sm:text-sm text-stone-600 mt-1">
                  Report a community issue. Select category, describe location with nearby landmarks, provide details, and attach a photo.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* 1. Problem Category */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                    1. Problem Category *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {categories.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setFormData({ ...formData, category: cat })}
                        className={`p-3.5 rounded text-left text-xs font-bold border transition-colors flex items-center justify-between ${
                          formData.category === cat
                            ? 'border-orange-500 bg-orange-50 text-orange-950'
                            : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                        }`}
                      >
                        <span>{cat}</span>
                        {formData.category === cat && (
                          <CheckCircle2 className="w-4 h-4 text-orange-600 shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 2. Browser location capture */}
                <div className="space-y-4">
                  <div className={`p-3.5 rounded border border-dashed bg-stone-50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    locationError ? 'border-red-300' : location ? 'border-emerald-300' : 'border-stone-300'
                  }`}>
                    <div className="flex items-start sm:items-center gap-2.5 text-xs text-stone-600">
                      <div className="w-7 h-7 rounded bg-white border border-stone-200 flex items-center justify-center text-orange-600 shrink-0">
                        <Navigation className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="font-semibold text-stone-800">
                          2. Exact Report Location *
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {location
                            ? `Captured: ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}`
                            : 'Uses your browser location. Coordinates are never guessed.'}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleLocate}
                      disabled={isLocating || isSubmitting}
                      className="px-3 py-1.5 rounded border border-stone-200 bg-white text-stone-700 hover:border-orange-400 disabled:text-stone-400 disabled:cursor-wait text-xs font-medium inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
                    >
                      <MapPin className="w-3.5 h-3.5 text-orange-600" />
                      <span>{isLocating ? 'Locating…' : location ? 'Refresh Location' : 'Use My Current Location'}</span>
                    </button>
                  </div>
                  {locationError && (
                    <p role="alert" className="text-xs text-red-600 font-medium">{locationError}</p>
                  )}
                </div>

                {/* 3. Problem Description */}
                <div>
                  <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider mb-2">
                    3. Problem Description & Hazards *
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Describe the issue size, depth, duration, and safety threat to pedestrians or vehicles..."
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2.5 text-xs border border-stone-300 rounded focus:outline-none focus:border-orange-500"
                  />
                </div>

                {/* 4. Problem Photo (Required by backend contract) */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-stone-900 uppercase tracking-wider">
                      4. Problem Photo *
                    </label>
                    <span className="text-[11px] text-stone-400">
                      JPG, PNG, WebP (Required)
                    </span>
                  </div>

                  {/* Real hidden file input */}
                  <input
                    type="file"
                    ref={photoInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handlePhotoSelect(e.target.files?.[0])}
                  />

                  {!selectedPhotoFile ? (
                    /* Dropzone opening browser's real file picker */
                    <div
                      onClick={() => photoInputRef.current?.click()}
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDraggingPhoto(true);
                      }}
                      onDragLeave={() => setIsDraggingPhoto(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDraggingPhoto(false);
                        handlePhotoSelect(e.dataTransfer.files?.[0]);
                      }}
                      className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
                        isDraggingPhoto
                          ? 'border-orange-500 bg-orange-50/60'
                          : photoError
                          ? 'border-red-300 bg-red-50/30'
                          : 'border-stone-300 hover:border-orange-400 bg-stone-50'
                      }`}
                    >
                      <Camera className="w-8 h-8 text-stone-400 mx-auto mb-2" />
                      <div className="text-xs font-bold text-stone-800">
                        Click to select or drop problem photo
                      </div>
                      <p className="text-[11px] text-stone-500 mt-1">
                        Select a photo from your device. Clear photos help coordinators identify required equipment.
                      </p>
                      {photoError && (
                        <p className="text-xs text-red-600 mt-2 font-medium">
                          {photoError}
                        </p>
                      )}
                    </div>
                  ) : (
                    /* Real Photo Selected State with Preview and Metadata */
                    <div className="rounded border border-stone-200 bg-white p-4 shadow-xs">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          {photoPreviewUrl && (
                            <div className="w-16 h-16 rounded overflow-hidden bg-stone-100 border border-stone-200 shrink-0">
                              <img
                                src={photoPreviewUrl}
                                alt="Selected problem preview"
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-900 truncate">
                              {selectedPhotoFile.name}
                            </div>
                            <div className="text-[11px] text-stone-500 font-mono mt-0.5">
                              {formatFileSize(selectedPhotoFile.size)} · {selectedPhotoFile.type.replace('image/', '').toUpperCase()}
                            </div>
                            <div className="text-[11px] text-emerald-700 flex items-center gap-1 mt-1 font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Photo attached for verification</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                          <button
                            type="button"
                            onClick={() => photoInputRef.current?.click()}
                            className="px-3 py-1.5 text-xs font-semibold text-stone-700 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 rounded transition-colors"
                          >
                            Replace
                          </button>
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="px-3 py-1.5 text-xs font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Proximity Duplicate Check & Advisory AI Governance Notice */}
                <div className="p-4 rounded bg-stone-100 border border-stone-200 text-xs text-stone-600 space-y-2">
                  <div className="flex items-start gap-2.5">
                    <Cpu className="w-4 h-4 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-900">
                        Proximity Check (Duplicate Policy):
                      </span>{' '}
                      Same category + active report within 100m = <strong>"Possible Duplicate"</strong>. Reports are never automatically merged; an Operations Admin reviews the context and makes the final decision on whether to merge or proceed independently.
                    </div>
                  </div>
                  <div className="pl-6.5 text-[11px] text-stone-500">
                    <strong>AI Governance:</strong> AI Triage is advisory only. Admins decide approvals, rejections, and merges; Coordinators schedule approved work.
                  </div>
                </div>

                {submitError && (
                  <div role="alert" className="p-3.5 rounded bg-red-50 border border-red-200 text-xs text-red-900">
                    <strong>Report could not be submitted:</strong> {submitError}
                  </div>
                )}

                <div className="pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-xs text-stone-500 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Your authenticated Citizen account securely owns this report.</span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || isLocating}
                    className="w-full sm:w-auto px-8 py-3 text-sm font-bold text-white bg-orange-600 hover:bg-orange-500 disabled:bg-orange-400 disabled:cursor-wait rounded transition-colors shadow-sm"
                  >
                    {isSubmitting ? 'Submitting Report…' : 'Submit Report & Generate ID'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};
