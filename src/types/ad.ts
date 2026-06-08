// types/ad.ts
import { AdType } from "@/lib/ads/ad-types";

export type Ad = {
  id: string;
  name: string;
  type: AdType;
  script: string;
  placement: string | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export type AdFormData = {
  name: string;
  type: AdType;
  script: string;
  placement: string | null;
};

export type AdFormErrors = {
  name?: string;
  type?: string;
  script?: string;
  placement?: string;
  submit?: string;
};
