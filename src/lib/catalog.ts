export const specialties = [
  {
    id: "primary-care",
    name: "Primary care",
    aliases: ["primary care", "family medicine", "general practice"],
  },
  {
    id: "cardiology",
    name: "Cardiology",
    aliases: ["cardiology", "cardiologist", "heart specialist"],
  },
  {
    id: "dermatology",
    name: "Dermatology",
    aliases: ["dermatology", "dermatologist", "skin specialist"],
  },
  { id: "orthopedics", name: "Orthopedics", aliases: ["orthopedics", "orthopedic", "orthopaedic"] },
  {
    id: "diagnostic-imaging",
    name: "Diagnostic imaging",
    aliases: ["diagnostic imaging", "radiology", "imaging center"],
  },
  { id: "endocrinology", name: "Endocrinology", aliases: ["endocrinology", "endocrinologist"] },
  {
    id: "physical-therapy",
    name: "Physical therapy",
    aliases: ["physical therapy", "physiotherapy", "physical therapist"],
  },
  {
    id: "gastroenterology",
    name: "Gastroenterology",
    aliases: ["gastroenterology", "gastroenterologist"],
  },
  {
    id: "ophthalmology",
    name: "Ophthalmology",
    aliases: ["ophthalmology", "ophthalmologist", "eye specialist"],
  },
];
export const services = [
  { id: "mri", name: "MRI", aliases: ["mri", "magnetic resonance imaging"] },
  { id: "ct-scan", name: "CT scan", aliases: ["ct scan", "cat scan", "computed tomography"] },
  { id: "ultrasound", name: "Ultrasound", aliases: ["ultrasound", "sonogram"] },
  { id: "echocardiogram", name: "Echocardiogram", aliases: ["echocardiogram", "echo test"] },
  {
    id: "skin-screening",
    name: "Skin screening",
    aliases: ["skin screening", "skin check", "mole check"],
  },
  {
    id: "annual-physical",
    name: "Annual physical",
    aliases: ["annual physical", "annual checkup", "annual check-up", "wellness visit"],
  },
  {
    id: "blood-testing",
    name: "Blood testing",
    aliases: ["blood testing", "blood test", "blood work", "lab work"],
  },
  {
    id: "physical-therapy",
    name: "Physical therapy",
    aliases: ["physical therapy", "physiotherapy"],
  },
  { id: "colonoscopy", name: "Colonoscopy", aliases: ["colonoscopy"] },
  { id: "eye-exam", name: "Eye exam", aliases: ["eye exam", "vision exam"] },
  { id: "bone-density", name: "Bone density scan", aliases: ["bone density", "dexa", "dxa"] },
  {
    id: "thyroid-consultation",
    name: "Thyroid consultation",
    aliases: ["thyroid consultation", "thyroid specialist"],
  },
];
export const insuranceOptions = [
  "Aetna",
  "Blue Cross Blue Shield",
  "Cigna",
  "Medicare",
  "UnitedHealthcare",
];
export const emptyIntent = {
  specialtyIds: [],
  serviceIds: [],
  terms: [],
  location: null,
  radiusMiles: null,
  telehealth: null,
  insurance: null,
  maxPrice: null,
  unsupported: false,
};
