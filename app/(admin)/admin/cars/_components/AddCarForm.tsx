"use client";

// 🔵 React & Hooks
import { useCallback, useEffect, useState } from "react";

// 🔵 Third-party Libraries
import { z } from "zod";
import { useForm } from "react-hook-form";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { zodResolver } from "@hookform/resolvers/zod";

// 🔵 Icons
import { Camera, Loader2, Upload, X } from "lucide-react";

// 🔵 Next.js
import Image from "next/image";

// 🔵 Custom Hooks & Actions
import useFetch from "@/hooks/useFetch";
import { addCar, processCarImageWithAI } from "@/actions/cars";

// 🔵 UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

// 🔵 Types
import { CarData, CarStatus } from "@/types/carData";
import { useRouter } from "next/navigation";


const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const transmissions = ["Automatic", "Manual", "Semi-Automatic"];

const bodyTypes = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Convertible",
  "Coupe",
  "Wagon",
  "Pickup"
];

const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"]

const carFormSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().refine((val) => {
    const year = parseInt(val)

    return (
      !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1
    );
  }, "Valid year required"),
  price: z.string().min(1, "Price is required"),
  mileage: z.string().min(1, "Mileage is required"),
  color: z.string().min(1, "Color is required"),
  fuelType: z.string().min(1, "Fuel type is required"),
  transmission: z.string().min(1, "Transmission is required"),
  bodyType: z.string().min(1, "Body type is required"),
  seats: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.nativeEnum(CarStatus),
  featured: z.boolean()
});

export type CarFormData = z.infer<typeof carFormSchema>;

const AddCarForm = () => {
  const [activeTab, setActiveTab] = useState("ai")
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [uploadedAiImage, setUploadedAiImage] = useState<File | null>(null)

  const router = useRouter()

  const { register, setValue, getValues, formState: { errors }, handleSubmit, watch } = useForm<CarFormData>({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: undefined,
      description: "",
      status: CarStatus.AVAILABLE,
      featured: false,
    },
  })

  // Handle AI image upload with Dropzone
  const onAiDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setUploadedAiImage(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  }, []);

  const { getRootProps: getAiRootProps, getInputProps: getAiInputProps } = useDropzone({
    onDrop: onAiDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: false,
    maxFiles: 1
  })

  const {
    loading: processImageLoading,
    fn: processImageFn,
    data: processImageResult,
    error: processImageError
  } = useFetch(processCarImageWithAI)

  useEffect(() => {
    if (processImageError) {
      toast.error(processImageError.message || "Failed to upload car")
    }
  }, [processImageError])

  useEffect(() => {
    console.log("processImageResult updated", processImageResult);

    if (processImageResult?.sucess) {
      const carDetails: CarData = processImageResult.data!

      console.log("Entrou no effect")

      // Update form with AI results
      setValue("make", carDetails.make);
      setValue("model", carDetails.model);
      setValue("year", carDetails.year.toString());
      setValue("color", carDetails.color);
      setValue("bodyType", carDetails.bodyType);
      setValue("fuelType", carDetails.fuelType);
      setValue("price", carDetails.price.toString());
      setValue("mileage", carDetails.mileage.toString());
      setValue("transmission", carDetails.transmission);
      setValue("description", carDetails.description);

      const reader = new FileReader()
      reader.onload = (e) => {
        setUploadedImages((prev) => [...prev, e.target?.result as string])
      }
      reader.readAsDataURL(uploadedAiImage as File)

      toast.success("Successfully extracted car details", {
        description: `Detected ${carDetails.year} ${carDetails.make} ${carDetails.model} with ${Math.round(carDetails.confidence as number * 100)}% confidence`
      })

      setActiveTab("manual")
    }
  }, [processImageResult, uploadedAiImage])

  const processWithAi = async () => {
    if (!uploadedAiImage) {
      toast.error("Please upload an image first")
      return
    }
    await processImageFn(uploadedAiImage)
  }

  const { data: addCarResult, loading: addCarLoading, fn: addCarFn } = useFetch(addCar)

  useEffect(() => {
    if (addCarResult?.success) {
      toast.success("Car added successfully");
      router.push("/admin/cars")
    }
  }, [addCarResult, addCarLoading])

  const onSubmit = async (data: CarFormData) => {
    if (uploadedImages.length === 0) {
      setImageError("Please upload at least one image")
      return
    }

    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseFloat(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : undefined
    };

    await addCarFn({
      carData,
      images: uploadedImages
    })

  }

  const onMultiImagesDrop = (acceptedFiles: File[]) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit and will be skipped`);

        return false;
      }

      return true;
    })

    if (validFiles.length === 0) return

    const newImages: string[] = [];
    validFiles.forEach((file) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        newImages.push(e.target?.result as string);

        if (newImages.length === validFiles.length) {
          setUploadedImages((prev) => [...prev, ...newImages]);
          setImageError("");
          toast.success(`SuccessFully uploaded ${validFiles.length} images`);
        }
      }

      reader.readAsDataURL(file)
    })
  }

  const { getRootProps: getMultiImageRootProps, getInputProps: getMultiImageInputProps } = useDropzone({
    onDrop: onMultiImagesDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true
  })

  const removeImage = (index: number) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index))
  }

  return (
    <div>
      <Tabs
        defaultValue="ai"
        className="mt-6"
        value={activeTab}
        onValueChange={setActiveTab}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="manual">Manual Entry</TabsTrigger>
          <TabsTrigger value="ai">AI Upload</TabsTrigger>
        </TabsList>
        <TabsContent value="manual" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Card Details</CardTitle>
              <CardDescription>Enter the details of the car you want to add.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="make">Make</Label>
                    <Input id="make"
                      {...register("make")}
                      placeholder="e.g. Toyota"
                      className={errors.make ? "border-red-500" : ""}
                    />
                    {errors.make && (
                      <p className="text-xs text-red-500">{errors.make.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Input id="model"
                      {...register("model")}
                      placeholder="e.g. Camry"
                      className={errors.model ? "border-red-500" : ""}
                    />
                    {errors.model && (
                      <p className="text-xs text-red-500">{errors.model.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Input id="year"
                      {...register("year")}
                      placeholder="e.g. 2022"
                      className={errors.year ? "border-red-500" : ""}
                    />
                    {errors.year && (
                      <p className="text-xs text-red-500">{errors.year.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price">Price</Label>
                    <Input id="price"
                      {...register("price")}
                      placeholder="e.g. 25000"
                      className={errors.price ? "border-red-500" : ""}
                    />
                    {errors.price && (
                      <p className="text-xs text-red-500">{errors.price.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="mileage">Mileage</Label>
                    <Input id="mileage"
                      {...register("mileage")}
                      placeholder="e.g. 15000"
                      className={errors.mileage ? "border-red-500" : ""}
                    />
                    {errors.mileage && (
                      <p className="text-xs text-red-500">{errors.mileage.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="color">color</Label>
                    <Input id="color"
                      {...register("color")}
                      placeholder="e.g. Blue"
                      className={errors.color ? "border-red-500" : ""}
                    />
                    {errors.color && (
                      <p className="text-xs text-red-500">{errors.color.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fuelType">Fuel Type</Label>
                    <Select onValueChange={value => setValue("fuelType", value)} defaultValue={getValues("fuelType")}>
                      <SelectTrigger className={errors.fuelType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select fuel type" />
                      </SelectTrigger>
                      <SelectContent>
                        {fuelTypes.map((fuelType) => (
                          <SelectItem key={fuelType} value={fuelType}>{fuelType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.fuelType && (
                      <p className="text-xs text-red-500">{errors.fuelType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="transmission">Transmission</Label>
                    <Select onValueChange={value => setValue("transmission", value)} defaultValue={getValues("transmission")}>
                      <SelectTrigger className={errors.transmission ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select transmission" />
                      </SelectTrigger>
                      <SelectContent>
                        {transmissions.map((transmission) => (
                          <SelectItem key={transmission} value={transmission}>{transmission}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.transmission && (
                      <p className="text-xs text-red-500">{errors.transmission?.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bodyType">bodyType</Label>
                    <Select onValueChange={value => setValue("bodyType", value)} defaultValue={getValues("bodyType")}>
                      <SelectTrigger className={errors.bodyType ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select bodyType" />
                      </SelectTrigger>
                      <SelectContent>
                        {bodyTypes.map((bodyType) => (
                          <SelectItem key={bodyType} value={bodyType}>{bodyType}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.bodyType && (
                      <p className="text-xs text-red-500">{errors.bodyType.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="seats">Number of Seats{" "}
                      <span className="text-sm text-gray-500">(Optional)</span>
                    </Label>
                    <Input
                      id="seats"
                      {...register("seats")}
                      placeholder="e.g. 5"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="status">status</Label>
                    <Select onValueChange={(value: CarStatus) => setValue("status", value)} defaultValue={getValues("status")}>
                      <SelectTrigger className={errors.status ? "border-red-500" : ""}>
                        <SelectValue placeholder="Select status" />
                      </SelectTrigger>
                      <SelectContent>
                        {carStatuses.map((status) => (
                          <SelectItem key={status} value={status}>{status.charAt(0) + status.slice(1).toLowerCase()}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.status && (
                      <p className="text-xs text-red-500">{errors.status.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    {...register("description")}
                    placeholder="Enter detailed description of the car..."
                    className={`min-h-32 ${errors.description ? "border-red-500" : ""
                      }`}
                  />

                  {errors.description && (
                    <p className="text-xs text-red-500">{errors.description.message}</p>
                  )}
                </div>

                <div className="flex items-start space-x-3 space-y-0 rounded-md border p-4">
                  <Checkbox
                    id="featured"
                    checked={watch("featured")}
                    onCheckedChange={(checked: boolean) => {
                      setValue("featured", checked)
                    }}
                  />

                  <div className="space-y-1 leading-none">
                    <Label htmlFor="featured">Featrure this Car</Label>
                    <p className="text-sm text-gray-500">Featured cars appear on the homepage</p>
                  </div>
                </div>

                <div className="mt-2">
                  <div
                    {...getMultiImageRootProps()}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:bg-gray-50 transition ${imageError ? "border-red-500" : "border-gray-300"
                      }`}
                  >
                    <input {...getMultiImageInputProps()} />
                    <div className="flex flex-col items-center justify-center">
                      <Upload className="h-12 w-12 text-gray-400 mb-3" />
                      <span className="text-sm text-gray-600">
                        Drag & drop or click to upload multiple images
                      </span>
                      <span className="text-xs text-gray-500 mt-1">
                        (JPG, PNG, WebP, max 5MB each)
                      </span>
                    </div>
                  </div>
                  {imageError && (
                    <p className="text-xs text-red-500 mt-1">{imageError}</p>
                  )}
                  {/* {uploadProgress > 0 && (
                      <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div
                          className="bg-blue-600 h-2.5 rounded-full"
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                    )} */}


                </div>
                {uploadedImages.length > 0 && (
                  <div className="mt-4">
                    <h3 className="text-sm font-medium mb-2">Uploaded Images ({uploadedImages.length})</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap4">
                      {uploadedImages.map((image, index) => (
                        <div className="relative group" key={index}>
                          <Image
                            src={image}
                            alt={`Car image ${index + 1}`}
                            height={50}
                            width={50}
                            className="h-28 w-full object-cover rounded-md"
                            priority
                          />
                          <Button
                            type="button"
                            size="icon"
                            variant="destructive"
                            className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => removeImage(index)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full md:w-auto"
                  disabled={addCarLoading}
                >
                  {addCarLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Adding Car...
                    </>
                  ) : (
                    "Add Car"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="ai" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>AI-Powered Car Details Extraction</CardTitle>
              <CardDescription>Upload an image of a car and let Gemini AI extract its details.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="border-2 border-dashed rounded-lg p-6 text-center">
                  {imagePreview ? <div className="flex flex-col items-center">
                    <img
                      src={imagePreview}
                      alt="Car preview"
                      className="max-h-56 max-w-full object-contain mb-4"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setImagePreview(null);
                          setUploadedAiImage(null)
                        }}
                      >
                        Remove
                      </Button>

                      <Button
                        size="sm"
                        onClick={processWithAi}
                        disabled={processImageLoading}
                      >
                        {processImageLoading ? <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Processing...
                        </> : (
                          <>
                            <Camera className="mr-2 h-4 w-4" />
                            Extract Details
                          </>
                        )}
                      </Button>
                    </div>
                  </div> : (
                    <div
                      {...getAiRootProps()}
                      className="cursor-pointer hover:bg-gray-50 transition"
                    >
                      <input {...getAiInputProps()} />
                      <div className="flex flex-col items-center justify-center">
                        <Camera className="h-12 w-12 text-gray-400 mb-3" />
                        <span className="text-sm text-gray-600">
                          Drag & drop or click to upload a car image
                        </span>
                        <span className="text-xs text-gray-500 mt-1">
                          (JPG, PNG, WebP, max 5MB)
                        </span>
                      </div>
                    </div>
                  )}</div>

                <div className="bg-gray-50 p-4 rounded-md">
                  <h3 className="font-medium mb-2">How it works</h3>
                  <ol className="space-y-2 text-sm text-gray-600 list-decimal pl-4">
                    <li>Upload a clear image of the car</li>
                    <li>Click "Extract Details" to analyze with Gemini AI</li>
                    <li>Review the extracted information</li>
                    <li>Fill in any missing details manually</li>
                    <li>Add the car to your inventory</li>
                  </ol>
                </div>

                <div className="bg-amber-50 p-4 rounded-md">
                  <h3 className="font-medium text-amber-800 mb-1">
                    Tips for best results
                  </h3>
                  <ul className="space-y-1 text-sm text-amber-700">
                    <li>• Use clear, well-lit images</li>
                    <li>• Try to capture the entire vehicle</li>
                    <li>• For difficult models, use multiple views</li>
                    <li>• Always verify AI-extracted information</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default AddCarForm;