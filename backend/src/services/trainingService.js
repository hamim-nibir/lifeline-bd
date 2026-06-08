import { db } from "../firebaseAdmin.js";
import { randomBytes } from "node:crypto";

const COURSES_COLLECTION = "training/courses";
const ENROLLMENTS_COLLECTION = "training/enrollments";
const CERTIFICATES_COLLECTION = "training/certificates";
const ACHIEVEMENTS_COLLECTION = "training/achievements";
const USER_ACHIEVEMENTS_COLLECTION = "training/user_achievements";
const PROGRESS_HISTORY_COLLECTION = "training/progress_history";

export const trainingService = {
  // COURSES
  async getAllCourses(level = null) {
    try {
      let query = db.collection(COURSES_COLLECTION);
      if (level && level !== "All") {
        query = query.where("level", "==", level);
      }
      const snapshot = await query.orderBy("createdAt", "desc").get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching courses:", error);
      throw error;
    }
  },

  async getCourseById(courseId) {
    try {
      const courseDoc = await db.collection(COURSES_COLLECTION).doc(courseId).get();
      if (!courseDoc.exists) throw new Error("Course not found");
      return {
        id: courseDoc.id,
        ...courseDoc.data(),
      };
    } catch (error) {
      console.error("Error fetching course:", error);
      throw error;
    }
  },

  async getCourseVideos(courseId) {
    try {
      const videosRef = db
        .collection(COURSES_COLLECTION)
        .doc(courseId)
        .collection("videos");
      const snapshot = await videosRef.orderBy("order", "asc").get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching course videos:", error);
      throw error;
    }
  },

  // ENROLLMENTS
  async enrollCourse(userId, courseId) {
    try {
      // Check if already enrolled
      const existingEnrollment = await db
        .collection(ENROLLMENTS_COLLECTION)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      if (!existingEnrollment.empty) {
        throw new Error("User already enrolled in this course");
      }

      const enrollmentRef = db.collection(ENROLLMENTS_COLLECTION).doc();
      const now = new Date();

      await enrollmentRef.set({
        userId,
        courseId,
        status: "in-progress",
        progress: 0,
        lastWatchedVideoId: null,
        lastWatchedAt: null,
        enrolledAt: now,
        completedAt: null,
        certificateId: null,
      });

      return {
        id: enrollmentRef.id,
        userId,
        courseId,
        status: "in-progress",
        progress: 0,
      };
    } catch (error) {
      console.error("Error enrolling in course:", error);
      throw error;
    }
  },

  async getEnrollmentsByUser(userId) {
    try {
      const snapshot = await db
        .collection(ENROLLMENTS_COLLECTION)
        .where("userId", "==", userId)
        .orderBy("enrolledAt", "desc")
        .get();

      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching user enrollments:", error);
      throw error;
    }
  },

  async getUserCourseEnrollment(userId, courseId) {
    try {
      const snapshot = await db
        .collection(ENROLLMENTS_COLLECTION)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      if (snapshot.empty) return null;
      const doc = snapshot.docs[0];
      return {
        id: doc.id,
        ...doc.data(),
      };
    } catch (error) {
      console.error("Error fetching enrollment:", error);
      throw error;
    }
  },

  // PROGRESS
  async updateProgress(userId, courseId, videoId, watchedDuration, totalDuration) {
    try {
      const now = new Date();

      // Record progress history
      await db.collection(PROGRESS_HISTORY_COLLECTION).add({
        userId,
        courseId,
        videoId,
        watchedDuration,
        totalDuration,
        progress: Math.round((watchedDuration / totalDuration) * 100),
        timestamp: now,
      });

      // Get all videos for the course
      const videos = await this.getCourseVideos(courseId);
      const totalVideos = videos.length;

      // Get enrollment to check watched videos
      const enrollment = await this.getUserCourseEnrollment(userId, courseId);
      if (!enrollment) throw new Error("Enrollment not found");

      // Get watched videos count
      const watchedSnapshot = await db
        .collection(PROGRESS_HISTORY_COLLECTION)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      const uniqueVideosWatched = new Set(
        watchedSnapshot.docs.map((doc) => doc.data().videoId)
      ).size;
      const courseProgress = Math.round((uniqueVideosWatched / totalVideos) * 100);

      // Update enrollment
      const enrollmentRef = db
        .collection(ENROLLMENTS_COLLECTION)
        .doc(enrollment.id);

      const updateData = {
        progress: courseProgress,
        lastWatchedVideoId: videoId,
        lastWatchedAt: now,
      };

      // Check if course completed
      if (courseProgress === 100) {
        updateData.status = "completed";
        updateData.completedAt = now;
      }

      await enrollmentRef.update(updateData);

      // Check for achievements
      if (courseProgress === 100) {
        await this.unlockCourseAchievement(userId, courseId);
        const certificateId = await this.issueCertificate(userId, courseId);
        await enrollmentRef.update({ certificateId });
      }

      return {
        progress: courseProgress,
        certificateEarned: courseProgress === 100,
      };
    } catch (error) {
      console.error("Error updating progress:", error);
      throw error;
    }
  },

  // ACHIEVEMENTS
  async getAchievements() {
    try {
      const snapshot = await db.collection(ACHIEVEMENTS_COLLECTION).orderBy("createdAt", "desc").get();
      return snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    } catch (error) {
      console.error("Error fetching achievements:", error);
      throw error;
    }
  },

  async getUserAchievements(userId) {
    try {
      const snapshot = await db
        .collection(USER_ACHIEVEMENTS_COLLECTION)
        .where("userId", "==", userId)
        .orderBy("unlockedAt", "desc")
        .get();

      const userAchievements = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Enrich with achievement details
      const achievements = await this.getAchievements();
      return userAchievements.map((ua) => {
        const achievement = achievements.find((a) => a.id === ua.achievementId);
        return {
          ...ua,
          ...achievement,
        };
      });
    } catch (error) {
      console.error("Error fetching user achievements:", error);
      throw error;
    }
  },

  async unlockCourseAchievement(userId, courseId) {
    try {
      // Find achievement for this course
      const achievementSnapshot = await db
        .collection(ACHIEVEMENTS_COLLECTION)
        .where("requirementType", "==", "course_completion")
        .where("courseId", "==", courseId)
        .get();

      if (achievementSnapshot.empty) return;

      const achievement = achievementSnapshot.docs[0];

      // Check if already unlocked
      const existingSnapshot = await db
        .collection(USER_ACHIEVEMENTS_COLLECTION)
        .where("userId", "==", userId)
        .where("achievementId", "==", achievement.id)
        .get();

      if (!existingSnapshot.empty) return;

      // Unlock achievement
      await db.collection(USER_ACHIEVEMENTS_COLLECTION).add({
        userId,
        achievementId: achievement.id,
        unlockedAt: new Date(),
        progress: 100,
      });
    } catch (error) {
      console.error("Error unlocking achievement:", error);
    }
  },

  // CERTIFICATES
  async issueCertificate(userId, courseId) {
    try {
      // Check if certificate already exists
      const existingSnapshot = await db
        .collection(CERTIFICATES_COLLECTION)
        .where("userId", "==", userId)
        .where("courseId", "==", courseId)
        .get();

      if (!existingSnapshot.empty) {
        return existingSnapshot.docs[0].id;
      }

      const certificateRef = db.collection(CERTIFICATES_COLLECTION).doc();
      const now = new Date();
      const expiryDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
      const certificateSuffix = randomBytes(5).toString("hex").toUpperCase();
      const certificateNumber = `CERT-${now.getFullYear()}-${certificateSuffix}`;

      await certificateRef.set({
        userId,
        courseId,
        certificateNumber,
        issuedAt: now,
        expiresAt: expiryDate,
        status: "active",
      });

      return certificateRef.id;
    } catch (error) {
      console.error("Error issuing certificate:", error);
      throw error;
    }
  },

  async getCertificatesByUser(userId) {
    try {
      const snapshot = await db
        .collection(CERTIFICATES_COLLECTION)
        .where("userId", "==", userId)
        .where("status", "==", "active")
        .orderBy("issuedAt", "desc")
        .get();

      // Enrich with course details
      const certificates = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      // Get course details for each certificate
      const enriched = await Promise.all(
        certificates.map(async (cert) => {
          const course = await this.getCourseById(cert.courseId);
          return {
            ...cert,
            courseName: course.title,
            courseIcon: course.icon,
          };
        })
      );

      return enriched;
    } catch (error) {
      console.error("Error fetching certificates:", error);
      throw error;
    }
  },

  // SEED DATA
  async seedCourses() {
    try {
      const courses = [
        {
          id: "first-aid-cpr",
          title: "First Aid & CPR",
          description: "Learn essential first aid techniques and CPR",
          level: "Beginner",
          icon: "🏥",
          thumbnail: "https://via.placeholder.com/200x120?text=First+Aid",
          backgroundColor: "#E3F2FD",
          duration: 240,
          enrolledCount: 2543,
          videoCount: 5,
          completionRate: 45,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "fire-prevention",
          title: "Fire Prevention & Emergency Response",
          description: "Prevent and respond to fire emergencies",
          level: "Beginner",
          icon: "🔥",
          thumbnail: "https://via.placeholder.com/200x120?text=Fire+Safety",
          backgroundColor: "#FFF3E0",
          duration: 180,
          enrolledCount: 1876,
          videoCount: 4,
          completionRate: 52,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "disaster-response",
          title: "Disaster Response & Preparedness",
          description: "Handle natural disasters effectively",
          level: "Intermediate",
          icon: "⚠️",
          thumbnail: "https://via.placeholder.com/200x120?text=Disaster+Response",
          backgroundColor: "#F3E5F5",
          duration: 300,
          enrolledCount: 1245,
          videoCount: 6,
          completionRate: 38,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: "rescue-operations",
          title: "Advanced Rescue Operations",
          description: "Master professional rescue techniques",
          level: "Intermediate",
          icon: "🚁",
          thumbnail: "https://via.placeholder.com/200x120?text=Rescue+Ops",
          backgroundColor: "#E8F5E9",
          duration: 360,
          enrolledCount: 856,
          videoCount: 7,
          completionRate: 31,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      for (const course of courses) {
        await db.collection("training/courses").doc(course.id).set(course);
      }

      console.log("Courses seeded successfully");
      return courses;
    } catch (error) {
      console.error("Error seeding courses:", error);
      throw error;
    }
  },

  async seedVideos() {
    try {
      const videos = {
        "first-aid-cpr": [
          {
            id: "v1",
            title: "CPR Step-by-Step Demonstration",
            description: "Learn proper CPR technique",
            videoUrl: "https://www.youtube.com/embed/0ibzrHcsDWU",
            duration: 750,
            order: 1,
            thumbnail: "https://via.placeholder.com/120x90?text=CPR",
            createdAt: new Date(),
          },
          {
            id: "v2",
            title: "Recovery Position",
            description: "How to place someone in recovery position",
            videoUrl: "https://www.youtube.com/embed/dGH3wGT8F4I",
            duration: 480,
            order: 2,
            thumbnail: "https://via.placeholder.com/120x90?text=Recovery",
            createdAt: new Date(),
          },
          {
            id: "v3",
            title: "Treating Choking",
            description: "Heimlich maneuver demonstration",
            videoUrl: "https://www.youtube.com/embed/3_c4eL6vOcg",
            duration: 520,
            order: 3,
            thumbnail: "https://via.placeholder.com/120x90?text=Choking",
            createdAt: new Date(),
          },
          {
            id: "v4",
            title: "Wound Bandaging",
            description: "Proper wound care and bandaging",
            videoUrl: "https://www.youtube.com/embed/DqRb0-PkQVo",
            duration: 580,
            order: 4,
            thumbnail: "https://via.placeholder.com/120x90?text=Bandaging",
            createdAt: new Date(),
          },
          {
            id: "v5",
            title: "Shock Management",
            description: "Recognizing and managing shock",
            videoUrl: "https://www.youtube.com/embed/Pf7b-EkJ3Ng",
            duration: 620,
            order: 5,
            thumbnail: "https://via.placeholder.com/120x90?text=Shock",
            createdAt: new Date(),
          },
        ],
        "fire-prevention": [
          {
            id: "v6",
            title: "Fire Safety Basics",
            description: "Fundamentals of fire prevention",
            videoUrl: "https://www.youtube.com/embed/z5-Bfx8GZvU",
            duration: 480,
            order: 1,
            thumbnail: "https://via.placeholder.com/120x90?text=Safety",
            createdAt: new Date(),
          },
          {
            id: "v7",
            title: "Using Fire Extinguishers",
            description: "PASS method for fire extinguishers",
            videoUrl: "https://www.youtube.com/embed/4j6h6FsYqmg",
            duration: 420,
            order: 2,
            thumbnail: "https://via.placeholder.com/120x90?text=Extinguisher",
            createdAt: new Date(),
          },
          {
            id: "v8",
            title: "Emergency Evacuation",
            description: "Evacuation procedures and safety",
            videoUrl: "https://www.youtube.com/embed/LeVGR-RHBrI",
            duration: 540,
            order: 3,
            thumbnail: "https://via.placeholder.com/120x90?text=Evacuation",
            createdAt: new Date(),
          },
          {
            id: "v9",
            title: "Fire Detection Systems",
            description: "Understanding alarms and detectors",
            videoUrl: "https://www.youtube.com/embed/e7o_wKkKZ6c",
            duration: 460,
            order: 4,
            thumbnail: "https://via.placeholder.com/120x90?text=Detection",
            createdAt: new Date(),
          },
        ],
        "disaster-response": [
          {
            id: "v10",
            title: "Earthquake Safety",
            description: "Earthquake preparedness and response",
            videoUrl: "https://www.youtube.com/embed/TKaQmqJmVTA",
            duration: 620,
            order: 1,
            thumbnail: "https://via.placeholder.com/120x90?text=Earthquake",
            createdAt: new Date(),
          },
          {
            id: "v11",
            title: "Flood Response",
            description: "Handling flood emergencies",
            videoUrl: "https://www.youtube.com/embed/kDrz7S5BgW8",
            duration: 580,
            order: 2,
            thumbnail: "https://via.placeholder.com/120x90?text=Flood",
            createdAt: new Date(),
          },
          {
            id: "v12",
            title: "Cyclone Preparedness",
            description: "Cyclone safety measures",
            videoUrl: "https://www.youtube.com/embed/j8cVdL8Hc4U",
            duration: 540,
            order: 3,
            thumbnail: "https://via.placeholder.com/120x90?text=Cyclone",
            createdAt: new Date(),
          },
          {
            id: "v13",
            title: "Urban Evacuation",
            description: "Mass evacuation procedures",
            videoUrl: "https://www.youtube.com/embed/s1DnCpCqMvI",
            duration: 600,
            order: 4,
            thumbnail: "https://via.placeholder.com/120x90?text=Urban+Evac",
            createdAt: new Date(),
          },
          {
            id: "v14",
            title: "Supply Management",
            description: "Emergency supply management",
            videoUrl: "https://www.youtube.com/embed/V5EZ0x_LNcc",
            duration: 480,
            order: 5,
            thumbnail: "https://via.placeholder.com/120x90?text=Supplies",
            createdAt: new Date(),
          },
          {
            id: "v15",
            title: "Community Response",
            description: "Community-based disaster response",
            videoUrl: "https://www.youtube.com/embed/aPHjhpvt5IM",
            duration: 560,
            order: 6,
            thumbnail: "https://via.placeholder.com/120x90?text=Community",
            createdAt: new Date(),
          },
        ],
        "rescue-operations": [
          {
            id: "v16",
            title: "Rope Rescue Basics",
            description: "Fundamentals of rope rescue",
            videoUrl: "https://www.youtube.com/embed/QCE1M1Ll0dc",
            duration: 680,
            order: 1,
            thumbnail: "https://via.placeholder.com/120x90?text=Rope",
            createdAt: new Date(),
          },
          {
            id: "v17",
            title: "Water Rescue",
            description: "Water rescue techniques",
            videoUrl: "https://www.youtube.com/embed/SzcZYM3lqhI",
            duration: 720,
            order: 2,
            thumbnail: "https://via.placeholder.com/120x90?text=Water",
            createdAt: new Date(),
          },
          {
            id: "v18",
            title: "Vehicle Rescue",
            description: "Vehicle extraction procedures",
            videoUrl: "https://www.youtube.com/embed/lKIq-nXdO1c",
            duration: 640,
            order: 3,
            thumbnail: "https://via.placeholder.com/120x90?text=Vehicle",
            createdAt: new Date(),
          },
          {
            id: "v19",
            title: "Confined Space Rescue",
            description: "Rescuing from confined spaces",
            videoUrl: "https://www.youtube.com/embed/b6pK7v8GQBY",
            duration: 700,
            order: 4,
            thumbnail: "https://via.placeholder.com/120x90?text=Confined",
            createdAt: new Date(),
          },
          {
            id: "v20",
            title: "Height Rescue",
            description: "Working at heights safely",
            videoUrl: "https://www.youtube.com/embed/Xh5sJkRSNxE",
            duration: 660,
            order: 5,
            thumbnail: "https://via.placeholder.com/120x90?text=Heights",
            createdAt: new Date(),
          },
          {
            id: "v21",
            title: "Hazmat Response",
            description: "Hazardous material response",
            videoUrl: "https://www.youtube.com/embed/lsNYs0-L7zI",
            duration: 740,
            order: 6,
            thumbnail: "https://via.placeholder.com/120x90?text=Hazmat",
            createdAt: new Date(),
          },
          {
            id: "v22",
            title: "Team Coordination",
            description: "Rescue team coordination",
            videoUrl: "https://www.youtube.com/embed/qx6VlSj8Q9Y",
            duration: 580,
            order: 7,
            thumbnail: "https://via.placeholder.com/120x90?text=Team",
            createdAt: new Date(),
          },
        ],
      };

      for (const [courseId, courseVideos] of Object.entries(videos)) {
        for (const video of courseVideos) {
          await db
            .collection("training/courses")
            .doc(courseId)
            .collection("videos")
            .doc(video.id)
            .set(video);
        }
      }

      console.log("Videos seeded successfully");
      return videos;
    } catch (error) {
      console.error("Error seeding videos:", error);
      throw error;
    }
  },

  async seedAchievements() {
    try {
      const achievements = [
        {
          id: "first-responder",
          title: "First Responder",
          description: "Completed First Aid & CPR",
          icon: "🏅",
          requirementType: "course_completion",
          courseId: "first-aid-cpr",
          createdAt: new Date(),
        },
        {
          id: "fire-guardian",
          title: "Fire Guardian",
          description: "Completed Fire Prevention",
          icon: "🔥",
          requirementType: "course_completion",
          courseId: "fire-prevention",
          createdAt: new Date(),
        },
        {
          id: "disaster-ready",
          title: "Disaster Ready",
          description: "Completed Disaster Response",
          icon: "⭐",
          requirementType: "course_completion",
          courseId: "disaster-response",
          createdAt: new Date(),
        },
        {
          id: "rescue-expert",
          title: "Rescue Expert",
          description: "Completed Advanced Rescue Operations",
          icon: "🚁",
          requirementType: "course_completion",
          courseId: "rescue-operations",
          createdAt: new Date(),
        },
      ];

      for (const achievement of achievements) {
        await db
          .collection(ACHIEVEMENTS_COLLECTION)
          .doc(achievement.id)
          .set(achievement);
      }

      console.log("Achievements seeded successfully");
      return achievements;
    } catch (error) {
      console.error("Error seeding achievements:", error);
      throw error;
    }
  },
};
