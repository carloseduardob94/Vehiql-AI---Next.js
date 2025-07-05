import { type Car } from "@prisma/client";

export const serializedCarData = (car: Car, wishlisted = false) => {
  return {
    ...car,
    price: parseFloat(car.price.toString()),
    createdAt: car.createdAt?.toISOString(),
    updatedAt: car.updatedAt?.toISOString(),
    wishlisted
  };
}