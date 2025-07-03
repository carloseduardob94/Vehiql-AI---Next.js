export type CarData = {
  make: string;
  model: string;
  year: number;
  color: string;
  price: string;
  mileage: number;
  bodyType: string;
  fuelType: string;
  transmission: string;
  description: string;
  confidence: number;
  seats?: number;
  status: CarStatus;
  featured: boolean
};

export enum CarStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  SOLD = "SOLD",
}