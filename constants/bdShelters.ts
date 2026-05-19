/** Fallback cyclone / flood shelters across Bangladesh */
export type BdShelterSeed = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
};

export const BD_SHELTER_LOCATIONS: BdShelterSeed[] = [
  // Dhaka
  { id: "dhaka-1", name: "Mohammadpur Cyclone Shelter", latitude: 23.7562, longitude: 90.3544, address: "Mohammadpur, Dhaka" },
  { id: "dhaka-2", name: "Dhanmondi Govt Shelter Centre", latitude: 23.7461, longitude: 90.3742, address: "Dhanmondi, Dhaka" },
  { id: "dhaka-3", name: "Mirpur Section-10 Shelter", latitude: 23.8067, longitude: 90.3683, address: "Mirpur, Dhaka" },
  { id: "dhaka-4", name: "Uttara Sector 7 Shelter", latitude: 23.8759, longitude: 90.3795, address: "Uttara, Dhaka" },
  { id: "dhaka-5", name: "Jatrabari Cyclone Shelter", latitude: 23.7102, longitude: 90.4396, address: "Jatrabari, Dhaka" },
  { id: "dhaka-6", name: "Demra Flood Shelter", latitude: 23.7201, longitude: 90.4832, address: "Demra, Dhaka" },
  { id: "dhaka-7", name: "Keraniganj Emergency Shelter", latitude: 23.6851, longitude: 90.353, address: "Keraniganj, Dhaka" },
  { id: "dhaka-8", name: "Gazipur Sadar Shelter", latitude: 23.9999, longitude: 90.4203, address: "Gazipur" },
  { id: "dhaka-9", name: "Narayanganj Bandar Shelter", latitude: 23.6238, longitude: 90.5, address: "Narayanganj" },
  { id: "dhaka-10", name: "Tongi Union Shelter", latitude: 23.8915, longitude: 90.4023, address: "Tongi, Gazipur" },
  // Chittagong / Chattogram
  { id: "ctg-1", name: "Chittagong Double Mooring Shelter", latitude: 22.3382, longitude: 91.8312, address: "Double Mooring, Chattogram" },
  { id: "ctg-2", name: "Agrabad Emergency Shelter", latitude: 22.3245, longitude: 91.8145, address: "Agrabad, Chattogram" },
  { id: "ctg-3", name: "Patenga Cyclone Shelter", latitude: 22.236, longitude: 91.815, address: "Patenga, Chattogram" },
  { id: "ctg-4", name: "Halishahar Shelter", latitude: 22.326, longitude: 91.78, address: "Halishahar, Chattogram" },
  { id: "ctg-5", name: "Sitakunda Upazila Shelter", latitude: 22.6163, longitude: 91.6615, address: "Sitakunda" },
  // Cox's Bazar & coastal
  { id: "cox-1", name: "Cox's Bazar Sadar Cyclone Shelter", latitude: 21.4272, longitude: 91.9688, address: "Cox's Bazar Sadar" },
  { id: "cox-2", name: "Teknaf Upazila Shelter", latitude: 20.858, longitude: 92.301, address: "Teknaf" },
  { id: "cox-3", name: "Ukhiya Refugee Area Shelter", latitude: 21.185, longitude: 92.153, address: "Ukhiya" },
  { id: "cox-4", name: "Moheshkhali Island Shelter", latitude: 21.583, longitude: 91.933, address: "Moheshkhali" },
  // Khulna & Barishal
  { id: "khu-1", name: "Khulna City Cyclone Shelter", latitude: 22.8456, longitude: 89.5403, address: "Khulna" },
  { id: "khu-2", name: "Mongla Port Shelter", latitude: 22.492, longitude: 89.6, address: "Mongla, Bagerhat" },
  { id: "khu-3", name: "Satkhira Sadar Shelter", latitude: 22.713, longitude: 89.076, address: "Satkhira" },
  { id: "bar-1", name: "Barishal Sadar Shelter", latitude: 22.701, longitude: 90.3535, address: "Barishal" },
  { id: "bar-2", name: "Bhola Island Cyclone Shelter", latitude: 22.685, longitude: 90.648, address: "Bhola" },
  { id: "bar-3", name: "Patuakhali Coastal Shelter", latitude: 22.36, longitude: 90.33, address: "Patuakhali" },
  // Sylhet & north-east
  { id: "syl-1", name: "Sylhet City Corporation Shelter", latitude: 24.8949, longitude: 91.8687, address: "Sylhet" },
  { id: "syl-2", name: "Sunamganj Flood Shelter", latitude: 25.065, longitude: 91.395, address: "Sunamganj" },
  { id: "syl-3", name: "Moulvibazar Shelter", latitude: 24.482, longitude: 91.777, address: "Moulvibazar" },
  { id: "syl-4", name: "Habiganj Emergency Shelter", latitude: 24.374, longitude: 91.415, address: "Habiganj" },
  // Rajshahi & Rangpur
  { id: "raj-1", name: "Rajshahi Disaster Management Shelter", latitude: 24.3745, longitude: 88.6042, address: "Rajshahi" },
  { id: "raj-2", name: "Natore Sadar Shelter", latitude: 24.42, longitude: 88.99, address: "Natore" },
  { id: "ran-1", name: "Rangpur City Shelter", latitude: 25.743, longitude: 89.275, address: "Rangpur" },
  { id: "ran-2", name: "Kurigram Flood Shelter", latitude: 25.805, longitude: 89.636, address: "Kurigram" },
  { id: "ran-3", name: "Lalmonirhat Shelter", latitude: 25.918, longitude: 89.445, address: "Lalmonirhat" },
  // Mymensingh & central
  { id: "mym-1", name: "Mymensingh Sadar Shelter", latitude: 24.747, longitude: 90.407, address: "Mymensingh" },
  { id: "mym-2", name: "Jamalpur Flood Shelter", latitude: 24.919, longitude: 89.95, address: "Jamalpur" },
  { id: "mym-3", name: "Kishoreganj Shelter", latitude: 24.444, longitude: 90.783, address: "Kishoreganj" },
  // Comilla / Cumilla & Noakhali
  { id: "cum-1", name: "Cumilla Sadar Cyclone Shelter", latitude: 23.461, longitude: 91.18, address: "Cumilla" },
  { id: "noa-1", name: "Noakhali Coastal Shelter", latitude: 22.869, longitude: 91.099, address: "Noakhali" },
  { id: "fen-1", name: "Feni Emergency Shelter", latitude: 23.015, longitude: 91.398, address: "Feni" },
];
