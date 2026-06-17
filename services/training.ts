import axios from "axios";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || "http://localhost:8080/api/training";

export interface Course {
  id: string;
  title: string;
  description: string;
  level: "Beginner" | "Intermediate";
  icon: string;
  thumbnail: string;
  backgroundColor: string;
  duration: number;
  videoCount: number;
  enrolledCount: number;
  completionRate: number;
  userEnrollmentStatus?: string;
  userProgress?: number;
}

export interface Video {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  duration: number;
  order: number;
  thumbnail: string;
  watched?: boolean;
  watchedDuration?: number;
}

export interface Enrollment {
  id: string;
  userId: string;
  courseId: string;
  status: "locked" | "in-progress" | "completed";
  progress: number;
  lastWatchedVideoId: string | null;
  lastWatchedAt: Date | null;
  enrolledAt: Date;
  completedAt: Date | null;
  certificateId: string | null;
  course?: Partial<Course>;
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: Date;
  progress: number;
}

export interface Certificate {
  id: string;
  userId: string;
  courseId: string;
  certificateNumber: string;
  issuedAt: Date;
  expiresAt: Date;
  status: "active" | "expired";
  courseName?: string;
  courseIcon?: string;
}

export const trainingAPI = {
  // Courses
  async getCourses(level?: string): Promise<Course[]> {
    try {
      const params = level && level !== "All" ? { level } : {};
      const response = await axios.get<{ success: boolean; data: Course[] }>(
        `${API_BASE_URL}/courses`,
        { params }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  },

  async getCourseDetail(courseId: string): Promise<Course & { videos: Video[] }> {
    try {
      const response = await axios.get<{
        success: boolean;
        data: Course & { videos: Video[] };
      }>(`${API_BASE_URL}/courses/${courseId}`);
      return response.data.data;
    } catch (error) {
      console.error("Error fetching course detail:", error);
      throw error;
    }
  },

  async getCourseVideos(courseId: string): Promise<Video[]> {
    try {
      const response = await axios.get<{ success: boolean; data: Video[] }>(
        `${API_BASE_URL}/courses/${courseId}/videos`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching course videos:", error);
      throw error;
    }
  },

  // Enrollments
  async enrollCourse(userId: string, courseId: string): Promise<Enrollment> {
    try {
      const response = await axios.post<{ success: boolean; data: Enrollment }>(
        `${API_BASE_URL}/enroll`,
        { userId, courseId }
      );
      return response.data.data;
    } catch (error) {
      console.error("Error enrolling in course:", error);
      throw error;
    }
  },

  async getMyCourses(userId: string): Promise<Enrollment[]> {
    try {
      const response = await axios.get<{ success: boolean; data: Enrollment[] }>(
        `${API_BASE_URL}/my-courses/${userId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching user courses:", error);
      throw error;
    }
  },

  // Progress
  async updateProgress(
    userId: string,
    courseId: string,
    videoId: string,
    watchedDuration: number,
    totalDuration: number
  ): Promise<{ progress: number; certificateEarned: boolean }> {
    try {
      const response = await axios.post<{
        success: boolean;
        data: { progress: number; certificateEarned: boolean };
      }>(`${API_BASE_URL}/progress`, {
        userId,
        courseId,
        videoId,
        watchedDuration,
        totalDuration,
      });
      return response.data.data;
    } catch (error) {
      console.error("Error updating progress:", error);
      throw error;
    }
  },

  // Achievements
  async getUserAchievements(userId: string): Promise<Achievement[]> {
    try {
      const response = await axios.get<{ success: boolean; data: Achievement[] }>(
        `${API_BASE_URL}/achievements/${userId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching achievements:", error);
      throw error;
    }
  },

  // Certificates
  async getCertificates(userId: string): Promise<Certificate[]> {
    try {
      const response = await axios.get<{ success: boolean; data: Certificate[] }>(
        `${API_BASE_URL}/certificates/${userId}`
      );
      return response.data.data;
    } catch (error) {
      console.error("Error fetching certificates:", error);
      throw error;
    }
  },

  async completeCourse(userId: string, courseId: string): Promise<{ certificateId: string }> {
    try {
      const response = await axios.post<{
        success: boolean;
        data: { certificateId: string };
      }>(`${API_BASE_URL}/complete-course`, {
        userId,
        courseId,
      });
      return response.data.data;
    } catch (error) {
      console.error("Error completing course:", error);
      throw error;
    }
  },

  // Seed data (development only)
  async seedData() {
    try {
      const response = await axios.post<{
        success: boolean;
        message: string;
        data: { coursesCount: number; videosCount: number; achievementsCount: number };
      }>(`${API_BASE_URL}/seed-data`);
      return response.data.data;
    } catch (error) {
      console.error("Error seeding data:", error);
      throw error;
    }
  },
};
