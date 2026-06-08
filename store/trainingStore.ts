import { create } from "zustand";
import { trainingAPI, Course, Video, Enrollment, Achievement, Certificate } from "../services/training";

interface TrainingStore {
  // State
  courses: Course[];
  enrollments: Enrollment[];
  currentCourse: (Course & { videos: Video[] }) | null;
  achievements: Achievement[];
  certificates: Certificate[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCourses: (level?: string) => Promise<void>;
  fetchCourseDetail: (courseId: string) => Promise<void>;
  enrollInCourse: (userId: string, courseId: string) => Promise<void>;
  fetchMyCourses: (userId: string) => Promise<void>;
  updateProgress: (
    userId: string,
    courseId: string,
    videoId: string,
    watchedDuration: number,
    totalDuration: number
  ) => Promise<{ progress: number; certificateEarned: boolean }>;
  fetchAchievements: (userId: string) => Promise<void>;
  fetchCertificates: (userId: string) => Promise<void>;
  completeCourse: (userId: string, courseId: string) => Promise<void>;
  clearError: () => void;
  setCourses: (courses: Course[]) => void;
  setCurrentCourse: (course: (Course & { videos: Video[] }) | null) => void;
}

export const useTrainingStore = create<TrainingStore>((set) => ({
  // Initial state
  courses: [],
  enrollments: [],
  currentCourse: null,
  achievements: [],
  certificates: [],
  isLoading: false,
  error: null,

  // Actions
  fetchCourses: async (level?: string) => {
    set({ isLoading: true, error: null });
    try {
      const courses = await trainingAPI.getCourses(level);
      set({ courses, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch courses",
        isLoading: false,
      });
    }
  },

  fetchCourseDetail: async (courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const course = await trainingAPI.getCourseDetail(courseId);
      set({ currentCourse: course, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch course",
        isLoading: false,
      });
    }
  },

  enrollInCourse: async (userId: string, courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const enrollment = await trainingAPI.enrollCourse(userId, courseId);
      set((state) => ({
        enrollments: [...state.enrollments, enrollment],
        isLoading: false,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to enroll in course",
        isLoading: false,
      });
      throw error;
    }
  },

  fetchMyCourses: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const enrollments = await trainingAPI.getMyCourses(userId);
      set({ enrollments, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch enrollments",
        isLoading: false,
      });
    }
  },

  updateProgress: async (
    userId: string,
    courseId: string,
    videoId: string,
    watchedDuration: number,
    totalDuration: number
  ) => {
    try {
      const result = await trainingAPI.updateProgress(
        userId,
        courseId,
        videoId,
        watchedDuration,
        totalDuration
      );

      // Update enrollment progress
      set((state) => ({
        enrollments: state.enrollments.map((e) =>
          e.courseId === courseId
            ? {
                ...e,
                progress: result.progress,
                lastWatchedVideoId: videoId,
                lastWatchedAt: new Date(),
                status: result.certificateEarned ? "completed" : e.status,
              }
            : e
        ),
      }));

      return result;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to update progress",
      });
      throw error;
    }
  },

  fetchAchievements: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const achievements = await trainingAPI.getUserAchievements(userId);
      set({ achievements, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch achievements",
        isLoading: false,
      });
    }
  },

  fetchCertificates: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      const certificates = await trainingAPI.getCertificates(userId);
      set({ certificates, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to fetch certificates",
        isLoading: false,
      });
    }
  },

  completeCourse: async (userId: string, courseId: string) => {
    set({ isLoading: true, error: null });
    try {
      await trainingAPI.completeCourse(userId, courseId);
      set({ isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : "Failed to complete course",
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setCourses: (courses) => {
    set({ courses });
  },

  setCurrentCourse: (currentCourse) => {
    set({ currentCourse });
  },
}));
