export type CarData = {
  make: string;
  model: string;
  year: number;
  price: number;
  mileage: number;
  color: string;
  fuelType: string;
  transmission: string;
  bodyType: string;
  seats?: number;
  description: string;
  status: CarStatus;
  featured: boolean;
  confidence?: number;
};

export enum CarStatus {
  AVAILABLE = "AVAILABLE",
  UNAVAILABLE = "UNAVAILABLE",
  SOLD = "SOLD",
}