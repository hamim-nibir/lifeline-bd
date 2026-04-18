import { useAuthStore } from "../../store/authStore";
import CitizenDashboard from "../../components/dashboard/CitizenDashboard";
import OperatorDashboard from "../../components/dashboard/OperatorDashboard";
import VolunteerDashboard from "../../components/dashboard/VolunteerDashboard";

export default function DashboardScreen() {
  const { accountType } = useAuthStore();

  if (accountType === "operator") return <OperatorDashboard />;
  if (accountType === "volunteer") return <VolunteerDashboard />;
  return <CitizenDashboard />;
}