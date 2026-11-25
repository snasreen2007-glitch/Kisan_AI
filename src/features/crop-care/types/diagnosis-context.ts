/**
 * Structured Diagnosis Context Object
 * Conveys vision model inference, severity metrics, and field metadata
 * to the Llama 3.2 1B agricultural reasoning engine.
 */

import type { CropKey } from "../knowledge";

export interface CandidatePrediction {
  slug: string;
  name: string;
  confidence: number;
}

export type ConfidenceCalibration = "calibrated" | "uncalibrated" | "high" | "moderate" | "low";
export type ImageQualityStatus = "good" | "blurry" | "poor_lighting" | "overexposed" | "underexposed" | "acceptable";
export type SeverityBand = "mild" | "moderate" | "severe";
export type MeasurementMethod = "irri-ses" | "opencv-foliar-mask" | "area-band";

export interface DiagnosisContext {
  crop: CropKey;
  predictedDiseaseOrPest: string;
  topicSlug: string;
  topPredictions: CandidatePrediction[];
  confidence: number;
  confidenceCalibrationStatus: ConfidenceCalibration;
  imageQualityStatus: ImageQualityStatus;
  visibleSymptomsDetected: string[];
  insectDirectlyVisible?: boolean;
  severityScore: number; // 0..9 for rice IRRI-SES or 0..100 for area percent
  severityCategory: SeverityBand;
  measurementMethod: MeasurementMethod;
  region?: string;
  season?: string;
  diagnosisTimestamp: number;
  modelVersion: string;
  isUncertainOrOOD: boolean;
  thumbnailUrl?: string;
}

export interface ActionPlanItem {
  id: string;
  title: string;
  category: "immediate" | "monitoring" | "prevention" | "escalation";
  description: string;
  completed: boolean;
  sourceDoc?: string;
}

export interface FarmerActionPlan {
  scanId: string;
  crop: CropKey;
  condition: string;
  actions: ActionPlanItem[];
  updatedAt: number;
}

