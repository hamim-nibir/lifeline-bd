export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  bloodType: string | null;
  phone: string | null;
  location: string | null;
  isDonor: boolean;
  createdAt: Date;
}

export interface AuthFormData {
  name?: string;
  email: string;
  password: string;
  confirmPassword?: string;
}